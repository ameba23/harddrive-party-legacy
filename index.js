const express = require('express')
const basicAuth = require('express-basic-auth')
const ExpressWs = require('express-ws')
const bodyParser = require('body-parser')
const Metadb = require('metadb-core')
const Controller = require('./controller')
const log = require('debug')('metadb-api')
const https = require('https')
const fs = require('fs')

exports = module.exports = async function (options) {
  console.log(require('./banner'))

  const metadb = new Metadb(options)

  const app = express()
  ExpressWs(app)

  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Credentials', true)
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
    res.header('Access-Control-Allow-Methods', '*')
    next()
  })

  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(bodyParser.json())

  app.use(function (req, res, next) {
    log(req.method, req.url, req.body)
    next()
  })

  await metadb.ready().catch((err) => {
    console.log(err)
    process.exit(1)
  })

  options.host = options.host || process.env.METADB_HOST || metadb.config.host || 'localhost'
  options.port = options.port || process.env.METADB_PORT || metadb.config.port || 2323

  options.httpsKey = options.httpsKey || process.env.METADB_HTTPS_KEY || metadb.config.httpsKey
  options.httpsCert = options.httpsCert || process.env.METADB_HTTPS_CERT || metadb.config.httpsCert
  options.https = !!(options.httpsKey && options.httpsCert)

  options.basicAuthUser = options.basicAuthUser || metadb.config.basicAuthUser
  options.basicAuthPassword = options.basicAuthPassword || metadb.config.basicAuthPassword
  options.basicAuth = !!(options.basicAuthUser && options.basicAuthPassword)
  if (options.basicAuth) {
    app.use(basicAuth({
      users: { [options.basicAuthUser]: options.basicAuthPassword },
      challenge: true,
      realm: 'metadb'
    }))
  }

  app.use('/', Controller(metadb, options))

  const { port, host } = options

  process.on('uncaughtException', (err) => {
    console.log(
      err.errno === 'EADDRINUSE'
        ? `Address in use at ${host}:${port} - either metadb is already running, or something else is using that port`
        : err
    )
    process.exit(1)
  })

  if (options.https) {
    https.createServer({
      key: fs.readFileSync(options.httpsKey),
      cert: fs.readFileSync(options.httpsCert)
    }, app).listen(port, host)
  } else {
    app.listen(port, host)
  }

  console.log(`Web interface available at http${options.https ? 's' : ''}://${host}:${port}`)

  metadb.views.ready()
  metadb.connect().catch((err) => {
    console.log(err)
    process.exit(1)
  }).then(() => {
    log('Connected.')
  })

  return app
}
