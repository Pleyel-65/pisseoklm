#!/usr/bin/env bash    

# setup WIFI
# - create /etc/wpa_supplicant/wpa_supplicant.conf:
####
# country=fr
# update_config=1
# ctrl_interface=/var/run/wpa_supplicant

# network={
# scan_ssid=1
# ssid="Carence de cuivre"
# psk="BAUERboys98"
# }
####

# enable SSH server : empty `ssh` file in the boot partition

# install nodejs 
uname -m # see what architecture it is, rpi A+ is armv7l
ARCH=arm64 #or armv7l
wget https://nodejs.org/dist/v16.14.0/node-v16.14.0-linux-$ARCH.tar.xz 
tar -xf node-v16.14.0-linux-$ARCH.tar.xz
cd node-v16.14.0-linux-$ARCH/
sudo cp -R * /usr/local/
node --version
npm --version
cd ..
rm -rf node-v16.14.0-linux-$ARCH.tar.xz node-v16.14.0-linux-$ARCH/


# install `play` command from libsox (audio)
sudo apt install sox libsox-fmt-mp3


sudo cp pisseoklm.service /etc/systemd/system/pisseoklm.service
sudo systemctl daemon-reload
sudo systemctl enable pisseoklm