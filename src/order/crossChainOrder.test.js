import {
    executeCrossChainSwapWithHTCL,
    executeEVMToCosmosSwap,
    executeCosmosToEVMSwap,
    executeEVMToDogecoinSwap,
    executeDogecoinToEVMSwap,
    exampleCrossChainSwap
} from './crossChainOrder.js';
import { TOKENS } from '../config/const';
import { NetworkEnum } from '@1inch/fusion-sdk';

// Test addresses
const ALICE_ADDRESS = '0x3cb04058AF6Af29cB6463415B39B6C571458Ac04';
const BOB_ADDRESS = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';

// Test amounts
const TEST_AMOUNT = '1000000'; // 1 USDC (6 decimals)

/**
 * Test EVM to Cosmos swap
 */
async function testEVMToCosmosSwap() {
    console.log('\n🧪 Testing EVM to Cosmos Swap');
    console.log('=' * 50);

    try {
        const result = await executeEVMToCosmosSwap(
            TEST_AMOUNT,
            TOKENS[NetworkEnum.POLYGON_AMOY].USDC,
            TOKENS[NetworkEnum.OSMOSIS].USDC,
            ALICE_ADDRESS,
            BOB_ADDRESS
        );

        console.log('✅ EVM to Cosmos swap completed:', result);
        return result;
    } catch (error) {
        console.error('❌ EVM to Cosmos swap failed:', error);
        throw error;
    }
}

/**
 * Test Cosmos to EVM swap
 */
async function testCosmosToEVMSwap() {
    console.log('\n🧪 Testing Cosmos to EVM Swap');
    console.log('=' * 50);

    try {
        const result = await executeCosmosToEVMSwap(
            TEST_AMOUNT,
            TOKENS[NetworkEnum.OSMOSIS].USDC,
            TOKENS[NetworkEnum.POLYGON_AMOY].USDC,
            ALICE_ADDRESS,
            BOB_ADDRESS
        );

        console.log('✅ Cosmos to EVM swap completed:', result);
        return result;
    } catch (error) {
        console.error('❌ Cosmos to EVM swap failed:', error);
        throw error;
    }
}

/**
 * Test EVM to Dogecoin swap
 */
async function testEVMToDogecoinSwap() {
    console.log('\n🧪 Testing EVM to Dogecoin Swap');
    console.log('=' * 50);

    try {
        const result = await executeEVMToDogecoinSwap(
            TEST_AMOUNT,
            TOKENS[NetworkEnum.POLYGON_AMOY].USDC,
            TOKENS[NetworkEnum.DOGECOIN].DOGE,
            ALICE_ADDRESS,
            BOB_ADDRESS
        );

        console.log('✅ EVM to Dogecoin swap completed:', result);
        return result;
    } catch (error) {
        console.error('❌ EVM to Dogecoin swap failed:', error);
        throw error;
    }
}

/**
 * Test Dogecoin to EVM swap
 */
async function testDogecoinToEVMSwap() {
    console.log('\n🧪 Testing Dogecoin to EVM Swap');
    console.log('=' * 50);

    try {
        const result = await executeDogecoinToEVMSwap(
            TEST_AMOUNT,
            TOKENS[NetworkEnum.DOGECOIN].DOGE,
            TOKENS[NetworkEnum.POLYGON_AMOY].USDC,
            ALICE_ADDRESS,
            BOB_ADDRESS
        );

        console.log('✅ Dogecoin to EVM swap completed:', result);
        return result;
    } catch (error) {
        console.error('❌ Dogecoin to EVM swap failed:', error);
        throw error;
    }
}

/**
 * Test generic cross-chain swap
 */
async function testGenericCrossChainSwap() {
    console.log('\n🧪 Testing Generic Cross-Chain Swap');
    console.log('=' * 50);

    try {
        const result = await executeCrossChainSwapWithHTCL(
            NetworkEnum.OSMOSIS,
            NetworkEnum.POLYGON_AMOY,
            TEST_AMOUNT,
            TOKENS[NetworkEnum.OSMOSIS].USDC,
            TOKENS[NetworkEnum.POLYGON_AMOY].USDC,
            ALICE_ADDRESS,
            BOB_ADDRESS
        );

        console.log('✅ Generic cross-chain swap completed:', result);
        return result;
    } catch (error) {
        console.error('❌ Generic cross-chain swap failed:', error);
        throw error;
    }
}

/**
 * Test example swap
 */
async function testExampleSwap() {
    console.log('\n🧪 Testing Example Swap');
    console.log('=' * 50);

    try {
        const result = await exampleCrossChainSwap();

        console.log('✅ Example swap completed:', result);
        return result;
    } catch (error) {
        console.error('❌ Example swap failed:', error);
        throw error;
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('🚀 Starting HTCL Cross-Chain Order Tests');
    console.log('=' * 60);

    const tests = [
        { name: 'EVM to Cosmos', fn: testEVMToCosmosSwap },
        { name: 'Cosmos to EVM', fn: testCosmosToEVMSwap },
        { name: 'EVM to Dogecoin', fn: testEVMToDogecoinSwap },
        { name: 'Dogecoin to EVM', fn: testDogecoinToEVMSwap },
        { name: 'Generic Cross-Chain', fn: testGenericCrossChainSwap },
        { name: 'Example Swap', fn: testExampleSwap }
    ];

    const results = [];

    for (const test of tests) {
        try {
            console.log(`\n📋 Running test: ${test.name}`);
            const result = await test.fn();
            results.push({ name: test.name, status: 'PASSED', result });
        } catch (error) {
            console.error(`❌ Test failed: ${test.name}`, error);
            results.push({ name: test.name, status: 'FAILED', error: error.message });
        }
    }

    // Print summary
    console.log('\n📊 Test Summary');
    console.log('=' * 30);

    const passed = results.filter(r => r.status === 'PASSED').length;
    const failed = results.filter(r => r.status === 'FAILED').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

    results.forEach(result => {
        const status = result.status === 'PASSED' ? '✅' : '❌';
        console.log(`${status} ${result.name}`);
    });

    return results;
}

// Export test functions
export {
    testEVMToCosmosSwap,
    testCosmosToEVMSwap,
    testEVMToDogecoinSwap,
    testDogecoinToEVMSwap,
    testGenericCrossChainSwap,
    testExampleSwap,
    runAllTests
};

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
    // Node.js environment
    runAllTests().catch(console.error);
} else {
    // Browser environment - expose to window
    window.HTCLTests = {
        testEVMToCosmosSwap,
        testCosmosToEVMSwap,
        testEVMToDogecoinSwap,
        testDogecoinToEVMSwap,
        testGenericCrossChainSwap,
        testExampleSwap,
        runAllTests
    };
} 