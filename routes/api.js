const express = require('express')
const router = express.Router()
const { validateAndGetSession, readableTime, getUpdateTime, getBeatmapSet, pushEvent, getIPAddress } = require('../src/util')
const sql = require('../src/sql')
const { queueBeatmapSetUpdate } = require ('../src/backgroundTask')
const config = require('../src/config')

const getQueue = module.exports.getQueue = async (token = null, page = -1, userId = -1) => {
    const values = []
    let where = ''
    let limit = ''
    if (userId !== -1) {
        where += 'user_id = ? '
        values.push(userId)
    }
    const count = (await sql.findOne(`SELECT COUNT(*) AS total_requests FROM requests ${where === '' ? '' : ('WHERE ' + where)}`, ...values))['total_requests']
    if (count === 0) return { max_entries: 0, entries: [] } // just send empty response
    if (page >= 0) {
        limit = `LIMIT ${page * 50}, 50`
    }
    const result = await sql.findAll(`SELECT * FROM requests ${where === '' ? '' : ('WHERE ' + where)}${limit}`, ...values)
    if (result.length === 0) return { max_entries: count, entries: [] }

    // get beatmaps
    const setIds = []
    const requestIds = []
    result.forEach(r => {
        setIds.includes(r.beatmapset_id) || setIds.push(r.beatmapset_id)
        requestIds.includes(r.id) || requestIds.push(r.id)
    })
    const whereSetIds = 'beatmapset_id=' + setIds.join(' OR beatmapset_id=')
    const sets = await sql.findAll(`SELECT * FROM beatmaps WHERE ${whereSetIds}`)

    // get users
    const userIds = []
    sets.forEach(r => userIds.includes(r.user_id) || userIds.push(r.user_id))
    result.forEach(r => userIds.includes(r.user_id) || userIds.push(r.user_id))
    const whereUserIds = 'id=' + userIds.join(' OR id=')
    const users = await sql.findAll(`SELECT * FROM users WHERE ${whereUserIds}`)

    // link beatmap <-> user (mapper)
    sets.forEach(b => b.user = users.find(e => e.id === b.user_id))

    // get events
    const whereRequestIds = 'request_id=' + requestIds.join(' OR request_id=')
    const events = await sql.findAll(`SELECT * FROM request_events WHERE ${whereRequestIds}`)
    result.forEach(r => {
        r.user = users.find(e => e.id === r.user_id) || null
        r.events = events.filter(e => e.request_id === r.id)
    })

    // queue beatmap update if it's old
    if (token) {
        // do not run if token is not present
        sets.forEach(s => {
            if (s.date.getTime() + getUpdateTime(s.status) < Date.now()) {
                queueBeatmapSetUpdate(token, s.beatmapset_id)
            }
        })
    }
    result.forEach(r => r.beatmapset = sets.find(e => e.beatmapset_id === r.beatmapset_id) || null)
    return { max_entries: count, entries: result }
}

router.get('/config', async (req, res) => {
    res.send(await config.getConfig(true))
})

// optional auth
router.get('/queue', async (req, res) => {
    const session = validateAndGetSession(req)
    res.send(await getQueue(session?.access_token, Math.max(0, req.query['page'] || 0)))
})

router.get('/queue/:id', async (req, res) => {
    const id = Math.max(parseInt(req.params.id || '0'), 0)
    if (id !== id) return res.status(400).send({ error: 'invalid_params' })
    const request = await sql.findOne('SELECT * FROM requests WHERE id = ?', id)
    if (!request) return res.status(404).send({ error: 'not_found' })
    const beatmapset = await sql.findOne('SELECT * FROM beatmaps WHERE beatmapset_id = ?', request.beatmapset_id)
    const users = await sql.findAll('SELECT * FROM users WHERE id = ? OR id = ?', request.user_id, (beatmapset?.user_id || 0))
    if (beatmapset) beatmapset.user = users.find(u => u.id === beatmapset.user_id)
    request.beatmapset = beatmapset
    request.user = users.find(u => u.id === request.user_id)
    res.send(request)
})

router.get('/queue/me', async (req, res) => {
    const session = validateAndGetSession(req)
    if (!session) return res.status(401).send({ error: 'login_required' })
    res.send(await getQueue(session.access_token, 0, session.user_id))
})

const recentlySubmitted = []

setInterval(() => recentlySubmitted.length = 0, 1000 * 60)

