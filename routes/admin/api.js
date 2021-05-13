const express = require('express')
const router = express.Router()
const config = require('../../src/config')

router.get('/status', async (req, res) => {
    const action = String(req.query['action'])
    if (action !== 'open' && action !== 'close') return res.status(400).send({ error: 'invalid_params' })
    await config.requests.setStatus(action === 'close' ? 'closed' : action)
    res.send({ message: 'ok' })
})

module.exports = router
