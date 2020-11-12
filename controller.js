const pull = require('pull-stream')
const express = require('express')
const router = express.Router()
const buildUi = require('metadb-ui')
const path = require('path')
const fs = require('fs')
const log = require('debug')('metadb-api-controller')
// const { exec } = require('child_process')
const defaultMaxEntries = 200 // Number of files to return

module.exports = function (metadb, options) {
  const uiFilePath = path.join(metadb.storage, 'ui.html')
  let uiReady = false
  let buildError

  build(uiFilePath, options, (err) => {
    uiReady = true
    buildError = err
  })

  // Send front-end on get '/'
  router.get('/', (req, res) => {
    if (buildError) return res.status(422).send(`Error when building user interface: ${buildError}`)
    if (!uiReady) return res.status(422).send('User interface not yet built, try reloading')
    res.sendFile(uiFilePath)
  })

  // For development - rebuild front end
  router.get('/rebuild', (req, res) => {
    build(uiFilePath, options, (err) => {
      if (err) return res.status(422).send(`Error when building user interface: ${buildError}`)
      res.type('html').send('<html><body>Rebuilt... <a href="http://localhost:2323">reload</a></body></html>')
      // res.sendFile(uiFilePath)
    })
  })

  // List files
  router.get('/files', (req, res) => pullback(metadb.query.files(req.query), res, req.query.LIMIT))
  // List files in order they were added
  router.get('/files/chronological', (req, res) => pullback(metadb.files.pullStreamByTimestamp({ reverse: true }), res))
  // List own files
  router.get('/files/shares', (req, res) => pullback(metadb.query.ownFilesNewestFirst(), res))
  // List files of a given peer
  router.get('/files/bypeer/:peerId', (req, res) => pullback(metadb.query.filesByPeer(req.params.peerId), res))
  // List files matching a given subdirectory
  router.post('/files/subdir', (req, res) => pullback(metadb.query.subdir(req.body.subdir, req.body.opts), res))
  // Filename substring search (fulltext coming soon)
  router.post('/files/search', (req, res) => pullback(metadb.query.filenameSubstring(req.body.searchterm), res))

  // Index a local directory
  router.post('/files/index', (req, res) => { metadb.indexFiles(req.body.dir, req.body.options, Callback(res)) })
  // Stop indexing a local directory
  router.delete('/files/index', (req, res) => { metadb.cancelIndexing(req.body.dir, Callback(res)) })
  // Pause indexing a local directory TODO dont use GET
  router.get('/files/index/pause', (req, res) => { metadb.pauseIndexing(Callback(res)) })
  // Resume indexing a local directory TODO dont use GET
  router.get('/files/index/resume', (req, res) => { metadb.resumeIndexing(Callback(res)) })
  // Get total number of files shared in each shared directory
  router.get('/share-totals', (req, res) => { pullback(metadb.getShareTotals(), res) })

  // Get metadata about a file with a given hash
  router.get('/files/:id', (req, res) => { metadb.files.get(req.params.id, Callback(res)) })
  // Add a comment to a file with a given hash
  router.post('/files/:id', (req, res) => { metadb.publish.fileComment(Object.assign(req.body, { sha256: req.params.id }), Callback(res)) })

  // List peers
  router.get('/peers', (req, res) => metadb.query.peers(Callback(res)))

  // List settings
  router.get('/settings', (req, res) => { metadb.getSettings(Callback(res)) })
  // Update settings
  router.post('/settings', (req, res) => { metadb.setSettings(req.body, Callback(res)) })

  // List requested files
  router.get('/request', (req, res) => pullback(metadb.query.requesting(), res))
  // Request files with given hashes
  router.post('/request', (req, res) => { metadb.request(req.body.files, Callback(res)) })
  // Cancel requests for files with given hashes
  router.delete('/request', (req, res) => { metadb.unrequest(req.body.files, Callback(res)) })

  // Connect to a given swarm
  router.post('/swarm', (req, res) => { metadb.swarm.connect(req.body.swarm, Callback(res)) })
  // Disconnect from a given swarm
  router.delete('/swarm', (req, res) => { metadb.swarm.disconnect(req.body.swarm, Callback(res)) })

  // List downloaded files
  router.get('/downloads', (req, res) => { pullback(metadb.getDownloads(), res) })
  // List uploaded files
  router.get('/uploads', (req, res) => { pullback(metadb.getUploads(), res) })
  // Send a downloaded file to the browser
  router.get('/downloads/:hash', (req, res) => {
    metadb.getDownloadedFileByHash(req.params.hash, (err, fileObject) => {
      if (err) return res.status(422).json({ err: 'No such file' })
      const filepath = path.join(metadb.config.downloadPath, fileObject.name)
      res.sendFile(filepath)
    })
  })

  // publish a 'wall message'
  router.post('/wall-message', (req, res) => { metadb.publish.wallMessage(req.body.message, req.body.swarmKey, Callback(res)) })
  // get wall messages for a given swarm
  router.post('/wall-message/by-swarm-key', (req, res) => { pullback(metadb.core.api.wallMessages.pullBySwarmKey(req.body.swarmKey), res) })

  // Open a file locally with xdg-open - currently disabled
  // router.post('/open', (req, res) => {
  //   if (options.host !== 'localhost') return res.status(422).json({ err: 'Can only open files on localhost' })
  //   const filepath = path.join(metadb.config.downloadPath, req.body.file)
  //   // console.log(`Opening "${filepath}"`)
  //   exec(`xdg-open "${filepath}"`)
  //   return res.status(200).json({ file: req.body.file })
  //   // res.sendFile(filepath)
  // })

  // Stop running
  router.post('/stop', (req, res) => { metadb.stop(Callback(res)) })

  // Handle websockes
  router.ws('/', (ws, req) => {
    metadb.events.on('ws', (message) => {
      log('Got message', message, 'sending thru ws')
      try {
        ws.send(message)
      } catch (err) {
        log('Error when sending message on ws.', err)
      }
    })
  })

  return router
}

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
