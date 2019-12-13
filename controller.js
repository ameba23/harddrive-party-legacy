const pull = require('pull-stream')
const express = require('express')
const router = express.Router()
// const { body } = require('express-validator')

module.exports = function (metadb) {
  router.get('/files', (req, res) => pullback(metadb.queryFiles(), res))

  // router.get('/files/:id', controller.files)
  router.post('/files/:id', (req, res) => { metadb.publishComment(req.body.comment, Callback(res)) })

  router.get('/files/myfiles', (req, res) => pullback(metadb.myFiles(), res))
  router.get('/files/bypeer', (req, res) => pullback(metadb.filesByPeer(req.body.peer), res))
  router.post('files/search', function (req, res) {
    return pullback(metadb.filenameSubstring(req.body.searchterm), res)
  })

  router.get('/peers', (req, res) => pullback(metadb.queryPeers(), res))

  router.get('/settings', (req, res) => { metadb.getSettings(Callback(res)) })
  router.post('/settings', (req, res) => { metadb.publishAbout(req.body.name, Callback(res)) })

  router.post('/request', (req, res) => { metadb.publishRequest(req.body.files, Callback(res)) })

  router.post('/swarm', (req, res) => { metadb.swarm(req.body.swarm, Callback(res)) })
  router.delete('/swarm', (req, res) => { console.log(true, req.body); metadb.unswarm(req.body.swarm, Callback(res)) })

  return router
}

// query (req, res) { return pullback(metadb.query(req.body.query), res) }
// byExtension (req, res) { return pullback(metadb.byExtention(req.body.extention), res) }
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
