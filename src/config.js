const sql = require('./sql')

let cachedConfig = null

const set = async (key, value) => {
    cachedConfig = null
    const str = JSON.stringify(value)
    await sql.execute(
        'INSERT INTO config (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
        key,
        str,
        str,
    )
}

// async
const get = (key) => sql.findOne('SELECT `value` FROM config WHERE `key` = ?', key).then(res => JSON.parse(res ? res['value'] : 'null'))

module.exports = {
    requests: {
        setStatus: async (type) => {
            if (type !== 'closed' && type !== 'open') throw new Error('Invalid type: ' + type)
            await set('requests.status', type)
        },
        // async!
        getStatus: () => get('requests.status'),
    },
    getConfig: async () => {
        if (cachedConfig) return cachedConfig
        const config = await sql.findAll('SELECT * FROM config')
        const obj = {
            requests: {
                status: 'open',
            },
        }
        config.forEach(e => {
            const { key } = e
            const value = JSON.parse(e.value)
            let o = obj
            const array = key.split('.')
            array.slice(0, -1).forEach(s => {
                const prev = o
                o = o[s]
                if (typeof o === 'undefined') {
                    o = {}
                    prev[s] = o
                }
            })
            o[array[array.length - 1]] = value
        })
        cachedConfig = obj
        setTimeout(() => cachedConfig = null, 1000 * 60 * 5)
        return obj
    }
}
