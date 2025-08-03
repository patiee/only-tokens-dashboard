import React, { useState, useEffect } from 'react';
import {
    executeCrossChainSwapWithHTCL
} from '../order/crossChainOrder.js';
import { TOKENS } from '../config/const';
import { NetworkEnum } from '@1inch/fusion-sdk';
import './HTCLSwapInterface.css';

const HTCLSwapInterface = () => {
    const [sourceNetwork, setSourceNetwork] = useState(NetworkEnum.POLYGON_AMOY);
    const [destNetwork, setDestNetwork] = useState(NetworkEnum.OSMOSIS);
    const [sourceAmount, setSourceAmount] = useState('1000000');
    const [destAmount, setDestAmount] = useState('1000000');
    const [aliceAddress, setAliceAddress] = useState('0x3cb04058AF6Af29cB6463415B39B6C571458Ac04');
    const [bobAddress, setBobAddress] = useState('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
    const [srcTokenAddress, setSrcTokenAddress] = useState('');
    const [dstTokenAddress, setDstTokenAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // Get available tokens for a specific network
    const getAvailableTokens = (network) => {
        console.log('getAvailableTokens called with network:', network, typeof network);
        console.log('NetworkEnum.ETHEREUM_SEPOLIA:', NetworkEnum.ETHEREUM_SEPOLIA);
        console.log('NetworkEnum.POLYGON_AMOY:', NetworkEnum.POLYGON_AMOY);
        console.log('NetworkEnum.OSMOSIS:', NetworkEnum.OSMOSIS);
        console.log('NetworkEnum.DOGECOIN:', NetworkEnum.DOGECOIN);

        if (network === NetworkEnum.OSMOSIS || network === 'osmo-test-5') {
            const tokens = [
                { value: TOKENS[NetworkEnum.OSMOSIS].USDC, label: 'USDC' },
                { value: TOKENS[NetworkEnum.OSMOSIS].OSMO, label: 'OSMO' },
                { value: TOKENS[NetworkEnum.OSMOSIS].ATOM, label: 'ATOM' }
            ];
            console.log('Osmosis tokens:', tokens);
            return tokens;
        } else if (network === NetworkEnum.POLYGON_AMOY || network === 80001) {
            const tokens = [
                { value: TOKENS[NetworkEnum.POLYGON_AMOY].USDC, label: 'USDC' },
                { value: TOKENS[NetworkEnum.POLYGON_AMOY].MATIC, label: 'MATIC' }
            ];
            console.log('Polygon tokens:', tokens);
            return tokens;
        } else if (network === NetworkEnum.ETHEREUM_SEPOLIA || network === 11155111) {
            const tokens = [
                { value: TOKENS[NetworkEnum.ETHEREUM_SEPOLIA].USDC, label: 'USDC' },
                { value: TOKENS[NetworkEnum.ETHEREUM_SEPOLIA].ETH, label: 'ETH' }
            ];
            console.log('Sepolia tokens:', tokens);
            return tokens;
        } else if (network === NetworkEnum.DOGECOIN || network === 568) {
            const tokens = [
                { value: TOKENS[NetworkEnum.DOGECOIN].DOGE, label: 'DOGE' }
            ];
            console.log('Dogecoin tokens:', tokens);
            return tokens;
        }
        console.log('No tokens found for network:', network);
        return [];
    };

    // Debug NetworkEnum values on component mount
    useEffect(() => {
        console.log('=== NetworkEnum Debug ===');
        console.log('NetworkEnum.OSMOSIS:', NetworkEnum.OSMOSIS, typeof NetworkEnum.OSMOSIS);
        console.log('NetworkEnum.POLYGON_AMOY:', NetworkEnum.POLYGON_AMOY, typeof NetworkEnum.POLYGON_AMOY);
        console.log('NetworkEnum.ETHEREUM_SEPOLIA:', NetworkEnum.ETHEREUM_SEPOLIA, typeof NetworkEnum.ETHEREUM_SEPOLIA);
        console.log('NetworkEnum.DOGECOIN:', NetworkEnum.DOGECOIN, typeof NetworkEnum.DOGECOIN);
        console.log('TOKENS keys:', Object.keys(TOKENS));
        console.log('TOKENS[NetworkEnum.OSMOSIS]:', TOKENS[NetworkEnum.OSMOSIS]);
        console.log('TOKENS[NetworkEnum.POLYGON_AMOY]:', TOKENS[NetworkEnum.POLYGON_AMOY]);
        console.log('=== End Debug ===');

        // Set initial token addresses
        const initialSrcTokens = getAvailableTokens(NetworkEnum.POLYGON_AMOY);
        const initialDstTokens = getAvailableTokens(NetworkEnum.OSMOSIS);
        console.log('Initial src tokens:', initialSrcTokens);
        console.log('Initial dst tokens:', initialDstTokens);
        if (initialSrcTokens.length > 0) {
            setSrcTokenAddress(initialSrcTokens[0].value);
        }
        if (initialDstTokens.length > 0) {
            setDstTokenAddress(initialDstTokens[0].value);
        }
    }, []);

    // All available networks
    const allNetworks = [
        { value: NetworkEnum.POLYGON_AMOY, label: 'Polygon Amoy' },
        { value: NetworkEnum.ETHEREUM_SEPOLIA, label: 'Ethereum Sepolia' },
        { value: NetworkEnum.DOGECOIN, label: 'Dogecoin Testnet' },
        { value: NetworkEnum.OSMOSIS, label: 'Osmosis Testnet' }
    ];

    // Get available destination networks based on source network
    const getAvailableDestNetworks = (sourceNetwork) => {
        switch (sourceNetwork) {
            case NetworkEnum.POLYGON_AMOY:
            case NetworkEnum.ETHEREUM_SEPOLIA:
                // EVM chains can swap to Cosmos, Dogecoin, and same chain
                return allNetworks.filter(net =>
                    net.value === NetworkEnum.OSMOSIS ||
                    net.value === NetworkEnum.DOGECOIN ||
                    net.value === sourceNetwork // Allow same-chain swaps
                );
            case NetworkEnum.OSMOSIS:
                // Cosmos can swap to EVM chains and same chain
                return allNetworks.filter(net =>
                    net.value === NetworkEnum.POLYGON_AMOY ||
                    net.value === NetworkEnum.ETHEREUM_SEPOLIA ||
                    net.value === sourceNetwork // Allow same-chain swaps
                );
            case NetworkEnum.DOGECOIN:
                // Dogecoin can swap to EVM chains and same chain
                return allNetworks.filter(net =>
                    net.value === NetworkEnum.POLYGON_AMOY ||
                    net.value === NetworkEnum.ETHEREUM_SEPOLIA ||
                    net.value === sourceNetwork // Allow same-chain swaps
                );
            default:
                return allNetworks;
        }
    };

    // Handle source network change
    const handleSourceNetworkChange = (network) => {
        console.log('handleSourceNetworkChange called with network:', network, typeof network);
        setSourceNetwork(network);

        // Update source token address based on new network
        const availableTokens = getAvailableTokens(network);
        console.log('Available tokens for network:', network, ':', availableTokens);

        if (availableTokens.length > 0) {
            const firstToken = availableTokens[0];
            console.log('Setting srcTokenAddress to:', firstToken.value, typeof firstToken.value);
            setSrcTokenAddress(firstToken.value);
        } else {
            console.log('No tokens available for network:', network);
            setSrcTokenAddress('');
        }

        // Reset destination network if current selection is not valid for new source
        const availableDestNetworks = getAvailableDestNetworks(network);
        console.log('Available destination networks:', availableDestNetworks);

        if (!availableDestNetworks.find(net => net.value === destNetwork)) {
            console.log('Current destNetwork not valid, setting to:', availableDestNetworks[0].value);
            setDestNetwork(availableDestNetworks[0].value);
            // Also update destination token address
            const destAvailableTokens = getAvailableTokens(availableDestNetworks[0].value);
            if (destAvailableTokens.length > 0) {
                setDstTokenAddress(destAvailableTokens[0].value);
            }
        }
    };

    // Handle destination network change
    const handleDestNetworkChange = (network) => {
        setDestNetwork(network);
        // Update destination token address based on new network
        const availableTokens = getAvailableTokens(network);
        if (availableTokens.length > 0) {
            setDstTokenAddress(availableTokens[0].value);
        }
    };

    const getTokenAddresses = () => {
        // Debug logging to see what values we're working with
        console.log('Source Network:', sourceNetwork, typeof sourceNetwork);
        console.log('Dest Network:', destNetwork, typeof destNetwork);
        console.log('TOKENS keys:', Object.keys(TOKENS));
        console.log('TOKENS[sourceNetwork]:', TOKENS[sourceNetwork]);
        console.log('TOKENS[destNetwork]:', TOKENS[destNetwork]);

        // Use state values instead of calculating
        console.log('Final srcToken:', srcTokenAddress);
        console.log('Final dstToken:', dstTokenAddress);

        return { srcToken: srcTokenAddress, dstToken: dstTokenAddress };
    };

    const getChainLabel = (chainId) => {
        const network = allNetworks.find(net => net.value === chainId);
        return network ? network.label : 'Unknown';
    };

    const getTokenLabel = (chainId) => {
        if (chainId === NetworkEnum.DOGECOIN) return 'DOGE';
        return 'USDC';
    };

    const executeSwap = async () => {
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const { srcToken, dstToken } = getTokenAddresses();

            // Always use the generic cross-chain swap function
            // This ensures the correct source and destination chain IDs are used
            const swapResult = await executeCrossChainSwapWithHTCL(
                sourceNetwork,
                destNetwork,
                sourceAmount,
                srcToken,
                dstToken,
                aliceAddress,
                bobAddress
            );

            setResult(swapResult);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const formatResult = (result) => {
        if (!result) return null;

        return (
            <div className="result-container">
                <h3>✅ Swap Completed Successfully</h3>
                <div className="result-details">
                    <div className="result-section">
                        <h4>Order Details</h4>
                        <p><strong>Order ID:</strong> {result.orderId}</p>
                        <p><strong>Secret:</strong> {result.secret?.substring(0, 16)}...</p>
                        <p><strong>Hashlock:</strong> {result.hashlock?.substring(0, 16)}...</p>
                        <p><strong>Timelock:</strong> {new Date(result.timelock * 1000).toLocaleString()}</p>
                    </div>

                    <div className="result-section">
                        <h4>HTCL Contracts</h4>
                        <p><strong>Alice Source HTCL:</strong> {result.aliceSourceHTCL?.contractAddress}</p>
                        <p><strong>Bob Destination HTCL:</strong> {result.bobDestHTCL?.contractAddress}</p>
                    </div>

                    <div className="result-section">
                        <h4>Withdrawals</h4>
                        <p><strong>Alice Withdrawal:</strong> {result.aliceWithdrawal?.txHash}</p>
                        <p><strong>Bob Withdrawal:</strong> {result.bobWithdrawal?.txHash}</p>
                    </div>

                    <div className="result-section">
                        <h4>Timestamps</h4>
                        <p><strong>Order Creation:</strong> {result.orderCreation?.txHash}</p>
                        <p><strong>Order Acceptance:</strong> {result.orderAcceptance?.txHash}</p>
                        <p><strong>Completed:</strong> {new Date(result.timestamp).toLocaleString()}</p>
                    </div>
                </div>
            </div>
        );
    };

    const availableDestNetworks = getAvailableDestNetworks(sourceNetwork);

    return (
        <div className="htcl-swap-interface">
            <div className="header">
                <h1>🔗 HTCL Cross-Chain Swap</h1>
                <p>Execute cross-chain swaps using Hash Time-Locked Contracts</p>
            </div>

            <div className="swap-form">
                <div className="form-section">
                    <h3>Swap Configuration</h3>
                </div>

                <div className="swap-card">
                    {/* Source Chain Section */}
                    <div className="swap-section">
                        <label className="swap-label">From Network</label>
                        <select
                            value={sourceNetwork}
                            onChange={(e) => handleSourceNetworkChange(e.target.value)}
                            className="swap-input"
                        >
                            {allNetworks.map(network => (
                                <option key={network.value} value={network.value}>
                                    {network.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="swap-section">
                        <label className="swap-label">From Token</label>
                        <select
                            value={srcTokenAddress || ''}
                            onChange={(e) => {
                                console.log('From token changed to:', e.target.value);
                                setSrcTokenAddress(e.target.value);
                            }}
                            className="token-address-input"
                        >
                            {(() => {
                                const tokens = getAvailableTokens(sourceNetwork);
                                console.log('Rendering tokens for sourceNetwork:', sourceNetwork, 'tokens:', tokens);
                                return tokens.map(token => (
                                    <option key={token.value} value={token.value}>
                                        {token.label}
                                    </option>
                                ));
                            })()}
                        </select>
                    </div>

                    <div className="swap-section">
                        <label className="swap-label">From Amount</label>
                        <input
                            type="text"
                            value={sourceAmount}
                            onChange={(e) => setSourceAmount(e.target.value)}
                            placeholder="1000000 (1 USDC)"
                            className="swap-input"
                        />
                    </div>

                    {/* Destination Chain Section */}
                    <div className="swap-section">
                        <label className="swap-label">To Network</label>
                        <select
                            value={destNetwork}
                            onChange={(e) => handleDestNetworkChange(e.target.value)}
                            className="swap-input"
                        >
                            {availableDestNetworks.map(network => (
                                <option key={network.value} value={network.value}>
                                    {network.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="swap-section">
                        <label className="swap-label">To Token</label>
                        <select
                            value={dstTokenAddress || ''}
                            onChange={(e) => {
                                console.log('To token changed to:', e.target.value);
                                setDstTokenAddress(e.target.value);
                            }}
                            className="token-address-input"
                        >
                            {getAvailableTokens(destNetwork).map(token => (
                                <option key={token.value} value={token.value}>
                                    {token.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="swap-section">
                        <label className="swap-label">To Amount</label>
                        <input
                            type="text"
                            value={destAmount}
                            onChange={(e) => setDestAmount(e.target.value)}
                            placeholder="1000000 (1 USDC)"
                            className="swap-input"
                        />
                    </div>

                    {/* Addresses Section */}
                    <div className="addresses-section">
                        <div className="swap-section">
                            <label className="swap-label">Alice Address (Order Creator)</label>
                            <input
                                type="text"
                                value={aliceAddress}
                                onChange={(e) => setAliceAddress(e.target.value)}
                                placeholder="0x..."
                                className="swap-input"
                            />
                        </div>

                        <div className="swap-section">
                            <label className="swap-label">Bob Address (Order Acceptor)</label>
                            <input
                                type="text"
                                value={bobAddress}
                                onChange={(e) => setBobAddress(e.target.value)}
                                placeholder="0x..."
                                className="swap-input"
                            />
                        </div>
                    </div>

                    <div className="button-group">
                        <button
                            onClick={executeSwap}
                            disabled={isLoading || sourceNetwork === destNetwork}
                            className="swap-button execute-button"
                        >
                            {isLoading ? '🔄 Executing Swap...' : '🚀 Execute HTCL Swap'}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-container">
                    <h3>❌ Error</h3>
                    <p>{error}</p>
                </div>
            )}

            {result && formatResult(result)}

            <div className="info-section">
                <h3>ℹ️ How it works</h3>
                <ol>
                    <li><strong>Alice creates an order</strong> with LimitOrderProtocol</li>
                    <li><strong>Bob accepts the order</strong> and provides hashlock</li>
                    <li><strong>Alice creates HTCL deposit</strong> on source chain with hashlock</li>
                    <li><strong>Bob creates HTCL deposit</strong> on destination chain with hashlock</li>
                    <li><strong>Alice withdraws</strong> from destination chain with secret before timelock</li>
                    <li><strong>Bob withdraws</strong> from source chain with Alice's secret before timelock</li>
                </ol>
            </div>
        </div>
    );
};

export default HTCLSwapInterface; 