const pull = require('pull-stream')
const express = require('express')
const router = express.Router()
// const { body } = require('express-validator')

module.exports = function (metadb) {
  router.get('/', (req, res) => { res.sendFile(require.resolve('metadb-ui/dist/index.html')) })

  // router.get('/query', (req, res) => pullback(metadb.query[req.body.query](req.body.queryArgs), res))
  router.get('/files', (req, res) => pullback(metadb.query.files(), res))

  // router.post('/files/:id', (req, res) => { metadb.publish.comment(req.body.comment, Callback(res)) })

  router.get('/files/chronological', (req, res) => pullback(metadb.files.pullStreamByTimestamp(), res))
  router.get('/files/shares', (req, res) => pullback(metadb.query.ownFiles(), res))
  router.get('/files/bypeer/:peerId', (req, res) => pullback(metadb.query.filesByPeer(req.params.peerId), res))
  router.post('/files/subdir', (req, res) => pullback(metadb.query.subdir(req.body.subdir), res))
  router.post('/files/search', (req, res) => pullback(metadb.query.filenameSubstring(req.body.searchterm), res))
  router.post('/files/index', (req, res) => { metadb.indexFiles(req.body.dir, Callback(res)) })
  router.get('/files/:id', (req, res) => { metadb.files.get(req.params.id, Callback(res)) })

  router.get('/peers', (req, res) => metadb.query.peers(Callback(res)))

  router.get('/settings', (req, res) => { metadb.getSettings(Callback(res)) })
  router.post('/settings', (req, res) => { metadb.setSettings(req.body, Callback(res)) })

  router.get('/request/fromSelf', (req, res) => pullback(metadb.query.requestsFromSelf(), res))
  router.get('/request/fromOthers', (req, res) => pullback(metadb.query.requestsFromOthers(), res))
  router.post('/request', (req, res) => { metadb.publish.request(req.body.files, Callback(res)) })

  router.post('/swarm', (req, res) => { metadb.swarm(req.body.swarm, Callback(res)) })
  router.delete('/swarm', (req, res) => { metadb.unswarm(req.body.swarm, Callback(res)) })

  return router
}

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
