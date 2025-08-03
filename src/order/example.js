/**
 * Example usage of HTCL Cross-Chain Order functionality
 * 
 * This file demonstrates how to use the new HTCL implementation
 * for cross-chain swaps between EVM, Cosmos, and Dogecoin chains.
 */

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

// Example addresses (replace with real addresses)
const ALICE_ADDRESS = '0x3cb04058AF6Af29cB6463415B39B6C571458Ac04';
const BOB_ADDRESS = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';

// Example amounts
const EXAMPLE_AMOUNT = '1000000'; // 1 USDC (6 decimals)

/**
 * Example 1: EVM to Cosmos swap
 */
async function exampleEVMToCosmos() {
    console.log('🚀 Example 1: EVM to Cosmos Swap');
    console.log('=' * 50);

    try {
        const result = await executeEVMToCosmosSwap(
            EXAMPLE_AMOUNT,
            TOKENS[NetworkEnum.POLYGON_AMOY].USDC,
            TOKENS[NetworkEnum.OSMOSIS].USDC,
            ALICE_ADDRESS,
            BOB_ADDRESS
        );

        console.log('✅ EVM to Cosmos swap completed successfully!');
        console.log('Result:', result);
        return result;
    } catch (error) {
        console.error('❌ EVM to Cosmos swap failed:', error);
        throw error;
    }
}

/**
 * Example 2: Cosmos to EVM swap
 */
async function exampleCosmosToEVM() {
    console.log('🚀 Example 2: Cosmos to EVM Swap');
    console.log('=' * 50);

    try {
        const result = await executeCosmosToEVMSwap(
            EXAMPLE_AMOUNT,
            TOKENS[NetworkEnum.OSMOSIS].USDC,
            TOKENS[NetworkEnum.POLYGON_AMOY].USDC,
            ALICE_ADDRESS,
            BOB_ADDRESS
        );

        console.log('✅ Cosmos to EVM swap completed successfully!');
        console.log('Result:', result);
        return result;
    } catch (error) {
        console.error('❌ Cosmos to EVM swap failed:', error);
        throw error;
    }
}

/**
 * Example 3: EVM to Dogecoin swap
 */
async function exampleEVMToDogecoin() {
    console.log('🚀 Example 3: EVM to Dogecoin Swap');
    console.log('=' * 50);

    try {
        const result = await executeEVMToDogecoinSwap(
            EXAMPLE_AMOUNT,
            TOKENS[NetworkEnum.POLYGON_AMOY].USDC,
            TOKENS[NetworkEnum.DOGECOIN].DOGE,
            ALICE_ADDRESS,
            BOB_ADDRESS
        );

        console.log('✅ EVM to Dogecoin swap completed successfully!');
        console.log('Result:', result);
        return result;
    } catch (error) {
        console.error('❌ EVM to Dogecoin swap failed:', error);
        throw error;
    }
}

/**
 * Example 4: Dogecoin to EVM swap
 */
async function exampleDogecoinToEVM() {
    console.log('🚀 Example 4: Dogecoin to EVM Swap');
    console.log('=' * 50);

    try {
        const result = await executeDogecoinToEVMSwap(
            EXAMPLE_AMOUNT,
            TOKENS[NetworkEnum.DOGECOIN].DOGE,
            TOKENS[NetworkEnum.POLYGON_AMOY].USDC,
            ALICE_ADDRESS,
            BOB_ADDRESS
        );

        console.log('✅ Dogecoin to EVM swap completed successfully!');
        console.log('Result:', result);
        return result;
    } catch (error) {
        console.error('❌ Dogecoin to EVM swap failed:', error);
        throw error;
    }
}

/**
 * Example 5: Generic cross-chain swap
 */
async function exampleGenericSwap() {
    console.log('🚀 Example 5: Generic Cross-Chain Swap');
    console.log('=' * 50);

    try {
        const result = await executeCrossChainSwapWithHTCL(
            NetworkEnum.OSMOSIS,
            NetworkEnum.POLYGON_AMOY,
            EXAMPLE_AMOUNT,
            TOKENS[NetworkEnum.OSMOSIS].USDC,
            TOKENS[NetworkEnum.POLYGON_AMOY].USDC,
            ALICE_ADDRESS,
            BOB_ADDRESS
        );

        console.log('✅ Generic cross-chain swap completed successfully!');
        console.log('Result:', result);
        return result;
    } catch (error) {
        console.error('❌ Generic cross-chain swap failed:', error);
        throw error;
    }
}

