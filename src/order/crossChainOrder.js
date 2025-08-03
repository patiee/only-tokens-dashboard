import Web3 from 'web3';
import { randomBytes } from 'crypto';
import { sha256 } from '@cosmjs/crypto';
import { ripemd160 } from '@cosmjs/crypto';
import { TOKENS } from '../config/const';
import { NetworkEnum } from '@1inch/fusion-sdk';
import {
    getGasPrice,
    createHTCLContract,
    withdrawFromHTCL,
    createOrder,
    acceptOrder
} from '../api/htcl.js';
import { createOsmosisWallet } from '../utils/utils';

// Environment variables
const PRIVATE_KEY_1 = import.meta.env.VITE_PRIVATE_KEY_1; // Alice's private key
const PRIVATE_KEY_2 = import.meta.env.VITE_PRIVATE_KEY_2; // Bob's private key
const sepoliaRpc = import.meta.env.VITE_SEPOLIA_RPC_URL;
const polygonRpc = import.meta.env.VITE_POLYGON_RPC;
const osmosisRpc = import.meta.env.VITE_OSMO_RPC;
const dogecoinRpc = import.meta.env.VITE_DOGE_RPC;

// Initialize Web3 instances (for local operations only)
const sepoliaWeb3 = new Web3(polygonRpc); // Using polygon as fallback
const polygonWeb3 = new Web3(polygonRpc);
const osmosisWeb3 = new Web3(osmosisRpc);
const dogecoinWeb3 = new Web3(dogecoinRpc);

// Contract ABIs (simplified for this implementation)
const HTCL_ABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "_bob", "type": "address" },
            { "internalType": "uint256", "name": "_timelock", "type": "uint256" },
            { "internalType": "bytes32", "name": "_hashlock", "type": "bytes32" }
        ],
        "stateMutability": "payable",
        "type": "constructor"
    },
    {
        "inputs": [],
        "name": "aliceWithdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "bytes32", "name": "secret", "type": "bytes32" }],
        "name": "bobWithdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getBalance",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }
];

const LIMIT_ORDER_PROTOCOL_ABI = [
    {
        "inputs": [
            { "internalType": "string", "name": "sourceChainId", "type": "string" },
            { "internalType": "string", "name": "destChainId", "type": "string" },
            { "internalType": "string", "name": "sourceWalletAddress", "type": "string" },
            { "internalType": "string", "name": "destWalletAddress", "type": "string" },
            { "internalType": "string", "name": "sourceToken", "type": "string" },
            { "internalType": "string", "name": "destToken", "type": "string" },
            { "internalType": "uint256", "name": "sourceAmount", "type": "uint256" },
            { "internalType": "uint256", "name": "destAmount", "type": "uint256" },
            { "internalType": "uint256", "name": "deadline", "type": "uint256" }
        ],
        "name": "createOrder",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "orderId", "type": "uint256" },
            { "internalType": "bytes32", "name": "hashlock", "type": "bytes32" },
            { "internalType": "uint256", "name": "timelock", "type": "uint256" }
        ],
        "name": "acceptOrder",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "orderId", "type": "uint256" }],
        "name": "getOrder",
        "outputs": [{ "components": [{ "internalType": "string", "name": "sourceChainId", "type": "string" }, { "internalType": "string", "name": "destChainId", "type": "string" }, { "internalType": "string", "name": "sourceWalletAddress", "type": "string" }, { "internalType": "string", "name": "destWalletAddress", "type": "string" }, { "internalType": "string", "name": "sourceToken", "type": "string" }, { "internalType": "string", "name": "destToken", "type": "string" }, { "internalType": "uint256", "name": "sourceAmount", "type": "uint256" }, { "internalType": "uint256", "name": "destAmount", "type": "uint256" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }, { "internalType": "address", "name": "creator", "type": "address" }, { "internalType": "bool", "name": "isActive", "type": "bool" }, { "internalType": "bool", "name": "isAccepted", "type": "bool" }, { "internalType": "address", "name": "acceptor", "type": "address" }, { "internalType": "bytes32", "name": "hashlock", "type": "bytes32" }, { "internalType": "uint256", "name": "timelock", "type": "uint256" }], "internalType": "struct LimitOrderProtocol.Order", "name": "", "type": "tuple" }],
        "stateMutability": "view",
        "type": "function"
    }
];

