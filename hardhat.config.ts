import { HardhatUserConfig, task } from "hardhat/config"
import "@typechain/hardhat"
import "@nomicfoundation/hardhat-toolbox"
import "@nomicfoundation/hardhat-chai-matchers"
import "@nomicfoundation/hardhat-ethers"
import "hardhat-deploy"
import * as dotenv from "dotenv"
import * as process from "process"

import "@nomicfoundation/hardhat-ignition-ethers"

const ENV_FILE = process.env.CONFIG || "./.env"

console.log(`ENV_FILE is ${ENV_FILE}`)

dotenv.config({ path: ENV_FILE })

import { ACCOUNT_ADDRESSES, PRIVATE_KEYS } from "./utils/accounts"
import { NetworkUserConfig } from "hardhat/types"

let NETWORK = process.env.NETWORK || "hardhat"
const INFURA_KEY = process.env.INFURA_KEY || ""

console.log(`infura key is ${INFURA_KEY}`)

type _Network = NetworkUserConfig & {
  ws?: string
  faucet?: string | Array<string>
  explorer?: string
  confirmations?: number
  odp?: string
}

const genesisAcc = [
  ...PRIVATE_KEYS.map((privateKey) => {
    return {
      privateKey: privateKey,
      balance: `${1000000000000000000000000n}`,
    }
  }),
]

interface _Config extends HardhatUserConfig {
  networks: {
    [network: string]: _Network
  }
}

const config: _Config = {
  solidity: {
    version: "0.8.30", // or any version you're using
    settings: {
      evmVersion: "london",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: NETWORK,
  namedAccounts: ACCOUNT_ADDRESSES,

  networks: {
    hardhat: {
      saveDeployments: true,
      // deploy: "hardhat",
      chainId: 1337,
      accounts: genesisAcc,
    },
    etherlink: {
      forking: {
        url: "https://node.mainnet.etherlink.com",
        blockNumber: 22332526,
      },
      chainId: 42793,
      accounts: genesisAcc,
      saveDeployments: true,
      fusion: {
        // TODO: add fusion contract addresses here
      },
    },
    aurora: {
      forking: {
        url: "https://node.mainnet.etherlink.com",
      },
      chainId: 1313161554,
      accounts: PRIVATE_KEYS,
      saveDeployments: true,
      fusion: {
        // TODO: add fusion contract addresses here
      },
    },
    localhost: {
      url: "http://localhost:8545",
      ws: "ws://localhost:8546",
      chainId: 1337,
      accounts: PRIVATE_KEYS,
      saveDeployments: true,
    },
    geth: {
      url: "http://localhost:8545",
      ws: "ws://localhost:8546",
      chainId: 1337,
      accounts: PRIVATE_KEYS,
      saveDeployments: true,
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_KEY}`,
      ws: `wss://sepolia.infura.io/ws/v3/${INFURA_KEY}`,
      chainId: 11155111,
      accounts: PRIVATE_KEYS,
      saveDeployments: true,
    },
    torus: {
      url: "https://rpc.testnet.toruschain.com",
      ws: "wss://rpc.testnet.toruschain.com",
      explorer: "https://testnet.toruscan.com",
      chainId: 8194,
      accounts: PRIVATE_KEYS,
      saveDeployments: true,
      faucet: "",
      odp: "0xc1c3ed9a297da8dc89f9f56c42a8549203df5262",
      confirmations: 1,
    },
    torusM: {
      url: "https://rpc.toruschain.com",
      ws: "wss://rpc.toruschain.com",
      explorer: "https://toruscan.com",
      chainId: 8192,
      accounts: PRIVATE_KEYS,
      saveDeployments: true,
      faucet: "",
      odp: "0xFF47178dAE98Cb1D61c0e46f38EB68bEa5BDE284",
      confirmations: 1,
    },
    amoy: {
      url: "https://rpc-amoy.polygon.technology",
      ws: "wss://polygon-amoy-bor-rpc.publicnode.com",
      chainId: 80002,
      accounts: PRIVATE_KEYS,
      saveDeployments: true,
      faucet: [
        "https://faucet.polygon.technology",
        // get 1 POL from discord server
      ],
    },
    base: {
      // url: "https://base-sepolia.blockpi.network/v1/rpc/public",
      url: "https://base-sepolia.g.alchemy.com/v2/uScobC3A2q3KXl956w4xsIh5VPooZJQp",
      ws: "wss://base-sepolia-rpc.publicnode.com",
      chainId: 84532,
      saveDeployments: true,
      accounts: PRIVATE_KEYS,
      faucet: [],
    },
    xdc: {
      url: "https://rpc.apothem.network",
      ws: "wss://ws.apothem.network",
      chainId: 51,
      saveDeployments: true,
      accounts: PRIVATE_KEYS,
      faucet: ["https://faucet.blocksscan.io"],
    },
    aurora: {
      url: "https://testnet.aurora.dev",
      ws: "wss://aurora-testnet.drpc.org",
      chainId: 1313161555,
      saveDeployments: true,
      accounts: PRIVATE_KEYS,
      faucet: ["https://aurora.dev/faucet"],
      explorer: "https://explorer.testnet.aurora.dev",
      confirmations: 1, //bugfix: for slow
    },
    etherlink: {
      url: "https://node.ghostnet.etherlink.com",
      ws: "wss://aurora-testnet.drpc.org",
      chainId: 1313161555,
      saveDeployments: true,
      accounts: PRIVATE_KEYS,
      faucet: ["https://aurora.dev/faucet"],
      explorer: "https://explorer.testnet.aurora.dev",
      confirmations: 1, //bugfix: for slow
    },
  },
  etherscan: {
    apiKey: {
      torusM: "empty",
      default: process.env.ETHERSCAN_API_KEY,
    },

    customChains: [
      {
        network: "torus",
        chainId: 8194,
        urls: {
          apiURL: "https://testnet.toruscan.com/api",
          browserURL: "https://testnet.toruscan.com",
        },
      },

      {
        network: "torusM",
        chainId: 8192,
        urls: {
          apiURL: "https://toruscan.com/api",
          browserURL: "http://toruscan.com",
        },
      },
    ],
  },
  sourcify: {
    // Disabled by default
    // Doesn't need an API key
    enabled: true,
    apiUrl: "https://sourcify.dev/server",
    browserUrl: "https://repo.sourcify.dev",
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
    alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
    externalArtifacts: ["externalArtifacts/*.json"], // optional array of glob patterns with external artifacts to process (for example external libs from node_modules)
    dontOverrideCompile: false, // defaults to false
  },

  ignition: {
    blockPollingInterval: 1_000,
    timeBeforeBumpingFees: 3 * 60 * 1_000,
    maxFeeBumps: 4,
    requiredConfirmations: 1,
    disableFeeBumping: false,
  },
}

// config.networks.localhost = config.networks.hardhat

// console.log(config)
module.exports = config

import "./tasks"
