const pull = require('pull-stream')
const express = require('express')
const router = express.Router()

module.exports = function (metadb) {
  router.get('/files', (req, res) => pullback(metadb.queryFiles(), res))

  // router.get('/files/:id', controller.files)

  router.get('/myfiles', (req, res) => pullback(metadb.myFiles(), res))

  router.get('/peers', (req, res) => pullback(metadb.queryPeers(), res))

  router.post('/search', function (req, res) {
    return pullback(metadb.filenameSubstring(req.body.substring), res)
  })

  return router
}

// query (req, res) { return pullback(metadb.query(req.body.query), res) }
// byExtension (req, res) { return pullback(metadb.byExtention(req.body.extention), res) }
// publishAbout (req, res) { metadb.publishAbout(req.body.name, Callback(res)) }
// publishRequest (req, res) { metadb.publishRequest(req.body.files, Callback(res)) }
// indexFiles (req, res) { metadb.indexFiles(req.body.directory, Callback(res)) }

function Callback (res) {
  return function (err, result) {
    return err
      ? res.status(422).json({ error: err.message })
      : res.status(200).json(result)
  }
}

function pullback (stream, res) {
  return pull(stream, pull.collect(Callback(res)))
}
