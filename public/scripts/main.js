const logInOutElement = document.getElementById('log-in-out')
const logInOutMobileElement = document.getElementById('log-in-out-mobile')

const isVisible = elem => !!elem && !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length)
const fadeInProgress = new Set()

// noinspection ES6ConvertVarToLetConst
var apiHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
}

function fadeIn(el) {
    if (fadeInProgress.has(el)) return
    fadeInProgress.add(el)
    el.classList.toggle('hidden', false)
    const i = setInterval(() => {
        const current = parseFloat(el.style.opacity || 0)
        if (current >= 1) {
            fadeInProgress.delete(el)
            return clearInterval(i)
        }
        el.style.opacity = (current + 0.05).toString(10)
    }, 8)
}

function fadeOut(el) {
    if (fadeInProgress.has(el)) return
    fadeInProgress.add(el)
    const i = setInterval(() => {
        const current = parseFloat(el.style.opacity || 1)
        if (current <= 0 || el.classList.contains('hidden')) {
            fadeInProgress.delete(el)
            el.classList.toggle('hidden', true)
            return clearInterval(i)
        }
        el.style.opacity = (current - 0.05).toString(10)
    }, 8)
}

const tooltipInitialized = []
const eventListeners = {}

function addTooltipOrToast(el, text = '', position = 'top') {
    const oldListener = eventListeners[el]
    if (oldListener) el.removeEventListener('click', oldListener)
    const listener = ev => {
        if (window.innerWidth <= 768 && el.contains(ev.target) && isVisible(el)) {
            toast(text)
            ev.shouldFire = false
        } else {
            ev.shouldFire = true
        }
    }
    el.addEventListener('click', listener)
    eventListeners[el] = listener
    if (window.innerWidth > 768) {
        el.setAttribute('data-position', position)
        el.setAttribute('data-tooltip', text)
        if (!tooltipInitialized.includes(el)) {
            tooltipInitialized.push(el)
            M.Tooltip.init(el)
        }
    }
}

function hideOnClickOutside(element) {
    const outsideClickListener = event => {
        if (element.classList.contains('hidden')) return removeClickListener()
        if (!element.contains(event.target) && isVisible(element)) {
            fadeOut(element)
            removeClickListener()
        }
    }

    const removeClickListener = () => {
        document.removeEventListener('click', outsideClickListener)
    }

    document.addEventListener('click', outsideClickListener)
}

function readableTime(time) {
    if (time < 0) {
        time = -time
        if (time < 1000 * 60) return `${Math.floor(time / 1000)} second${Math.floor(time / 1000) === 1 ? '' : 's'} ago`
        if (time < 1000 * 60 * 60) return `${Math.floor(time / (1000 * 60))} minute${Math.floor(time / (1000 * 60)) === 1 ? '' : 's'} ago`
        if (time < 1000 * 60 * 60 * 24) return `${Math.floor(time / (1000 * 60 * 60))} hour${Math.floor(time / (1000 * 60 * 60)) === 1 ? '' : 's'} ago`
        if (time < 1000 * 60 * 60 * 24 * 30) return `${Math.floor(time / (1000 * 60 * 60 * 24))} day${Math.floor(time / (1000 * 60 * 60 * 24)) === 1 ? '' : 's'} ago`
        return `${Math.floor(time / (1000 * 60 * 60 * 24 * 30))} month${Math.floor(time / (1000 * 60 * 60 * 24 * 30)) === 1 ? '' : 's'} ago`
    } else {
        if (time < 1000 * 60) return `in ${Math.floor(time / 1000)} second${Math.floor(time / 1000) === 1 ? '' : 's'}`
        if (time < 1000 * 60 * 60) return `in ${Math.floor(time / (1000 * 60))} minute${Math.floor(time / (1000 * 60)) === 1 ? '' : 's'}`
        if (time < 1000 * 60 * 60 * 24) return `in ${Math.floor(time / (1000 * 60 * 60))} hour${Math.floor(time / (1000 * 60 * 60)) === 1 ? '' : 's'}`
        if (time < 1000 * 60 * 60 * 24 * 30) return `in ${Math.floor(time / (1000 * 60 * 60 * 24))} day${Math.floor(time / (1000 * 60 * 60 * 24)) === 1 ? '' : 's'}`
        return `in ${Math.floor(time / (1000 * 60 * 60 * 24 * 30))} month${Math.floor(time / (1000 * 60 * 60 * 24 * 30)) === 1 ? '' : 's'}`
    }
}

