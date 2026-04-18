#!/bin/bash

SCRIPT_PATH=$(dirname -- "$(readlink -f -- "$0";)";)

main()
{
    "$SCRIPT_PATH/start-server.sh" "$@" &
    SERVER_PID=$!

    cleanup() {
        kill "$SERVER_PID" 2>/dev/null
    }

    trap cleanup EXIT INT TERM

    "$SCRIPT_PATH/start-frontend.sh" "$@"
}

main "$@"
