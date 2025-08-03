import React, { useState } from 'react';
import {
    executeCrossChainSwapWithHTCL,
    executeEVMToCosmosSwap,
    executeCosmosToEVMSwap,
    executeEVMToDogecoinSwap,
    executeDogecoinToEVMSwap
} from '../order/crossChainOrder.js';
import { TOKENS } from '../config/const';
import { NetworkEnum } from '@1inch/fusion-sdk';
import './HTCLSwapInterface.css';

const HTCLSwapInterface = () => {
    const [swapType, setSwapType] = useState('evm-cosmos');
    const [amount, setAmount] = useState('1000000');
    const [aliceAddress, setAliceAddress] = useState('0x3cb04058AF6Af29cB6463415B39B6C571458Ac04');
    const [bobAddress, setBobAddress] = useState('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const swapTypes = [
        { value: 'evm-cosmos', label: 'EVM → Cosmos', srcChain: NetworkEnum.POLYGON_AMOY, dstChain: NetworkEnum.OSMOSIS },
        { value: 'cosmos-evm', label: 'Cosmos → EVM', srcChain: NetworkEnum.OSMOSIS, dstChain: NetworkEnum.POLYGON_AMOY },
        { value: 'evm-dogecoin', label: 'EVM → Dogecoin', srcChain: NetworkEnum.POLYGON_AMOY, dstChain: NetworkEnum.DOGECOIN },
        { value: 'dogecoin-evm', label: 'Dogecoin → EVM', srcChain: NetworkEnum.DOGECOIN, dstChain: NetworkEnum.POLYGON_AMOY }
    ];

    console.log('HTCLSwapInterface rendered with swapType:', swapType);

    const getSelectedSwap = () => {
        return swapTypes.find(type => type.value === swapType);
    };

    const getTokenAddresses = () => {
        const selected = getSelectedSwap();
        if (!selected) return { srcToken: '', dstToken: '' };

        switch (swapType) {
            case 'evm-cosmos':
                return {
                    srcToken: TOKENS[NetworkEnum.POLYGON_AMOY]?.USDC || '0x...',
                    dstToken: TOKENS[NetworkEnum.OSMOSIS]?.USDC || 'osmo...'
                };
            case 'cosmos-evm':
                return {
                    srcToken: TOKENS[NetworkEnum.OSMOSIS]?.USDC || 'osmo...',
                    dstToken: TOKENS[NetworkEnum.POLYGON_AMOY]?.USDC || '0x...'
                };
            case 'evm-dogecoin':
                return {
                    srcToken: TOKENS[NetworkEnum.POLYGON_AMOY]?.USDC || '0x...',
                    dstToken: TOKENS[NetworkEnum.DOGECOIN]?.DOGE || 'DOGE'
                };
            case 'dogecoin-evm':
                return {
                    srcToken: TOKENS[NetworkEnum.DOGECOIN]?.DOGE || 'DOGE',
                    dstToken: TOKENS[NetworkEnum.POLYGON_AMOY]?.USDC || '0x...'
                };
            default:
                return { srcToken: '', dstToken: '' };
        }
    };

    const executeSwap = async () => {
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const selected = getSelectedSwap();
            const { srcToken, dstToken } = getTokenAddresses();

            let swapResult;

            switch (swapType) {
                case 'evm-cosmos':
                    swapResult = await executeEVMToCosmosSwap(amount, srcToken, dstToken, aliceAddress, bobAddress);
                    break;
                case 'cosmos-evm':
                    swapResult = await executeCosmosToEVMSwap(amount, srcToken, dstToken, aliceAddress, bobAddress);
                    break;
                case 'evm-dogecoin':
                    swapResult = await executeEVMToDogecoinSwap(amount, srcToken, dstToken, aliceAddress, bobAddress);
                    break;
                case 'dogecoin-evm':
                    swapResult = await executeDogecoinToEVMSwap(amount, srcToken, dstToken, aliceAddress, bobAddress);
                    break;
                default:
                    swapResult = await executeCrossChainSwapWithHTCL(
                        selected.srcChain,
                        selected.dstChain,
                        amount,
                        srcToken,
                        dstToken,
                        aliceAddress,
                        bobAddress
                    );
            }

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

    return (
        <div className="htcl-swap-interface">
            <div className="header">
                <h1>🔗 HTCL Cross-Chain Swap</h1>
                <p>Execute cross-chain swaps using Hash Time-Locked Contracts</p>
            </div>

            <div className="swap-form">
                <div className="form-section">
                    <h3>Swap Configuration</h3>

                    <div className="form-group">
                        <label htmlFor="swapType">Swap Type:</label>
                        <select
                            id="swapType"
                            value={swapType}
                            onChange={(e) => {
                                console.log('Swap type changed to:', e.target.value);
                                setSwapType(e.target.value);
                            }}
                            style={{
                                display: 'block',
                                width: '100%',
                                padding: '12px 15px',
                                border: '2px solid #e1e5e9',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                backgroundColor: '#f8f9fa',
                                color: '#2c3e50',
                                marginBottom: '10px'
                            }}
                        >
                            {swapTypes.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                        <div style={{
                            color: '#7f8c8d',
                            fontSize: '0.9rem',
                            marginBottom: '15px',
                            padding: '8px',
                            backgroundColor: '#f1f2f6',
                            borderRadius: '4px'
                        }}>
                            Selected: {swapTypes.find(t => t.value === swapType)?.label}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="amount">Amount (in smallest unit):</label>
                        <input
                            type="text"
                            id="amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="1000000 (1 USDC)"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="aliceAddress">Alice Address (Order Creator):</label>
                        <input
                            type="text"
                            id="aliceAddress"
                            value={aliceAddress}
                            onChange={(e) => setAliceAddress(e.target.value)}
                            placeholder="0x..."
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="bobAddress">Bob Address (Order Acceptor):</label>
                        <input
                            type="text"
                            id="bobAddress"
                            value={bobAddress}
                            onChange={(e) => setBobAddress(e.target.value)}
                            placeholder="0x..."
                        />
                    </div>
                </div>

                <div className="form-section">
                    <h3>Swap Details</h3>
                    <div className="swap-details">
                        <div className="detail-item">
                            <strong>Source Chain:</strong> {getSelectedSwap()?.srcChain}
                        </div>
                        <div className="detail-item">
                            <strong>Destination Chain:</strong> {getSelectedSwap()?.dstChain}
                        </div>
                        <div className="detail-item">
                            <strong>Source Token:</strong> {getTokenAddresses().srcToken}
                        </div>
                        <div className="detail-item">
                            <strong>Destination Token:</strong> {getTokenAddresses().dstToken}
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <button
                        onClick={executeSwap}
                        disabled={isLoading}
                        className="execute-button"
                    >
                        {isLoading ? '🔄 Executing Swap...' : '🚀 Execute HTCL Swap'}
                    </button>
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