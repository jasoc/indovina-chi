#!/bin/bash

SCRIPT_PATH=$(dirname -- "$(readlink -f -- "$0";)";)

main()
{
    "$SCRIPT_PATH/install-deps-server.sh" "$@"
    "$SCRIPT_PATH/install-deps-frontend.sh" "$@"
}

main "$@"
