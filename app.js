require('dotenv-safe').config()
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const sql = require('./src/sql')
const serverTiming = require('server-timing')
const config = require('./src/config')
const debugEnabled = process.env.APP_ENV === 'development'
const { validateAndGetSession, getUser, getIPAddress } = require("./src/util")
const debug = require('debug')('mod.acrylicstyle.xyz:app')
require('simple-git')().fetch()

sql.query('SELECT 1').then(async () => {
  debug('Confirmed MySQL connection')
  await sql.findOne('SHOW TABLES LIKE "config"').then(res => {
    if (!res) {
      debug('Creating config table')
      sql.execute(`CREATE TABLE config (
  \`key\` varchar(255) NOT NULL,
  \`value\` text NOT NULL
)`)
      config.requests.setRules([
          'No tech maps',
          'Set your map\'s language/genre before submitting (if possible)',
          'Do not hit submit button than once. Excessive requests may leads to a ban on your account.',
          'Mod request from restricted/banned/silenced user will be rejected.',
      ])
      debug('Created config table')
    }
  })
  await sql.findOne('SHOW TABLES LIKE "users"').then(res => {
    if (!res) {
      debug('Creating users table')
      sql.execute(`CREATE TABLE users (
  \`id\` int unsigned NOT NULL,
  \`username\` varchar(255) NOT NULL,
  \`group\` varchar(255) NOT NULL DEFAULT "user",
  \`country_code\` varchar(255) NOT NULL DEFAULT "XX",
  \`country_name\` varchar(255) NOT NULL DEFAULT "XX",
  \`avatar_url\` varchar(255) DEFAULT NULL,
  \`title\` varchar(255) DEFAULT NULL,
  \`profile_colour\` varchar(255) DEFAULT NULL,
  \`last_update\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`last_submit\` DATETIME DEFAULT NULL,
  \`mod_queue_banned\` tinyint(1) NOT NULL DEFAULT 0,
  \`mod_queue_banned_reason\` varchar(255) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
)`)
      // if mod_queue_banned is 1, user will be unable to do following action(s):
      // - submit mod request
      debug('Created users table')
    }
  })
  await sql.findOne('SHOW TABLES LIKE "requests"').then(res => {
    if (!res) {
      debug('Creating requests table')
      sql.execute(`CREATE TABLE requests (
  \`id\` int unsigned NOT NULL AUTO_INCREMENT,
  \`beatmapset_id\` int unsigned NOT NULL,
  \`user_id\` int unsigned DEFAULT NULL,
  \`date\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`status\` varchar(255) NOT NULL DEFAULT "submitted",
  \`comment_by_mapper\` varchar(255) DEFAULT NULL,
  \`comment_by_modder\` varchar(255) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
)`)
      // all possible values of status: submitted/pending/rejected/done
      // submitted: a user has submitted a map and pending for approval, and may be rejected.
      // pending: a modder has approved the request and will (should) be modded later
      // rejected: a modder has rejected the request and will not be modded
      // done: a modder has completed the modding of the beatmap
      debug('Created requests table')
    }
  })
  await sql.findOne('SHOW TABLES LIKE "request_events"').then(res => {
    if (!res) {
      debug('Creating request_events table')
      sql.execute(`CREATE TABLE request_events (
  \`id\` int unsigned NOT NULL AUTO_INCREMENT,
  \`request_id\` int unsigned NOT NULL,
  \`type\` varchar(255) NOT NULL,
  \`user_id\` int unsigned NOT NULL,
  \`description\` varchar(2000) NOT NULL,
  \`date\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
)`)
      // current valid types (-> request.status):
      //              submitted - mapper has submitted mod request (-> submitted)
      //      comment-by-mapper - a comment was posted by mapper
      //      comment-by-modder - a comment was posted by modder
      //               approved - the request was approved and is now pending for mods (-> pending)
      //               rejected - the request was rejected (-> rejected)
      //             unapproved - the request was approved before but has been unapproved (-> submitted)
      //               finished - modder has finished modding the map (-> done)
      debug('Created request_events table')
    }
  })
  await sql.findOne('SHOW TABLES LIKE "beatmaps"').then(res => {
    if (!res) {
      debug('Creating beatmaps table')
      sql.execute(`CREATE TABLE beatmaps (
  \`beatmapset_id\` int unsigned NOT NULL,
  \`user_id\` int unsigned NOT NULL,
  \`status\` varchar(255) NOT NULL DEFAULT "unknown",
  \`date\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`lowest_sr\` float NOT NULL DEFAULT 0,
  \`highest_sr\` float NOT NULL DEFAULT 0,
  \`artist\` varchar(512) NOT NULL,
  \`title\` varchar(512) NOT NULL,
  \`fullname\` varchar(512) NOT NULL,
  PRIMARY KEY (\`beatmapset_id\`)
)`)
      // all possible status values:
      // unknown, graveyard, wip, pending, approved, ranked, qualified, loved
      debug('Created beatmaps table')
    }
  })
  process.emit('ready')
}).catch(e => {
  console.error('Your mysql configuration is foobar, pls fix')
  console.error(e.stack || e)
  process.kill(process.pid, 'SIGINT')
})

