#!/bin/bash

./build-run.sh

cd ~/rocket-territorio/.snapcraft/

snapcraft clean
snapcraft stage
sudo snapcraft snap

snapcraft push --release edge *.snap
