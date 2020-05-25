#!/usr/bin/env bash

set -xe
cd "$( dirname ${BASH_SOURCE[0]} )"
source ../pisseoklm.profile

# can be overrided 
CACA_LOG=${CACA_LOG:-../caca.log}

exec python ./luminos.py