const player = require('play-sound')(opts = {})


module.exports.play = function(path, callback) {

  console.log(`audio: playing ${path}`)

  const audio = player.play(path, function(err){
    if (err && !err.killed) {
      console.error(`ERROR: a problem occurred with audio file ${path}`, err)
    }
    callback()
  })

  return () => {
    console.log(`audio : killing ${path}`)
    audio.kill()
  }
}

