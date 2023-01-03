const nrf24 = require('nrf24')

// state null means the radio is turned off
// holds nrf24 objects and other data when radio is turned on
let state = null; 

const paLevelValues = {
  'min': nrf24.RF24_PA_MIN,
  'low': nrf24.RF24_PA_LOW,
  'high': nrf24.RF24_PA_HIGH,
  'max': nrf24.RF24_PA_MAX,
}

const dataRateValues = {
  '1mbs': nrf24.RF24_1MBPS,
  '2mbs': nrf24.RF24_2MBPS,
  '250kbs': nrf24.RF24_250KBS,
}

const dataTypes = {
  'bool': 0,
  'int': 1,
  'uint': 2,
  'float': 3
}

let listenerNextId = 0;
const listenersIndex = {}

function safeGetValue(values, key) {
  if (!values.hasOwnProperty(key)) {
    throw new Error(`${key} not found in ${values}`)
  }
  return values[key]
}

module.exports.turnOn = function(opts) {

  if (state !== null) {
    throw new Error(`radio already turned on`)
  }

  state = {
    radio: new nrf24.nRF24(opts.pinCE, opts.csn),
    opts: opts
  }
  state.radio.begin(opts.debug)

  if (!state.radio.present()) {
    throw new Error(`radio is not connected`)
  }

  const config = {
    PALevel: safeGetValue(paLevelValues, opts.paLevel),
    EnableLna: opts.enableLna,
    DataRate: safeGetValue(dataRateValues, opts.dataRate),
    Channel: opts.channel,
    AutoAck: opts.autoAck,
    PayloadSize: opts.payloadSize,
    Irq: opts.pinIRQ,
    PollBaseTime: 5000
  }

  state.radio.config(config, opts.debug)

  const pipe = state.radio.addReadPipe(opts.addr)

  if (pipe === -1) {
    throw new Error(`failed to create radio read pipe`)
  }

  state.radio.read(onDataReceived, onListeningStopped)
}

function addListenerInIndex(listener) {

  const { origin, subject} = listener;

  if (!listenersIndex.hasOwnProperty(origin)) {
    listenersIndex[origin] = {}
  }

  if (!listenersIndex[origin].hasOwnProperty(subject)) {
    listenersIndex[origin][subject] = []
  }

  listenersIndex[origin][subject].push(listener); 
}

function removeListenerInIndex(listener) {
  const { id, origin, subject} = listener;

  listenersIndex[origin][subject] = listenersIndex[origin][subject].filter(l => l.id !== id)
}

function findListeners(origin, subject) {
  const results = []

  function _find(origin, subject) {
    if (listenersIndex.hasOwnProperty(origin)) {
      if (listenersIndex[origin].hasOwnProperty(subject)) {
        results.push(...listenersIndex[origin][subject])
      }
    }
  }

  _find(origin, subject)
  _find(origin, 'any')
  _find('any', subject)
  _find('any', 'any')

  return results;
}

module.exports.listen = function(subject, origin, callback) {
  const id = listenerNextId;
  listenerNextId += 1;

  const listener = {
    id, subject, origin, callback
  }

  addListenerInIndex(listener)

  return () => {
    removeListenerInIndex(id)
  }
}

function parsePayload(payload) {
  const message = {
    origin: payload.toString('utf8', 0, 7),
    subject: payload.toString('utf8', 8, 15),
    dataType: payload.readUint8(16),
  }

  if (message.dataType === dataTypes['bool']) {
    message.value = payload.readUint8(17) !== 0
  }
  else if (message.dataType === dataTypes['int']) {
    message.value = payload.readInt32LE(17)
  }
  else if (message.dataType === dataTypes['uint']) {
    message.value = payload.readUInt32LE(17)
  }
  else if (message.dataType === dataTypes['float']) {
    message.value = payload.readFloatLE(17)
  }
  else {
    console.error(`radio received a unknown data type in ${JSON.stringify(message)}`);
    return null;
  }

  if (message.origin === 'any' || message.subject === 'any') {
    console.warn("radio received a message with origin or subject 'any', discarding");
    return null;
  }

  return message;
}

function onDataReceived(data, n) {
  data.forEach(item => {
    const message = parsePayload(item.data)
    if (!message) {
      return ;
    }
    const listeners = findListeners(message.origin, message.subject);

    if (state.opts.debug) {
      console.debug(`radio received data : ${JSON.stringify(message)}. Found ${listeners.length} listeners.`)
    }
    listeners.forEach(l => l.callback(message.value))
  })
}

function onListeningStopped(isStopped, by_user, error_count) {
  console.log("radio has been stopped", isStopped, by_user, error_count)
}

module.exports.turnOff = function() {
  if (state === null) {
    throw new Error(`radio already turned off`)
  }

  state.radio.stopRead()
  state.radio.stopWrite()
  state.radio.destroy()
  state = null
}

module.exports.cleanup = function() {
  if (state !== null) {
    module.exports.turnOff()
  }
}