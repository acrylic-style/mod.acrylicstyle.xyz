const express = require('express')
const router = express.Router()
const fetch = require('node-fetch')
const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET
const redirectUri = 'https://mod.acrylicstyle.xyz/login/callback'
const { generateSecureRandomString, sleep, sessions, getAccessToken } = require('../src/util')
const osu = require('../src/osu')
const sql = require('../src/sql')
const knownTokens = []

router.get('/login', (req, res) => {
  res.set('Cache-Control', 'no-store')
  if (req.query['redirect_to']) res.cookie('redirect_to', req.query['redirect_to'])
  Promise.race([sleep(3000), generateSecureRandomString(50)]).then(r => {
    if (!r) {
      res.status(500).send({ error: 'could not generate random string within specified timeout' })
      return
    }
    knownTokens.push(r)
    res.redirect(`https://osu.ppy.sh/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURI(redirectUri)}&response_type=code&scope=identify%20public&state=${r}`)
  })
});

router.get('/login/callback', (req, res) => {
  const redirectTo = req.cookies['redirect_to'] || ''
  res.cookie('redirect_to', '')
  res.set('Cache-Control', 'no-store')
  const err = req.query['error']
  if (err) {
    res.redirect(`https://mod.acrylicstyle.xyz/${redirectTo}?authstate=err_${err}`)
    return
  }
  const state = req.query['state']
  if (!knownTokens.includes(state)) {
    res.redirect(`https://mod.acrylicstyle.xyz/${redirectTo}?authstate=invalid_csrf_token`)
    return
  }
  const code = req.query['code']
  if (!code) {
    res.redirect(`https://mod.acrylicstyle.xyz/${redirectTo}?authstate=invalid_code`)
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
      res.redirect(`https://mod.acrylicstyle.xyz/${redirectTo}?authstate=invalid_code`)
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
      res.redirect(`https://mod.acrylicstyle.xyz/${redirectTo}?authstate=error`)
      return
    }
    res.cookie('mod_session', state)
    res.redirect(`https://mod.acrylicstyle.xyz/${redirectTo}?authstate=logged_in`)
  })
})

router.get('/logout', (req, res) => {
  if (req.cookies) {
    const session = req.cookies['mod_session']
    if (session) delete sessions[session]
  }
  res.redirect('/?authstate=logged_out')
})

router.get('/me', (req, res) => {
  const token = getAccessToken(req.cookies)
  if (!token) return res.status(403).send({ error: 'login_required' })
  osu(token).me().then(async data => {
    if (data['status_code'] !== 200) {
      res.status(403).send({ error: 'login_required' })
      return
    }
    if (!data.id || !data.username) {
      res.status(403).send({ error: 'login_required' })
      return
    }
    await sql.execute("INSERT IGNORE INTO users (`id`, `username`) VALUES (?, ?)", data.id, data.username)
    const user = await sql.findOne("SELECT `site_admin` FROM users WHERE `id` = ?", data.id)
    data['site_admin'] = !!user['site_admin']
    res.send(data)
  }).catch(e => {
    console.error(e)
    res.status(500).send({ something_broke: 'something went wrong' })
  })
})

module.exports = router
