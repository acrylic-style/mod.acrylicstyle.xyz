const mapsElement = document.getElementById('maps')
const labelElement = document.getElementById('label')

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
    const hasMorePages = data.max_entries / 50 > page + 1
    labelElement.textContent = labelElement.textContent.replace('? / ?', `${Math.min(data.max_entries, (page + 1) * 50)} / ${data.max_entries}`)
    const me = await whoAmI();
    for (const e of data.entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())) {
        const el = document.createElement('div')
        el.classList.add('col-l', 'col-m', 'map-entry')
        const cardDetails = document.createElement('div')
        cardDetails.classList.add('card', 'card-individual', 'z-depth-3')
        const cover = document.createElement('img')
        cover.src = coverURL(e.beatmapset_id)
        const cardRankedStatus = document.createElement('div')
        cardRankedStatus.classList.add('card-ranked-status')
        const rankedStatusIcon = document.createElement('i')
        rankedStatusIcon.classList.add('tooltipped', 'material-icons', `status-${e.beatmapset.status}`)
        rankedStatusIcon.setAttribute('data-position', 'top')
        let status = `${e.beatmapset.status.substring(0, 1).toUpperCase() + e.beatmapset.status.substring(1)}`
        if (status.toLowerCase() === 'wip') status = 'WIP'
        rankedStatusIcon.setAttribute('data-tooltip', status)
        rankedStatusIcon.textContent = 'help'
        if (e.beatmapset.status === 'ranked') {
            rankedStatusIcon.textContent = 'keyboard_capslock'
        } else if (e.beatmapset.status === 'approved') {
            rankedStatusIcon.textContent = 'check'
        } else if (e.beatmapset.status === 'loved') {
            rankedStatusIcon.textContent = 'favorite'
        } else if (e.beatmapset.status === 'qualified') {
            rankedStatusIcon.textContent = 'thumb_up'
        } else if (e.beatmapset.status === 'wip') {
            rankedStatusIcon.textContent = 'build'
        } else if (e.beatmapset.status === 'pending') {
            rankedStatusIcon.textContent = 'pending'
        } else if (e.beatmapset.status === 'graveyard') {
            rankedStatusIcon.textContent = 'remove_circle'
        }
        cardDetails.addEventListener('click', ev => {
            setTimeout(() => { // wrap in setTimeout so it will be called at last
                if (ev.shouldFire || typeof ev.shouldFire === 'undefined') {
                    // open request events
                    const elem = document.getElementById('request-details')
                    const events = document.getElementById('req-events')
                    events.innerHTML = ''
                    e.events.sort((a, b) => b.id - a.id).forEach(event => {
                        const elem = document.createElement('div')
                        elem.classList.add('request-event-entries-item')
                        const detailContainer = document.createElement('div')
                        detailContainer.classList.add('request-event-entries-details')
                        const iconContainer = document.createElement('div')
                        iconContainer.classList.add('request-event-entries-icon')
                        const icon = document.createElement('i')
                        icon.classList.add('material-icons', `request-event-type-${event.type}`)
                        icon.textContent = 'info'
                        if (event.type === 'submitted') {
                            icon.textContent = 'add_circle'
                        } else if (event.type === 'comment-by-mapper' || event.type === 'comment-by-modder') {
                            icon.textContent = 'edit'
                        } else if (event.type === 'approved') {
                            icon.textContent = 'task_alt'
                        } else if (event.type === 'rejected') {
                            icon.textContent = 'highlight_off'
                        } else if (event.type === 'finished') {
                            icon.textContent = 'done_all'
                        } else if (event.type === 'unapproved') {
                            icon.textContent = 'remove'
                        }
                        const textContainer = document.createElement('div')
                        textContainer.classList.add('request-event-entries-text')
                        textContainer.innerHTML = event.description
                        const timeContainer = document.createElement('div')
                        const time = document.createElement('span')
                        time.title = event.date
                        time.textContent = readableTime(new Date(event.date) - Date.now())

                        iconContainer.appendChild(icon)
                        detailContainer.appendChild(iconContainer)
                        detailContainer.appendChild(textContainer)
                        timeContainer.appendChild(time)
                        elem.appendChild(detailContainer)
                        elem.appendChild(timeContainer)
                        events.appendChild(elem)
                    })
                    fadeIn(elem)
                    setTimeout(() => hideOnClickOutside(elem), 10)
                }
            }, 1)
        })
        addTooltipOrToast(rankedStatusIcon, status)
        const cardBody = document.createElement('div')
        cardBody.classList.add('card-body')

        const truncate = document.createElement('div')
        truncate.classList.add('text-truncate')

        // song title
        const titleContainer = truncate.cloneNode(true)
        const title = document.createElement('a')
        title.href = `https://osu.ppy.sh/beatmapsets/${e.beatmapset_id}`
        title.rel = 'noopener'
        title.textContent = `${e.beatmapset.artist} - ${e.beatmapset.title}`
        title.target = '_blank'
        title.classList.add('tooltipped')
        title.setAttribute('data-position', 'top')
        title.setAttribute('data-tooltip', `${e.beatmapset.artist} - ${e.beatmapset.title}`)
        M.Tooltip.init(title)

        // mapper link
        const mapperContainer = document.createElement('div')
        mapperContainer.classList.add('mapper')
        const mapperText = document.createElement('span')
        mapperText.textContent = 'mapped by '
        const mapperBold = document.createElement('b')
        const mapperLink = document.createElement('a')
        mapperLink.href = `https://osu.ppy.sh/users/${e.beatmapset.user.id}`
        mapperLink.rel = 'noopener'
        mapperLink.textContent = e.beatmapset.user.username
        mapperLink.target = '_blank'
        if (e.beatmapset.user.id === e.user.id && e.user['mod_queue_banned']) {
            mapperLink.classList.add('mapper-banned', 'tooltipped')
            mapperLink.setAttribute('data-position', 'top')
            mapperLink.setAttribute('data-tooltip', `This mapper is banned from this site for: ${e.user['mod_queue_banned_reason'] || '(No reason provided)'}`)
            M.Tooltip.init(mapperLink)
        }
        if (e.beatmapset.user.profile_colour) {
            mapperLink.style.color = e.beatmapset.user.profile_colour // custom color for player who has custom color (eg. NAT, BN, GMT)
        }

        // star rating
        const srSpread = document.createElement('span')
        srSpread.classList.add('sr-spread')
        srSpread.innerHTML = `<span style="color: ${getColorForDifficulty(e.beatmapset.highest_sr)}">★</span><span style="color: ${getColorForDifficulty(e.beatmapset.lowest_sr)}">${e.beatmapset.lowest_sr}</span>-<span style="color: ${getColorForDifficulty(e.beatmapset.highest_sr)}">${e.beatmapset.highest_sr}</span>`
        const notesIcon = document.createElement('i')
        notesIcon.classList.add('material-icons')
        notesIcon.textContent = 'notes'

        // comment from mapper
        const notesFromMapper = document.createElement('div')
        notesFromMapper.classList.add('card-comment', 'hidden')
        const notesFromMapperTextContainer = truncate.cloneNode(true)
        const notesFromMapperText = document.createElement('span')
        const updateMapperComment = () => {
            notesFromMapper.classList.toggle('hidden', !e['comment_by_mapper'])
            notesFromMapperText.textContent = e['comment_by_mapper'] ? 'Mapper: ' + e['comment_by_mapper'] : ''
        }
        updateMapperComment()

        // comment from modder
        const notesFromModder = document.createElement('div')
        notesFromModder.classList.add('card-comment', 'hidden')
        const notesFromModderTextContainer = truncate.cloneNode(true)
        const notesFromModderText = document.createElement('span')
        const updateModderComment = () => {
            notesFromModder.classList.toggle('hidden', !e['comment_by_modder'])
            notesFromModderText.textContent = e['comment_by_modder'] ? 'Modder: ' + e['comment_by_modder'] : ''
        }
        updateModderComment()

        // submitted date
        const submittedAt = new Date(e.date)
        const datetime = document.createElement('span')
        datetime.textContent = readableTime(submittedAt.getTime() - Date.now())
        datetime.classList.add('tooltipped', 'card-time')
        datetime.setAttribute('data-position', 'top')
        datetime.setAttribute('data-tooltip', submittedAt.toString())
        M.Tooltip.init(datetime)

        // icons
        const iconsContainer = document.createElement('div')
        iconsContainer.classList.add('card-icons')
        const statusIcon = document.createElement('i')
        statusIcon.classList.add('material-icons', 'float-left')
        const updateStatus = () => {
            statusIcon.classList.forEach(c => !c.startsWith('approval-status-') || statusIcon.classList.remove(c))
            statusIcon.classList.add(`approval-status-${e.status}`)
            statusIcon.textContent = 'help'
            let statusText = 'Unknown'
            if (e.status === 'submitted') {
                statusIcon.textContent = 'history_toggle_off'
                statusText = 'Pending approval'
            } else if (e.status === 'pending') {
                statusIcon.textContent = 'watch_later'
                statusText = 'Pending'
            } else if (e.status === 'rejected') {
                statusIcon.textContent = 'close'
                statusText = 'Rejected'
            } else if (e.status === 'done') {
                statusIcon.textContent = 'done'
                statusText = 'Finished'
            }
            addTooltipOrToast(statusIcon, statusText, 'bottom')
        }
        updateStatus()
        // function that returns function
        const editCommentButtonListener = type => ev => {
            ev.shouldFire = false
            const comment = prompt(`New ${type}'s comment:`, e[`comment_by_${type}`] || '')
            if (comment !== null && comment !== e[`comment_by_${type}`]) {
                toast('Updating comment...')
                fetch('/api/queue/edit_comment', {
                    method: 'post',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        request_id: e.id,
                        type: `edit_${type}`,
                        comment,
                    }),
                }).then(res => res.json()).then(data => {
                    // handle errors
                    const err = data.error
                    if (err) {
                        if (err === 'login_required') {
                            toast('Error: Session expired or not logged in.\nPlease login again (reload the page).')
                        } else if (err === 'insufficient_permission') {
                            toast('Error: Insufficient permission to update comment.')
                        } else {
                            toast(`Error: Unknown error during updating comment: ${err}`)
                        }
                        return
                    }

                    // update events
                    fetch(`/api/queue/request_events/${e.id}`).then(res => res.json()).then(res => e.events = res)

                    // update comment
                    e[`comment_by_${type}`] = comment
                    updateMapperComment()
                    updateModderComment()

                    toast('Updated comment successfully!')
                })
            }
        }
        const editCommentMapperButton = document.createElement('i')
        if (me && me.id === e.beatmapset.user_id) {
            editCommentMapperButton.classList.add('material-icons', 'float-left', 'clickable-icon')
            editCommentMapperButton.textContent = 'edit'
            editCommentMapperButton.setAttribute('data-position', 'bottom')
            editCommentMapperButton.setAttribute('data-tooltip', 'Edit (mapper) comment')
            editCommentMapperButton.addEventListener('click', editCommentButtonListener('mapper'))
            M.Tooltip.init(editCommentMapperButton)
        }
        const flexingDiv = document.createElement('div')
        flexingDiv.style.flex = '1';
        const editCommentModderButton = document.createElement('i')
        const doneButton = document.createElement('i')
        const approveButton = document.createElement('i')
        const unapproveButton = document.createElement('i')
        const rejectButton = document.createElement('i')
        const manageButtonLink = document.createElement('a')
        if (me && (me.group === 'modder' || me.group === 'admin')) {
            const updateButtons = () => {
                editCommentModderButton.classList.remove('hidden')
                doneButton.classList.toggle('hidden', e.status !== 'pending') // shown on pending, hidden on submitted/rejected/done
                approveButton.classList.toggle('hidden', e.status === 'pending' || e.status === 'done') // shown on submitted/rejected, hidden on pending/done
                unapproveButton.classList.toggle('hidden', e.status === 'submitted') // shown on pending/rejected/done (because someone might done'd the request accidentally), hidden on submitted
                rejectButton.classList.toggle('hidden', e.status === 'done' || e.status === 'rejected') // shown on submitted/pending hidden on done/rejected
            }
            const toastError = err => {
                if (err === 'login_required') {
                    toast('Error: Session expired or not logged in.\nPlease login again (reload the page).')
                } else if (err === 'insufficient_permission') {
                    toast('Error: Insufficient permission to update mod request.')
                } else {
                    toast(`Error: Unknown error during updating comment: ${err}`)
                }
            }
            editCommentModderButton.classList.add('material-icons', 'float-left', 'clickable-icon', 'hidden')
            editCommentModderButton.textContent = 'edit'
            editCommentModderButton.setAttribute('data-position', 'bottom')
            editCommentModderButton.setAttribute('data-tooltip', 'Edit (modder) comment')
            editCommentModderButton.addEventListener('click', editCommentButtonListener('modder'))
            M.Tooltip.init(editCommentModderButton)
            doneButton.classList.add('material-icons', 'float-right', 'clickable-icon', 'hidden')
            doneButton.textContent = 'done'
            doneButton.setAttribute('data-position', 'bottom')
            doneButton.setAttribute('data-tooltip', 'Done')
            doneButton.addEventListener('click', ev => {
                ev.shouldFire = false
                const comment = prompt('Comment for marking as finished (optional):')
                if (comment === null) return
                fetch('/api/queue/update_status', {
                    method: 'post',
                    headers: apiHeaders,
                    body: JSON.stringify({
                        request_id: e.id,
                        type: 'done',
                        comment,
                    }),
                }).then(res => res.json()).then(data => {
                    if (data.error) return toastError(data.error)
                    fetch(`/api/queue/request_events/${e.id}`).then(res => res.json()).then(res => e.events = res)
                    e.status = 'done'
                    updateStatus()
                    updateButtons()
                    toast('Mod request has been marked as finished!')
                })
            })
            M.Tooltip.init(doneButton)
            approveButton.classList.add('material-icons', 'float-right', 'clickable-icon', 'hidden')
            approveButton.textContent = 'thumb_up_alt' // non-alt icon seemed big for me
            approveButton.setAttribute('data-position', 'bottom')
            approveButton.setAttribute('data-tooltip', 'Approve')
            approveButton.addEventListener('click', ev => {
                ev.shouldFire = false
                const comment = prompt('Comment for approving the request (optional):')
                if (comment === null) return
                fetch('/api/queue/update_status', {
                    method: 'post',
                    headers: apiHeaders,
                    body: JSON.stringify({
                        request_id: e.id,
                        type: 'approve',
                        comment,
                    }),
                }).then(res => res.json()).then(data => {
                    if (data.error) return toastError(data.error)
                    fetch(`/api/queue/request_events/${e.id}`).then(res => res.json()).then(res => e.events = res)
                    e.status = 'pending'
                    updateStatus()
                    updateButtons()
                    toast('You\'ve approved the mod request!')
                })
            })
            M.Tooltip.init(approveButton)
            unapproveButton.classList.add('material-icons', 'float-right', 'clickable-icon', 'hidden')
            unapproveButton.textContent = 'remove'
            unapproveButton.setAttribute('data-position', 'bottom')
            unapproveButton.setAttribute('data-tooltip', 'Unapprove')
            unapproveButton.addEventListener('click', ev => {
                ev.shouldFire = false
                const comment = prompt('Comment for unapproving the request:')
                if (comment === null) return
                if (comment.length === 0) return toast('Error: Comment is empty.')
                fetch('/api/queue/update_status', {
                    method: 'post',
                    headers: apiHeaders,
                    body: JSON.stringify({
                        request_id: e.id,
                        type: 'unapprove',
                        comment,
                    }),
                }).then(res => res.json()).then(data => {
                    if (data.error) return toastError(data.error)
                    fetch(`/api/queue/request_events/${e.id}`).then(res => res.json()).then(res => e.events = res)
                    e.status = 'submitted'
                    updateStatus()
                    updateButtons()
                    toast('You\'ve unapproved the mod request!')
                })
            })
            M.Tooltip.init(unapproveButton)
            rejectButton.classList.add('material-icons', 'float-right', 'clickable-icon', 'hidden')
            rejectButton.textContent = 'thumb_down_alt'
            rejectButton.setAttribute('data-position', 'bottom')
            rejectButton.setAttribute('data-tooltip', 'Reject')
            rejectButton.addEventListener('click', ev => {
                ev.shouldFire = false
                const comment = prompt('Reason for rejecting the request:')
                if (comment === null) return
                if (comment.length === 0) return toast('Error: Comment is empty.')
                fetch('/api/queue/update_status', {
                    method: 'post',
                    headers: apiHeaders,
                    body: JSON.stringify({
                        request_id: e.id,
                        type: 'reject',
                        comment,
                    }),
                }).then(res => res.json()).then(data => {
                    if (data.error) return toastError(data.error)
                    fetch(`/api/queue/request_events/${e.id}`).then(res => res.json()).then(res => e.events = res)
                    e.status = 'rejected'
                    updateStatus()
                    updateButtons()
                    toast('You\'ve rejected the mod request!')
                })
            })
            M.Tooltip.init(rejectButton)
            if (me.group === 'admin') {
                const manageButton = document.createElement('i')
                manageButton.classList.add('material-icons', 'float-right')
                manageButton.textContent = 'build'
                manageButtonLink.href = `/admin/requests/${e.id}`
                manageButtonLink.rel = 'noopener'
                manageButtonLink.target = '_blank'
                manageButtonLink.classList.add('card-manage-button', 'clickable-icon')
                manageButtonLink.setAttribute('data-position', 'bottom')
                manageButtonLink.setAttribute('data-tooltip', 'Manage')
                manageButtonLink.appendChild(manageButton)
                manageButtonLink.addEventListener('click', ev => ev.shouldFire = false)
                M.Tooltip.init(manageButtonLink)
            }
            updateButtons()
        }

        iconsContainer.appendChild(statusIcon)
        if (me && me.id === e.beatmapset.user_id) iconsContainer.appendChild(editCommentMapperButton)
        iconsContainer.appendChild(flexingDiv)
        if (me && (me.group === 'modder' || me.group === 'admin')) {
            iconsContainer.appendChild(editCommentModderButton)
            iconsContainer.appendChild(doneButton)
            iconsContainer.appendChild(approveButton)
            iconsContainer.appendChild(unapproveButton)
            iconsContainer.appendChild(rejectButton)
            if (me.group === 'admin') {
                iconsContainer.appendChild(manageButtonLink)
            }
        }
        notesFromMapperTextContainer.appendChild(notesFromMapperText)
        notesFromModderTextContainer.appendChild(notesFromModderText)
        notesFromMapper.appendChild(notesIcon.cloneNode(true))
        notesFromMapper.appendChild(notesFromMapperTextContainer)
        notesFromModder.appendChild(notesIcon.cloneNode(true))
        notesFromModder.appendChild(notesFromModderTextContainer)
        mapperBold.appendChild(mapperLink)
        mapperContainer.appendChild(mapperText)
        mapperContainer.appendChild(mapperBold)
        titleContainer.appendChild(title)
        cardBody.appendChild(titleContainer)
        cardBody.appendChild(mapperContainer)
        cardBody.appendChild(srSpread)
        cardBody.appendChild(notesFromMapper)
        cardBody.appendChild(notesFromModder)
        cardBody.appendChild(datetime)
        cardBody.appendChild(iconsContainer)
        cardRankedStatus.appendChild(rankedStatusIcon)
        cardDetails.appendChild(cover)
        cardDetails.appendChild(cardRankedStatus)
        cardDetails.appendChild(cardBody)
        el.appendChild(cardDetails)
        mapsElement.appendChild(el)
    }
})
