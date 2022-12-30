const { spawn } = require('child_process');

module.exports.play = function(path, callback) {

  console.log(`audio: playing ${path}`)

  const process = spawn('aplay', [path], {stdio: 'ignore'})

  process.on('exit', code => {
    console.log(`aplay finished with code ${code}`)
    callback()
  })

  return () => {
    console.log(`audio : killing ${path}`)
    process.kill('SIGKILL')
  }
}