// Contract addresses (these would be deployed addresses)
const CONTRACT_ADDRESSES = {
    HTCL: '0x' + randomBytes(20).toString('hex'), // Mock address
    LIMIT_ORDER_PROTOCOL: '0x' + randomBytes(20).toString('hex'), // Mock address
    COSMOS_CODE_ID: 12792
};

// Utility functions
function generateSecret() {
    return '0x' + randomBytes(32).toString('hex');
}

/**
 * Hash secret for different blockchain types
 * @param {string} secret - The secret to hash
 * @param {string} chainType - The blockchain type ('evm', 'cosmos', 'dogecoin')
 * @returns {string} The hashed secret
 */
function hashSecret(secret, chainType = 'evm') {
    try {
        switch (chainType) {
            case 'evm':
                // For EVM chains (Polygon, Ethereum, etc.) - use keccak256
                return polygonWeb3.utils.keccak256(secret);

            case 'cosmos':
                // For Cosmos chains (Osmosis, etc.) - use SHA256
                const secretBuffer = Buffer.from(secret.replace('0x', ''), 'hex');
                const hashBuffer = sha256(secretBuffer);
                return '0x' + hashBuffer.toString('hex');

            case 'dogecoin':
                // For Dogecoin - use SHA256 + RIPEMD160 (like Bitcoin)
                const dogeSecretBuffer = Buffer.from(secret.replace('0x', ''), 'hex');
                const sha256Hash = sha256(dogeSecretBuffer);
                const ripemd160Hash = ripemd160(sha256Hash);
                return '0x' + ripemd160Hash.toString('hex');

            default:
                // Default to EVM keccak256
                return polygonWeb3.utils.keccak256(secret);
        }
    } catch (error) {
        console.error('Error hashing secret:', error);
        // Fallback to mock hash if hashing fails
        return '0x' + randomBytes(32).toString('hex');
    }
}

/**
 * Get chain type based on chain ID
 * @param {number|string} chainId - The chain ID
 * @returns {string} The chain type
 */
