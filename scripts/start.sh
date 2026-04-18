#!/bin/bash

SCRIPT_PATH=$(dirname -- "$(readlink -f -- "$0";)";)
ROOT_PATH="$SCRIPT_PATH/.."
FRONTEND_PATH="$ROOT_PATH/frontend"
SERVER_PATH="$ROOT_PATH/server"

main()
{
    cd "$SERVER_PATH"
    npm start &
    SERVER_PID=$!

    cleanup() {
        kill "$SERVER_PID" 2>/dev/null
    }

    trap cleanup EXIT INT TERM

    cd "$FRONTEND_PATH"
    npm run dev
}

main "$@"
