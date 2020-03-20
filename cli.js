#!/usr/bin/env node
const argv = require('minimist')(process.argv.slice(2))
const axios = require('axios')
const { inspect } = require('util')

if (argv.help || argv._[0] === 'help' || !argv._.length) {
  console.log(`
    Usage:  ${process.argv[1]} command <options>
    Commands:
      start - start metadb
      stop - stop metadb
      index <directory> - index a directory
      ls - list files
      connect <swarm> [<swarm>] - connect to one or more swarms.
      disconnect <swarm> - disconnect from one or more swarms.
                           If no swarms specified, disconnect from all swarms.
    Global options:
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
  const commands = {
    index () {
      const dir = argv._[1]
      if (!dir) {
        console.log('Missing directory to index')
        process.exit(0)
      }
      request.post('/files/index', { dir })
        .then(console.log)
        .catch(handleError)
    },
    ls () {
      request.get('/files').then(stringify).catch(handleError)
    },
    stop () {
      request.post('/stop').then(() => {
        console.log('metadb has stopped.')
      }).catch(handleError)
    },
    connect () {
      const swarm = argv._.slice(1)
      request.post('/swarm', { swarm }).then(stringify).catch(handleError)
    },
    disconnect () {
      const swarm = argv._.slice(1)
      request.delete('/swarm', { swarm }).then(stringify).catch(handleError)
    },
    getSettings () {
      request.get('/settings').then(stringify).catch(handleError)
    }
  }
  commands[argv._[0]]()
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

function handleError (err) {
  if (err.code === 'ECONNREFUSED') {
    console.log('Connection refused. Is metadb running?')
  } else {
    console.log(err)
  }
  // TODO: pass the error code
  process.exit(1)
}

function stringify (response) {
  // console.log(JSON.stringify(response, null, 4))
  console.log(inspect(response.data))
}
