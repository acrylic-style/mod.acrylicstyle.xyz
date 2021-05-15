const express = require('express')
const router = express.Router()
const sql = require('../../src/sql')
const config = require('../../src/config')
const apiRouter = require('./api')
const api = require('../api')
const { getBeatmapSet } = require('../../src/util')

// add api router
router.use('/api', apiRouter)

router.get('/users/:id', async (req, res) => {
    const id = parseInt(req.params.id)
    if (id < 0 || id !== id) return res.send404()
    const user = await sql.findOne('SELECT * FROM users WHERE id = ?', id)
    if (!user) return res.send404()
    res.render('user/details', { user })
})

router.get('/requests', async (req, res) => {
    res.render('request/index', {
        config: await config.getConfig(true),
        discordWebhookURLs: await config.webhook.getDiscordWebhookURLs(),
    })
})

router.get('/requests/:id', async (req, res) => {
    const id = parseInt(req.params.id)
    if (id < 0 || id !== id) return res.send404()
    const request = await sql.findOne('SELECT * FROM requests WHERE id = ?', id)
    if (!request) return res.send404()
    const beatmapset = await getBeatmapSet(req.session.access_token, request.beatmapset_id)
    const users = await sql.findAll('SELECT * FROM users WHERE id = ? OR id = ?', request.user_id, (beatmapset?.user_id || 0))
    if (beatmapset) beatmapset.user = users.find(u => u.id === beatmapset.user_id)
    request.events = await sql.findAll('SELECT * FROM request_events WHERE request_id = ?', request.id)
    request.beatmapset = beatmapset
    request.user = users.find(u => u.id === request.user_id)
    res.render('request/details', { request })
})

module.exports = router;
