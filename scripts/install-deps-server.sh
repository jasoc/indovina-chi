#!/bin/bash

SCRIPT_PATH=$(dirname -- "$(readlink -f -- "$0";)";)
ROOT_PATH="$SCRIPT_PATH/.."
SERVER_PATH="$ROOT_PATH/server"

main()
{
    cd "$SERVER_PATH"
    npm install
}

main "$@"
