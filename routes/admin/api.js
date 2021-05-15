const express = require('express')
const router = express.Router()
const config = require('../../src/config')
const sql = require('../../src/sql')

router.get('/status', async (req, res) => {
    const action = String(req.query['action'])
    if (action !== 'open' && action !== 'close') return res.status(400).send({ error: 'invalid_params' })
    await config.requests.setStatus(action === 'close' ? 'closed' : action)
    res.send({ message: 'ok' })
})

router.post('/rules_all', async (req, res) => {
    if (!req.body) return res.status(400).send({ error: 'invalid_params' })
    const maxDiff = Math.round(parseFloat(req.body['max_diff']) * 100) / 100
    const rules = req.body.rules
    if (!Array.isArray(rules) || rules.length <= 0) return res.status(400).send({ error: 'invalid_params' })
    if (req.body['max_diff'] !== null && (maxDiff !== maxDiff || maxDiff < 0 || maxDiff > 50))
        return res.status(400).send({ error: 'invalid_params' })
    await config.requests.setRules(rules)
    if (req.body['max_diff'] !== null) {
        await config.requests.setMaxDifficulty(maxDiff)
    }
    res.send({ message: 'ok' })
})

router.post('/rules', async (req, res) => {
    if (!req.body) return res.status(400).send({ error: 'invalid_params' })
    const rules = req.body.rules
    if (!Array.isArray(rules) || rules.length < 0) return res.status(400).send({ error: 'invalid_params' })
    await config.requests.setRules(rules)
    res.send({ message: 'ok' })
})

router.get('/max_difficulty', async (req, res) => {
    const maxDiff = Math.round(parseFloat(req.query['max_diff']) * 100) / 100
    if (maxDiff < 0 && maxDiff > 50) return res.status(400).send({ error: 'invalid_params' })
    await config.requests.setMaxDifficulty(maxDiff)
    res.send({ message: 'ok' })
})

router.post('/update_discord_webhooks', async (req, res) => {
    if (!req.body) return res.status(400).send({ error: 'invalid_params' })
    const urls = req.body.urls
    if (!Array.isArray(urls) || urls.length < 0) return res.status(400).send({ error: 'invalid_params' })
    await config.webhook.setDiscordWebhookURLs(urls)
    res.send({ message: 'ok' })
})

router.post('/save_user', async (req, res) => {
    if (!req.body) return res.status(400).send({ error: 'invalid_params' })
    const id = parseInt(req.body.id)
    if (id !== id || id < 0) return res.status(400).send({ error: 'invalid_params' })
    const group = String(req.body.group)
    if (group !== 'user' && group !== 'modder' && group !== 'admin') return res.status(400).send({ error: 'invalid_params' })
    const banned = Boolean(req.body.banned)
    const bannedReason = String(req.body.banned_reason)
    if (bannedReason.length > 255 || (!banned && bannedReason.length > 0)) return res.status(400).send({ error: 'invalid_params' })
    const e = await sql.execute(
        'UPDATE users SET `group` = ?, `mod_queue_banned` = ?, `mod_queue_banned_reason` = ? WHERE `id` = ?',
        group,
        banned ? 1 : 0,
        bannedReason,
        id,
    ).catch(err => {
        res.send500(err)
        return 'e'
    })
    if (e !== 'e') res.send({ message: 'ok' })
})

module.exports = router
