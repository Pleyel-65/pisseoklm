#!/usr/bin/env bash

set -xe
cd "$( dirname ${BASH_SOURCE[0]} )"
source ../pisseoklm.profile

exec python ./parle.py "$@"