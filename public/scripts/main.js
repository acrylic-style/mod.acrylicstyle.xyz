const logInOutElement = document.getElementById('log-in-out')

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
    M.toast({ text })
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
} else if (authStatus === 'error') {
    toast('Something went wrong :(')
}

fetch('/me').then(async res => {
    const data = await res.json()
    if (res.status !== 200 || data['error']) {
        logInOutElement.setAttribute('data-tooltip', 'Login')
        // noinspection HtmlUnknownTarget
        logInOutElement.innerHTML = '<a href="/login"><i class="material-icons" style="color: #0f0">login</i></a>'
        if (data['error'] !== 'login_required') {
            toast('Unknown error fetching user data: ' + data['error'])
        }
        return
    }
    logInOutElement.setAttribute('data-tooltip', `Logged in as ${data['username']}. Click to logout.`)
    // noinspection HtmlUnknownTarget
    logInOutElement.innerHTML = `<a href="/logout"><i class="material-icons" style="color: #d00">logout</i></a>`
    if (authStatus === 'logged_in') {
        toast(`Hello ${data['username']}! (Logged in as ${data['group']})`)
    }
})

history.pushState({}, document.title, location.href.replace(/(.*?)\?.*/, '$1'))

M.AutoInit(document.body)
