const config = require('./config.json')
const httpServer = require('./httpServer.js')
const audio = require('./audio.js')

let idCounter = 0
function getNewId() {
  if (idCounter > 1000000000) {
    idCounter = 0
  }
  idCounter = (idCounter + 1)
  return idCounter
}

// Load the scenario
let scenario = {
  
  tracks: {
    "test1": "data/music-test1.mp3",
    "test2": "data/music-test2.mp3"
  },

  global: {
    timers: [
    ]
  },

  busy: {
    timers: [
      {
        seconds: 0,
        action: {
          type: "audio",
          track: "test2",
          repeat: false,
        },
      }
    ],
  },

  idle: {
    timers: [
      {
        seconds: 5,
        action: {
          type: "audio",
          track: "test1",
          repeat: false,
        },
      }
    ],
  }
}

let state = {
  isBusy: false,

  busy: {
    timeouts: {},
    actions: {}
  },

  idle: {
    timeouts: {},
    actions: {}
  },

  global: {
    timeouts: {},
    actions: {}
  }
}


function getSubScenario(isBusy) {
  return isBusy ? scenario.busy : scenario.idle
}

function getSubState(isBusy) {
  return isBusy ? state.busy : state.idle
}

function setState(isBusy) {
  if (state.isBusy !== isBusy) {

    // kill all actions and timeout of current state
    killAll(getSubState(state.isBusy))

    state.isBusy = isBusy


    // schedule all timers for the current state
    const subScenario = getSubScenario(state.isBusy)
    const subState = getSubState(state.isBusy)

    schedule(subScenario, subState)
  }
}

function schedule(subScenario, subState) {
  scheduleTimers(subScenario, subState)
}

function scheduleTimers(subScenario, subState) {
  for (const timerItem of subScenario.timers) {
    const id = getNewId()
    const timeoutRef = setTimeout(function() {
      executeAction(timerItem.action, subState)
      delete subState.timeouts[id]
    }, timerItem.seconds * 1000)
    subState.timeouts[id] = { ref: timeoutRef, survivor: false }
  }
} 

function executeAction(action, subState) {
  if (!(action.type in actionHandlers)) {
    console.error(`ERROR: no handler for action of type ${action.type}`)
  }
  else {
    const id = getNewId()
    const actionKill = actionHandlers[action.type](action, () => {
      delete subState.actions[id]
    })
    subState.actions[id] = { kill: actionKill, survivor: false }
  }
}

function executeActionAudio(action, callback) {

  if (!(action.track in scenario.tracks)) {
    console.log(`ERROR: track ${action.track} is not listed`)
    return () => {};
  }

  const path = scenario.tracks[action.track]

  let audioKill = null;
  let killed = false
  function audioPlay() {
    audioKill = audio.play(path, () => {
      if (action.repeat && !killed) {
        audioPlay()
      }
      else {
        callback()
      }
    })
  }

  audioPlay()
  return () => {
    killed = true;
    audioKill && audioKill()
  }
}

const actionHandlers = {
  'audio': executeActionAudio,
}

function killAll(subState, force = false) {
  killAllTimeouts(subState, force)
  killAllActions(subState, force)
}

function killAllTimeouts(subState, force = false) {

  const newTimeouts = []
  for (const [key, item] of Object.entries(subState.timeouts)) {
    if (force || !item.survivor) {
      clearTimeout(item.ref)
    }
    else {
      newTimeouts.push(item)
    }
  }
  subState.timeouts = newTimeouts
}

function killAllActions(subState, force = false) {

  const newActions = []
  for (const [key, item] of Object.entries(subState.actions)) {
    if (force || !item.survivor) {
      item.kill && item.kill()
    }
    else {
      newActions.push(item)
    }
  }
  subState.actions = newActions
}

//////////////////////////
// Start of the program
//////////////////////////

// Check access to I/O -> GPIO, Music...

// Start listening to event
function setupListeners() {

  // setup busy/idle listeners
  //    - GPIO
  //    - HTTP

  if (config.httpServer.enabled) {
    httpServer.setup()
    httpServer.onBusy(() => setState(true))
    httpServer.onIdle(() => setState(false))
  }
}
setupListeners()

// start the runner
function start() {

  // program all global timers

  schedule(scenario.global, state.global)
}
start()