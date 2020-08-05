const express = require('express')
const ExpressWs = require('express-ws')
const bodyParser = require('body-parser')
const Metadb = require('metadb-core')
const Controller = require('./controller')
const https = require('https')
const fs = require('fs')

exports = module.exports = function (options) {
  console.log(require('./metadb-banner'))

  const metadb = Metadb(options)

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
  metadb.ready((err) => {
    if (err) {
      console.log(err)
      process.exit(1)
    }
    options.host = options.host || process.env.METADB_HOST || metadb.config.host || 'localhost'
    options.port = options.port || process.env.METADB_PORT || metadb.config.port || 2323
    options.httpsKey = options.httpsKey || process.env.METADB_HTTPS_KEY || metadb.config.httpsKey
    options.httpsCert = options.httpsCert || process.env.METADB_HTTPS_CERT || metadb.config.httpsCert
    options.https = options.httpsKey && options.httpsCert
    app.use('/', Controller(metadb, options))
    const { port, host } = options
    if (options.https) {
      https.createServer({
        key: fs.readFileSync(options.httpsKey),
        cert: fs.readFileSync(options.httpsCert)
      }, app).listen(port, host)
    } else {
      app.listen(port, host)
    }
    console.log(`Web interface available at http${options.https ? 's' : ''}://${host}:${port}`)
    metadb.buildIndexes(() => {})
  })
  return app
}
