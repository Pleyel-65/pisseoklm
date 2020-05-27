#!/usr/bin/env bash

set -xe

cd "$( dirname ${BASH_SOURCE[0]} )"/..

TARGET_SSH=${TARGET_SSH:-pi@192.168.0.168}

if [ $# -ne 1 ]; then
    echo "usage: $0 name"
    exit 1
fi

name=$1

if [ -e "$name/deploy.sh" ]; then
    ./$name/deploy.sh
else
    ssh $TARGET_SSH rm -rfv ./$name
    scp -r $(pwd)/$name $TARGET_SSH:~/$name

    if [ -e $name/setup.sh ]; then
    ssh $TARGET_SSH sudo ./$name/setup.sh
    fi
fi