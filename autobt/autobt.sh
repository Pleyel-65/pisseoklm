#!/usr/bin/env bash

set -xe
cd "$( dirname ${BASH_SOURCE[0]} )"
source ../pisseoklm.profile

if ! $ENABLE_BT; then
	echo "BT is not enabled, aborting"
	exit 0
fi

i=0
while ! ./connect-speaker.sh || ! ./set-profile.sh;
do

	i=$((i+1))

	if [ $i -gt 20 ]; then
		echo "disconnect $BT_ADDR" | bluetoothctl ;
		i=0
	fi

	sleep 1;
done
