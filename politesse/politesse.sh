#!/usr/bin/env bash

set -xe
cd "$( dirname ${BASH_SOURCE[0]} )"
source ../pisseoklm.profile

# /dev/urandom seems not to be random enough on rpi zero w
SHUF="shuf --random-source=/dev/random"

PARLE=../paroles/parle.sh

function choisir_bonjour() {
  yq '.bonjours[]' $POLITESSE_FILE -r | $SHUF -n 1
}

function choisir_blague() {
  yq '.blagues[]' $POLITESSE_FILE -r | $SHUF -n 1
}

function choisir_aurevoir() {
  yq '.aurevoirs[]' $POLITESSE_FILE -r | $SHUF -n 1
}


function process() {
  ts=$1
  event=$2

  if [ "$event" = "arrival" ]; then
    $PARLE "$(choisir_bonjour)"
    $PARLE "$(choisir_blague)"
  elif [ "$event" = "departure" ]; then
    $PARLE "$(choisir_aurevoir)"
  fi
}


# caca.log is populated by Luminos or other detection system
tail -n 0 -f $CACA_LOG | while IFS= read -r line; do process $line; done
