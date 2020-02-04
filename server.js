const App = require('./')

module.exports = function (options) {
  const host = options.host || 'localhost'
  const port = options.port || 3000

  const app = App({ storage: options.storage })
  app.listen(port, host)

  console.log(require('./metadb-banner'))
  console.log(`Web interface available at http://${host}:${port}`)
}
