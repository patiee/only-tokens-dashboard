require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
const { NetworkEnum } = require('@1inch/fusion-sdk');

// Environment variables - read once at the beginning
const ENV_VARS = {
    POLYGON_AMOY_RPC_URL: process.env.VITE_POLYGON_AMOY_RPC_URL,
    SEPOLIA_RPC_URL: process.env.VITE_SEPOLIA_RPC_URL,
    PRIVATE_KEY_1: process.env.VITE_PRIVATE_KEY_1,
    PRIVATE_KEY_2: process.env.VITE_PRIVATE_KEY_2
};

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.19",
        settings: {
            viaIR: true,
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        hardhat: {
            chainId: 1337
        },
        localhost: {
            url: "http://127.0.0.1:8545"
        },
        amoy: {
            url: ENV_VARS.POLYGON_AMOY_RPC_URL,
            accounts: [ENV_VARS.PRIVATE_KEY_1, ENV_VARS.PRIVATE_KEY_2].filter(Boolean),
            chainId: NetworkEnum.POLYGON_AMOY,
        },
        sepolia: {
            url: ENV_VARS.SEPOLIA_RPC_URL,
            accounts: [ENV_VARS.PRIVATE_KEY_1, ENV_VARS.PRIVATE_KEY_2].filter(Boolean),
            chainId: NetworkEnum.ETHEREUM_SEPOLIA,
        },
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    }
}; 