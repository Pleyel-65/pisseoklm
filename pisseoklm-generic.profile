# can be changed from pisseoklm.profile but have a default
export BASEDIR=${BASEDIR:-$HOME}
export MOOD=${MOOD:-love}
export BT_ENABLE=${BT_ENABLE:-true}

# almost never change :
source $BASEDIR/.venv/bin/activate
export VARDIR=${BASEDIR}/.pisseoklm
export CACA_LOG=${VARDIR}/caca.log
export PULSE_RUNTIME_PATH=${VARDIR}/pulse-runtime
export PAROLES_DATA_DIR=${VARDIR}/paroles
export MOODDIR=${BASEDIR}/moods/$MOOD
export MUZIK_FILE=${MOODDIR}/muzik.wav
export POLITESSE_FILE=${MOODDIR}/politesse.yaml
