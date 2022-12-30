#!/usr/bin/env bash

set -xe

cd "$( dirname ${BASH_SOURCE[0]} )"

TARGET_SSH=${TARGET_SSH:-pi@192.168.0.168}
NAME=weboklm
DIST_BASE=dist
DIST=$DIST_BASE/weboklm

./dist.sh
scp $DIST.tar.gz $TARGET_SSH:~/
ssh $TARGET_SSH <<EOF
set -xe
rm -rf $NAME
tar -xzf $NAME.tar.gz
sudo $NAME/setup.sh 
rm $NAME.tar.gz
EOF