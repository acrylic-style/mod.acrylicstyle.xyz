const express = require('express')
const router = express.Router()
// const { validateAndGetSession } = require('../src/util')

// all /admin routes are validated

router.get('/requests/:id', async (req, res) => {
    const id = parseInt(req.params.id)
    if (id !== id) return res.status(400).send({ error: 'invalid_params' })

    res.render('request/details')
})

module.exports = router;
