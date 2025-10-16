import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import * as dotenv from "dotenv";
import "hardhat-deploy";
import { HardhatUserConfig } from "hardhat/config";
import * as process from "process";

import "@nomicfoundation/hardhat-ignition-ethers";

const ENV_FILE = process.env.CONFIG || "./.env";

console.log(`ENV_FILE is ${ENV_FILE}`);

dotenv.config({ path: ENV_FILE });

import { NetworkUserConfig } from "hardhat/types";
import { ACCOUNT_ADDRESSES, PRIVATE_KEYS } from "./utils/accounts";

let NETWORK = process.env.NETWORK || "hardhat";
const INFURA_KEY = process.env.INFURA_KEY || "";

// console.log(`infura key is ${INFURA_KEY}`)

type _Network = NetworkUserConfig & {
  ws?: string;
  faucet?: string | Array<string>;
  explorer?: string;
  confirmations?: number;
  odp?: string;
  evmVersion?: string;
};

const genesisAcc = [
  ...PRIVATE_KEYS.map((privateKey) => {
    return {
      privateKey: privateKey,
      balance: `${1000000000000000000000000n}`,
    };
  }),
];

interface _Config extends HardhatUserConfig {
  networks: {
    [network: string]: _Network;
  };
}

const config: _Config = {
  solidity: {
    version: "0.8.30", // or any version you're using
    settings: {
      evmVersion: "london", //cancum...
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
      forking: {
        url: "https://base-sepolia.g.alchemy.com/v2/uScobC3A2q3KXl956w4xsIh5VPooZJQp",
      },
      saveDeployments: true,
      // deploy: "hardhat",
      chainId: 1337,
      accounts: genesisAcc,
    },
    etherlink: {
      evmVersion: "cancum",
      url: "https://node.ghostnet.etherlink.com", // Use localhost when forking
      chainId: 128123,
      accounts: PRIVATE_KEYS,
      saveDeployments: true,
      confirmations: 1,
      explorer: "https://testnet.explorer.etherlink.com",
      faucet: ["https://faucet.etherlink.com"],
    },
    aurora: {
      forking: {
        url: "https://mainnet.aurora.dev",
      },
      url: "https://mainnet.aurora.dev",
      chainId: 1313161554,
      accounts: PRIVATE_KEYS,
      saveDeployments: true,
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
    torusV2: {
      url: "https://rpc-v2.testnet.toruschain.com/",
      ws: "wss://rpc-v2.testnet.toruschain.com/",
      explorer: "https://v2.testnet.toruscan.com",
      chainId: 8196,
      accounts: PRIVATE_KEYS,
      saveDeployments: true,
      faucet: "",
      odp: "0x51Bb4e2E3D81cd17A713f1bD3B23d3fF62712b40",
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
    // CreditCoin
    cc: {
      url: "https://rpc.cc3-testnet.creditcoin.network",
      ws: "wss://rpc.cc3-testnet.creditcoin.network",
      chainId: 102031,
      accounts: PRIVATE_KEYS,
      saveDeployments: true,
      faucet: ["<discord>"],
      explorer: "https://creditcoin-testnet.blockscout.com",
    },

    titanAI: {
      //skale testnet
      chainId: 1020352220,
      url: "https://testnet.skalenodes.com/v1/aware-fake-trim-testnet",
      ws: "wss://testnet.skalenodes.com/v1/ws/aware-fake-trim-testnet",
      accounts: PRIVATE_KEYS,
      saveDeployments: true,
      // https://testnet.portal.skale.spatitce/chains/titan
      // https://aware-fake-trim-testnet.explorer.testnet.skalenodes.com

      // Faucet:
      // https://www.sfuelstation.com/claim-sfuel/0x9c7398aEc564B94db7B932f96d2BD8010a7e8Ee2?testnet=true
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
    "aurora:testnet": {
      url: "https://testnet.aurora.dev",
      ws: "wss://aurora-testnet.drpc.org",
      chainId: 1313161555,
      saveDeployments: true,
      accounts: PRIVATE_KEYS,
      faucet: ["https://aurora.dev/faucet"],
      explorer: "https://explorer.testnet.aurora.dev",
      confirmations: 1, //bugfix: for slow
    },
    "etherlink:testnet": {
      url: "https://node.ghostnet.etherlink.com",
      ws: "wss://aurora-testnet.drpc.org",
      chainId: 1313161555,
      saveDeployments: true,
      accounts: PRIVATE_KEYS,
      faucet: ["https://aurora.dev/faucet"],
      explorer: "https://explorer.testnet.aurora.dev",
      confirmations: 1, //bugfix: for slow
    },
    somnia: {
      // https://dream-rpc.somnia.network
      url: "https://rpc.ankr.com/somnia_testnet/b538dd90abf174d5a5e91e686b9a0d2bcb80c0531c5d99fe61aa7b2a9720d453",
      chainId: 50312,
      saveDeployments: true,
      accounts: PRIVATE_KEYS,
      faucet: [""],
      explorer: "https://shannon-explorer.somnia.network",
      confirmations: 1, //bugfix: for slow
    },
  },
  etherscan: {
    apiKey: {
      torusM: "empty",
      cc: "empty",
      somnia: "empty",
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

      {
        network: "cc",
        chainId: 102031,
        urls: {
          apiURL: "https://creditcoin-testnet.blockscout.com/api",
          browserURL: "https://creditcoin-testnet.blockscout.com",
        },
      },
      {
        network: "somnia",
        chainId: 50312,
        urls: {
          apiURL: "https://shannon-explorer.somnia.network/api",
          browserURL: "https://shannon-explorer.somnia.network",
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
};

// config.networks.localhost = config.networks.hardhat

// console.log(config)
module.exports = config;

import "./tasks";
