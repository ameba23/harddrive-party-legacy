const express = require('express')
const bodyParser = require('body-parser')

const app = express()
const router = express.Router()

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

const api = {
  router,
  controllers: {
    files: require('./controllers/files')
  }
}

routes(api)

app.use('/', router)

function routes (api) {
  const { router, controllers } = api

  const files = controllers.files(api.groups)
  router.get('/files', files.list)
}

exports = module.exports = app
