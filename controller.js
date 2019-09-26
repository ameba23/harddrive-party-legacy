const pull = require('pull-stream')

module.exports = (metadb, opts) => new MetadbController(metadb, opts)

class MetadbController {
  constructor (metadb, opts = {}) {
    this.metadb = metadb

    this.queryFiles = this.queryFiles.bind(this)
    this.myFiles = this.myFiles.bind(this)
    this.query = this.query.bind(this)
    this.byExtension = this.byExtension.bind(this)
    this.filenameSubstring = this.filenameSubstring.bind(this)
    this.queryPeers = this.queryPeers.bind(this)
    this.publishAbout = this.publishAbout.bind(this)
    this.publishRequest = this.publishRequest.bind(this)
    this.indexFiles = this.indexFiles.bind(this)
  }

  queryFiles (req, res) { return pullback(this.metadb.queryFiles(), res) }
  query (req, res) { return pullback(this.metadb.query(req.body.query), res) }
  myFiles (req, res) { return pullback(this.metadb.myFiles(), res) }
  byExtension (req, res) { return pullback(this.metadb.byExtention(req.body.extention), res) }
  filenameSubstring (req, res) { return pullback(this.metadb.filenameSubstring(req.body.substring), res) }
  queryPeers (req, res) { return pullback(this.metadb.queryPeers(), res) }

  publishAbout (req, res) { this.metadb.publishAbout(req.body.name, Callback(res)) }
  publishRequest (req, res) { this.metadb.publishRequest(req.body.files, Callback(res)) }

  indexFiles (req, res) { this.metadb.indexFiles(req.body.directory, Callback(res)) }
}

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
