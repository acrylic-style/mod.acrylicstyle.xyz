const logInOutElement = document.getElementById('log-in-out')
const logInOutMobileElement = document.getElementById('log-in-out-mobile')

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

const query = parseQuery(location.href.replace(/.*?\?(.*)/, '$1'))

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

fetch('/me').then(async res => {
    let redirect = ''
    if (logInOutElement.getAttribute('data-redirect-to')) {
        redirect = '?redirect_to=' + logInOutElement.getAttribute('data-redirect-to')
    }
    const data = await res.json()
    if (res.status !== 200 || data['error']) {
        logInOutElement.setAttribute('data-tooltip', 'You are currently not logged in. Click to login.')
        // noinspection HtmlUnknownTarget
        const el = `<a href="/login${redirect}"><i class="material-icons" style="color: #0f0">login</i></a>`
        logInOutElement.innerHTML = el
        logInOutMobileElement.innerHTML = el
        if (data['error'] !== 'login_required') {
            toast('Unknown error fetching user data: ' + data['error'])
        }
        return
    }
    logInOutElement.setAttribute('data-tooltip', `Logged in as ${data['username']}. Click to logout.`)
    // noinspection HtmlUnknownTarget
    const el = `<a href="/logout${redirect}" class="avatar-link"><img width="56" height="56" class="avatar left" src="${data['avatar_url']}" alt="avatar"/><i class="material-icons" style="color: #d00">logout</i></a>`
    logInOutElement.innerHTML = el
    logInOutMobileElement.innerHTML = el
    if (authStatus === 'logged_in') {
        toast(`Hello ${data['username']}! (Logged in as ${data['group']})`)
    }
})

history.pushState({}, document.title, location.href.replace(/(.*?)\?.*/, '$1'))

M.AutoInit(document.body)
