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

const query = parseQuery(location.href.replace(/.*?\?(.*)/, '$1'))

const authStatus = query['authstate']
if (authStatus === 'logged_in') {
    const username = query['username'] || '???'
    M.toast({ text: `Hello ${username}!` })
} else if (authStatus === 'logged_out') {
    M.toast({ text: 'You have successfully logged out!' })
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
})

history.pushState({}, document.title, location.href.replace(/(.*?)\?.*/, '$1'))
