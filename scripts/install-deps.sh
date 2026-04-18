#!/bin/bash

SCRIPT_PATH=$(dirname -- "$(readlink -f -- "$0";)";)
ROOT_PATH="$SCRIPT_PATH/.."
FRONTEND_PATH="$ROOT_PATH/frontend"
SERVER_PATH="$ROOT_PATH/server"

main()
{
    cd "$SERVER_PATH"
    npm install

    cd "$FRONTEND_PATH"
    npm install
}

main "$@"
