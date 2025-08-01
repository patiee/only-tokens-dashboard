import {
    createOsmosisToPolygonOrder,
    submitOrder,
    monitorAndSubmitSecrets,
    executeOsmosisToPolygonSwap,
    getOrderStatus,
    exampleOsmosisToPolygonSwap
} from './crossChainOrder.js';

/**
 * Test function to demonstrate cross-chain order creation
 */
export async function testCrossChainOrder() {
    try {
        console.log('=== Testing Cross-Chain Order from Osmosis to Polygon ===');

        // Example parameters
        const amount = '1000000'; // 1 USDC (6 decimals)
        const srcTokenAddress = '0x...'; // Replace with actual Osmosis USDC address
        const dstTokenAddress = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174'; // USDC on Polygon
        const walletAddress = '0x...'; // Replace with actual wallet address

        console.log('Test parameters:', {
            amount,
            srcTokenAddress,
            dstTokenAddress,
            walletAddress
        });

        // Test 1: Create order only
        console.log('\n--- Test 1: Creating Order ---');
        const orderData = await createOsmosisToPolygonOrder(
            amount,
            srcTokenAddress,
            dstTokenAddress,
            walletAddress
        );
        console.log('Order created:', orderData.hash);

        // Test 2: Submit order
        console.log('\n--- Test 2: Submitting Order ---');
        const submitResult = await submitOrder(orderData);
        console.log('Order submitted:', submitResult);

        // Test 3: Monitor and submit secrets
        console.log('\n--- Test 3: Monitoring Order ---');
        const finalStatus = await monitorAndSubmitSecrets(orderData.hash, orderData.secrets);
        console.log('Final status:', finalStatus);

        // Test 4: Get order status
        console.log('\n--- Test 4: Getting Order Status ---');
        const status = await getOrderStatus(orderData.hash);
        console.log('Current status:', status);

        return {
            orderHash: orderData.hash,
            finalStatus,
            status
        };

    } catch (error) {
        console.error('Test failed:', error);
        throw error;
    }
}

/**
 * Test function for complete swap execution
 */
export async function testCompleteSwap() {
    try {
        console.log('=== Testing Complete Cross-Chain Swap ===');

        const result = await exampleOsmosisToPolygonSwap();
        console.log('Complete swap result:', result);

        return result;

    } catch (error) {
        console.error('Complete swap test failed:', error);
        throw error;
    }
}

/**
 * Test function for order status monitoring
 */
export async function testOrderMonitoring(orderHash) {
    try {
        console.log('=== Testing Order Monitoring ===');
        console.log('Monitoring order:', orderHash);

        const status = await getOrderStatus(orderHash);
        console.log('Order status:', status);

        return status;

    } catch (error) {
        console.error('Order monitoring test failed:', error);
        throw error;
    }
}

// Export test functions
export default {
    testCrossChainOrder,
    testCompleteSwap,
    testOrderMonitoring
}; 