router.post('/queue/submit', async (req, res) => {
    const ip = getIPAddress(req)
    if (recentlySubmitted.includes(ip)) return res.status(429).send({ error: 'too_many_requests' })
    recentlySubmitted.push(ip)
    const session = validateAndGetSession(req)
    if (!session) return res.status(401).send({ error: 'login_required' })
    if (!req.body) return res.status(400).send({ error: 'invalid_params' })
    const beatmapSetId = parseInt(req.body['beatmapSetId'])
    if (!beatmapSetId) return res.status(400).send({ error: 'invalid_params' })
    if (beatmapSetId !== beatmapSetId) return res.status(400).send({ error: 'invalid_params' })
    const comment = req.body['comment'] !== null ? req.body['comment'].toString() : null
    if (comment && comment.length > 255) return res.status(400).send({ error: 'invalid_params' })
    res.startTime('fetch_user', 'Fetch user data')
    const user = await sql.findOne("SELECT `username`, `last_submit`, `group`, `mod_queue_banned`, `mod_queue_banned_reason` FROM users WHERE id = ?", session.user_id)
    res.endTime('fetch_user')
    if (!user) return res.status(401).send({ error: 'login_required' })
    if (await config.requests.getStatus() === 'closed' && user.group !== 'modder' && user.group !== 'admin') return res.status(400).send({ error: 'closed' })
    // admins cannot bypass the ban :P
    if (user['mod_queue_banned']) return res.status(403).send({ error: 'banned', reason: user['mod_queue_banned_reason'] || null })
    // but admins are allowed to bypass this
    // 2 weeks (14 days)
    const time = !user['last_submit'] ? 0 : (user['last_submit'].getTime() + 1000 * 60 * 60 * 24 * 14)
    if (user.group !== 'admin' && time > Date.now()) return res.status(400).send({ error: 'time', time: readableTime(time - Date.now()) })
    res.startTime('get_beatmapset', `API Request: beatmapsets/${beatmapSetId}`)
    const beatmapSet = await getBeatmapSet(session.access_token, beatmapSetId)
    res.endTime('get_beatmapset')
    if (beatmapSet.status_code === 404) return res.status(400).send({ error: 'not_found' })
    if (beatmapSet.status_code === 401) return res.status(401).send({ error: 'login_required' })
    if (beatmapSet.status_code !== 200) return res.status(beatmapSet.status_code || 500).send({ error: 'unexpected_api_error' })
    // admins can bypass these limits
    if (user.group !== 'admin') {
        // not your beatmapset (in case of GDs, the beatmapset host must do it.)
        if (beatmapSet.user_id !== session.user_id) return res.status(400).send({ error: 'not_your_beatmapset' })
        // no >= 8 stars
        if (beatmapSet.highest_sr >= 7) return res.status(400).send({ error: 'no_7_stars' })
        // no graveyard/ranked sets
        if (beatmapSet.status !== 'pending' && beatmapSet.status !== 'wip') return res.status(400).send({ error: 'wrong_status' })
    }
    const requestId = await sql.findOne('INSERT INTO requests (`beatmapset_id`, `user_id`, `comment_by_mapper`) VALUES (?, ?, ?)', beatmapSetId, session.user_id, comment)
    await sql.execute("UPDATE users SET last_submit = now() WHERE id = ?", session.user_id)
    await pushEvent(requestId, 'submitted', session.user_id, `<b><a href="https://osu.ppy.sh/users/${user.id}">${user.username}</a></b> submitted the mod request (<a href="https://osu.ppy.sh/beatmapsets/${beatmapSetId}">${beatmapSet.artist} - ${beatmapSet.title}</a>).`)
    if (comment) await pushEvent(requestId, 'comment-by-mapper', session.user_id, `<b><a href="https://osu.ppy.sh/users/${user.id}">${user.username}</a></b> (mapper) updated the comment (<em>${comment}</em>).`)
    res.send({ message: 'accepted' })
})

let queue_edit_comment = {}

setInterval(() => queue_edit_comment = {}, 1000 * 60)

router.post('/queue/edit_comment', async (req, res) => {
    const ip = getIPAddress(req)
    if (queue_edit_comment[ip] >= 6) return res.status(429).send({ error: 'too_many_requests' })
    queue_edit_comment[ip] = (queue_edit_comment[ip] || 0) + 1
    const session = validateAndGetSession(req)
    if (!session) return res.status(401).send({ error: 'login_required' })
    if (!req.body) return res.status(400).send({ error: 'invalid_params' })
    const type = req.body.type.toString()
    if (!type || (type !== 'edit_mapper' && type !== 'edit_modder')) return res.status(400).send({ error: 'invalid_params' })
    const requestId = parseInt(req.body.request_id)
    if (!requestId || requestId !== requestId) return res.status(400).send({ error: 'invalid_params' })
    if (req.body['comment'] === null || typeof req.body['comment'] === 'undefined') return res.status(400).send({ error: 'invalid_params' })
    const comment = req.body['comment'].toString()
    if (comment.length > 255) return res.status(400).send({ error: 'invalid_params' })
    res.startTime('fetch_user', 'Fetch user data')
    const user = await sql.findOne('SELECT `id`, `username`, `group` FROM users WHERE id = ?', session.user_id)
    res.endTime('fetch_user')
    res.startTime('fetch_request', 'Fetch mod request data')
    const request = await sql.findOne('SELECT `user_id` FROM requests WHERE id = ?', requestId)
    res.endTime('fetch_request')
    if (type === 'edit_mapper') {
        if (request.user_id !== user.id) return res.status(403).send({ error: 'insufficient_permission' })
        res.startTime('update', 'Update data')
        await sql.execute('UPDATE requests SET comment_by_mapper = ? WHERE id = ?', comment, requestId)
        await pushEvent(requestId, 'comment-by-mapper', user.id, `<b><a href="https://osu.ppy.sh/users/${user.id}">${user.username}</a></b> (mapper) updated the comment (<em>${comment}</em>).`)
        res.endTime('update')
    } else {
        if (user.group !== 'modder' && user.group !== 'admin') return res.status(403).send({ error: 'insufficient_permission' })
        res.startTime('update', 'Update data')
        await sql.execute('UPDATE requests SET comment_by_modder = ? WHERE id = ?', comment, requestId)
        await pushEvent(requestId, 'comment-by-modder', user.id, `<b><a href="https://osu.ppy.sh/users/${user.id}">${user.username}</a></b> (modder) updated the comment (<em>${comment}</em>).`)
        res.endTime('update')
    }
    res.send({ message: 'accepted' })
})

