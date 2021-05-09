const express = require('express')
const router = express.Router()
const { validateAndGetSession, readableTime, getUpdateTime, getBeatmapSet } = require('../src/util')
const sql = require('../src/sql')
const { queueBeatmapSetUpdate } = require ('../src/backgroundTask')

const getQueue = async (token = null, page = -1, userId = -1) => {
    const count = (await sql.findOne('SELECT COUNT(*) AS total_requests FROM requests'))['total_requests']
    if (count === 0) return { max_entries: 0, entries: [] } // just send empty response
    const values = []
    let where = ''
    let limit = ''
    if (userId !== -1) {
        where += 'user_id = ? '
        values.push(userId)
    }
    if (page !== -1) {
        limit = `LIMIT ${page * 50}, 50`
    }
    const result = await sql.findAll(`SELECT * FROM requests ${where === '' ? '' : ('WHERE ' + where)}${limit}`, ...values)
    if (result.length === 0) return { max_entries: count, entries: [] }
    const userIds = []
    result.forEach(r => userIds.includes(r['user_id']) || userIds.push(r['user_id']))
    const whereUserIds = 'id=' + userIds.join(' OR id=')
    const _users = await sql.findAll(`SELECT * FROM users WHERE ${whereUserIds}`)
    const users = {}
    _users.forEach(u => users[u.id] = u)
    result.forEach(r => r['user'] = users[r['user_id']] || null)
    const setIds = []
    result.forEach(r => setIds.includes(r['beatmapset_id']) || setIds.push(r['beatmapset_id']))
    const whereSetIds = 'beatmapset_id=' + setIds.join(' OR beatmapset_id=')
    const _sets = await sql.findAll(`SELECT * FROM beatmaps WHERE ${whereSetIds}`)
    if (token) {
        // do not run if token is not present
        _sets.forEach(s => {
            if (s.date.getTime() + getUpdateTime(s.status) < Date.now()) {
                queueBeatmapSetUpdate(token, s['beatmapset_id'])
            }
        })
    }
    const sets = {}
    _sets.forEach(u => sets[u['beatmapset_id']] = u)
    result.forEach(r => r['beatmapset'] = sets[r['beatmapset_id']] || null)
    return { max_entries: count, entries: result }
}

router.get('/queue', async (req, res) => {
    const session = validateAndGetSession(req)
    res.send(await getQueue(session?.access_token, req.query['page'] || 0))
})

router.get('/queue/me', async (req, res) => {
    const session = validateAndGetSession(req)
    if (!session) return res.status(401).send({ error: 'login_required' })
    res.send(await getQueue(session.access_token, 0, session.user_id))
})

router.post('/queue/submit', async (req, res) => {
    const session = validateAndGetSession(req)
    if (!session) return res.status(401).send({ error: 'login_required' })
    if (!req.body) return res.status(400).send({ error: 'invalid_params' })
    const beatmapSetId = parseInt(req.body['beatmapSetId'])
    if (!beatmapSetId) return res.status(400).send({ error: 'invalid_params' })
    if (beatmapSetId !== beatmapSetId) return res.status(400).send({ error: 'invalid_params' })
    const comment = req.body['comment'] || null
    if (comment && comment.length > 255) return res.status(400).send({ error: 'invalid_params' })
    res.startTime('fetch_user', 'Fetch user data')
    const user = await sql.findOne("SELECT `last_submit`, `group`, `mod_queue_banned`, `mod_queue_banned_reason` FROM users WHERE id = ?", session.user_id)
    res.endTime('fetch_user')
    if (!user) return res.status(401).send({ error: 'login_required' })
    // admins cannot bypass the ban :P
    if (user['mod_queue_banned']) return res.send({ error: 'banned', reason: user['mod_queue_banned_reason'] || null })
    // but admins are allowed to bypass this
    const time = !user['last_submit'] ? 0 : user['last_submit'].getTime() + 1000 * 60 * 60 * 24 * 14
    if (user.group !== 'admin' && time > Date.now()) return res.send({ error: 'time', expiresIn: readableTime(time - Date.now()) })
    res.startTime('get_beatmapset', `API Request: beatmapsets/${beatmapSetId}`)
    const beatmapSet = await getBeatmapSet(session.access_token, beatmapSetId)
    res.endTime('get_beatmapset')
    if (beatmapSet.status_code === 404) return res.send({ error: 'not_found' })
    if (beatmapSet.status_code !== 200) return res.status(beatmapSet.status_code || 500).send({ error: 'unexpected_api_error' })
    // admins can bypass these limits
    if (user.group !== 'admin') {
        // not your beatmapset (in case of GDs, the beatmapset host must do it.)
        if (beatmapSet.user_id !== session.user_id) return res.send({ error: 'not_your_beatmapset' })
        // no >= 8 stars
        if (beatmapSet.highest_sr >= 8) return res.send({ error: 'no_8_stars' })
        // no graveyard/ranked sets
        if (beatmapSet.status !== 'pending' && beatmapSet.status !== 'wip') return res.send({ error: 'wrong_status' })
    }
    await sql.execute("INSERT INTO requests (`beatmapset_id`, `user_id`, `comment_by_mapper`) VALUES (?, ?, ?)", beatmapSetId, session.user_id, comment)
    res.send({ message: 'accepted' })
})

module.exports = router
