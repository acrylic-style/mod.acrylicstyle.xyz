const express = require('express')
const router = express.Router()
const path = require('path')

router.get('/', (req, res) => {
    res.sendFile(path.resolve('static/index.html'))
})

router.get('/requests', (req, res) => {
    res.sendFile(path.resolve('static/requests.html'))
})

router.get('/queue', (req, res) => {
    res.sendFile(path.resolve('static/queue.html'))
})

module.exports = router;
