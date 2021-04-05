#!/usr/bin/env node
const argv = require('minimist')(process.argv.slice(2))
const { red, yellow, blue, green, magenta, grey } = require('chalk')
const axios = require('axios')
const { sep, basename } = require('path')
const { inspect } = require('util')
const { version } = require('./package.json')

const DEFAULTHOST = process.env.METADB_HOST || 'localhost'
const DEFAULTPORT = process.env.METADB_PORT || 2323
const REQUEST_TIMEOUT = 5000

function displayHelp () {
  console.log(`metadb version ${version}

    Usage:  ${magenta(basename(process.argv[1]))} ${green('command')} options
    Commands:
      ${green('start')} - start metadb
        options:
          --httpsKey ${yellow('<path to key file>')} Default: dont use https
          --httpsCert ${yellow('<path to cert file>')}
      ${green('stop')} - stop metadb
      ${green('index')} ${yellow('<directory>')} - begin indexing a directory
      ${green('stopIndex')} ${yellow('<directory>')} - cancel index a directory
      ${green('ls')} - list files
      ${green('search')} ${yellow('<search terms>')} - filename substring search
      ${green('show')} ${yellow('<hash>')} - show details of a given file
      ${green('peers')} - list peers
      ${green('settings')} - list settings
      ${green('connect')} ${yellow('<swarm>')} [${yellow('<swarm>')}] - connect to one or more swarms.
                            If no swarm specified, connect to a new private swarm.
      ${green('disconnect')} ${yellow('<swarm>')} - disconnect from one or more swarms.
                           If no swarms specified, disconnect from all swarms.
      ${green('request')} ${yellow('<hash(es)>')} - request one or more files by hash

    Global options:
      --debug turn on logging
      --host ${yellow('<host>')} default: localhost
      --port ${yellow('<port number>')} default: 2323
      --https - use https
      --basicAuthUser ${yellow('<username>')} - username for http basic auth
      --basicAuthPassword ${yellow('<password>')} - password for http basic auth
  `)
}

if (!argv._.length) {
  displayHelp()
  argv._ = ['settings']
}

if (argv.help || argv._[0] === 'help') {
  displayHelp()
  process.exit(0)
}

if (argv.debug) {
  process.env.DEBUG = 'metadb*'
}

if (argv._[0] === 'start') {
  const server = require('.')
  server(argv)
} else {
  const request = Request(argv)
  const commands = {
    index () {
      const dir = argv._[1]
      if (!dir) {
        console.log('Missing directory to index')
        process.exit(1)
      }
      request.post('/files/index', { dir, options: { skipExtraction: argv.skipExtraction } })
        .then((res) => {
          console.log(`Beginning indexing of directory ${JSON.parse(res.config.data).dir}`)
        })
        .catch(handleError)
    },
    stopIndex () {
      const dir = argv._[1]
      request.delete('/files/index', { dir })
        .then((res) => {
          console.log('Stopped indexing.')
        })
        .catch(handleError)
    },
    search () {
      const searchterm = argv._.slice(1).join(' ')
      request.post('/files/search', { searchterm }).then(displayFiles).catch(handleError)
    },
    subdir () {
      const subdir = argv._[1]
      const opts = { oneLevel: argv.oneLevel, connectedPeersOnly: argv.connectedPeersOnly }
      request.post('/files/subdir', { subdir, opts }).then(displayFiles).catch(handleError)
    },
    wishlist () {
      request.get('/request').then(stringify).catch(handleError)
    },
    availableFiles () {
      request.get('/files', { params: { fromConnectedPeers: true } }).then(displayFiles).catch(handleError)
    },
    peers () {
      request.get('/peers').then(stringify).catch(handleError)
    },
    ls () {
      const LIMIT = argv.limit
      request.get('/files', { params: { LIMIT } }).then(displayFiles).catch(handleError)
    },
    stop () {
      request.post('/stop').then(() => {
        console.log('metadb has stopped.')
      }).catch(handleError)
    },
    show () {
      const sha256 = argv._[1]
      if (!sha256) {
        console.log(red('Missing hash argument'))
        process.exit(1)
      }
      request.get(`/files/${sha256}`).then(stringify).catch(handleError)
    },
    request () {
      const files = argv._.slice(1)
      request.post('/request', { files }).then(stringify).catch(handleError)
    },
    connect () {
      const swarm = argv._.slice(1)
      request.post('/swarm', { swarm }).then(stringify).catch(handleError)
    },
    disconnect () {
      const swarm = argv._.slice(1)
      request.delete('/swarm', { swarm }).then(stringify).catch(handleError)
    },
    settings () {
      request.get('/settings').then(displaySettings).catch(handleError)
    }
  }

  if (typeof commands[argv._[0]] !== 'function') {
    console.log(red(`${argv._[0]} is not a command!`))
    displayHelp()
    process.exit(1)
  }

  commands[argv._[0]]()
}

function Request (options = {}) {
  const host = options.host || DEFAULTHOST
  const port = options.port || DEFAULTPORT
  const useHttps = options.https
  return axios.create({
    baseURL: `http${useHttps ? 's' : ''}://${host}:${port}/`,
    timeout: REQUEST_TIMEOUT,
    headers: { 'Content-type': 'application/json' },
    auth: (options.basicAuthUser && options.basicAuthPassword)
      ? { username: options.basicAuthUser, password: options.basicAuthPassword }
      : undefined
  })
}

function handleError (err) {
  console.log(red(err.code === 'ECONNREFUSED'
    ? 'Connection refused. Is metadb running?'
    : err.response.data.error
  ))
  // TODO: pass the error code
  process.exit(1)
}

function stringify (response) {
  // console.log(JSON.stringify(response, null, 4))
  console.log(inspect(response.data, { colors: true, depth: Infinity }))
}

function displayPath (filePath) {
  // Reverse path, so more relevant parts appear first
  const reverse = true
  if (Array.isArray(filePath)) {
    if (filePath.length > 1) {
      return filePath.map(displayPath).join(', ')
    }
    filePath = filePath[0]
  }
  const arr = filePath.split(sep)
  if (reverse) arr.reverse()
  const filenamePosition = reverse ? 0 : arr.length - 1

  return arr.map((comp, i) => {
    const outputColor = (i === filenamePosition) ? green : blue
    const trailing = (i === arr.length - 1) ? '' : grey(sep)
    return `${outputColor(comp)}${trailing}`
  }).join('')
}

function displayFiles (res) {
  res.data.forEach((f) => {
    if (f.dir) return console.log(blue(f.dir))

    console.log(displayPath(f.filename), red(readableBytes(f.size)), grey(f.sha256))
  })
}

function displaySettings ({ data }) {
  console.log(`${data.filesInDb} files in db, ${readableBytes(data.bytesInDb)}, ${data.peers.length} known peers.`)
  const connectedSwarms = Object.keys(data.swarms).filter(s => data.swarms[s])
  console.log(connectedSwarms.length ? `Connected swarms: ${yellow(connectedSwarms)}` : 'Not connected.')
  console.log(`Download path: ${yellow(data.downloadPath)}`)
  if (data.indexing) console.log(`Indexing - ${yellow(data.indexing)} - ${data.indexProgrss}% done...`)
  if (argv.test) console.log(data)
}

function readableBytes (bytes) {
  if (bytes < 1) return 0 + ' B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  return (bytes / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + sizes[i]
}
