const pull = require('pull-stream')
const express = require('express')
const router = express.Router()
// const { body } = require('express-validator')

module.exports = function (metadb) {
  // router.get('/query', (req, res) => pullback(metadb.query[req.body.query](req.body.queryArgs), res))
  router.get('/files', (req, res) => pullback(metadb.query.files(), res))

  // router.get('/files/:id', (req, res) => { metadb....(req.body.comment, Callback(res)) })
  // router.post('/files/:id', (req, res) => { metadb.publish.comment(req.body.comment, Callback(res)) })

  router.get('/files/ownfiles', (req, res) => pullback(metadb.query.ownFiles(), res))
  router.get('/files/bypeer', (req, res) => pullback(metadb.query.filesByPeer(req.body.peer), res))
  router.post('/files/subdir', (req, res) => { console.log(req.body) ; pullback(metadb.query.subdir(req.body.subdir), res)})
  router.post('/files/search', function (req, res) {
    return pullback(metadb.query.filenameSubstring(req.body.searchterm), res)
  })

  router.get('/peers', (req, res) => pullback(metadb.query.peers(), res))

  router.get('/settings', (req, res) => { metadb.getSettings(Callback(res)) })
  router.post('/settings', (req, res) => { metadb.publish.about(req.body.name, Callback(res)) })

  router.post('/request', (req, res) => { metadb.publish.request(req.body.files, Callback(res)) })

  router.post('/swarm', (req, res) => { metadb.swarm(req.body.swarm, Callback(res)) })
  // router.post('/unswarm', (req, res) => { console.log(true, req.body); metadb.unswarm(req.body.swarm, Callback(res)) })
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
