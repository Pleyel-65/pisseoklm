const Gpio = require('onoff').Gpio;
const { spawnSync } = require('child_process');

let pins = {}

const pullValues = {
  'up': 'pu',
  'down': 'pd',
  'none': 'pn'
}

module.exports.init = function(num, direction, edge, pull) {
  if (num in pins) {
    throw new Error(`ERROR: pin ${num} already initialized`)
  }

  if (pull !== null) {

    if (!(pull in pullValues)) {
      throw new Error(`ERROR: pin pull value ${pull} is not correct, should be one of ${Object.keys(pullValues).join(', ')}`)
    }

    const ret = spawnSync('raspi-gpio', ['set', num, pullValues[pull]])

    if (ret.status !== 0) {
      console.log(ret.stdout.toString(), ret.stderr.toString())
      throw new Error(`ERROR: can't initalizing pin ${num} with pulling ${pull}, returned ${ret}`)
    }
  }

  pins[num] = new Gpio(num, direction, edge);
}

module.exports.monitor = function(num, callback) {

  if (!(num in pins)) {
    throw new Error(`ERROR: pin ${num} not initialized`)
  }

  const pin = pins[num]

  function watchCallback(err, value) {
    if (err) {
      throw err;
    }
    callback(value)
  }

  pin.watch(watchCallback);

  return () => {
    pin.unwatch(watchCallback);
  }
}

module.exports.write = function(num, value) {
  if (!(num in pins)) {
    throw new Error(`ERROR: pin ${num} not initialized`)
  }
  const pin = pins[num]
  pin.writeSync(value)
}

process.on('SIGINT', _ => {
  console.log("gpio : cleaning up before shutdown...")
  for (const [num, pin] of Object.entries(pins)) {
    pin.unexport()
  }
  pins = {}
});