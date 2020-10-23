const pull = require('pull-stream')
const express = require('express')
const router = express.Router()
const buildUi = require('metadb-ui')
const path = require('path')
const fs = require('fs')
const { exec } = require('child_process')
const defaultMaxEntries = 200 // Number of files to return

module.exports = function (metadb, options) {
  // Send front-end on get '/'
  const uiFilePath = path.join(metadb.storage, 'ui.html')
  let uiReady = false
  let buildError

  build(uiFilePath, options, (err) => {
    uiReady = true
    buildError = err
  })

  router.get('/', (req, res) => {
    if (buildError) return res.status(422).send(`Error when building user interface: ${buildError}`)
    if (!uiReady) return res.status(422).send('User interface not yet built, try reloading')
    res.sendFile(uiFilePath)
  })

  router.get('/rebuild', (req, res) => {
    build(uiFilePath, options, (err) => {
      if (err) return res.status(422).send(`Error when building user interface: ${buildError}`)
      res.type('html').send('<html><body>Rebuilt... <a href="http://localhost:2323">reload</a></body></html>')
      // res.sendFile(uiFilePath)
    })
  })

  router.get('/files', (req, res) => pullback(metadb.query.files(req.query), res, req.query.LIMIT))

  // router.post('/files/:id', (req, res) => { metadb.publish.comment(req.body.comment, Callback(res)) })

  router.get('/files/chronological', (req, res) => pullback(metadb.files.pullStreamByTimestamp({ reverse: true }), res))
  router.get('/files/shares', (req, res) => pullback(metadb.query.ownFilesNewestFirst(), res))
  router.get('/files/bypeer/:peerId', (req, res) => pullback(metadb.query.filesByPeer(req.params.peerId), res))
  router.post('/files/subdir', (req, res) => pullback(metadb.query.subdir(req.body.subdir, req.body.opts), res))
  router.post('/files/search', (req, res) => pullback(metadb.query.filenameSubstring(req.body.searchterm), res))

  // there should also be 'cancel' and 'pause/resume' indexing
  router.post('/files/index', (req, res) => { metadb.indexFiles(req.body.dir, Callback(res)) })
  router.delete('/files/index', (req, res) => { metadb.cancelIndexing(req.body.dir) })
  router.get('/share-totals', (req, res) => { pullback(metadb.getShareTotals(), res) })
  router.get('/files/index/pause', (req, res) => { metadb.pauseIndexing(Callback(res)) })
  router.get('/files/index/resume', (req, res) => { metadb.resumeIndexing(Callback(res)) })

  router.get('/files/:id', (req, res) => { metadb.files.get(req.params.id, Callback(res)) })

  router.get('/peers', (req, res) => metadb.query.peers(Callback(res)))

  router.get('/settings', (req, res) => { metadb.getSettings(Callback(res)) })
  router.post('/settings', (req, res) => { metadb.setSettings(req.body, Callback(res)) })

  router.get('/request', (req, res) => pullback(metadb.query.requesting(), res))
  router.post('/request', (req, res) => { metadb.request(req.body.files, Callback(res)) })
  router.delete('/request', (req, res) => { metadb.unrequest(req.body.files, Callback(res)) })

  router.post('/swarm', (req, res) => { metadb.swarm.connect(req.body.swarm, Callback(res)) })
  router.delete('/swarm', (req, res) => { metadb.swarm.disconnect(req.body.swarm, Callback(res)) })

  router.get('/downloads', (req, res) => { pullback(metadb.getDownloads(), res) })
  router.get('/uploads', (req, res) => { pullback(metadb.getUploads(), res) })
  router.get('/downloads/:hash', (req, res) => {
    // TODO validate hash correctly formed
    metadb.getDownloadedFileByHash(req.params.hash, (err, fileObject) => {
      if (err) return res.status(422).json({ err: 'No such file' })
      const filepath = path.join(metadb.config.downloadPath, fileObject.name)
      console.log(`seding ${filepath}`)
      res.sendFile(filepath)
    })
  })

  router.post('/open', (req, res) => {
    if (options.host !== 'localhost') return res.status(422).json({ err: 'Can only open files on localhost' })
    const filepath = path.join(metadb.config.downloadPath, req.body.file)
    // console.log(`Opening "${filepath}"`)
    exec(`xdg-open "${filepath}"`)
    return res.status(200).json({ file: req.body.file })
    // res.sendFile(filepath)
  })

  router.post('/stop', (req, res) => { metadb.stop(Callback(res)) })

  // Handle websockes
  router.ws('/', (ws, req) => {
    metadb.events.on('ws', (message) => {
      console.log('got message', message, 'sending thru ws')
      try {
        ws.send(message)
      } catch (err) {
        console.log('error when sending message on ws.', err)
      }
    })
  })

  return router
}

// router.get('/query', (req, res) => pullback(metadb.query[req.body.query](req.body.queryArgs), res))
// byExtension (req, res) { return pullback(metadb.byExtention(req.body.extention), res) }
// indexFiles (req, res) { metadb.indexFiles(req.body.directory, Callback(res)) }

function Callback (res) {
  return function (err, result) {
    if (err) console.log(err)
    return err
      ? res.status(422).json({ error: err.message })
      : res.status(200).json(result)
  }
}

function pullback (stream, res, maxEntries) {
  if (typeof maxEntries === 'string') maxEntries = parseInt(maxEntries)
  return pull(
    stream,
    pull.take(maxEntries || defaultMaxEntries),
    pull.collect(Callback(res))
  )
}

function build (uiFilePath, options, callback) {
  const uiFile = fs.createWriteStream(uiFilePath)
  uiFile.on('error', (err) => { return callback(err) })
  const ui = buildUi(options)
  ui.on('end', () => { callback() })
  ui.pipe(uiFile)
}
