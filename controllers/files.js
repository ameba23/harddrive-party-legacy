
module.exports = (db, opts) => new MetadbController(db, opts)

class MetadbController {
  constructor (metadb, opts = {}) {
    this.metadb = metadb

    this.list = this.list.bind(this)
  }

  list (req, res) {
    return res
      .status(200)
      .json({ foo: 'bar' })
  }
}
