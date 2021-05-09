const express = require('express');
const router = express.Router();
const path = require('path')
const { getAccessToken } = require('../src/util')

router.get('/', (req, res) => {
    res.sendFile(path.resolve('static/index.html'))
})

router.get('/requests', (req, res) => {
    const token = getAccessToken(req.cookies)
    if (!token) return res.redirect('/login?redirect_to=requests')
    res.sendFile(path.resolve('static/requests.html'))
})

router.get('/modded', (req, res) => {
    res.sendFile(path.resolve('static/queue.html'))
})

module.exports = router;
