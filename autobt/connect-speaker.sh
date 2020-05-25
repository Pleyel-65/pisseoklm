#!/usr/bin/env bash

set -xe

if echo "info" | bluetoothctl | grep Connected | grep yes; then

	echo "BT speaker already connected"
	exit 0;
fi

echo "try to connect to the speaker" ;
echo "connect $BT_ADDR" | bluetoothctl  | grep successful
exit $?
