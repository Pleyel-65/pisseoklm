const { spawn } = require('child_process');

module.exports.play = function(path, volume, callback) {

  console.log(`audio: playing ${path}`)

  const process = spawn('play', ['-v', volume, path], {stdio: 'ignore'})

  process.on('exit', code => {
    console.log(`aplay finished with code ${code}`)
    callback()
  })

  return () => {
    console.log(`audio : killing ${path}`)
    process.kill('SIGKILL')
  }
}

