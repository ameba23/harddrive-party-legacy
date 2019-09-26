const express = require('express')
const bodyParser = require('body-parser')
const metadb = require('metadb')()
const Controller = require('./controller')

const app = express()
const router = express.Router()

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

metadb.ready(() => {
  metadb.buildIndexes(() => {
    const controller = Controller(metadb)
    router.get('/files', controller.list)
    router.get('/myfiles', controller.myFiles)

    app.use('/', router)
// gcc  swarm (req, res) { this.metadb.swarm(argv.key) }
  })
})

exports = module.exports = app