const indexRouter = require('./routes/index')
const loginRouter = require('./routes/login')
const apiRouter = require('./routes/api')
const adminRouter = require('./routes/admin')

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs')

// noinspection JSUnusedGlobalSymbols,JSCheckFunctionSignatures
app.use(logger('dev', {
  stream: {
    write: s => {
      debug(s.substring(0, s.length - 1))
    }
  }
}))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))
app.use(serverTiming({
  enabled: debugEnabled,
}))

app.use((req, res, next) => {
  res.send401 = () => {
    if (req.headers['accept'] === 'application/json') {
      res.status(401).send({ error: 'unauthorized' })
    } else {
      res.sendFile(path.resolve('static/401.html'))
    }
  }
  res.send403 = () => {
    if (req.headers['accept'] === 'application/json') {
      res.status(403).send({ error: 'forbidden' })
    } else {
      res.sendFile(path.resolve('static/403.html'))
    }
  }
  res.send404 = () => {
    if (req.headers['accept'] === 'application/json') {
      res.status(404).send({ error: 'not_found' })
    } else {
      res.sendFile(path.resolve('static/404.html'))
    }
  }
  res.send500 = async (err) => {
    if (debugEnabled) {
      debug('an error occurred:', err.stack || err)
    }
    // render the error page
    if (req.headers['accept'] === 'application/json') {
      res.status(err.status || 500).send({ error: 'unknown' })
    } else {
      const session = validateAndGetSession(req)
      let stack = null
      if (session) {
        const user = await getUser(session.access_token, session.user_id)
        if (user.group === 'admin') stack = err.stack
      }
      res.status(err.status || 500).render('500', { extraDataAvailable: !!stack, extraData: stack })
    }
  }
  next()
})

// restrict access for /admin routes
app.use('/admin', async (req, res, next) => {
  const session = req.session = validateAndGetSession(req)
  if (!session) return res.send401()
  const user = req.user = await getUser(session.access_token, session.user_id)
  if (!user || user.group !== 'admin') {
    return res.send403()
  }
  next()
})

let apiRequests = {}

// more lenient request limit
const tooManyRequests = [
    '/config',
    '/me',
]

app.use('/api', (req, res, next) => {
  let limit = 60
  if (tooManyRequests.includes(req.url)) {
    limit = 240
  }
  const ip = getIPAddress(req)
  if (apiRequests[ip] >= limit) return res.status(429).send({ error: 'too_many_requests' })
  apiRequests[ip] = (apiRequests[ip] || 0) + 1
  next()
})

// reset rate limit every 1m
setInterval(() => apiRequests = {}, 1000 * 60)

app.use('/', indexRouter)
app.use('/', loginRouter)
app.use('/api', apiRouter)
app.use('/admin', adminRouter)

app.get('/500', (req, res) => {
  throw new Error('something broke')
})

app.use((req, res, next) => {
  if (req.headers['accept'] === 'application/json') return res.status(404).send({ error: 'route_not_found' })
  res.status(404).sendFile(path.resolve('static/404.html'))
})

app.use(async (err, req, res, next) => {
  res.send500(err)
});

module.exports = app
