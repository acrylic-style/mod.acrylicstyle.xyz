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
    const data = await res.json()
    if (res.status !== 200 || data['error']) {
        meData = null
        meCallbacks.forEach(cb => cb(meData))
        logInOutElement.setAttribute('data-tooltip', 'You are currently not logged in. Click to login.')
        // noinspection HtmlUnknownTarget
        const el = `<a href="/login${redirect}" class="flex-center">Login<i class="material-icons" style="color: #0f0; margin-left: 10px;">login</i></a>`
        logInOutElement.innerHTML = el
        logInOutMobileElement.innerHTML = el
        if (data['error'] !== 'login_required') {
            toast('Unknown error fetching user data: ' + data['error'])
        }
        return
    }
    meData = data
    meCallbacks.forEach(cb => cb(meData))
    logInOutElement.setAttribute('data-tooltip', `Logged in as ${data['username']}. Click to logout.`)
    // noinspection HtmlUnknownTarget
    const el = `<a href="/logout${redirect}" class="avatar-link"><img width="56" height="56" class="avatar left" src="${data['avatar_url']}" alt="avatar"/><i class="material-icons" style="color: #ff2b2b">logout</i></a>`
    logInOutElement.innerHTML = el
    logInOutMobileElement.innerHTML = el
    if (authStatus === 'logged_in') {
        toast(`Hello ${data['username']}! (Logged in as ${data['group']})`)
    }
})

history.pushState({}, document.title, location.href.replace(/(.*?)\?.*/, '$1'))

M.AutoInit(document.body)
