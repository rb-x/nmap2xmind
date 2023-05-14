#!/bin/bash

EXEC_MODE="docker" # local or docker

for arg in "$@"; do
    # If --build is provided as an argument, install the docker image
    if [ "$arg" == "--install" ] && [ "$EXEC_MODE" == "docker" ]; then
        docker build -t nmap2xmind .
        exit 0
    fi
    if [ "$arg" == "--install" ] && [ "$EXEC_MODE" == "local" ]; then
        npm install
        exit 0
    fi
done


if [ $# -eq 0 ]; then
    echo "Usage: $0 <nmap-result.xml>"
    exit 1
else
    if [ "$EXEC_MODE" == "local" ] && [ -f "$1" ]; then
        node nmap2xmind.js $1
    fi
    if [ "$EXEC_MODE" == "docker" ]; then
        docker run -v $(pwd):/app nmap2xmind node nmap2xmind.js $1
    fi
fi
