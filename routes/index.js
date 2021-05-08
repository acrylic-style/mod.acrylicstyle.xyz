const express = require('express');
const router = express.Router();
const path = require('path')
const { getAccessToken } = require('../src/util')
const osu = require('../src/osu')

router.get('/', (req, res, next) => {
    res.sendFile(path.resolve('static/index.html'))
})

router.get('/requests', (req, res, next) => {
    const token = getAccessToken(req.cookies)
    if (!token) return res.redirect('/login?redirect_to=requests')
    res.sendFile(path.resolve('static/requests.html'))
})

router.get('/modded', (req, res, next) => {
    res.sendFile(path.resolve('static/modded.html'))
})

router.get('/me', (req, res, next) => {
    const token = getAccessToken(req.cookies)
    if (!token) return res.status(403).send({ error: 'login_required' })
    osu(token).me().then(data => {
        if (data['status_code'] !== 200) {
            res.status(403).send({ error: 'login_required' })
            return
        }
        res.send(data)
    }).catch(e => {
        console.error(e)
        res.status(500).send({ something_broke: 'something went wrong' })
    })
})

module.exports = router;
