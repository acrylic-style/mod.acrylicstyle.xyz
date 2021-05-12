const debug = require('debug')('mod.acrylicstyle.xyz:mysql')
const mysql = require('mysql')
const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
})

const getConnection = /* async */ () => {
    return new Promise((resolve, reject) =>
        pool.getConnection((err, connection) => {
                if (err) return reject(err)
                resolve(connection)
            }
        )
    )
}

/**
 * @param {string} sql
 * @param values
 * @returns {Promise<{ results: Array<any>, fields: Array<string> }>}
 */
const query = (sql, ...values) => {
    return new Promise((resolve, reject) => {
        debug(sql, values)
        pool.query(sql, values, (error, results, fields) => {
            if (error) return reject(error)
            resolve({ results, fields })
        })
    })
}

const queryWithConnection = (connection, sql, ...values) => {
    return new Promise((resolve, reject) => {
        debug(sql, values)
        connection.query(sql, values, (error, results, fields) => {
            if (error) return reject(error)
            resolve({ results, fields })
        })
    })
}

/**
 * @param {string} sql
 * @param values
 * @returns {Promise<void>}
 */
const execute = (sql, ...values) => {
    return new Promise((resolve, reject) => {
        debug(sql, values)
        pool.query(sql, values, (error) => {
            if (error) return reject(error)
            resolve(null)
        })
    })
}

/**
 * @param {string} sql
 * @param values
 * @returns {Promise<any>}
 */
const findOne = async (sql, ...values) => {
    if (!sql.toLowerCase().startsWith('insert')) return await query(sql, ...values).then(value => value.results[0] || null)
    const connection = await getConnection()
    await queryWithConnection(connection, sql, ...values).then(value => value.results[0] || null)
    return await queryWithConnection(connection, "SELECT LAST_INSERT_ID() AS why").then(value => value.results[0] ? value.results[0]['why'] : null)
}

/**
 * @param {string} sql
 * @param values
 * @returns {Promise<Array<any>>}
 */
const findAll = (sql, ...values) => query(sql, ...values).then(value => value.results)

module.exports = {
    query,
    execute,
    findOne,
    findAll,
}
