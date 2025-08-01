import {
    HashLock,
    NetworkEnum,
    OrderStatus,
    PresetEnum,
    PrivateKeyProviderConnector,
    SDK
} from '@1inch/cross-chain-sdk';
import Web3 from 'web3';
import { randomBytes } from 'node:crypto';

// Configuration
const privateKey = '0x'; // Replace with your private key
const rpc = 'https://ethereum-rpc.publicnode.com';
const authKey = 'auth-key'; // Replace with your 1inch API key
const source = 'only-tokens-dashboard';

// Initialize Web3 and SDK
const web3 = new Web3(rpc);
const walletAddress = web3.eth.accounts.privateKeyToAccount(privateKey).address;

const sdk = new SDK({
    url: 'https://api.1inch.dev/fusion-plus',
    authKey,
    blockchainProvider: new PrivateKeyProviderConnector(privateKey, web3)
});

// Utility function for sleeping
async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Token addresses for Osmosis and Polygon
const TOKENS = {
    OSMOSIS: {
        USDC: '0x...', // Replace with actual Osmosis USDC address
        OSMO: '0x...', // Replace with actual Osmosis OSMO address
    },
    POLYGON: {
        USDC: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC on Polygon
        MATIC: '0x0000000000000000000000000000000000001010', // MATIC on Polygon
    }
};

/**
 * Create a cross-chain order from Osmosis to Polygon
 * @param {string} amount - Amount in smallest unit (e.g., wei)
 * @param {string} srcTokenAddress - Source token address on Osmosis
 * @param {string} dstTokenAddress - Destination token address on Polygon
 * @param {string} walletAddress - User's wallet address
 * @returns {Promise<Object>} Order details
 */
export async function createOsmosisToPolygonOrder(amount, srcTokenAddress, dstTokenAddress, walletAddress) {
    try {
        console.log('Creating cross-chain order from Osmosis to Polygon...');
        console.log('Parameters:', { amount, srcTokenAddress, dstTokenAddress, walletAddress });

        // Get quote for the swap
        const quote = await sdk.getQuote({
            amount: amount,
            srcChainId: NetworkEnum.OSMOSIS, // Assuming OSMOSIS is defined in NetworkEnum
            dstChainId: NetworkEnum.POLYGON,
            enableEstimate: true,
            srcTokenAddress: srcTokenAddress,
            dstTokenAddress: dstTokenAddress,
            walletAddress: walletAddress
        });

        console.log('Quote received:', quote);

        const preset = PresetEnum.fast;

        // Generate secrets for the hash lock
        const secrets = Array.from({
            length: quote.presets[preset].secretsCount
        }).map(() => '0x' + randomBytes(32).toString('hex'));

        const hashLock = secrets.length === 1
            ? HashLock.forSingleFill(secrets[0])
            : HashLock.forMultipleFills(HashLock.getMerkleLeaves(secrets));

        const secretHashes = secrets.map((s) => HashLock.hashSecret(s));

        // Create the order
        const { hash, quoteId, order } = await sdk.createOrder(quote, {
            walletAddress,
            hashLock,
            preset,
            source,
            secretHashes
        });

        console.log('Order created successfully:', { hash, quoteId });

        return {
            hash,
            quoteId,
            order,
            secrets,
            secretHashes,
            quote
        };

    } catch (error) {
        console.error('Error creating cross-chain order:', error);
        throw error;
    }
}

/**
 * Submit the created order
 * @param {Object} orderData - Order data from createOsmosisToPolygonOrder
 * @returns {Promise<Object>} Submission result
 */
export async function submitOrder(orderData) {
    try {
        console.log('Submitting order...');

        const orderInfo = await sdk.submitOrder(
            orderData.quote.srcChainId,
            orderData.order,
            orderData.quoteId,
            orderData.secretHashes
        );

        console.log('Order submitted successfully:', orderInfo);

        return orderInfo;

    } catch (error) {
        console.error('Error submitting order:', error);
        throw error;
    }
}

