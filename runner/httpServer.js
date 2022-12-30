const config = require('./config.json')

const express = require('express')

const app = express()
const port = config.httpServer.port

let [emitCallback ] = [null]

module.exports.setup = function() {
  app.get('/emit/:event', (req, res) => {
    console.log(`httpServer : event ${req.params.event}`);
    emitCallback(req.params.event)
    res.send('emitted')
  })

  app.listen(port, () => {
    console.log(`Listening on port ${port}`)
  })
}

module.exports.onEmit = function(callback) {
  emitCallback = callback
}
