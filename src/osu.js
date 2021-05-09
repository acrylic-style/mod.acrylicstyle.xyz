const debug = require('debug')('mod.acrylicstyle.xyz:osu-api')
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
    debug(`${method} /${url}`)
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
        me: (mode = '') => request(token, `me/${mode}`),
        lookupBeatmap: (checksum = '', filename = '', id = 0) => {
            let params = '?dummy=dummy'
            if (checksum !== '') {
                params += `&checksum=${encodeURI(checksum)}`
            }
            if (filename !== '') {
                params += `&filename=${encodeURI(filename)}`
            }
            if (id !== 0) {
                params += `&id=${id}`
            }
            if (params === '?') return Promise.reject(new Error('lookupBeatmap requires at least 1 argument'))
            return request(token, `beatmaps/lookup${params}`)
        },
        getBeatmap: (beatmapId = 0) => request(token, `beatmaps/${beatmapId}`),
        // example: https://paste.acrylicstyle.xyz/qavipoqoge.yaml
        getBeatmapSet: (beatmapSetId = 0) => request(token, `beatmapsets/${beatmapSetId}`),
        //lookupBeatmapSet: () => Promise.resolve(),
    }
}
