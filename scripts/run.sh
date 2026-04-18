#!/bin/bash

SCRIPT_PATH=$(dirname -- "$(readlink -f -- "$0";)";)

main()
{
    "$SCRIPT_PATH/install-deps.sh" "$@"
    "$SCRIPT_PATH/start.sh" "$@"
}

main "$@"