/**
 * Example 6: Built-in example swap
 */
async function exampleBuiltInSwap() {
    console.log('🚀 Example 6: Built-in Example Swap');
    console.log('=' * 50);

    try {
        const result = await exampleCrossChainSwap();

        console.log('✅ Built-in example swap completed successfully!');
        console.log('Result:', result);
        return result;
    } catch (error) {
        console.error('❌ Built-in example swap failed:', error);
        throw error;
    }
}

/**
 * Run all examples
 */
async function runAllExamples() {
    console.log('🎯 Running All HTCL Cross-Chain Examples');
    console.log('=' * 60);

    const examples = [
        { name: 'EVM to Cosmos', fn: exampleEVMToCosmos },
        { name: 'Cosmos to EVM', fn: exampleCosmosToEVM },
        { name: 'EVM to Dogecoin', fn: exampleEVMToDogecoin },
        { name: 'Dogecoin to EVM', fn: exampleDogecoinToEVM },
        { name: 'Generic Cross-Chain', fn: exampleGenericSwap },
        { name: 'Built-in Example', fn: exampleBuiltInSwap }
    ];

    const results = [];

    for (const example of examples) {
        try {
            console.log(`\n📋 Running: ${example.name}`);
            const result = await example.fn();
            results.push({ name: example.name, status: 'SUCCESS', result });
        } catch (error) {
            console.error(`❌ Failed: ${example.name}`, error);
            results.push({ name: example.name, status: 'FAILED', error: error.message });
        }
    }

    // Print summary
    console.log('\n📊 Example Summary');
    console.log('=' * 30);

    const successful = results.filter(r => r.status === 'SUCCESS').length;
    const failed = results.filter(r => r.status === 'FAILED').length;

    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((successful / results.length) * 100).toFixed(1)}%`);

    results.forEach(result => {
        const status = result.status === 'SUCCESS' ? '✅' : '❌';
        console.log(`${status} ${result.name}`);
    });

    return results;
}

/**
 * Demonstrate HTCL workflow step by step
 */
function demonstrateHTCLWorkflow() {
    console.log('🔗 HTCL Cross-Chain Workflow Demonstration');
    console.log('=' * 60);

    console.log('\n📋 Step-by-step HTCL workflow:');
    console.log('1. Alice creates an order with LimitOrderProtocol');
    console.log('2. Bob accepts the order and waits for Alice deposit');
    console.log('3. Alice creates HTCL deposit on source chain with hashlock');
    console.log('4. Bob creates HTCL deposit on destination chain with hashlock');
    console.log('5. Alice withdraws from destination chain with secret before timelock');
    console.log('6. Bob withdraws from source chain with Alice\'s secret before timelock');

    console.log('\n🔐 Security features:');
    console.log('- Hashlock ensures only the secret holder can withdraw');
    console.log('- Timelock prevents indefinite locking of funds');
    console.log('- Cross-chain compatibility with universal hashlock format');
    console.log('- Support for EVM, Cosmos, and Dogecoin chains');

    console.log('\n⚡ Benefits:');
    console.log('- Trustless cross-chain swaps');
    console.log('- Atomic execution (all or nothing)');
    console.log('- No third-party intermediaries');
    console.log('- Time-bound security with automatic refunds');
}

// Export functions for use in other modules
export {
    exampleEVMToCosmos,
    exampleCosmosToEVM,
    exampleEVMToDogecoin,
    exampleDogecoinToEVM,
    exampleGenericSwap,
    exampleBuiltInSwap,
    runAllExamples,
    demonstrateHTCLWorkflow
};

// Run examples if this file is executed directly
if (typeof window === 'undefined') {
    // Node.js environment
    demonstrateHTCLWorkflow();
    runAllExamples().catch(console.error);
} else {
    // Browser environment - expose to window
    window.HTCLExamples = {
        exampleEVMToCosmos,
        exampleCosmosToEVM,
        exampleEVMToDogecoin,
        exampleDogecoinToEVM,
        exampleGenericSwap,
        exampleBuiltInSwap,
        runAllExamples,
        demonstrateHTCLWorkflow
    };
} 