const API_ENDPOINT = "https://osu.ppy.sh/api/v2/" // trailing slash is required
const fetch = require('node-fetch')

const baseHeaders = token => {
    return {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    }
}

const header = (token, additionalHeaders) => {
    if (!additionalHeaders) return baseHeaders(token)
    return Object.assign(baseHeaders(token), additionalHeaders)
}

const request = async (token, url, headers, method = 'GET') => {
    if (!token) throw new Error(`Cannot ${method} /${url} with empty token`)
    return await fetch(`${API_ENDPOINT}${url}`, {
        method,
        headers: header(token, headers),
    }).then(async res => {
        const json = await res.json()
        json['status_code'] = res.status
        return json
    })
}

module.exports = token => {
    return {
        me: (mode = '') => {
            return request(token, `me/${mode}`)
        }
    }
}
