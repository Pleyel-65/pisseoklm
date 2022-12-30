#!/usr/bin/env bash

set -xe

for f in *.txt; do
  gtts-cli -l fr -f "$f" --output "$(basename $f .txt).mp3"
done
