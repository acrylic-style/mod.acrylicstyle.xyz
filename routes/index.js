const express = require('express');
const router = express.Router();
const path = require('path')
const { generateSecureRandomString, sleep, sessions } = require('../src/util')
const osu = require('../src/osu')

router.get('/', (req, res, next) => {
    res.sendFile(path.resolve("static/index.html"))
})

router.get('/requests', (req, res, next) => {
    res.sendFile(path.resolve("static/requests.html"))
})

router.get('/modded', (req, res, next) => {
    res.sendFile(path.resolve("static/modded.html"))
})

router.get('/me', (req, res, next) => {
    if (!req.cookies) {
        res.status(403).send({ error: 'login_required', reason: 'no_cookie' })
        return
    }
    const session = req.cookies['mod_session']
    const token = sessions[session]
    if (!session || !token) {
        res.status(403).send({ error: 'login_required', reason: 'missing_session_or_token' })
        return
    }
    osu(token['access_token']).me().then(data => {
        if (data['status_code'] !== 200) {
            res.status(403).send({ error: 'login_required', reason: 'expired_session' })
            return
        }
        res.send(data)
    }).catch(e => {
        console.error(e)
        res.status(500).send({ something_broke: 'something went wrong' })
    })
})

module.exports = router;
