#!/usr/bin/env bash

# install autobt, should run as root

set -xe

cd "$( dirname ${BASH_SOURCE[0]} )"

SERVICE=autobt
UDEV=100-pisseoklm-autobt

function install_service() {
    rm -vf /etc/systemd/system/$SERVICE.service
    ln -s $(pwd)/$SERVICE.service /etc/systemd/system/$SERVICE.service
    systemctl daemon-reload
    systemctl enable $SERVICE
}

function install_udev() {
    rm -vf /etc/udev/rules.d/$UDEV.rules
    ln -s $(pwd)/udev.rules /etc/udev/rules.d/$UDEV.rules
    udevadm control --reload-rules && udevadm trigger
}

function install_crontab() {
   (crontab -l 2>/dev/null | grep -v autobt; echo "*/1 * * * * /bin/systemctl start $SERVICE") | crontab -
}

install_service
install_udev
install_crontab

