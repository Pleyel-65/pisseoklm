#!/usr/bin/env bash

set -xe

cd "$( dirname ${BASH_SOURCE[0]} )"/..

TARGET_SSH=${TARGET_SSH:-pi@192.168.0.168}

scp requirements.txt $TARGET_SSH:~/

ssh $TARGET_SSH pip3 install --user -r requirements.txt
