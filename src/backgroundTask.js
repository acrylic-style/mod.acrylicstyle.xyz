const debug = require('debug')('mod.acrylicstyle.xyz:background-task-executor')
const { setAsyncInterval } = require('./asyncInterval')
const osu = require('./osu')
const sql = require('./sql')
let queuedBeatmapSetUpdates = []
const tasks = []

setAsyncInterval(async () => {
    const task = tasks.shift()
    if (!task) return
    try {
        await task()
    } catch (e) {
        debug('Error executing task')
        console.error(e)
    }
}, 3000)

debug('Initialized background task executor')

module.exports = {
    tasks,
    queueBeatmapSetUpdate: (token, beatmapSetId = -1) => {
        if (!token || beatmapSetId === -1) return
        if (queuedBeatmapSetUpdates.includes(beatmapSetId)) return
        queuedBeatmapSetUpdates.push(beatmapSetId)
        debug(`Queued update of beatmapset ${beatmapSetId}`)
        tasks.push(async () => {
            const res = await osu(token).getBeatmapSet(beatmapSetId)
            if (res.status_code !== 200) {
                await sql.execute("UPDATE beatmaps SET date = now() WHERE beatmapset_id = ?", beatmapSetId)
                queuedBeatmapSetUpdates = queuedBeatmapSetUpdates.filter(b => b !== beatmapSetId)
                return debug(`Update of beatmapset ${beatmapSetId} failed: ${res['status_code']} (${res['error']})`)
            }
            const maps = res['beatmaps'].sort((a, b) => a['difficulty_rating'] - b['difficulty_rating'])
            const lowestSR = maps.length === 0 ? 0 : maps[0]['difficulty_rating']
            const highestSR = maps.length === 0 ? 0 : maps[maps.length - 1]['difficulty_rating']
            await sql.execute(
                "UPDATE beatmaps SET `artist` = ?, `title` = ?, `status` = ?, `date` = now(), `highest_sr` = ?, `lowest_sr` = ?, fullname = ? WHERE beatmapset_id = ?",
                // set
                res['artist'],
                res['title'],
                res['status'],
                highestSR,
                lowestSR,
                `${res['artist']} - ${res['title']}`,
                // where
                beatmapSetId,
            )
            queuedBeatmapSetUpdates = queuedBeatmapSetUpdates.filter(b => b !== beatmapSetId)
            debug(`Updated beatmapset ${beatmapSetId}`)
        })
    },
}
