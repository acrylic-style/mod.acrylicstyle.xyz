const crypto = require('crypto')
const osu = require('./osu')
const sql = require('./sql')
const config = require('./config')
const { queueBeatmapSetUpdate, queue } = require('./backgroundTask')
const fetch = require('node-fetch')

const sessions = {}

const generateSecureRandomString = length => {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(length, function(err, buffer) {
            if (err) {
                reject(err)
            } else {
                resolve(buffer.toString('hex'))
            }
        });
    })
}

const sleep = async time => {
    await new Promise((res) => setTimeout(res, time));
    return null;
}

const validateAndGetSession = req => {
    const cookies = req.cookies
    if (!cookies) return null // reject if they don't have cookies (where are their cookies?)
    const session = cookies['mod_session']
    const token = sessions[session]
    if (!session || !token || token.expires_at <= Date.now()) return null // reject if session does not found or session expired
    if (token.ip !== getIPAddress(req)) return null // reject if ip address does not match
    return token
}

const getSession = cookies => {
    if (!cookies) return null
    const session = cookies['mod_session']
    const token = sessions[session]
    if (!session || !token) return null
    return token
}

const getAccessToken = cookies => {
    if (!cookies) return null
    const session = cookies['mod_session']
    const token = sessions[session]
    if (!session || !token || !token['access_token']) return null
    return token['access_token']
}

const getIPAddress = req => {
    const cloudflareHeader = req.headers['cf-connecting-ip']
    if (cloudflareHeader) return cloudflareHeader
    return req.ip
}

const readableTime = time => {
    if (time < 0) {
        time = -time
        if (time < 1000 * 60) return `${Math.floor(time / 1000)} second${Math.floor(time / 1000) === 1 ? '' : 's'} ago`
        if (time < 1000 * 60 * 60) return `${Math.floor(time / (1000 * 60))} minute${Math.floor(time / (1000 * 60)) === 1 ? '' : 's'} ago`
        if (time < 1000 * 60 * 60 * 24) return `${Math.floor(time / (1000 * 60 * 60))} hour${Math.floor(time / (1000 * 60 * 60)) === 1 ? '' : 's'} ago`
        if (time < 1000 * 60 * 60 * 24 * 30) return `${Math.floor(time / (1000 * 60 * 60 * 24))} day${Math.floor(time / (1000 * 60 * 60 * 24)) === 1 ? '' : 's'} ago`
        return `${Math.floor(time / (1000 * 60 * 60 * 24 * 30))} month${Math.floor(time / (1000 * 60 * 60 * 24 * 30)) === 1 ? '' : 's'} ago`
    } else {
        if (time < 1000 * 60) return 'soon'
        if (time < 1000 * 60 * 60) return `in ${Math.floor(time / (1000 * 60))} minute${Math.floor(time / (1000 * 60)) === 1 ? '' : 's'}`
        if (time < 1000 * 60 * 60 * 24) return `in ${Math.floor(time / (1000 * 60 * 60))} hour${Math.floor(time / (1000 * 60 * 60)) === 1 ? '' : 's'}`
        if (time < 1000 * 60 * 60 * 24 * 30) return `in ${Math.floor(time / (1000 * 60 * 60 * 24))} day${Math.floor(time / (1000 * 60 * 60 * 24)) === 1 ? '' : 's'}`
        return `in ${Math.floor(time / (1000 * 60 * 60 * 24 * 30))} month${Math.floor(time / (1000 * 60 * 60 * 24 * 30)) === 1 ? '' : 's'}`
    }
}

/**
 * Fetches beatmapset from database and update immediately if not found in database. Also queues update if token was
 * provided and the beatmapset is outdated.
 * @param token
 * @param beatmapSetId
 * @returns {Promise<* | null>}
 */
