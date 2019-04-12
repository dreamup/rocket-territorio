#!/bin/bash

sudo ./build-run.sh

cd ~/rocket-territorio/.snapcraft/

sudo rm *.snap
snapcraft clean
snapcraft stage
sudo snapcraft snap

snapcraft push --release edge *.snap
