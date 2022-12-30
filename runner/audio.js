const { spawn } = require('child_process');

module.exports.play = function(path, opts, callback) {

  console.log(`audio: playing ${path}`)

  const process = spawn('play', ['-v', opts.volume, path].concat(opts.extraArgs), {stdio: 'ignore'})

  process.on('exit', code => {
    console.log(`play finished with code ${code}`)
    callback()
  })

  let killed = false;
  const kill = () => {
    if (!killed) {
      console.log(`audio : killing ${path}`)
      process.kill('SIGKILL')
      killed = true;
    }
  }

  if (opts.timeout != 0){
    setTimeout(() => {
      kill()
    }, opts.timeout * 1000);
  }

  return kill;
}