require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

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
            url: process.env.POLYGON_AMOY_RPC_URL,
            accounts: [process.env.PRIVATE_KEY_1, process.env.PRIVATE_KEY_2].filter(Boolean),
            chainId: 80002,
        },
        sepolia: {
            url: process.env.SEPOLIA_RPC_URL,
            accounts: [process.env.PRIVATE_KEY_1, process.env.PRIVATE_KEY_2].filter(Boolean),
            chainId: 11155111,
        },
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    }
}; 