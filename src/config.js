const sql = require('./sql')
const git = require('simple-git')()

let cachedConfig = null

const set = async (key, value) => {
    const val = JSON.stringify(value)
    const connection = await sql.getConnection()
    const res = await sql.findOneWithConnection(connection, 'SELECT `key` FROM config WHERE `key` = ? LIMIT 1', key)
    if (res) {
        await sql.queryWithConnection(
            connection,
            'UPDATE config SET `value` = ? WHERE `key` = ? LIMIT 1',
            val,
            key,
        )
    } else {
        await sql.queryWithConnection(
            connection,
            'INSERT INTO config (`key`, `value`) VALUES (?, ?)',
            key,
            val,
        )
    }
    cachedConfig = null
    connection.release()
}

// async
const get = (key) => sql.findOne('SELECT `value` FROM config WHERE `key` = ? LIMIT 1', key).then(res => JSON.parse(res ? res['value'] : 'null'))

module.exports = {
    requests: {
        setStatus: async (type) => {
            if (type !== 'closed' && type !== 'open') throw new Error('Invalid type: ' + type)
            await set('requests.status', type)
        },
        // async!
        getStatus: () => get('requests.status'),
        setRules: async (rules) => {
            const connection = await sql.getConnection()
            // delete all custom rules
            await sql.queryWithConnection(connection, 'DELETE FROM `config` WHERE `key` = "requests.rules"')
            if (rules.length === 0) return
            // and add all of them
            const values = '("requests.rules", ?)' + ', ("requests.rules", ?)'.repeat(rules.length - 1)
            // insert multiple rows at once
            await sql.queryWithConnection(connection, `INSERT INTO \`config\` (\`key\`, \`value\`) VALUES ${values}`, ...rules.map(r => JSON.stringify(r)))
            cachedConfig = null
            connection.release()
        },
        getRules: () => sql.findAll('SELECT `value` FROM `config` WHERE `key` = "requests.rules"').then(res => res.map(e => JSON.parse(e['value']))),
        setMaxDifficulty: async (difficulty) => {
            difficulty = Math.round(parseFloat(difficulty) * 100) / 100
            if (difficulty !== difficulty || difficulty < 0 || difficulty > 50)
                throw new Error('Invalid max difficulty value: ' + difficulty)
            return await set('requests.max_difficulty', difficulty)
        },
        getMaxDifficulty: () => get('requests.max_difficulty'),
    },
    webhook: {
        addDiscordWebhookURL: async (url) => {
            const connection = await sql.getConnection()
            // look for dupes, return if there's any
            if (await sql.findOneWithConnection(connection, 'SELECT `key` FROM `config` WHERE `key` = "private.webhook_discord", `value` = ?', JSON.stringify(url))) return
            await sql.queryWithConnection(connection, 'INSERT INTO `config` (`key`, `value`) VALUES ("private.webhook_discord", ?)', JSON.stringify(url))
            cachedConfig = null
            connection.release()
        },
        setDiscordWebhookURLs: async (urls) => {
            const connection = await sql.getConnection()
            await sql.queryWithConnection(connection, 'DELETE FROM `config` WHERE `key` = "private.webhook_discord"')
            if (urls.length === 0) return
            const values = '("private.webhook_discord", ?)' + ', ("private.webhook_discord", ?)'.repeat(urls.length - 1)
            await sql.queryWithConnection(connection, `INSERT INTO \`config\` (\`key\`, \`value\`) VALUES ${values}`, ...urls.map(r => JSON.stringify(r)))
            cachedConfig = null
            connection.release()
        },
        getDiscordWebhookURLs: () => sql.findAll('SELECT `value` FROM `config` WHERE `key` = "private.webhook_discord"').then(res => res.map(e => JSON.parse(e['value']))),
    },
    getConfig: async (includeGit) => {
        if (cachedConfig) return cachedConfig
        const config = await sql.findAll('SELECT * FROM config')
        const obj = {
            requests: {
                status: 'open',
                rules: [],
                max_difficulty: 7,
            },
        }
        const forcedArray = [
            'requests.rules',
        ]
        config.forEach(e => {
            const { key } = e
            if (key.startsWith('private.')) return // don't include private configurations
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
            if (forcedArray.includes(key) || config.filter(c => c.key === key).length > 1) {
                // array
                if (typeof o[array[array.length - 1]] === 'undefined') o[array[array.length - 1]] = []
                o[array[array.length - 1]].push(value)
            } else {
                // anything else
                o[array[array.length - 1]] = value
            }
        })
        cachedConfig = obj
        setTimeout(() => cachedConfig = null, 1000 * 60 * 5)
        if (includeGit) {
            const status = await git.status()
            obj.isProd = process.env.APP_ENV !== 'development'
            obj.isDev = !obj.isProd
            obj.commit = await git.revparse(['HEAD']) || '0000000'
            obj.git = {
                isClean: status.isClean(),
                ahead: status.ahead,
                behind: status.behind,
                current: status.current,
            }
        }
        return obj
    }
}
