#!/usr/bin/env bash

# copy google translate speech (you should run repetition.sh prior to execute this)

set -xe

cd "$( dirname ${BASH_SOURCE[0]} )"/..

TARGET_SSH=${TARGET_SSH:-pi@192.168.0.168}

ssh $TARGET_SSH mkdir -p .pisseoklm/paroles/fr
scp .pisseoklm/paroles/fr/* $TARGET_SSH:~/.pisseoklm/fr/paroles
