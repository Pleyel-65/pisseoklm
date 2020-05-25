# Pisse OKLM

EN: This is a luxury water closet steward program.

FR: Toilettes 2.0

## Generalités

Assistant pas vraiment intéligent à installer sur une raspberry pi dotée de bluetooth (e.g zero w).

La rapsberry pi est positionné dans un caninet de toilettes à côté d'une enceinte bluetooth. Le tout peut être alimenté par une batterie portable USB.

Un dispositif de detection de lumière est positionnée entre le raspberry pi et l'ampoule illuminant les toilettes pendant utilisation.

L'entrée d'un utilisateur est détectée par allumage de la lumière. L'assistant accompagne l'utiliateur dans son occupation en jouant de la musique et en raccontant des choses.

## Composants

Pulseaudio et Bluez assurent l'audio et la connexion bluetooth.

Le service `autobt` assure la (re)connnexion à l'enceinte bluetoooth.

Le service `pisseoklm` assure la detection des entrées sortie et déclenche la musique.

Le service `politesse` déclenche les séquences parlées.

Le service `weboklm` est une interface web pour controler pisseoklm à distance.

## Installation non exhaustive :/

Les paquets systèmes à installer :
- python3
- pip
- pulseaudio
- bluez

De la confiuration pour ces programmes se situe dans `./etc`.

Les paquets python (pip) :
- RPi.GPIO (via `sudo pip install rpi.GPIO`)
- yq (via `pip install --user yq`)

Installer node manuellement :
- récupérer l'archive node-v10.20.1-linux-armv6l.tar.gz (la version est importante)
- décompresser son contenu dans /home/pi
- créer un lien symbolique `ln -s /home/pi node-v10.20.1-linux-armv6l /home/pi/node`











