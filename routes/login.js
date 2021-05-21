const express = require('express')
const router = express.Router()
const fetch = require('node-fetch')
const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET
const redirectUri = `${process.env.APP_URL}/login/callback`
const { generateSecureRandomString, sleep, sessions, validateAndGetSession, getIPAddress } = require('../src/util')
const osu = require('../src/osu')
const sql = require('../src/sql')
let knownTokens = []

router.get('/login', (req, res) => {
  res.set('Cache-Control', 'no-store')
  if (req.query['redirect_to']) res.cookie('redirect_to', req.query['redirect_to'])
  Promise.race([sleep(3000), generateSecureRandomString(50)]).then(r => {
    if (!r) {
      res.redirect('/?authstate=timed_out')
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
    res.redirect(`${process.env.APP_URL}/${redirectTo}?authstate=err_${err}`)
    return
  }
  const state = req.query['state']
  if (!knownTokens.includes(state)) {
    res.redirect(`${process.env.APP_URL}/${redirectTo}?authstate=invalid_csrf_token`)
    return
  } else {
    // remove token
    knownTokens = knownTokens.filter(token => token !== state)
  }
  const code = req.query['code']
  if (!code) {
    res.redirect(`${process.env.APP_URL}/${redirectTo}?authstate=invalid_code`)
    return
  }
  res.startTime('exchange_code', 'Exchanging code')
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
    res.endTime('exchange_code')
    if (response.status !== 200) {
      console.warn(`received an error during exchanging code to access token: ${r}`)
      res.redirect(`${process.env.APP_URL}/${redirectTo}?authstate=invalid_code`)
      return
    }
    res.startTime('fetch_user', 'Fetching user data')
    const me = await osu(r['access_token']).me()
    res.endTime('fetch_user')
    if (!me['username']) {
      res.redirect(`${process.env.APP_URL}/${redirectTo}?authstate=error`)
      return
    }
    sessions[state] = {
      // always Bearer
      token_type: r['token_type'],
      expires_at: Date.now() + (r['expires_in'] * 1000 - 10000),
      access_token: r['access_token'],
      refresh_token: r['refresh_token'],
      user_id: me['id'],
      ip: getIPAddress(req),
    }
    res.cookie('mod_session', state)
    res.redirect(`${process.env.APP_URL}/${redirectTo}?authstate=logged_in`)
  })
})

router.get('/logout', (req, res) => {
  if (req.cookies) {
    const session = req.cookies['mod_session']
    if (session) delete sessions[session]
  }
  res.redirect(`/${req.query['redirect_to'] || ''}?authstate=logged_out`)
})

router.get('/me', async (req, res) => {
  const session = validateAndGetSession(req)
  if (!session) return res.status(403).send({ error: 'login_required' })
  res.startTime('prechk', 'Pre-checking')
  const user = await sql.findOne("SELECT * FROM users WHERE `id` = ?", session.user_id)
  res.endTime('prechk')
  // update user every 30 days
  if (user && user['last_update'].getTime() + 1000 * 60 * 60 * 24 * 30 > Date.now()) return res.send(user)
  res.startTime('api', 'API Request')
  osu(session.access_token).me().then(async data => {
    res.endTime('api')
    if (data['status_code'] !== 200) {
      res.status(403).send({ error: 'login_required' })
      return
    }
    if (!data.id || !data.username) {
      res.status(403).send({ error: 'login_required' })
      return
    }
    res.startTime('insert', 'Insert + Query')
    await sql.execute("INSERT IGNORE INTO users (`id`, `username`, `country_code`, `country_name`, `avatar_url`, `title`, `profile_colour`) VALUES (?, ?, ?, ?, ?, ?, ?)", data.id, data.username, data.country.code, data.country.name, data['avatar_url'], data['title'], data['profile_colour'])
    const user = await sql.findOne("SELECT * FROM users WHERE `id` = ?", session.user_id)
    res.endTime('insert')
    res.send(user)
  }).catch(e => {
    console.error(e)
    res.status(500).send({ something_broke: 'something went wrong' })
  })
})

module.exports = router
