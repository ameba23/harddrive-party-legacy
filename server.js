#!/usr/bin/env node
const argv = require('minimist')(process.argv.slice(2))
const app = require('./')
const host = argv.host || 'localhost'
const port = argv.port || 3000

if (argv.help) {
  console.log(`
    Usage:  ${process.argv[1]}
    Options:
      --port <port number> default: 3000
      --host <host> default: localhost
  `)
  process.exit(0)
}

app.listen(port, host)

console.log(require('./metadb-banner'))
console.log(`Web interface available at http://${host}:${port}`)
