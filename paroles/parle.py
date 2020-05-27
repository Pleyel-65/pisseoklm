#!/usr/bin/env python3

import sys
import hashlib
import os

PAROLES_DATA_DIR=os.environ['PAROLES_DATA_DIR']

if len(sys.argv) < 2:
    print("syntax error")
    exit(1)

if len(sys.argv) > 2:
  lang=sys.argv[2]
else:
  lang='fr'

text = sys.argv[1]
m = hashlib.sha1()
m.update(text.encode('utf-8'))
hash = m.digest().hex()
filename = PAROLES_DATA_DIR + '/' + lang + '/' + hash + '.mp3'

if not os.path.isfile(filename):
  from gtts import gTTS
  if not os.path.exists(PAROLES_DATA_DIR + '/' + lang):
    os.makedirs(PAROLES_DATA_DIR + '/' + lang)
  print("targeting google translate")
  speech = gTTS(text = text, lang = lang, slow = False)
  speech.save(filename)

print("playing " + filename)
os.system('amixer sset Master 75%')
os.system('mpg123 -f %d %s' % (int(32768 * 1.5), filename))
os.system('amixer sset Master 100%')
