const express = require('express')
const bodyParser = require('body-parser')
const metadb = require('metadb')()
const Controller = require('./controller')

const app = express()
// const router = express.Router()

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

metadb.ready(() => {
  metadb.buildIndexes(() => {
    app.use('/', Controller(metadb))
    // metadb.swarm(key)
  })
})

exports = module.exports = app
