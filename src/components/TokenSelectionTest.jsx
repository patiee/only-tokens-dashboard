import React, { useState } from 'react';

// Network constants (matching the ones in crossChainOrder.js)
const NETWORKS = {
    POLYGON: 137,
    OSMOSIS: 'osmosis-1',
    DOGECOIN: 568
};

// Token addresses for the swap
const TOKENS = {
    OSMOSIS: {
        USDC: 'osmo1facacsudmmarmshj54306q8qlwyee2l369tn9c385xa8lkcz3snqrtw9ke',
        OSMO: 'uosmo',
        ATOM: 'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
    },
    POLYGON: {
        USDC: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
        MATIC: '0x0000000000000000000000000000000000001010',
        WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
        USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    },
    DOGECOIN: {
        DOGE: 'DOGE',
        USDC: 'DOGE_USDC', // Mock USDC on Dogecoin
        WBTC: 'DOGE_WBTC' // Mock Wrapped Bitcoin on Dogecoin
    }
};

const TokenSelectionTest = () => {
    const [fromNetwork, setFromNetwork] = useState(NETWORKS.OSMOSIS);
    const [toNetwork, setToNetwork] = useState(NETWORKS.POLYGON);
    const [fromToken, setFromToken] = useState('USDC');
    const [toToken, setToToken] = useState('USDC');

    const networks = [
        { value: NETWORKS.OSMOSIS, label: 'Osmosis' },
        { value: NETWORKS.POLYGON, label: 'Polygon' },
        { value: NETWORKS.DOGECOIN, label: 'Dogecoin' }
    ];

    // Get available tokens for a specific network
    const getAvailableTokens = (network) => {
        if (network === NETWORKS.OSMOSIS) {
            return [
                { value: 'USDC', label: 'USDC' },
                { value: 'OSMO', label: 'OSMO' },
                { value: 'ATOM', label: 'ATOM' }
            ];
        } else if (network === NETWORKS.POLYGON) {
            return [
                { value: 'USDC', label: 'USDC' },
                { value: 'MATIC', label: 'MATIC' },
                { value: 'WETH', label: 'WETH' },
                { value: 'USDT', label: 'USDT' }
            ];
        } else if (network === NETWORKS.DOGECOIN) {
            return [
                { value: 'DOGE', label: 'DOGE' },
                { value: 'USDC', label: 'USDC' },
                { value: 'WBTC', label: 'WBTC' }
            ];
        }
        return [];
    };

    // Helper function to get token address based on network
    const getTokenAddress = (network, tokenType) => {
        if (network === NETWORKS.OSMOSIS) {
            return TOKENS.OSMOSIS[tokenType];
        } else if (network === NETWORKS.POLYGON) {
            return TOKENS.POLYGON[tokenType];
        } else if (network === NETWORKS.DOGECOIN) {
            return TOKENS.DOGECOIN[tokenType];
        }
        return TOKENS.POLYGON[tokenType]; // Default fallback
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h2>Token Selection Test</h2>

            <div style={{ marginBottom: '20px' }}>
                <h3>From Network: {networks.find(n => n.value === fromNetwork)?.label}</h3>
                <p>Available tokens: {getAvailableTokens(fromNetwork).map(t => t.label).join(', ')}</p>
                <p>Selected token: {fromToken}</p>
                <p>Token address: {getTokenAddress(fromNetwork, fromToken)}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3>To Network: {networks.find(n => n.value === toNetwork)?.label}</h3>
                <p>Available tokens: {getAvailableTokens(toNetwork).map(t => t.label).join(', ')}</p>
                <p>Selected token: {toToken}</p>
                <p>Token address: {getTokenAddress(toNetwork, toToken)}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3>Test Network Changes</h3>
                <button
                    onClick={() => setFromNetwork(NETWORKS.OSMOSIS)}
                    style={{ margin: '5px', padding: '10px' }}
                >
                    Set From: Osmosis
                </button>
                <button
                    onClick={() => setFromNetwork(NETWORKS.POLYGON)}
                    style={{ margin: '5px', padding: '10px' }}
                >
                    Set From: Polygon
                </button>
                <button
                    onClick={() => setFromNetwork(NETWORKS.DOGECOIN)}
                    style={{ margin: '5px', padding: '10px' }}
                >
                    Set From: Dogecoin
                </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3>Test Token Changes</h3>
                <button
                    onClick={() => setFromToken('USDC')}
                    style={{ margin: '5px', padding: '10px' }}
                >
                    Set From Token: USDC
                </button>
                <button
                    onClick={() => setFromToken('OSMO')}
                    style={{ margin: '5px', padding: '10px' }}
                >
                    Set From Token: OSMO
                </button>
                <button
                    onClick={() => setFromToken('MATIC')}
                    style={{ margin: '5px', padding: '10px' }}
                >
                    Set From Token: MATIC
                </button>
            </div>

            <div style={{
                padding: '15px',
                backgroundColor: '#f0f0f0',
                borderRadius: '8px',
                marginTop: '20px'
            }}>
                <h3>Swap Summary</h3>
                <p><strong>From:</strong> {getAvailableTokens(fromNetwork).find(t => t.value === fromToken)?.label} on {networks.find(n => n.value === fromNetwork)?.label}</p>
                <p><strong>To:</strong> {getAvailableTokens(toNetwork).find(t => t.value === toToken)?.label} on {networks.find(n => n.value === toNetwork)?.label}</p>
                <p><strong>From Address:</strong> {getTokenAddress(fromNetwork, fromToken)}</p>
                <p><strong>To Address:</strong> {getTokenAddress(toNetwork, toToken)}</p>
            </div>
        </div>
    );
};

export default TokenSelectionTest; 