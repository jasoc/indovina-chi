#!/bin/bash

PROJECT_PATH=$(dirname -- "$(readlink -f -- "$0";)";)/../app

main()
{
    cd $PROJECT_PATH
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    npm run dev
}

main "$@"