function openInNewTab(url) {
    const w = window.open(url, '_blank')
    if (w) w.opener = null
}

function getColorForDifficulty(sr = 0) {
    if (sr < 2) return '#88B300' // infinity - 1.99
    if (sr < 2.7) return '#66CCFF' // 2 - 2.69
    if (sr < 4) return '#FFCC22' // 2.7 - 3.99
    if (sr < 5.3) return '#FF66AA' // 4.0 - 5.29
    if (sr < 6.5) return '#8866EE' // 5.3 - 6.49
    return '#000000' // 6.5+
}

function parseQuery(queryString) {
    const query = {}
    const pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&')
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i].split('=')
        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || null)
    }
    return query
}

function toast(text) {
    M.toast({ unsafeHTML: text.replace('\n', '<br />') })
    console.log(`Notification: ${text}`)
}

// noinspection ES6ConvertVarToLetConst
var query = parseQuery(location.href.replace(/.*?\?(.*)/, '$1'))

const authStatus = query['authstate']
// logged_in is handled below
if (authStatus === 'logged_out') {
    toast('You have successfully logged out!')
} else if (authStatus === 'err_access_denied') {
    toast('Error during login: Access denied (You\'ve cancelled the authorization request)')
} else if (authStatus === 'invalid_csrf_token') {
    toast('Error during login: Invalid CSRF Token')
} else if (authStatus === 'invalid_code') {
    toast('Error during login: Invalid secret code')
} else if (authStatus === 'timed_out') {
    toast('Error during login: Timed out random string generator')
} else if (authStatus === 'error') {
    toast('Something went wrong :(')
}

let meData = undefined
const meCallbacks = []

function me(cb) {
    if (typeof cb === 'function') {
        if (typeof meData !== 'undefined') {
            cb(meData)
        } else {
            meCallbacks.push(cb)
        }
    }
}

function whoAmI() {
    return new Promise((resolve) => me(data => resolve(data)))
}

fetch('/me').then(async res => {
    let redirect = ''
    if (logInOutElement.getAttribute('data-redirect-to')) {
        redirect = '?redirect_to=' + logInOutElement.getAttribute('data-redirect-to')
    }
    const size = parseInt(logInOutElement.getAttribute('data-avatar-size') || 56)
    const data = await res.json()
    if (res.status !== 200 || data['error']) {
        meData = null
        meCallbacks.forEach(cb => cb(meData))
        logInOutElement.setAttribute('data-tooltip', 'You are currently not logged in. Click to login.')
        // noinspection HtmlUnknownTarget
        const el = `<a href="/login${redirect}" class="flex-center">Login<i class="material-icons" style="color: #0f0; margin-left: 10px;">login</i></a>`
        logInOutElement.innerHTML = el
        if (logInOutMobileElement) logInOutMobileElement.innerHTML = el
        if (data['error'] !== 'login_required') {
            toast('Unknown error fetching user data: ' + data['error'])
        }
        return
    }
    meData = data
    meCallbacks.forEach(cb => cb(meData))
    logInOutElement.setAttribute('data-tooltip', `Logged in as ${data['username']}. Click to logout.`)
    // noinspection HtmlUnknownTarget
    const el = `<a href="/logout${redirect}" class="avatar-link"><img width="${size}" height="${size}" class="avatar left" src="${data['avatar_url']}" alt="avatar"/><i class="material-icons" style="color: #ff2b2b">logout</i></a>`
    logInOutElement.innerHTML = el
    if (logInOutMobileElement) logInOutMobileElement.innerHTML = el
    if (authStatus === 'logged_in') {
        toast(`Hello ${data['username']}! (Logged in as ${data['group']})`)
    }
})

function coverURL(beatmapSetId) {
    return `https://assets.ppy.sh/beatmaps/${beatmapSetId}/covers/card.jpg`
}

async function renderRequestCard(e) {
    const me = await whoAmI()
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
    return el
}

let cachedConfig = null

async function getConfig() {
    if (cachedConfig) return cachedConfig
    const configElement = document.getElementById('json-config')
    if (configElement) {
        return (cachedConfig = JSON.parse(configElement.textContent))
    }
    return (cachedConfig = await fetch('/api/config').then(res => res.json()))
}

if (location.href.replace(/(.*?)\?.*/, '$1') !== location.href) {
    history.pushState({}, document.title, location.href.replace(/(.*?)\?.*/, '$1'))
}

M.AutoInit(document.body)