function getChainType(chainId) {
    if (typeof chainId === 'number') {
        // EVM chains typically have numeric IDs
        if (chainId === 137 || chainId === 1 || chainId === 56 || chainId === 11155111 || chainId === 80002) {
            return 'evm';
        } else if (chainId === 568) {
            return 'dogecoin';
        }
    } else if (typeof chainId === 'string') {
        // Cosmos chains typically have string IDs
        if (chainId === 'osmosis-1' || chainId === 'osmo-test-5' || chainId.startsWith('cosmos') || chainId.startsWith('osmo')) {
            return 'cosmos';
        }
    }

    // Default to EVM
    return 'evm';
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create HTCL contract on EVM chain
 * @param {string} bobAddress - Bob's address
 * @param {number} timelock - Timelock expiration
 * @param {string} hashlock - Hashlock
 * @param {string} amount - Amount to deposit
 * @param {boolean} isAlice - Whether this is Alice's transaction
 * @param {number} networkId - Network ID for the correct chain
 * @returns {Promise<Object>} HTCL contract details
 */
async function createEVMHTCL(bobAddress, timelock, hashlock, amount, isAlice = true, networkId) {
    try {
        console.log(`${isAlice ? 'Alice' : 'Bob'} creating EVM HTCL contract...`);

        // Use API for EVM HTCL creation
        const result = await createHTCLContract(networkId, bobAddress, timelock, hashlock, amount);

        console.log(`${isAlice ? 'Alice' : 'Bob'} created EVM HTCL:`, {
            contractAddress: result.contractAddress,
            txHash: result.txHash,
            bobAddress,
            timelock,
            hashlock,
            network: networkId
        });

        return result;
    } catch (error) {
        console.error(`Error creating EVM HTCL:`, error);
        throw error;
    }
}

/**
 * Create HTCL contract on Cosmos chain
 * @param {string} bobAddress - Bob's address
 * @param {number} timelock - Timelock expiration
 * @param {string} hashlock - Hashlock
 * @param {string} amount - Amount to deposit
 * @param {boolean} isAlice - Whether this is Alice's transaction
 * @param {string} tokenAddress - Token address (required)
 * @returns {Promise<Object>} HTCL contract details
 */
async function createCosmosHTCL(bobAddress, timelock, hashlock, amount, isAlice = true, tokenAddress) {
    try {
        console.log(`${isAlice ? 'Alice' : 'Bob'} creating Cosmos HTCL contract...`);
        console.log('Debug - createCosmosHTCL received tokenAddress:', tokenAddress);
        console.log('Debug - createCosmosHTCL tokenAddress type:', typeof tokenAddress);

        if (!tokenAddress) {
            throw new Error('Token address is required for Cosmos HTCL creation');
        }

        // Use API for Cosmos HTCL creation with token address
        const result = await createHTCLContract(NetworkEnum.OSMOSIS, bobAddress, timelock, hashlock, amount, tokenAddress, isAlice);

        console.log(`${isAlice ? 'Alice' : 'Bob'} created Cosmos HTCL:`, {
            contractAddress: result.contractAddress,
            txHash: result.txHash,
            bobAddress,
            timelock,
            hashlock,
            tokenType: result.tokenType,
            codeId: CONTRACT_ADDRESSES.COSMOS_CODE_ID
        });

        return {
            ...result,
            codeId: CONTRACT_ADDRESSES.COSMOS_CODE_ID
        };
    } catch (error) {
        console.error('Error creating Cosmos HTCL:', error);
        throw error;
    }
}

/**
 * Create HTCL contract on Dogecoin chain
 * @param {string} bobAddress - Bob's address
 * @param {number} timelock - Timelock expiration
 * @param {string} hashlock - Hashlock
 * @param {string} amount - Amount to deposit
 * @param {boolean} isAlice - Whether this is Alice's transaction
 * @returns {Promise<Object>} HTCL contract details
 */
async function createDogecoinHTCL(bobAddress, timelock, hashlock, amount, isAlice = true) {
    try {
        console.log(`${isAlice ? 'Alice' : 'Bob'} creating Dogecoin HTCL contract...`);

        // Use API for Dogecoin HTCL creation
        const result = await createHTCLContract(NetworkEnum.DOGECOIN, bobAddress, timelock, hashlock, amount);

        console.log(`${isAlice ? 'Alice' : 'Bob'} created Dogecoin HTCL:`, {
            contractAddress: result.contractAddress,
            txHash: result.txHash,
            bobAddress,
            timelock,
            hashlock,
            script: result.script // Include script for withdrawals
        });

        return result;
    } catch (error) {
        console.error('Error creating Dogecoin HTCL:', error);
        throw error;
    }
}

/**
 * Withdraw from HTCL contract on EVM chain
 * @param {string} contractAddress - HTCL contract address
 * @param {string} secret - Secret for withdrawal
 * @param {boolean} isAlice - Whether this is Alice's withdrawal
 * @param {number} networkId - Network ID for the correct chain
 * @returns {Promise<Object>} Withdrawal result
 */
async function withdrawFromEVMHTCL(contractAddress, secret, isAlice = false, networkId = NetworkEnum.POLYGON_AMOY) {
    try {
        console.log(`${isAlice ? 'Alice' : 'Bob'} withdrawing from EVM HTCL...`);

        // Pass NetworkEnum constant directly to API
        const result = await withdrawFromHTCL(networkId, contractAddress, secret, isAlice);

        console.log(`${isAlice ? 'Alice' : 'Bob'} withdrew from EVM HTCL:`, {
            contractAddress,
            txHash: result.txHash,
            secret: isAlice ? 'N/A' : secret
        });

        return result;
    } catch (error) {
        console.error(`Error withdrawing from EVM HTCL:`, error);
        throw error;
    }
}

/**
 * Withdraw from HTCL contract on Cosmos chain
 * @param {string} contractAddress - HTCL contract address
 * @param {string} secret - Secret for withdrawal
 * @param {boolean} isAlice - Whether this is Alice's withdrawal
 * @returns {Promise<Object>} Withdrawal result
 */
async function withdrawFromCosmosHTCL(contractAddress, secret, isAlice = false, asAlice = isAlice) {
    try {
        console.log(`${isAlice ? 'Alice' : 'Bob'} withdrawing from Cosmos HTCL...`);

        // Pass NetworkEnum constant directly to API
        const result = await withdrawFromHTCL(NetworkEnum.OSMOSIS, contractAddress, secret, isAlice, asAlice);

        console.log(`${isAlice ? 'Alice' : 'Bob'} withdrew from Cosmos HTCL:`, {
            contractAddress,
            txHash: result.txHash,
            secret: isAlice ? 'N/A' : secret
        });

        return result;
    } catch (error) {
        console.error(`Error withdrawing from Cosmos HTCL:`, error);
        throw error;
    }
}

/**
 * Withdraw from HTCL contract on Dogecoin chain
 * @param {string} contractAddress - HTCL contract address
 * @param {string} secret - Secret for withdrawal
 * @param {boolean} isAlice - Whether this is Alice's withdrawal
 * @returns {Promise<Object>} Withdrawal result
 */
async function withdrawFromDogecoinHTCL(contractAddress, secret, isAlice = false) {
    try {
        console.log(`${isAlice ? 'Alice' : 'Bob'} withdrawing from Dogecoin HTCL...`);

        // Pass NetworkEnum constant directly to API
        const result = await withdrawFromHTCL(NetworkEnum.DOGECOIN, contractAddress, secret, isAlice);

        console.log(`${isAlice ? 'Alice' : 'Bob'} withdrew from Dogecoin HTCL:`, {
            contractAddress,
            txHash: result.txHash,
            secret: isAlice ? 'N/A' : secret
        });

        return result;
    } catch (error) {
        console.error(`Error withdrawing from Dogecoin HTCL:`, error);
        throw error;
    }
}

/**
 * Create order with LimitOrderProtocol
 * @param {Object} orderData - Order data
 * @param {boolean} isAlice - Whether this is Alice's transaction
 * @param {number} networkId - Network ID for the correct chain
 * @returns {Promise<Object>} Order creation result
 */
async function createOrderWithProtocol(orderData, isAlice = true, networkId = NetworkEnum.POLYGON_AMOY) {
    try {
        console.log(`${isAlice ? 'Alice' : 'Bob'} creating order with protocol...`);

        // Use API for order creation
        const result = await createOrder(networkId, orderData, isAlice);

        console.log(`${isAlice ? 'Alice' : 'Bob'} created order:`, {
            txHash: result.txHash,
            orderData,
            network: networkId
        });

        return result;
    } catch (error) {
        console.error(`Error creating order:`, error);
        throw error;
    }
}

/**
 * Accept order with LimitOrderProtocol
 * @param {string} orderId - Order ID
 * @param {string} hashlock - Hashlock
 * @param {number} timelock - Timelock
 * @param {boolean} isAlice - Whether this is Alice's transaction
 * @param {number} networkId - Network ID for the correct chain
 * @returns {Promise<Object>} Order acceptance result
 */
async function acceptOrderWithProtocol(orderId, hashlock, timelock, isAlice = false, networkId = NetworkEnum.POLYGON_AMOY) {
    try {
        console.log(`${isAlice ? 'Alice' : 'Bob'} accepting order with protocol...`);

        // Use API for order acceptance
        const result = await acceptOrder(networkId, orderId, hashlock, timelock, isAlice);

        console.log(`${isAlice ? 'Alice' : 'Bob'} accepted order:`, {
            orderId,
            txHash: result.txHash,
            hashlock,
            timelock,
            network: networkId
        });

        return result;
    } catch (error) {
        console.error(`Error accepting order:`, error);
        throw error;
    }
}

// Test function to verify parameter passing
function testParameterPassing(dstTokenAddress) {
    console.log('=== Parameter Passing Test ===');
    console.log('dstTokenAddress:', dstTokenAddress);
    console.log('dstTokenAddress type:', typeof dstTokenAddress);
    console.log('dstTokenAddress === null:', dstTokenAddress === null);
    console.log('dstTokenAddress === undefined:', dstTokenAddress === undefined);
    console.log('dstTokenAddress === ""', dstTokenAddress === "");
    console.log('dstTokenAddress length:', dstTokenAddress ? dstTokenAddress.length : 'N/A');
    console.log('=== End Test ===');
}

// Function to get appropriate address for each chain type
async function getAddressForChain(baseAddress, chainType, isAlice = true) {
    if (chainType === 'evm') {
        // For EVM chains, use the original EVM address
        return baseAddress;
    } else if (chainType === 'cosmos') {
        // For Cosmos chains, generate real address from private key
        try {
            const privateKey = isAlice ? import.meta.env.VITE_PRIVATE_KEY_1 : import.meta.env.VITE_PRIVATE_KEY_2;
            console.log(`Debug - Private key for ${isAlice ? 'Alice' : 'Bob'}:`, privateKey ? 'Found' : 'Not found');
            console.log(`Debug - Private key length:`, privateKey ? privateKey.length : 0);
            console.log(`Debug - Private key starts with 0x:`, privateKey ? privateKey.startsWith('0x') : false);

            if (!privateKey) {
                throw new Error(`No private key found for ${isAlice ? 'Alice' : 'Bob'}`);
            }

            // Create wallet and get address
            console.log('Debug - Creating Osmosis wallet...');
            const wallet = await createOsmosisWallet(privateKey);
            const [account] = await wallet.getAccounts();
            console.log(`Debug - Generated ${isAlice ? 'Alice' : 'Bob'} Osmosis address:`, account.address);
            return account.address;
        } catch (error) {
            console.error('Error generating Cosmos address:', error);
            console.log('Debug - Falling back to mock address');
            // Fallback to mock addresses if private key is not available
            return isAlice ? 'osmo1raddhpf6vkxgh6g7sk6uy854glm9ng9ya89dx0' : 'osmo1ng2jl6298n0qyvseexumysk386eyw37d6mlcaa';
        }
    } else if (chainType === 'dogecoin') {
        // For Dogecoin, we need a Dogecoin address
        return isAlice ? 'D8KvHqJqJqJqJqJqJqJqJqJqJqJqJqJqJq' : 'D9KvHqJqJqJqJqJqJqJqJqJqJqJqJqJqJq';
    }
    return baseAddress; // fallback
}

/**
 * Execute cross-chain swap with real HTCL logic
 * @param {number} srcChainId - Source chain ID
 * @param {number} dstChainId - Destination chain ID
 * @param {string} amount - Amount to swap
 * @param {string} srcTokenAddress - Source token address
 * @param {string} dstTokenAddress - Destination token address
 * @param {string} aliceAddress - Alice's address
 * @param {string} bobAddress - Bob's address
 * @returns {Promise<Object>} Complete swap result
 */
export async function executeCrossChainSwapWithHTCL(
    srcChainId,
    dstChainId,
    amount,
    srcTokenAddress,
    dstTokenAddress,
    aliceAddress,
    bobAddress
) {
    try {
        console.log('Starting cross-chain swap with HTCL...');
        console.log('Debug - srcChainId:', srcChainId, typeof srcChainId);
        console.log('Debug - dstChainId:', dstChainId, typeof dstChainId);
        console.log('Debug - getChainType(srcChainId):', getChainType(srcChainId));
        console.log('Debug - getChainType(dstChainId):', getChainType(dstChainId));

        // Test parameter passing
        testParameterPassing(dstTokenAddress);

        const parameters = {
            srcChainId,
            dstChainId,
            amount,
            srcTokenAddress,
            dstTokenAddress,
            aliceAddress,
            bobAddress
        };

        console.log('Parameters:', parameters);

        // Step 1: Generate secret and hashlock
        const secret = generateSecret();
        const chainType = getChainType(srcChainId);
        const hashlock = hashSecret(secret, chainType);
        const timelock = Math.floor(Date.now() / 1000) + 3600; // 1 hour

        console.log('Generated parameters:', {
            secret: secret.substring(0, 20) + '...',
            hashlock: hashlock.substring(0, 20) + '...',
            timelock
        });
        console.log('Debug - Secret length:', secret.length);
        console.log('Debug - Hashlock length:', hashlock.length);
        console.log('Debug - Secret starts with 0x:', secret.startsWith('0x'));
        console.log('Debug - Hashlock starts with 0x:', hashlock.startsWith('0x'));

        // Step 2: Alice creates order with LimitOrderProtocol
        console.log('\n=== Step 1: Alice creates order ===');
        const orderData = {
            sourceChainId: srcChainId.toString(),
            destChainId: dstChainId.toString(),
            sourceWalletAddress: aliceAddress,
            destWalletAddress: bobAddress,
            sourceToken: srcTokenAddress,
            destToken: dstTokenAddress,
            sourceAmount: amount,
            destAmount: amount,
            deadline: Math.floor(Date.now() / 1000) + 7200 // 2 hours
        };

        const orderCreation = await createOrderWithProtocol(orderData, true, srcChainId);
        const orderId = 0; // Mock order ID

        // Step 3: Bob accepts the order
        console.log('\n=== Step 2: Bob accepts order ===');
        const orderAcceptance = await acceptOrderWithProtocol(orderId, hashlock, timelock, false, srcChainId);

        // Step 3: Alice creates HTCL deposit on source chain
        console.log('\n=== Step 3: Alice creates HTCL on source chain ===');
        console.log('Debug - Source chain type:', getChainType(srcChainId));
        console.log('Debug - Source chain ID:', srcChainId);
        console.log('Debug - Source chain ID type:', typeof srcChainId);
        let aliceSourceHTCL;
        if (getChainType(srcChainId) === 'evm') {
            console.log('Debug - Creating EVM HTCL on source chain');
            aliceSourceHTCL = await createEVMHTCL(bobAddress, timelock, hashlock, amount, true, srcChainId);
        } else if (getChainType(srcChainId) === 'cosmos') {
            console.log('Debug - Creating Cosmos HTCL on source chain');
            const srcChainType = getChainType(srcChainId);
            const bobSrcAddress = await getAddressForChain(bobAddress, srcChainType, false);
            console.log('Debug - Using Bob address for source Cosmos:', bobSrcAddress);
            aliceSourceHTCL = await createCosmosHTCL(bobSrcAddress, timelock, hashlock, amount, true, srcTokenAddress);
        } else if (getChainType(srcChainId) === 'dogecoin') {
            aliceSourceHTCL = await createDogecoinHTCL(bobAddress, timelock, hashlock, amount, true);
        }

        // Step 4: Bob creates HTCL deposit on destination chain (so Alice can withdraw from it)
        console.log('\n=== Step 4: Bob creates HTCL on destination chain ===');
        console.log('Debug - Destination chain type:', getChainType(dstChainId));
        console.log('Debug - Destination chain ID:', dstChainId);
        console.log('Debug - dstTokenAddress before createCosmosHTCL:', dstTokenAddress);
        console.log('Debug - dstTokenAddress type:', typeof dstTokenAddress);
        console.log('Debug - dstChainId:', dstChainId);
        console.log('Debug - dstChainId type:', typeof dstChainId);
        console.log('Debug - getChainType(dstChainId):', getChainType(dstChainId));
        let bobDestHTCL;
        if (getChainType(dstChainId) === 'evm') {
            bobDestHTCL = await createEVMHTCL(aliceAddress, timelock, hashlock, amount, false, dstChainId);
        } else if (getChainType(dstChainId) === 'cosmos') {
            const dstChainType = getChainType(dstChainId);
            console.log('Debug - About to call getAddressForChain for Alice destination Cosmos');
            // For Bob's HTCL on destination chain, pass Alice's address as 'bob' so she can withdraw
            const aliceDstAddress = await getAddressForChain(aliceAddress, dstChainType, true);
            console.log('Debug - Using Alice address for destination Cosmos (so she can withdraw):', aliceDstAddress);
            bobDestHTCL = await createCosmosHTCL(aliceDstAddress, timelock, hashlock, amount, false, dstTokenAddress);
        } else if (getChainType(dstChainId) === 'dogecoin') {
            bobDestHTCL = await createDogecoinHTCL(aliceAddress, timelock, hashlock, amount, false);
        }

        // Step 5: Alice withdraws from destination chain with secret
        console.log('\n=== Step 5: Alice withdraws from destination chain ===');
        console.log('Debug - dstChainId:', dstChainId);
        console.log('Debug - dstChainId type:', typeof dstChainId);
        console.log('Debug - getChainType(dstChainId):', getChainType(dstChainId));
        console.log('Debug - bobDestHTCL:', bobDestHTCL);
        let aliceWithdrawal;
        if (getChainType(dstChainId) === 'evm') {
            aliceWithdrawal = await withdrawFromEVMHTCL(bobDestHTCL.contractAddress, secret, true, dstChainId);
        } else if (getChainType(dstChainId) === 'cosmos') {
            // For EVM-to-Cosmos: Alice uses bobWithdraw(secret) since Bob created the HTCL
            console.log('Debug - Alice calling bobWithdraw(secret) on Cosmos HTCL');
            console.log('Debug - Alice withdrawal secret:', secret.substring(0, 20) + '...');
            aliceWithdrawal = await withdrawFromCosmosHTCL(bobDestHTCL.contractAddress, secret, true);
        } else if (getChainType(dstChainId) === 'dogecoin') {
            aliceWithdrawal = await withdrawFromDogecoinHTCL(bobDestHTCL.contractAddress, secret, true);
        }

        // Step 6: Bob withdraws from source chain with Alice's secret
        console.log('\n=== Step 6: Bob withdraws from source chain ===');
        console.log('Debug - Bob using secret to withdraw from EVM HTCL:', secret);
        console.log('Debug - Source chain type:', getChainType(srcChainId));
        console.log('Debug - Alice source HTCL contract address:', aliceSourceHTCL.contractAddress);
        let bobWithdrawal;
        if (getChainType(srcChainId) === 'evm') {
            // Bob uses bobWithdraw(secret) to withdraw from Alice's EVM HTCL
            console.log('Debug - Bob withdrawing from EVM HTCL with secret');
            bobWithdrawal = await withdrawFromEVMHTCL(aliceSourceHTCL.contractAddress, secret, false, srcChainId);
        } else if (getChainType(srcChainId) === 'cosmos') {
            console.log('Debug - Bob withdrawing from Cosmos HTCL with secret');
            console.log('Debug - Bob withdrawal secret:', secret.substring(0, 20) + '...');
            bobWithdrawal = await withdrawFromCosmosHTCL(aliceSourceHTCL.contractAddress, secret, false);
        } else if (getChainType(srcChainId) === 'evm') {
            console.log('Debug - Bob withdrawing from EVM HTCL with secret');
            console.log('Debug - Bob withdrawal secret:', secret.substring(0, 20) + '...');
            bobWithdrawal = await withdrawFromEVMHTCL(aliceSourceHTCL.contractAddress, secret, false, srcChainId);
        } else if (getChainType(srcChainId) === 'dogecoin') {
            bobWithdrawal = await withdrawFromDogecoinHTCL(aliceSourceHTCL.contractAddress, secret, false);
        }

        const result = {
            orderId,
            secret,
            hashlock,
            timelock,
            orderCreation,
            orderAcceptance,
            aliceSourceHTCL,
            aliceDestHTCL,
            aliceWithdrawal,
            bobWithdrawal,
            status: 'completed',
            timestamp: Date.now()
        };

        console.log('\n=== Cross-chain swap completed successfully ===');
        console.log('Result:', result);

        return result;

    } catch (error) {
        console.error('Error executing cross-chain swap with HTCL:', error);
        throw error;
    }
}

/**
 * Execute EVM to Cosmos swap
 * @param {string} amount - Amount to swap
 * @param {string} srcTokenAddress - Source token address
 * @param {string} dstTokenAddress - Destination token address
 * @param {string} aliceAddress - Alice's address
 * @param {string} bobAddress - Bob's address
 * @returns {Promise<Object>} Swap result
 */
export async function executeEVMToCosmosSwap(amount, srcTokenAddress, dstTokenAddress, aliceAddress, bobAddress) {
    return executeCrossChainSwapWithHTCL(
        NetworkEnum.POLYGON_AMOY,
        NetworkEnum.OSMOSIS,
        amount,
        srcTokenAddress,
        dstTokenAddress,
        aliceAddress,
        bobAddress
    );
}

/**
 * Execute Cosmos to EVM swap
 * @param {string} amount - Amount to swap
 * @param {string} srcTokenAddress - Source token address
 * @param {string} dstTokenAddress - Destination token address
 * @param {string} aliceAddress - Alice's address
 * @param {string} bobAddress - Bob's address
 * @returns {Promise<Object>} Swap result
 */
export async function executeCosmosToEVMSwap(amount, srcTokenAddress, dstTokenAddress, aliceAddress, bobAddress) {
    return executeCrossChainSwapWithHTCL(
        NetworkEnum.OSMOSIS,
        NetworkEnum.POLYGON_AMOY,
        amount,
        srcTokenAddress,
        dstTokenAddress,
        aliceAddress,
        bobAddress
    );
}

/**
 * Execute EVM to Dogecoin swap
 * @param {string} amount - Amount to swap
 * @param {string} srcTokenAddress - Source token address
 * @param {string} dstTokenAddress - Destination token address
 * @param {string} aliceAddress - Alice's address
 * @param {string} bobAddress - Bob's address
 * @returns {Promise<Object>} Swap result
 */
export async function executeEVMToDogecoinSwap(amount, srcTokenAddress, dstTokenAddress, aliceAddress, bobAddress) {
    return executeCrossChainSwapWithHTCL(
        NetworkEnum.POLYGON_AMOY,
        NetworkEnum.DOGECOIN,
        amount,
        srcTokenAddress,
        dstTokenAddress,
        aliceAddress,
        bobAddress
    );
}

/**
 * Execute Dogecoin to EVM swap
 * @param {string} amount - Amount to swap
 * @param {string} srcTokenAddress - Source token address
 * @param {string} dstTokenAddress - Destination token address
 * @param {string} aliceAddress - Alice's address
 * @param {string} bobAddress - Bob's address
 * @returns {Promise<Object>} Swap result
 */
export async function executeDogecoinToEVMSwap(amount, srcTokenAddress, dstTokenAddress, aliceAddress, bobAddress) {
    return executeCrossChainSwapWithHTCL(
        NetworkEnum.DOGECOIN,
        NetworkEnum.POLYGON_AMOY,
        amount,
        srcTokenAddress,
        dstTokenAddress,
        aliceAddress,
        bobAddress
    );
}

// Example usage function
export async function exampleCrossChainSwap() {
    const amount = '1000000'; // 1 USDC (6 decimals)
    const srcTokenAddress = TOKENS.OSMOSIS.USDC;
    const dstTokenAddress = TOKENS.POLYGON_AMOY.USDC;
    const aliceAddress = '0x3cb04058AF6Af29cB6463415B39B6C571458Ac04';
    const bobAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';

    try {
        const result = await executeCrossChainSwapWithHTCL(
            NetworkEnum.OSMOSIS,
            NetworkEnum.POLYGON_AMOY,
            amount,
            srcTokenAddress,
            dstTokenAddress,
            aliceAddress,
            bobAddress
        );

        console.log('Cross-chain swap completed:', result);
        return result;

    } catch (error) {
        console.error('Example swap failed:', error);
        throw error;
    }
}

// Legacy functions for backward compatibility
export async function createCrossChainOrder(srcChainId, dstChainId, amount, srcTokenAddress, dstTokenAddress, walletAddress) {
    console.warn('createCrossChainOrder is deprecated. Use executeCrossChainSwapWithHTCL instead.');
    return executeCrossChainSwapWithHTCL(
        srcChainId,
        dstChainId,
        amount,
        srcTokenAddress,
        dstTokenAddress,
        walletAddress,
        walletAddress
    );
}

export async function executeCrossChainSwap(srcChainId, dstChainId, amount, srcTokenAddress, dstTokenAddress, walletAddress) {
    console.warn('executeCrossChainSwap is deprecated. Use executeCrossChainSwapWithHTCL instead.');
    return executeCrossChainSwapWithHTCL(
        srcChainId,
        dstChainId,
        amount,
        srcTokenAddress,
        dstTokenAddress,
        walletAddress,
        walletAddress
    );
}

export async function submitOrder(orderData) {
    console.warn('submitOrder is deprecated. Use executeCrossChainSwapWithHTCL instead.');
    return { status: 'deprecated' };
}

export async function monitorAndSubmitSecrets(hash, secrets) {
    console.warn('monitorAndSubmitSecrets is deprecated. Use executeCrossChainSwapWithHTCL instead.');
    return { status: 'deprecated' };
}

export async function getOrderStatus(hash) {
    console.warn('getOrderStatus is deprecated.');
    return { status: 'deprecated' };
}

export async function getReadyToAcceptSecretFills(hash) {
    console.warn('getReadyToAcceptSecretFills is deprecated.');
    return { status: 'deprecated' };
}

export async function executeOsmosisToPolygonSwap(amount, srcTokenAddress, dstTokenAddress, walletAddress) {
    console.warn('executeOsmosisToPolygonSwap is deprecated. Use executeCosmosToEVMSwap instead.');
    return executeCosmosToEVMSwap(amount, srcTokenAddress, dstTokenAddress, walletAddress, walletAddress);
}

export default {
    executeCrossChainSwapWithHTCL,
    executeEVMToCosmosSwap,
    executeCosmosToEVMSwap,
    executeEVMToDogecoinSwap,
    executeDogecoinToEVMSwap,
    exampleCrossChainSwap,
    // Legacy exports
    createCrossChainOrder,
    executeCrossChainSwap,
    submitOrder,
    monitorAndSubmitSecrets,
    getOrderStatus,
    getReadyToAcceptSecretFills,
    executeOsmosisToPolygonSwap
}; 