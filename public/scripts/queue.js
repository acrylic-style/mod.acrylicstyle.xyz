const submittedMapsElement = document.getElementById('submitted-maps')

function coverURL(beatmapSetId) {
    return `https://assets.ppy.sh/beatmaps/${beatmapSetId}/covers/card.jpg`
}

const page = query['page'] || 0
fetch(`/api/queue?page=${page}`).then(async r => {
    if (r.status !== 200) {
        return toast('Failed to fetch modding queue')
    }
    const data = await r.json()
    const hasPreviousPages = page > 0
    const hasMorePages = data['max_entries'] / 50 > page + 1
    data.entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(e => {
        const el = document.createElement('div')
        el.classList.add('col-l', 'col-m', 'map-entry')
        const cardDetails = document.createElement('div')
        cardDetails.classList.add('card', 'card-individual')
        const cover = document.createElement('img')
        cover.src = coverURL(e.beatmapset_id)
        //cover.classList.add('card-img')
        const cardRankedStatus = document.createElement('div')
        cardRankedStatus.classList.add('card-ranked-status')
        const rankedStatusIcon = document.createElement('i')
        rankedStatusIcon.classList.add('tooltipped', 'material-icons', `status-${e.beatmapset.status}`)
        rankedStatusIcon.setAttribute('data-position', 'top')
        let status = `${e.beatmapset.status.substring(0, 1).toUpperCase() + e.beatmapset.status.substring(1)}`
        if (status.toLowerCase() === 'wip') status = 'WIP'
        rankedStatusIcon.setAttribute('data-tooltip', status)
        let rsIcon = 'edit'
        if (e.beatmapset.status === 'ranked') {
            rsIcon = 'keyboard_capslock'
        } else if (e.beatmapset.status === 'approved') {
            rsIcon = 'check'
        } else if (e.beatmapset.status === 'loved') {
            rsIcon = 'favorite'
        } else if (e.beatmapset.status === 'qualified') {
            rsIcon = 'thumb_up'
        }
        rankedStatusIcon.textContent = rsIcon
        if (window.innerWidth < 768) {
            const isVisible = elem => !!elem && !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length)
            cardDetails.addEventListener('click', ev => {
                if (rankedStatusIcon.contains(ev.target) && isVisible(rankedStatusIcon)) {
                    toast(status)
                } else {
                    openInNewTab(`https://osu.ppy.sh/beatmapsets/${e.beatmapset_id}`)
                }
            })
        } else {
            cardDetails.addEventListener('click', () => openInNewTab(`https://osu.ppy.sh/beatmapsets/${e.beatmapset_id}`))
            M.Tooltip.init(rankedStatusIcon)
        }
        const cardBody = document.createElement('div')
        cardBody.classList.add('card-body')
        const titleContainer = document.createElement('div')
        titleContainer.classList.add('text-truncate')
        const title = document.createElement('a')
        title.href = `https://osu.ppy.sh/beatmapsets/${e.beatmapset_id}`
        title.textContent = `${e.beatmapset.artist} - ${e.beatmapset.title}`
        title.target = '_blank'
        title.classList.add('tooltipped')
        title.setAttribute('data-position', 'top')
        title.setAttribute('data-tooltip', `${e.beatmapset.artist} - ${e.beatmapset.title}`)
        M.Tooltip.init(title)
        const mapperContainer = document.createElement('div')
        mapperContainer.classList.add('mapper')
        const mapperText = document.createElement('span')
        mapperText.textContent = 'mapped by '
        const mapperBold = document.createElement('b')
        const mapperLink = document.createElement('a')
        mapperLink.href = `https://osu.ppy.sh/users/${e.user_id}`
        mapperLink.textContent = e.user.username
        mapperLink.target = '_blank'
        if (e.user['mod_queue_banned']) {
            mapperLink.classList.add('mapper-banned', 'tooltipped')
            mapperLink.setAttribute('data-position', 'top')
            mapperLink.setAttribute('data-tooltip', `This mapper is banned from this site for: ${e.user['mod_queue_banned_reason'] || '(No reason provided)'}`)
            M.Tooltip.init(mapperLink)
        }
        if (e.user['profile_colour']) {
            mapperLink.style.color = e.user['profile_colour'] // custom color for player who has custom color (eg. NAT, BN, GMT)
        }
        const srSpread = document.createElement('span')
        srSpread.classList.add('sr-spread')
        srSpread.innerHTML = `<span style="color: ${getColorForDifficulty(e.beatmapset.highest_sr)}">★</span><span style="color: ${getColorForDifficulty(e.beatmapset.lowest_sr)}">${e.beatmapset.lowest_sr}</span>-<span style="color: ${getColorForDifficulty(e.beatmapset.highest_sr)}">${e.beatmapset.highest_sr}</span>`
        const submittedAt = new Date(e.date)
        const datetime = document.createElement('span')
        datetime.textContent = readableTime(submittedAt.getTime() - Date.now())
        datetime.classList.add('tooltipped')
        datetime.setAttribute('data-position', 'top')
        datetime.setAttribute('data-tooltip', submittedAt.toString())
        M.Tooltip.init(datetime)
        const iconsContainer = document.createElement('div')
        iconsContainer.classList.add('card-icons')

        mapperBold.appendChild(mapperLink)
        titleContainer.appendChild(title)
        mapperContainer.appendChild(mapperText)
        mapperContainer.appendChild(mapperBold)
        cardBody.appendChild(titleContainer)
        cardBody.appendChild(mapperContainer)
        cardBody.appendChild(srSpread)
        cardBody.appendChild(datetime)
        cardBody.appendChild(iconsContainer)
        cardRankedStatus.appendChild(rankedStatusIcon)
        cardDetails.appendChild(cover)
        cardDetails.appendChild(cardRankedStatus)
        cardDetails.appendChild(cardBody)
        el.appendChild(cardDetails)
        if (e.status === 'submitted') {
            submittedMapsElement.appendChild(el)
        }
    })
})
