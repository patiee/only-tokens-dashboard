import { createCrossChainOrder, executeCrossChainSwap } from './crossChainOrder.js';

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
    process.env = {
        ...originalEnv,
        VITE_PRIVATE_KEY: '0x1234567890123456789012345678901234567890123456789012345678901234',
        VITE_POLYGON_RPC: 'https://polygon-rpc.com',
        VITE_OSMOSIS_RPC: 'https://rpc.osmosis.zone'
    };
});

afterEach(() => {
    process.env = originalEnv;
});

describe('Cross Chain Order Tests', () => {
    test('should create a cross-chain order from Osmosis to Polygon', async () => {
        const amount = '1000000'; // 1 USDC
        const srcTokenAddress = 'osmo1facacsudmmarmshj54306q8qlwyee2l369tn9c385xa8lkcz3snqrtw9ke';
        const dstTokenAddress = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
        const walletAddress = '0x3cb04058AF6Af29cB6463415B39B6C571458Ac04';
        const srcChainId = 'osmosis-1';
        const dstChainId = 137;

        const result = await createCrossChainOrder(
            srcChainId,
            dstChainId,
            amount,
            srcTokenAddress,
            dstTokenAddress,
            walletAddress
        );

        expect(result).toBeDefined();
        expect(result.hash).toBeDefined();
        expect(result.srcChainId).toBe(srcChainId);
        expect(result.dstChainId).toBe(dstChainId);
        expect(result.amount).toBe(amount);
        expect(result.srcTokenAddress).toBe(srcTokenAddress);
        expect(result.dstTokenAddress).toBe(dstTokenAddress);
        expect(result.walletAddress).toBe(walletAddress);
        expect(result.secret).toBeDefined();
        expect(result.secretHash).toBeDefined();
        expect(result.escrowData).toBeDefined();
        expect(result.resolverResult).toBeDefined();
        expect(result.auctionData).toBeDefined();
        expect(result.status).toBe('created');
        expect(result.timestamp).toBeDefined();
    });

    test('should create a cross-chain order from Polygon to Osmosis', async () => {
        const amount = '1000000'; // 1 USDC
        const srcTokenAddress = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
        const dstTokenAddress = 'osmo1facacsudmmarmshj54306q8qlwyee2l369tn9c385xa8lkcz3snqrtw9ke';
        const walletAddress = '0x3cb04058AF6Af29cB6463415B39B6C571458Ac04';
        const srcChainId = 137;
        const dstChainId = 'osmosis-1';

        const result = await createCrossChainOrder(
            srcChainId,
            dstChainId,
            amount,
            srcTokenAddress,
            dstTokenAddress,
            walletAddress
        );

        expect(result).toBeDefined();
        expect(result.hash).toBeDefined();
        expect(result.srcChainId).toBe(srcChainId);
        expect(result.dstChainId).toBe(dstChainId);
        expect(result.amount).toBe(amount);
        expect(result.srcTokenAddress).toBe(srcTokenAddress);
        expect(result.dstTokenAddress).toBe(dstTokenAddress);
        expect(result.walletAddress).toBe(walletAddress);
        expect(result.secret).toBeDefined();
        expect(result.secretHash).toBeDefined();
        expect(result.escrowData).toBeDefined();
        expect(result.resolverResult).toBeDefined();
        expect(result.auctionData).toBeDefined();
        expect(result.status).toBe('created');
        expect(result.timestamp).toBeDefined();
    });

    test('should execute a complete cross-chain swap', async () => {
        const amount = '1000000'; // 1 USDC
        const srcTokenAddress = 'osmo1facacsudmmarmshj54306q8qlwyee2l369tn9c385xa8lkcz3snqrtw9ke';
        const dstTokenAddress = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
        const walletAddress = '0x3cb04058AF6Af29cB6463415B39B6C571458Ac04';
        const srcChainId = 'osmosis-1';
        const dstChainId = 137;

        const result = await executeCrossChainSwap(
            srcChainId,
            dstChainId,
            amount,
            srcTokenAddress,
            dstTokenAddress,
            walletAddress
        );

        expect(result).toBeDefined();
        expect(result.orderHash).toBeDefined();
        expect(result.submissionResult).toBeDefined();
        expect(result.finalStatus).toBeDefined();
        expect(result.orderData).toBeDefined();
        expect(result.submissionResult.status).toBe('submitted');
        expect(result.finalStatus.status).toBe('executed');
    });

    test('should throw error for unsupported source chain', async () => {
        const amount = '1000000';
        const srcTokenAddress = '0x1234567890123456789012345678901234567890';
        const dstTokenAddress = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
        const walletAddress = '0x3cb04058AF6Af29cB6463415B39B6C571458Ac04';
        const srcChainId = 999; // Unsupported chain
        const dstChainId = 137;

        await expect(createCrossChainOrder(
            srcChainId,
            dstChainId,
            amount,
            srcTokenAddress,
            dstTokenAddress,
            walletAddress
        )).rejects.toThrow('Unsupported source chain: 999');
    });
}); 