#!/usr/bin/env bash

set -xe
cd "$( dirname ${BASH_SOURCE[0]} )"
source ../pisseoklm.profile

PARLE=../paroles/parle.sh


for mood in $(ls ../moods/ | xargs -L 1 -I {} basename "{}"); do

    export POLITESSE_FILE=../moods/$mood/politesse.yaml

    for category in bonjours blagues aurevoirs; do 
        yq ".$category[]" $POLITESSE_FILE -r | tr '\n' '\0' | xargs -L 1 -0 -I {} $PARLE "{}"
    done
done
