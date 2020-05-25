#!/usr/bin/env bash

set -xe

export CARD=bluez_card.$(echo -n "$BT_ADDR" | tr : _ )

if [ -z "$PULSE_RUNTIME_PATH" ]; then
	echo "no pulseaudio runime directory"
	exit 1;
fi


if ! pacmd list-cards | grep $CARD; then

	echo "BT card not ready";
	exit 1;
fi


if pacmd  list-cards  | grep a2dp_sink  | grep 'available: no'; then

	echo "a2dp sink not ready"
	exit 1;
fi

if pacmd list-cards | grep 'active profile: <a2dp_sink>'; then

	echo "a2dp profile already active"
	exit 0;
fi

if pacmd  list-cards  | grep a2dp_sink  | grep 'unknown'; then

        echo "a2dp profile is probably waiting for us... enabling it !"
	pacmd set-card-profile $CARD a2dp_sink;
        exit $?
fi

echo "don't know what is happening with pulseaudio: check this :"
pacmd  list-cards
exit 1
