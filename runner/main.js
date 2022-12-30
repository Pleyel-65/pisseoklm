const fs = require('fs');
const YAML = require('yaml')
const config = require('./config.json')
const httpServer = require('./httpServer.js')
const audio = require('./audio.js');
const gpio = require('./gpio.js')

let idCounter = 0
function getNewId() {
  if (idCounter > 1000000000) {
    idCounter = 0
  }
  idCounter = (idCounter + 1)
  return idCounter.toString()
}

function evaluateConstant(name) {
  if (!(name in scenario.constants)) {
    throw new Error(`ERROR: constant ${name} is not defined`)
  }
  return scenario.constants[name]
}

function evaluateScalar(scalar) {

  if (typeof scalar === 'string') {
    if (scalar.length > 0 && scalar[0] === '$') {
      return evaluateConstant(scalar.substring(1))
    }
  }

  return scalar
}

function evaluateAction(action, spec) {

  const actionEval = {...commonActionSpec.defaults, ...spec.defaults || {}, ...action}
  for (const field of spec.evaluate || []) {
    actionEval[field] = evaluateScalar(actionEval[field])
  }

  return actionEval
}

// Load the scenario
let scenarioYaml = fs.readFileSync(config.scenario.path, 'utf8');
let scenario = YAML.parse(scenarioYaml);

// initialize the state
let state = {

  timeouts: {},
  actions: {},

  suspendedEvents: {}
}

function emitEvent(event) {
  console.log(`event ${event} emitted`)

  if (event in state.suspendedEvents) {
    console.log(`event ${event} is suspended`)
    return ;
  }

  const action = scenario.events[event]
  if (action) {
    console.log(`matched action for event ${event}`)
    executeAction(scenario.events[event])
  }
} 

function executeAction(action, callback = () => {}) {

  if (!(action.type in actionSpecs)) {
    console.error(`ERROR: no handler for action of type ${action.type}`)
    return () => {}
  }

  const spec = actionSpecs[action.type]

  const actionEval = evaluateAction(action, spec)

  const id = getNewId()

  if (spec.sync) {
    spec.handler(id, actionEval, null)
    return () => {}
  }
  else {
    let finished = false
    const actionKill = spec.handler(id, actionEval, () => {
      delete state.actions[id]
      finished = true
      callback()
    })
    if (!finished) { // in case the callback was called before the returning call
      state.actions[id] = { actionEval, kill: actionKill }
    }

    return actionKill
  }
}

function executeActionAudio(id, action, callback) {

  const path = action.track; // TODO: directory

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

function executeActionSequence(id, action, callback) {

  let i = -1;
  let killed = false;
  let killCurentAction = null;

  function executeNext() {
    i += 1
    if (killed || i >= action.group.length) {
      callback()
    }
    else {
      killCurrentAction = executeAction(action.group[i], executeNext)
      // WARNING: this is tricky
      if (killCurentAction === null) { // in case next action is sync, null is returned and callback is not called
        executeNext()
      }
    }
  }

  function kill() {
    killed = true
    killCurentAction && killCurrentAction()
  }

  executeNext()

  return kill
}

function executeActionParallel(id, action, callback) {

  for (const child of action.group) {
    executeAction(child)
  }

  return null
}

function executeActionKillAll(id, action, callback) {

  for (const [itemId, item] of Object.entries(state.actions)) {
    if (itemId != id && !item.actionEval.persist) {
      item.kill && item.kill()
    }
  }
  
  return null
}

function executeActionTimer(id, action, callback) {

  const timeoutRef = setTimeout(function() {
    executeAction(action.action)
    callback()
  }, action.seconds * 1000)

  function kill() {
    clearTimeout(timeoutRef)
    callback()
  }

  return kill
}

function executeActionSuspend(id, action, callback) {

  if (action.suspend) {
    state.suspendedEvents[action.event] = true
  }
  else {
    delete state.suspendedEvents[action.event]
  }

  return null
}

function executeActionEmit(id, action, callback) {
  setImmediate(() => {
    emitEvent(action.event)
  })
  return null
}

function executeActionPinInit(id, action, callback) {
  gpio.init(action.num, action.direction, action.edge, action.pull)
}

function executePinMonitor(id, action, callback) {

  const unmonitor = gpio.monitor(action.num, (value) => {
    if (value === 0) {
      executeAction(action.low)
    }
    else {
      executeAction(action.high)  
    }
  })

  function kill() {
    console.log("killing gpio monitor")
    unmonitor()
    callback()
  }

  return kill;
}

function executePinOutput(id, action, callback) {
  gpio.write(action.num, action.value)  
}

const commonActionSpec = {
  defaults: {
    persist: false
  }
}

const actionSpecs = {
  'killAll': {
    handler: executeActionKillAll,
    sync: true,
  },
  'audio': {
    handler: executeActionAudio,
    sync: false,
    defaults: {
      repeat: false
    },
    evaluate: ['repeat', 'track']
  },
  'sequence': {
    handler: executeActionSequence,
    sync: false
  },
  'parallel': {
    handler: executeActionParallel,
    sync: true
  },
  'timer': {
    handler: executeActionTimer,
    sync: false,
    evaluate: ['seconds']
  },
  'suspend': {
    handler: executeActionSuspend,
    sync: true,
    defaults: {
      suspend: true
    },
    evaluate: ['suspend', 'event']
  },
  'emit': {
    handler: executeActionEmit,
    sync: true,
    evaluate: ['event']
  },
  'pinInit': {
    handler: executeActionPinInit,
    sync: true,
    evaluate: ['num', 'direction', 'edge', 'pull'],
    defaults: {
      edge: 'none',
      pull: null
    }
  },
  'pinMonitor': {
    handler: executePinMonitor,
    sync: false,
    evaluate: ['num'],
  },
  'pinOutput': {
    handler: executePinOutput,
    sync: true,
    evaluate: ['num', 'value'],
  }
}


//////////////////////////
// Start of the program
//////////////////////////

// Check access to I/O -> GPIO, Music...

// Start listening to event
function setupListeners() {

  // set http event listener
  if (config.httpServer.enabled) {
    httpServer.setup()
    httpServer.onEmit(emitEvent)
  }
}
setupListeners()

// start the runner
function start() {

  // program all global timers

  emitEvent('_START_')

  setInterval(() => {
    console.log("==============================")
    console.log(JSON.stringify(state, null, 2))
    console.log("==============================")
  }, 1000);
}
start()