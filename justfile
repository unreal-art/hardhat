set shell := ["sh", "-c"]
set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]
#set allow-duplicate-recipe
set positional-arguments
#set dotenv-filename := ".env"


import "local.Justfile"


flatten contract:
    # npx hardhat flatten {{contract}} > flat.sol
    forge flatten {{contract}} > flat.sol

t:
    pnpm run t --bail --grep "Results"; 


ignite *ARGS:
    bunx hardhat ignition deploy {{ARGS}}

test *ARGS:
    bunx hardhat test {{ARGS}}

verify contractAddress network:
  bunx hardhat verify {{contractAddress}} --network {{network}}



exchange NETWORK="torus":
    bunx hardhat deploy --network {{NETWORK}} --tags "exchange"

    bunx hardhat run scripts/exchange-config.ts --network {{NETWORK}}


sponsor-william val="1" iter="150":
    #!/bin/bash
    for i in $(seq 1 {{iter}}); do
        bun hardhat sponsor {{val}} 0x7D4e2d9D7cf03199D5E41bAB5E9930a8d9A44FD7 --network torusM
    done


run-onchain NETWORK="torus":
    bunx hardhat run scripts/run-cowsay-onchain.ts --network {{NETWORK}}


unreal NETWORK="localhost":
    bunx hardhat run scripts/run-unreal-onchain.ts --network {{NETWORK}}

deploy NETWORK *ARGS:
    bunx hardhat deploy --network {{NETWORK}} {{ARGS}}