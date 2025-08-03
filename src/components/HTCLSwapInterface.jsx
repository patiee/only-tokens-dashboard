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
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

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
                // EVM chains can swap to Cosmos and Dogecoin
                return allNetworks.filter(net =>
                    net.value === NetworkEnum.OSMOSIS ||
                    net.value === NetworkEnum.DOGECOIN
                );
            case NetworkEnum.OSMOSIS:
                // Cosmos can swap to EVM chains
                return allNetworks.filter(net =>
                    net.value === NetworkEnum.POLYGON_AMOY ||
                    net.value === NetworkEnum.ETHEREUM_SEPOLIA
                );
            case NetworkEnum.DOGECOIN:
                // Dogecoin can swap to EVM chains
                return allNetworks.filter(net =>
                    net.value === NetworkEnum.POLYGON_AMOY ||
                    net.value === NetworkEnum.ETHEREUM_SEPOLIA
                );
            default:
                return allNetworks;
        }
    };

    // Handle source network change
    const handleSourceNetworkChange = (network) => {
        setSourceNetwork(network);
        // Reset destination network if current selection is not valid for new source
        const availableDestNetworks = getAvailableDestNetworks(network);
        if (!availableDestNetworks.find(net => net.value === destNetwork)) {
            setDestNetwork(availableDestNetworks[0].value);
        }
    };

    const getTokenAddresses = () => {
        // Debug logging to see what values we're working with
        console.log('Source Network:', sourceNetwork, typeof sourceNetwork);
        console.log('Dest Network:', destNetwork, typeof destNetwork);
        console.log('TOKENS keys:', Object.keys(TOKENS));
        console.log('TOKENS[sourceNetwork]:', TOKENS[sourceNetwork]);
        console.log('TOKENS[destNetwork]:', TOKENS[destNetwork]);

        // Get token addresses with proper fallbacks
        let srcToken = '0x...';
        let dstToken = '0x...';

        // Handle source network
        if (sourceNetwork === NetworkEnum.OSMOSIS) {
            srcToken = TOKENS[NetworkEnum.OSMOSIS].USDC;
        } else if (sourceNetwork === NetworkEnum.POLYGON_AMOY) {
            srcToken = TOKENS[NetworkEnum.POLYGON_AMOY].USDC;
        } else if (sourceNetwork === NetworkEnum.ETHEREUM_SEPOLIA) {
            srcToken = TOKENS[NetworkEnum.ETHEREUM_SEPOLIA].USDC;
        } else if (sourceNetwork === NetworkEnum.DOGECOIN) {
            srcToken = TOKENS[NetworkEnum.DOGECOIN].DOGE;
        }

        // Handle destination network
        if (destNetwork === NetworkEnum.OSMOSIS) {
            dstToken = TOKENS[NetworkEnum.OSMOSIS].USDC;
        } else if (destNetwork === NetworkEnum.POLYGON_AMOY) {
            dstToken = TOKENS[NetworkEnum.POLYGON_AMOY].USDC;
        } else if (destNetwork === NetworkEnum.ETHEREUM_SEPOLIA) {
            dstToken = TOKENS[NetworkEnum.ETHEREUM_SEPOLIA].USDC;
        } else if (destNetwork === NetworkEnum.DOGECOIN) {
            dstToken = TOKENS[NetworkEnum.DOGECOIN].DOGE;
        }

        console.log('Final srcToken:', srcToken);
        console.log('Final dstToken:', dstToken);

        return { srcToken, dstToken };
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
                            onChange={(e) => handleSourceNetworkChange(Number(e.target.value))}
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
                        <div className="token-display">
                            <span className="token-name">{getTokenLabel(sourceNetwork)}</span>
                            <span className="token-address">{getTokenAddresses().srcToken}</span>
                        </div>
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
                            onChange={(e) => setDestNetwork(Number(e.target.value))}
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
                        <div className="token-display">
                            <span className="token-name">{getTokenLabel(destNetwork)}</span>
                            <span className="token-address">{getTokenAddresses().dstToken}</span>
                        </div>
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