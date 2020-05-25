#!/usr/bin/env bash

set -xe

TARGET_SSH=pi@192.168.0.168
NAME=weboklm
DIST_BASE=dist
DIST=$DIST_BASE/weboklm
SERVICE=weboklm

scp $DIST.tar.gz $TARGET_SSH:~/
ssh $TARGET_SSH <<EOF
set -xe
sudo systemctl stop $SERVICE
rm -rf $NAME
tar -xzf $NAME.tar.gz
sudo systemctl start $SERVICE
EOF