const getBeatmapSet = async (token, beatmapSetId = 0) => {
    let beatmapSet = await sql.findOne("SELECT * FROM beatmaps WHERE beatmapset_id = ?", beatmapSetId)
    if (!token) return beatmapSet
    if (!beatmapSet) {
        const beatmapSetApi = await osu(token).getBeatmapSet(beatmapSetId)
        if (beatmapSetApi.status_code !== 200) {
            // could not fetch beatmap
            return beatmapSetApi
        }
        const maps = beatmapSetApi['beatmaps'].sort((a, b) => a['difficulty_rating'] - b['difficulty_rating'])
        const lowestSR = maps.length === 0 ? 0 : maps[0]['difficulty_rating']
        const highestSR = maps.length === 0 ? 0 : maps[maps.length - 1]['difficulty_rating']
        await sql.execute(
            "INSERT INTO beatmaps (`beatmapset_id`, `user_id`, `status`, `lowest_sr`, `highest_sr`, `artist`, `title`, `fullname`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            beatmapSetApi['id'],
            beatmapSetApi['user_id'],
            beatmapSetApi['status'],
            lowestSR,
            highestSR,
            beatmapSetApi['artist'],
            beatmapSetApi['title'],
            `${beatmapSetApi['artist']} - ${beatmapSetApi['title']}`,
        )
        beatmapSet = {}
        beatmapSet.beatmapset_id = beatmapSetApi['id']
        beatmapSet.user_id = beatmapSetApi['user_id']
        beatmapSet.status = beatmapSetApi['status']
        beatmapSet.date = new Date()
        beatmapSet.lowest_sr = lowestSR
        beatmapSet.highest_sr = highestSR
        beatmapSet.artist = beatmapSetApi['artist']
        beatmapSet.title = beatmapSetApi['title']
        beatmapSet.status_code = 200 // its always 200
        beatmapSet.fullname = `${beatmapSetApi['artist']} - ${beatmapSetApi['title']}`
    }
    await getUser(token, beatmapSet.user_id) // user information (like username) could be missing, so we must update now
    if (beatmapSet.date.getTime() + getUpdateTime(beatmapSet.status) < Date.now()) queueBeatmapSetUpdate(token, beatmapSetId)
    beatmapSet.status_code = 200
    return beatmapSet
}

// nullable
const getUser = async (token, userId = 0) => {
    const user = await sql.findOne("SELECT * FROM users WHERE `id` = ?", userId)
    if (!token) return user
    // update user every 30 days
    if (user && user['last_update'].getTime() + 1000 * 60 * 60 * 24 * 30 > Date.now()) return user
    const data = await osu(token).getUser(userId)
    if (data.status_code !== 200) {
        // no luck
        return null
    }
    await sql.execute(
        "INSERT IGNORE INTO users (`id`, `username`, `country_code`, `country_name`, `avatar_url`, `title`, `profile_colour`) VALUES (?, ?, ?, ?, ?, ?, ?)",
        data.id,
        data.username,
        data.country?.code || 'XX',
        data.country?.name || 'XX',
        data.avatar_url,
        data.title,
        data.profile_colour
    )
    return {
        id: data.id,
        username: data.username,
        country_code: data.country?.code || 'XX',
        country_name: data.country?.name || 'XX',
        avatar_url: data.avatar_url,
        title: data.title,
        profile_colour: data.profile_colour
    }
}

const getUpdateTime = (status) => {
    let days = 60
    if (status === 'graveyard' || status === 'pending' || status === 'wip' || status === 'qualified') days = 3
    return 1000 * 60 * 60 * 24 * days
}

const pushEvent = async (requestId = -1, type = '', userId = -1, description = '') => {
    if (requestId === -1 || !requestId) throw new Error(`Invalid request id: ${requestId}`)
    if (userId === -1 || !userId) throw new Error(`Invalid user id: ${userId}`)
    if (type === '' || !type) throw new Error('Empty event type')
    await sql.execute(
        "INSERT INTO request_events (`request_id`, `type`, `user_id`, `description`) VALUES (?, ?, ?, ?)",
        requestId,
        type,
        userId,
        description,
    )
}

const pushDiscordWebhook = (title, description, color = 'ffffff') => {
    config.webhook.getDiscordWebhookURLs().then(urls => {
        for (const url of urls) {
            queue(async () => {
                await fetch(url, {
                    method: 'post',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        embeds: [
                            {
                                title,
                                description,
                                color: Math.min(parseInt(color, 16), 0xfffffe),
                            },
                        ],
                    }),
                })
            })
        }
    })
}

module.exports = {
    sessions,
    generateSecureRandomString,
    sleep,
    getSession,
    getAccessToken,
    getIPAddress,
    validateAndGetSession,
    readableTime,
    getBeatmapSet,
    getUpdateTime,
    pushEvent,
    getUser,
    pushDiscordWebhook,
}
