#!/usr/bin/env bash

set -xe

cd "$( dirname ${BASH_SOURCE[0]} )"/..

./deploy/deploy_profile.sh
./deploy/deploy_pyp.sh

./deploy/deploy_module.sh moods
./deploy/deploy_module.sh autobt
./deploy/deploy_module.sh luminos
./deploy/deploy_module.sh muzik
./deploy/deploy_module.sh paroles
./deploy/deploy_module.sh politesse
./deploy/deploy_module.sh weboklm



