const Gpio = require('onoff').Gpio;

const pins = {}

module.exports.init = function(num, direction, edge) {
  if (num in pins) {
    console.error(`ERROR: pin ${num} already initialized`)
    return ;
  }

  console.log(num, direction, edge)
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