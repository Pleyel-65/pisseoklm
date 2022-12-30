#!/usr/bin/env bash

set -xe

cd "$( dirname ${BASH_SOURCE[0]} )"/..

TARGET_SSH=${TARGET_SSH:-pi@192.168.0.168}

TEMPLATE_FILE=./pisseoklm.profile.template

# TODO: make this configurable
bt_addr="78:44:05:F2:C0:B6"
mood=love
bt_enable=true

render_template() {

    placeholder() {
        local name=$1
        local value=$2
        sed "s/{$name}/${value}/g"     
    }

    cat $TEMPLATE_FILE |
        placeholder BT_ADDR $bt_addr |
        placeholder MOOD $mood |
        placeholder BT_ENABLE $bt_enable
}

# show config before send
render_template
render_template | ssh $TARGET_SSH -T "cat > pisseoklm.profile"
scp pisseoklm-generic.profile $TARGET_SSH:~/
