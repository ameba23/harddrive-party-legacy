const express = require('express')
const bodyParser = require('body-parser')
const metadb = require('metadb')()
const Controller = require('./controller')

const app = express()
const router = express.Router()

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

metadb.ready(() => {
  metadb.buildIndexes(() => {
    const controller = Controller(metadb)
    router.get('/files', controller.queryFiles)
    // router.get('/files/:id', controller.files)
    router.get('/myfiles', controller.myFiles)
    router.get('/peers', controller.queryPeers)
    app.use('/', router)
    // metadb.swarm(key)
  })
})

exports = module.exports = app
