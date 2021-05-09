require('dotenv-safe').config()
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const sql = require('./src/sql')
const debug = require('debug')('mod.acrylicstyle.xyz:app');

sql.query('SELECT 1').then(async () => {
  debug('Confirmed MySQL connection')
  await sql.findOne('SHOW TABLES LIKE "users"').then(res => {
    if (!res) {
      debug('Creating users table')
      sql.execute(`CREATE TABLE users (
  \`id\` int unsigned NOT NULL,
  \`username\` varchar(255) NOT NULL,
  \`site_admin\` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (\`id\`)
)`)
      debug('Created users table')
    }
  })
}).catch(e => {
  console.error('Your mysql configuration is foobar, pls fix')
  console.error(e.stack || e)
  process.kill(process.pid, 'SIGINT')
})

const indexRouter = require('./routes/index');
const loginRouter = require('./routes/login');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/', loginRouter);

app.use((req, res, next) => {
  next(createError(404));
});

app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500).send({ something_broke: 'something went wrong' });
});

module.exports = app;
