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

fetch('/me', { credentials: 'include' }).then(async res => {
    if (res.status !== 200) {
        logInOutElement.innerHTML = '<a href="/login" style="color: #0f0"><i class="material-icons">login</i></a>'
        return
    }
    const data = await res.json()
    if (!data['error']) {
        logInOutElement.innerHTML = '<a href="/logout" style="color: #d00"><i class="material-icons">logout</i></a>'
    }
    if (authStatus === 'logged_in') {
        toast(`Hello ${data['username']}!`)
    }
})

history.pushState({}, document.title, location.href.replace(/(.*?)\?.*/, '$1'))
