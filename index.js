const express = require('express')
const bodyParser = require('body-parser')
const Metadb = require('metadb-core')
const Controller = require('./controller')

exports = module.exports = function (options) {
  const metadb = Metadb(options)
  const app = express()

  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Credentials', true)
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
    res.header('Access-Control-Allow-Methods: *')
    next()
  })

  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(bodyParser.json())

  metadb.ready(() => {
    metadb.buildIndexes(() => {
      app.use('/', Controller(metadb))
    })
  })
  return app
}
