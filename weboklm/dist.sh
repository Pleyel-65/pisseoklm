#!/usr/bin/env bash

set -xe

NAME=weboklm
DIST_BASE=dist
DIST=$DIST_BASE/weboklm

# clean
rm -rf $DIST_BASE
mkdir -p $DIST

# build all
npm run build
npm --prefix front run build

# package backend
cp -r weboklm.sh package.json node_modules build $DIST/
cp .env.rpi $DIST/.env

# package front-end
mkdir -p $DIST/front
cp -r front/build $DIST/front/

# create archive
tar -C $DIST_BASE -czf $DIST.tar.gz $NAME
