#!/usr/bin/env bash

# install luminos, should run as root

set -xe

cd "$( dirname ${BASH_SOURCE[0]} )"

SERVICE=weboklm

function install_service() {
    rm -vf /etc/systemd/system/$SERVICE.service
    ln -s $(pwd)/$SERVICE.service /etc/systemd/system/$SERVICE.service
    systemctl daemon-reload
    systemctl enable $SERVICE
}

install_service

