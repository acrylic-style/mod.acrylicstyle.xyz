const express = require('express')
const router = express.Router()
const sql = require('../src/sql')
const { getBeatmapSet, getUser } = require('../src/util')

router.get('/requests/:id', async (req, res) => {
    const id = parseInt(req.params.id)
    if (id < 0 || id !== id) return res.send404()
    const request = await sql.findOne('SELECT * FROM requests WHERE id = ?', id)
    if (!request) return res.send404()
    const beatmapset = await getBeatmapSet(req.session.access_token, request.beatmapset_id)
    const users = await sql.findAll('SELECT * FROM users WHERE id = ? OR id = ?', request.user_id, (beatmapset?.user_id || 0))
    if (beatmapset) beatmapset.user = users.find(u => u.id === beatmapset.user_id)
    request.beatmapset = beatmapset
    request.user = users.find(u => u.id === request.user_id)
    res.render('request/details', {
        fullname: request.beatmapset.fullname,
        submitter_id: request.user_id,
        mapper_id: request.beatmapset.user_id,
        request: JSON.stringify(request),
    })
})

module.exports = router;
