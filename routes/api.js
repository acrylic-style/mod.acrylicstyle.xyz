const express = require('express')
const router = express.Router()
const fetch = require('node-fetch')
const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET
const redirectUri = 'https://mod.acrylicstyle.xyz/login/callback'
const { sessions } = require('../src/util')
const osu = require('../src/osu')

module.exports = router
