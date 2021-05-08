const express = require('express')
const router = express.Router()
const fetch = require('node-fetch')
const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET
const redirectUri = 'https://mod.acrylicstyle.xyz/login/callback'
const { generateSecureRandomString, sleep, sessions } = require('../src/util')
const osu = require('../src/osu')
const knownTokens = []

router.get('/login', (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  Promise.race([sleep(3000), generateSecureRandomString(50)]).then(r => {
    if (!r) {
      res.status(500).send({ error: 'could not generate random string within specified timeout' })
      return
    }
    knownTokens.push(r)
    res.redirect(`https://osu.ppy.sh/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURI(redirectUri)}&response_type=code&scope=identify%20public&state=${r}`)
  })
});

router.get('/login/callback', (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  const err = req.query['error']
  if (err) {
    res.status(401).send({ error: err })
    return
  }
  const state = req.query['state']
  if (!knownTokens.includes(state)) {
    res.status(400).send({ error: 'invalid token' })
    return
  }
  const code = req.query['code']
  if (!code) {
    res.status(400).send({ error: 'missing code' })
    return
  }
  fetch('https://osu.ppy.sh/oauth/token', {
    method: 'post',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  }).then(async response => {
    const r = await response.json()
    if (response.status !== 200) {
      console.warn(`received an error during exchanging code to access token: ${r}`)
      res.status(400).send({ error: 'received an error during requesting access token' })
      return
    }
    sessions[state] = {
      token_type: r['token_type'],
      expires_at: Date.now() + (r['expires_in'] * 1000 - 10000), // nerf a bit
      access_token: r['access_token'],
      refresh_token: r['refresh_token'],
    }
    const me = await osu(r['access_token']).me()
    if (!me['username']) {
      res.status(400).send({ error: 'failed to invoke api' })
      return
    }
    res.cookie('mod_session', state)
    res.redirect(`https://mod.acrylicstyle.xyz/?authstate=logged_in&username=${me['username']}`)
  })
})

router.get('/logout', (req, res, next) => {
  if (req.cookies) {
    const session = req.cookies['mod_session']
    if (session) delete sessions[session]
  }
  res.redirect('/?authstate=logged_out')
})

module.exports = router
