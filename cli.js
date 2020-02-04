#!/usr/bin/env node
const argv = require('minimist')(process.argv.slice(2))
const axios = require('axios')

if (argv.help || argv._[0] === 'help' || !argv._.length) {
  console.log(`
    Usage:  ${process.argv[1]} command <options>
    Commands:
      start - start metadb
    Options:
      --port <port number> default: 3000
      --host <host> default: localhost
  `)
  process.exit(0)
}

if (argv._[0] === 'start') {
  const server = require('./server')
  server(argv)
} else {
  const request = Request(argv)
  switch (argv._[0]) {
    case 'files':
      console.log('hello')
      break
  }
}

function Request (options) {
  const host = options.host || 'localhost'
  const port = options.port || 3000
  return axios.create({
    baseURL: `http://${host}:${port}/`,
    timeout: 1000,
    headers: { 'Content-type': 'application/json' }
  })
}
