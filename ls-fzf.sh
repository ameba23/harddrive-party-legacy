#!/bin/sh
# List and preview files using fzf: https://github.com/junegunn/fzf
./cli.js request $(./cli.js ls --limit=100000 | fzf --ansi --preview='./cli.js show {-1}' --preview-window=:wrap | awk -F' ' '{print $NF}')
