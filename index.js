const express = require('express')
const ExpressWs = require('express-ws')
const bodyParser = require('body-parser')
const Metadb = require('metadb-core')
const Controller = require('./controller')

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

  metadb.ready(() => {
    metadb.buildIndexes(() => {
      app.use('/', Controller(metadb))

      options.host = options.host || process.env.METADB_HOST || metadb.config.host || 'localhost'
      options.port = options.port || process.env.METADB_PORT || metadb.config.port || 2323
      const { port, host } = options
      console.log(`Web interface available at http://${host}:${port}`)
      app.listen(port, host)
    })
  })

  return app
}
