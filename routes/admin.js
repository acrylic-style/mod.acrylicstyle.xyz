const express = require('express')
const router = express.Router()
const sql = require('../src/sql')
const { getBeatmapSet, getUser } = require('../src/util')

router.get('/requests/:id', async (req, res) => {
    const id = parseInt(req.params.id)
    if (id < 0 || id !== id) return res.send404()
    const request = await sql.findOne('SELECT * FROM requests WHERE id = ?', id)
    if (!request) return res.send404()
    request.beatmapset = await getBeatmapSet(req.session.access_token, request.beatmapset_id)
    request.user = await getUser(req.session.access_token, request.user_id)
    res.render('request/details', {
        fullname: request.beatmapset.fullname,
        submitter_id: request.user_id,
        mapper_id: request.beatmapset.user_id,
        request: JSON.stringify(request),
    })
})

module.exports = router;
