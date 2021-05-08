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

module.exports = {
    generateSecureRandomString,
    sleep,
    sessions,
}