router.post('/queue/update_status', async (req, res) => {
    const session = validateAndGetSession(req)
    if (!session) return res.status(401).send({ error: 'login_required' })
    if (!req.body) return res.status(400).send({ error: 'invalid_params' })
    const type = req.body.type.toString()
    if (!type || (type !== 'approve' && type !== 'reject' && type !== 'done' && type !== 'unapprove')) return res.status(400).send({ error: 'invalid_params' })
    const requestId = parseInt(req.body.request_id)
    if (!requestId) return res.status(400).send({ error: 'invalid_params' })
    if ((type === "reject" || type === "unapprove") && !req.body.comment)
        return res.status(400).send({ error: "invalid_params" });
    const comment = req.body.comment ? req.body['comment'].toString() : ''
    if (comment.length > 255) return res.status(400).send({ error: 'invalid_params' })
    res.startTime('fetch_user', 'Fetch user data')
    const user = await sql.findOne('SELECT `id`, `username`, `group` FROM users WHERE id = ?', session.user_id)
    res.endTime('fetch_user')
    res.startTime('fetch_req', 'Fetch user data')
    const request = await sql.findOne('SELECT `status` FROM requests WHERE id = ?', requestId)
    if (!request) return res.status(404).send({ error: 'not_found' })
    // current status
    const { status } = request
    res.endTime('fetch_req')
    if (user.group !== 'modder' && user.group !== 'admin') return res.status(403).send({ error: 'insufficient_permission' })
    let evType = null
    let newStatus = null
    let desc = null
    if (type === 'approve' && status !== 'pending' && status !== 'done') {
        evType = 'approved'
        newStatus = 'pending'
        desc = 'Approved by ? and is now waiting for modding.'
    } else if (type === 'reject' && status !== 'done' && status !== 'rejected') {
        evType = 'rejected'
        newStatus = 'rejected'
        desc = 'Rejected by ?.'
    } else if (type === 'done' && status === 'pending') {
        evType = 'finished'
        newStatus = 'done'
        desc = 'Marked as finished by ?.'
    } else if (type === 'unapprove' && (status === 'pending' || status === 'rejected' || status === 'done')) {
        evType = 'unapproved'
        newStatus = 'submitted'
        desc = 'Unapproved by ?.'
    } else {
        return res.status(400).send({ error: 'invalid_params' })
    }
    const commentSection = comment ? ` (<em>${comment}</em>)` : ''
    const usr = `<b><a href="https://osu.ppy.sh/users/${user.id}">${user.username}</a></b>`
    await sql.execute('UPDATE `requests` SET `status` = ? WHERE `id` = ?', newStatus, requestId)
    await pushEvent(requestId, evType, user.id, `${desc.replace('?', usr)}${commentSection}`)
    res.send({ message: 'accepted' })
})

// no auth
router.get('/queue/request_events/:requestId', async (req, res) => {
    const requestId = parseInt(req.params.requestId)
    if (requestId <= 0) return res.status(400).send({ error: 'invalid_params' })
    const events = await sql.findAll('SELECT * FROM request_events WHERE request_id = ?', requestId)
    res.send(events)
})

// returns minimum information (no extra beatmap/user/events information) for specified request id
// no auth
router.get('/queue/queues_small/:requestId', async (req, res) => {
    const requestId = parseInt(req.params.requestId)
    if (requestId <= 0) return res.status(400).send({ error: 'invalid_params' })
    const request = await sql.findOne('SELECT * FROM requests WHERE id = ?', requestId)
    if (!request) return res.status(404).send({ error: 'not_found' })
    res.send(request)
})

module.exports = router
