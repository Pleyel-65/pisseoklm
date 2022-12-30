const fs = require('fs');
const YAML = require('yaml')
const { getAudioDurationInSeconds } = require('get-audio-duration')
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

function evaluateFunction(value) {
  if (!(value.function in functionSpecs)) {
    throw new Error(`ERROR: function ${value} is not defined`)
  }
  const spec = functionSpecs[value.function]
  const functionEval = {...spec.defaults || {}, ...value }
  for (const field of spec.evaluate || []) {
    functionEval[field] = evaluate(functionEval[field])
  }
  return spec.handler(functionEval)
}

function evaluate(value) {

  if (typeof value === 'string') {
    if (value.length > 0 && value[0] === '$') {
      return evaluate(evaluateConstant(value.substring(1)))
    }
  }

  else if (Array.isArray(value)) {
    return value.map(item => evaluate(item))
  }
  
  else if (value !== null && typeof value == 'object' && value.function) {
    return evaluate(evaluateFunction(value))
  }

  return value
}

function evaluateAction(action, spec) {

  const actionEval = {...commonActionSpec.defaults, ...spec.defaults || {}, ...action}
  for (const field of spec.evaluate || []) {
    actionEval[field] = evaluate(actionEval[field])
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

function emitEvent(event, callback = () => {}) {
  console.log(`event ${event} emitted`)

  if (event in state.suspendedEvents) {
    console.log(`event ${event} is suspended`)
    return ;
  }

  const action = scenario.events[event]
  if (action) {
    console.log(`matched action for event ${event}`)
    executeAction(scenario.events[event], callback)
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
    callback()
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
    const opts = { volume: action.volume, timeout: action.timeout, extraArgs: action.extraArgs }

    audioKill = audio.play(path, opts, () => {
      if (action.repeat && !killed) {
        audioPlay()
      }
      else {
        callback()
      }
    })
  }

  audioPlay()

  // crossOver experimentation
  if (action.crossOverAction !== null) {
    getAudioDurationInSeconds(path).then((duration) => {

      if (action.timeout > 0) {
        duration = Math.min(duration, action.timeout)
      }

      executeAction({
        type: "timer",
        action: action.crossOverAction,
        seconds: action.crossOverSeconds > 0 ? action.crossOverSeconds : duration + action.crossOverSeconds
      })
    })
  }

  return () => {
    killed = true;
    audioKill && audioKill()
  }
}

function executeActionSequence(id, action, callback) {

  let i = -1;
  let killed = false;

  function executeNext() {
    i += 1
    if (killed || i >= action.group.length) {
      callback()
    }
    else {      
        executeAction(action.group[i], () => setImmediate(executeNext))
    }
  }

  function kill() {
    killed = true
  }

  setImmediate(executeNext)

  return kill
}

function executeActionParallel(id, action, callback) {

  for (const child of action.group) {
    // setImmediate(() => executeAction(child))
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

  if (action.then) {
    //setImmediate(() => executeAction(action.then))
    executeAction(action.then)
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

function executeActionLoop(id, action, callback) {

  let i = -1;
  let killed = false;

  function executeNext() {
    i += 1
    if (killed || (action.count !== 'infinite' && i >= action.count)) {
      callback()
    }
    else {      
        executeAction(action.action, () => setImmediate(executeNext))
    }
  }

  function kill() {
    killed = true
  }

  setImmediate(executeNext)

  return kill
}

function executeActionSleep(id, action, callback) {

  const timeoutRef = setTimeout(function() {
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
  // setImmediate(() => {
  //   emitEvent(action.event)
  // })
  emitEvent(action.event)
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
      repeat: false,
      volume: 1,
      timeout: 0,
      extraArgs: [],
      crossOverAction: null,
      crossOverSeconds: -1,
    },
    evaluate: ['repeat', 'track', 'volume', 'timeout', 'extraArgs', 'crossOver', 'crossOverSeconds']
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
  'loop': {
    handler: executeActionLoop,
    sync: false,
    evaluate: ['count']
  },
  'sleep': {
    handler: executeActionSleep,
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

function executeFunctionRandomChoice(functionEval) {
  return functionEval.choices[Math.floor(Math.random() * functionEval.choices.length)];
} 

function executeFunctionRandomInt(functionEval) {
  return Math.floor(Math.random() * (functionEval.max - functionEval.min + 1)) + functionEval.min;
}

function executeFunctionRandomFloat(functionEval) {
  return Math.random() * (functionEval.max - functionEval.min) + functionEval.min;
}

function executeFunctionRandomBool(functionEval) {
  return Math.random() < 0.5;
}

const functionSpecs = {
  'randomChoice': {
    handler: executeFunctionRandomChoice,
    evaluate: ['choices']
  },
  'randomInt': {
    handler: executeFunctionRandomInt,
    evaluate: ['min', 'max'],
    defaults: {
      min: 0
    }
  },
  'randomFloat': {
    handler: executeFunctionRandomFloat,
    evaluate: ['min', 'max'],
    defaults: {
      min: 0
    }
  },
  'randomBool': {
    handler: executeFunctionRandomBool,
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

function stop() {
  console.log("SIGINT received, emit _STOP_ event")
  emitEvent('_STOP_', () => {
    gpio.cleanup()
    process.exit()
  })
}
process.on('exit', stop);
process.on('SIGINT', stop);
process.on('SIGUSR1', stop);
process.on('SIGUSR2', stop);

start()