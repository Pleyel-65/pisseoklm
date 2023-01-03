PisseOKLM
=========



# Memo

Send code to RPi :
```
rsync -a --exclude runner/node_modules . pi@192.168.1.97:~/pisseoklm
```

Remote nodejs debug :
```
node --inspect-brk=192.168.141.189:9229 main.js
```