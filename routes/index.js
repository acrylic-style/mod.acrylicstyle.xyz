const express = require('express')
const router = express.Router()
const path = require('path')
const config = require('../src/config')

router.get('/', (req, res) => {
    res.sendFile(path.resolve('static/index.html'))
})

router.get('/requests', async (req, res) => {
    res.render('requests', { config: await config.getConfig() })
})

router.get('/queue', (req, res) => {
    res.sendFile(path.resolve('static/queue.html'))
})

module.exports = router;
