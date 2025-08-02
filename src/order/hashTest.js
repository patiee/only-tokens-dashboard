import { createCrossChainOrder } from './crossChainOrder.js';

/**
 * Test function to demonstrate different hashing methods
 */
export async function testHashingMethods() {
    console.log('=== Testing Different Hashing Methods ===\n');

    const testSecret = '0x1234567890123456789012345678901234567890123456789012345678901234';
    const amount = '1000000'; // 1 USDC
    const walletAddress = '0x3cb04058AF6Af29cB6463415B39B6C571458Ac04';

    // Test EVM (Polygon) hashing
    console.log('1. Testing EVM (Polygon) Hashing:');
    try {
        const polygonOrder = await createCrossChainOrder(
            137, // Polygon
            'osmosis-1', // Osmosis
            amount,
            '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC on Polygon
            'osmo1facacsudmmarmshj54306q8qlwyee2l369tn9c385xa8lkcz3snqrtw9ke', // USDC on Osmosis
            walletAddress
        );
        console.log('   Secret:', polygonOrder.secret);
        console.log('   Secret Hash (keccak256):', polygonOrder.secretHash);
        console.log('   Chain Type:', polygonOrder.chainType);
        console.log('   Order Hash:', polygonOrder.hash);
        console.log('   ✅ EVM hashing successful\n');
    } catch (error) {
        console.log('   ❌ EVM hashing failed:', error.message, '\n');
    }

    // Test Cosmos (Osmosis) hashing
    console.log('2. Testing Cosmos (Osmosis) Hashing:');
    try {
        const osmosisOrder = await createCrossChainOrder(
            'osmosis-1', // Osmosis
            137, // Polygon
            amount,
            'osmo1facacsudmmarmshj54306q8qlwyee2l369tn9c385xa8lkcz3snqrtw9ke', // USDC on Osmosis
            '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC on Polygon
            walletAddress
        );
        console.log('   Secret:', osmosisOrder.secret);
        console.log('   Secret Hash (SHA256):', osmosisOrder.secretHash);
        console.log('   Chain Type:', osmosisOrder.chainType);
        console.log('   Order Hash:', osmosisOrder.hash);
        console.log('   ✅ Cosmos hashing successful\n');
    } catch (error) {
        console.log('   ❌ Cosmos hashing failed:', error.message, '\n');
    }

    // Test Dogecoin hashing
    console.log('3. Testing Dogecoin Hashing:');
    try {
        const dogecoinOrder = await createCrossChainOrder(
            568, // Dogecoin
            137, // Polygon
            amount,
            'DOGE', // DOGE token
            '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC on Polygon
            walletAddress
        );
        console.log('   Secret:', dogecoinOrder.secret);
        console.log('   Secret Hash (SHA256 + RIPEMD160):', dogecoinOrder.secretHash);
        console.log('   Chain Type:', dogecoinOrder.chainType);
        console.log('   Order Hash:', dogecoinOrder.hash);
        console.log('   ✅ Dogecoin hashing successful\n');
    } catch (error) {
        console.log('   ❌ Dogecoin hashing failed:', error.message, '\n');
    }

    console.log('=== Hashing Test Summary ===');
    console.log('• EVM chains (Polygon, Ethereum): keccak256');
    console.log('• Cosmos chains (Osmosis): SHA256');
    console.log('• Dogecoin: SHA256 + RIPEMD160 (like Bitcoin)');
    console.log('• All hashes are prefixed with "0x" for consistency');
}

/**
 * Compare hash lengths and formats
 */
export function compareHashFormats() {
    console.log('=== Hash Format Comparison ===\n');

    const testSecret = '0x1234567890123456789012345678901234567890123456789012345678901234';

    // Mock hashes for demonstration
    const evmHash = '0x' + 'a'.repeat(64); // 32 bytes = 64 hex chars (keccak256)
    const cosmosHash = '0x' + 'b'.repeat(64); // 32 bytes = 64 hex chars (SHA256)
    const dogecoinHash = '0x' + 'c'.repeat(40); // 20 bytes = 40 hex chars (RIPEMD160)

    console.log('Test Secret:', testSecret);
    console.log('Secret Length:', testSecret.length, 'characters');
    console.log('Secret Bytes:', testSecret.length / 2 - 1, 'bytes (excluding 0x prefix)\n');

    console.log('Hash Formats:');
    console.log('• EVM (keccak256):', evmHash);
    console.log('  Length:', evmHash.length, 'characters');
    console.log('  Bytes:', evmHash.length / 2 - 1, 'bytes\n');

    console.log('• Cosmos (SHA256):', cosmosHash);
    console.log('  Length:', cosmosHash.length, 'characters');
    console.log('  Bytes:', cosmosHash.length / 2 - 1, 'bytes\n');

    console.log('• Dogecoin (SHA256 + RIPEMD160):', dogecoinHash);
    console.log('  Length:', dogecoinHash.length, 'characters');
    console.log('  Bytes:', dogecoinHash.length / 2 - 1, 'bytes\n');

    console.log('Note: Dogecoin uses SHA256 + RIPEMD160 which produces a 20-byte hash');
    console.log('This is the standard Bitcoin-style hashing algorithm');
}

// Export test functions
export default {
    testHashingMethods,
    compareHashFormats
}; 