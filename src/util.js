const crypto = require('crypto')

const sessions = {}

const generateSecureRandomString = length => {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(length, function(err, buffer) {
            if (err) {
                reject(err)
            } else {
                resolve(buffer.toString('hex'))
            }
        });
    })
}

const sleep = async time => {
    await new Promise((res) => setTimeout(res, time));
    return null;
}

const getSession = cookies => {
    if (!cookies) return null
    const session = cookies['mod_session']
    const token = sessions[session]
    if (!session || !token) return null
    return token
}

const getAccessToken = cookies => {
    if (!cookies) return null
    const session = cookies['mod_session']
    const token = sessions[session]
    if (!session || !token || !token['access_token']) return null
    return token['access_token']
}

module.exports = {
    generateSecureRandomString,
    sleep,
    sessions,
    getSession,
    getAccessToken,
}
