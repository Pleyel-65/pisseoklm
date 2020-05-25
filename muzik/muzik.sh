#!/usr/bin/env bash

set -xe
cd "$( dirname ${BASH_SOURCE[0]} )"
source ../pisseoklm.profile

# can be overrided 
MUZIK_FILE=${MUZIK_FILE:-./muzik.wav}
CACA_LOG=${CACA_LOG:-../caca.log}

APLAY_PID=""
PLAYING=false

function play() {
  if ! $PLAYING; then
    aplay $MUZIK_FILE &
    APLAY_PID=$!
    PLAYING=true
  fi
}

function stop() {
  if $PLAYING; then
    kill -9 $APLAY_PID || true
    PLAYING=false
  fi
}

function process() {
  ts=$1
  event=$2

  if [ "$event" = "arrival" ]; then
    play
  elif [ "$event" = "departure" ]; then
    stop
  fi
}

# play silence every 30 sec
( while true; do aplay --duration=1 ./silence.wav; sleep 30 ; done ) &

# Luminos populate caca.log, Musik start and stop the music based on this log
tail -n 0 -f $CACA_LOG | while IFS= read -r line; do process $line; done
