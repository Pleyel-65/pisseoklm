const config = require('./config.json')

const express = require('express')

const app = express()
const port = config.httpServer.port

let [busyCallback, idleCallback] = [null, null]

module.exports.setup = function() {
  app.get('/busy', (req, res) => {
    console.log("httpServer : busy")
    busyCallback && busyCallback()
    res.send('OK')
  })

  app.get('/idle', (req, res) => {
    console.log("httpServer : idle")
    idleCallback && idleCallback()
    res.send('OK')
  })
  
  app.listen(port, () => {
    console.log(`Listening on port ${port}`)
  })
}

module.exports.onBusy = function(callback) {
  busyCallback = callback
}

module.exports.onIdle = function(callback) {
  idleCallback = callback
}