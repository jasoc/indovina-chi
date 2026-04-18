#!/bin/bash

SCRIPT_PATH=$(dirname -- "$(readlink -f -- "$0";)";)
ROOT_PATH="$SCRIPT_PATH/.."
FRONTEND_PATH="$ROOT_PATH/frontend"

main()
{
    cd "$FRONTEND_PATH"
    npm run dev
}

main "$@"