/**
 * Monitor and submit secrets for the order
 * @param {string} hash - Order hash
 * @param {Array} secrets - Array of secrets
 * @returns {Promise<Object>} Final order status
 */
export async function monitorAndSubmitSecrets(hash, secrets) {
    try {
        console.log('Monitoring order and submitting secrets...');

        while (true) {
            const secretsToShare = await sdk.getReadyToAcceptSecretFills(hash);

            if (secretsToShare.fills.length) {
                for (const { idx } of secretsToShare.fills) {
                    await sdk.submitSecret(hash, secrets[idx]);
                    console.log(`Shared secret ${idx}`);
                }
            }

            // Check if order is finished
            const { status } = await sdk.getOrderStatus(hash);

            if (
                status === OrderStatus.Executed ||
                status === OrderStatus.Expired ||
                status === OrderStatus.Refunded
            ) {
                console.log('Order finished with status:', status);
                break;
            }

            await sleep(1000);
        }

        const statusResponse = await sdk.getOrderStatus(hash);
        console.log('Final order status:', statusResponse);

        return statusResponse;

    } catch (error) {
        console.error('Error monitoring order:', error);
        throw error;
    }
}

/**
 * Complete cross-chain swap from Osmosis to Polygon
 * @param {string} amount - Amount to swap
 * @param {string} srcTokenAddress - Source token address
 * @param {string} dstTokenAddress - Destination token address
 * @param {string} walletAddress - User's wallet address
 * @returns {Promise<Object>} Complete swap result
 */
export async function executeOsmosisToPolygonSwap(amount, srcTokenAddress, dstTokenAddress, walletAddress) {
    try {
        console.log('Starting Osmosis to Polygon cross-chain swap...');

        // Step 1: Create order
        const orderData = await createOsmosisToPolygonOrder(
            amount,
            srcTokenAddress,
            dstTokenAddress,
            walletAddress
        );

        // Step 2: Submit order
        await submitOrder(orderData);

        // Step 3: Monitor and submit secrets
        const finalStatus = await monitorAndSubmitSecrets(orderData.hash, orderData.secrets);

        return {
            orderHash: orderData.hash,
            finalStatus,
            orderData
        };

    } catch (error) {
        console.error('Error executing cross-chain swap:', error);
        throw error;
    }
}

/**
 * Get order status
 * @param {string} hash - Order hash
 * @returns {Promise<Object>} Order status
 */
export async function getOrderStatus(hash) {
    try {
        const status = await sdk.getOrderStatus(hash);
        return status;
    } catch (error) {
        console.error('Error getting order status:', error);
        throw error;
    }
}

/**
 * Get ready to accept secret fills
 * @param {string} hash - Order hash
 * @returns {Promise<Object>} Secret fills data
 */
export async function getReadyToAcceptSecretFills(hash) {
    try {
        const fills = await sdk.getReadyToAcceptSecretFills(hash);
        return fills;
    } catch (error) {
        console.error('Error getting ready to accept secret fills:', error);
        throw error;
    }
}

// Example usage function
export async function exampleOsmosisToPolygonSwap() {
    const amount = '1000000'; // 1 USDC (6 decimals)
    const srcTokenAddress = TOKENS.OSMOSIS.USDC;
    const dstTokenAddress = TOKENS.POLYGON.USDC;

    try {
        const result = await executeOsmosisToPolygonSwap(
            amount,
            srcTokenAddress,
            dstTokenAddress,
            walletAddress
        );

        console.log('Cross-chain swap completed:', result);
        return result;

    } catch (error) {
        console.error('Example swap failed:', error);
        throw error;
    }
}

export default {
    createOsmosisToPolygonOrder,
    submitOrder,
    monitorAndSubmitSecrets,
    executeOsmosisToPolygonSwap,
    getOrderStatus,
    getReadyToAcceptSecretFills,
    exampleOsmosisToPolygonSwap
}; 