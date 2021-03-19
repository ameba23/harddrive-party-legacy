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

  build(uiFilePath, options)
    .then(() => { uiReady = true })
    .catch((err) => { buildError = err })

  // Send front-end on get '/'
  router.get('/', (req, res) => {
    if (buildError) return res.status(422).send(`Error when building user interface: ${buildError}`)
    if (!uiReady) return res.status(422).send('User interface not yet built, try reloading')
    res.sendFile(uiFilePath)
  })

  // For development - rebuild front end
  router.get('/rebuild', async (req, res) => {
    await build(uiFilePath, options)
      .catch((err) => {
        return res.status(422).send(`Error when building user interface: ${err.message}`)
      })
    res.type('html').send('<html><body>Rebuilt... <a href="http://localhost:2323">reload</a></body></html>')
    // res.sendFile(uiFilePath)
  })

  router.get('/favicon.svg', (req, res) => {
    res.sendFile(path.join(path.resolve(__dirname), 'favicon.svg'))
  })

  // List files
  router.get('/files', (req, res) => processIterator(metadb.query.files.stream(), res, req.query.LIMIT)) // pass req.query
  // List files in order they were added
  router.get('/files/chronological', (req, res) => processIterator(metadb.query.files.byTimestamp({ reverse: true }), res))

  // List own files
  router.get('/files/shares', (req, res) => processIterator(metadb.listSharesNewestFirst(), res))

  // List files of a given peer
  router.get('/files/bypeer/:peerId', (req, res) => processIterator(metadb.query.files.byHolder({ holder: req.params.peerId }), res))

  // List files matching a given subdirectory
  router.post('/files/subdir', (req, res) => processIterator(metadb.query.files.byPath(req.body.subdir, req.body.opts), res))

  // Filename substring search (fulltext coming soon)
  router.post('/files/search', (req, res) => processIterator(metadb.query.files.filenameSubstring(req.body.searchterm), res))

  // Index a local directory
  router.post('/files/index', (req, res) => {
    metadb.shares.once('start', (status) => {
      res.status(200).json(status)
    })
    metadb.shares.scanDir(req.body.dir, req.body.options)
      .catch((err) => {
        if (!res.finished) res.status(422).json({ error: err.message })
      })
  })

  // Stop indexing a local directory
  router.delete('/files/index', (req, res) => { handleSync(metadb.shares.cancel(req.body.dir), res) })

  // Pause indexing a local directory TODO dont use GET
  router.get('/files/index/pause', (req, res) => { handleSync(metadb.shares.pause(), res) })

  // Resume indexing a local directory TODO dont use GET
  router.get('/files/index/resume', (req, res) => { handleSync(metadb.shares.resume(), res) })

  // Get total number of files shared in each shared directory
  router.get('/share-totals', (req, res) => { processIterator(metadb.shares.getShareTotals(), res) })

  // Get metadata about a file with a given hash
  router.get('/files/:id', (req, res) => { handleAsync(metadb.query.files.get(req.params.id), res) })

  // Add a comment to a file with a given hash
  router.post('/files/:id', (req, res) => { handleAsync(metadb.fileComment(Object.assign(req.body, { sha256: req.params.id })), res) })

  // List peers
  router.get('/peers', (req, res) => processIterator(metadb.listPeers(), res))
  router.post('/peers', (req, res) => { handleAsync(metadb.addFeed(req.body.peerId), res) })

  // List settings
  router.get('/settings', (req, res) => { handleAsync(metadb.getSettings(), res) })
  // Update settings
  router.post('/settings', (req, res) => { handleAsync(metadb.setSettings(req.body), res) })

  // List requested files
  router.get('/request', (req, res) => processIterator(metadb.client.listRequests(), res))
  // Request files with given hashes
  router.post('/request', (req, res) => { handleAsync(metadb.client.request(req.body.files), res) })
  // Cancel requests for files with given hashes
  // router.delete('/request', (req, res) => { metadb.client.unrequest(req.body.files, Callback(res)) })

  // Connect to a given swarm
  router.post('/swarm', (req, res) => { handleSync(metadb.swarm.join(req.body.swarm), res) })
  // Disconnect from a given swarm
  router.delete('/swarm', (req, res) => { handleSync(metadb.swarm.leave(req.body.swarm), res) })

  // List downloaded files
  router.get('/downloads', (req, res) => { processIterator(metadb.client.getDownloads(), res) })
  // List uploaded files
  router.get('/uploads', (req, res) => { processIterator(metadb.server.getUploads(), res) })
  // Send a downloaded file to the browser
  router.get('/downloads/:hash', async (req, res) => {
    const file = await metadb.client.getDownloadedFileByHash(req.params.hash)
      .catch((err) => { return err })
    if (file instanceof Error) return res.status(422).json({ err: file.message })
    res.sendFile(file.filename)
  })

  // publish a 'wall message'
  // router.post('/wall-message', (req, res) => { metadb.publish.wallMessage(req.body.message, req.body.swarmKey, Callback(res)) })
  // get wall messages for a given swarm
  // router.post('/wall-message/by-swarm-key', (req, res) => { pullback(metadb.core.api.wallMessages.pullBySwarmKey(req.body.swarmKey), res) })

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
  router.post('/stop', async (req, res) => {
    await metadb.stop().catch(handleError(res))
    res.status(200).json({})
  })

  // Handle websockes
  router.ws('/', (ws, req) => {
    metadb.on('ws', (message) => {
      console.log(122443)
      if (ws.readyState === 1) {
        log('Got message', message, 'sending thru ws')
        ws.send(JSON.stringify(message), (err) => {
          if (err) log('Error when sending message on ws.', err)
        })
      }
    })
    ws.on('close', () => {
      // Not sure if this is needed
      ws.terminate()
    })
  })

  return router
}

function handleSync (output, res) {
  if (output instanceof Error) return res.status(422).json({ error: output.message })
  res.status(200).json(output || {})
}

function handleAsync (promise, res) {
  promise
    .then((output) => { res.status(200).json(output) })
    .catch((err) => { res.status(422).json({ error: err.message }) })
}

function handleError (res) {
  return function (err) {
    if (!res.finished) res.status(422).json({ error: err.message })
  }
}

function Callback (res) {
  return function (err, result) {
    if (err) console.log(err)
    return err
      ? res.status(422).json({ error: err.message })
      : res.status(200).json(result)
  }
}

async function processIterator (iterator, res, maxEntries) {
  if (typeof maxEntries === 'string') maxEntries = parseInt(maxEntries)
  maxEntries = maxEntries || defaultMaxEntries
  const output = []
  for await (const entry of iterator) {
    output.push(entry)
    if (output.length >= maxEntries) break
  }
  // TODO handle errors
  return res.status(200).json(output)
}

function pullback (stream, res, maxEntries) {
  if (typeof maxEntries === 'string') maxEntries = parseInt(maxEntries)
  return pull(
    stream,
    pull.take(maxEntries || defaultMaxEntries),
    pull.collect(Callback(res))
  )
}

async function build (uiFilePath, options) {
  const uiFile = fs.createWriteStream(uiFilePath)
  uiFile.on('error', (err) => { return Promise.reject(err) })
  const ui = buildUi(options)
  // ui.on('end', () => { callback() })
  ui.pipe(uiFile)
}
