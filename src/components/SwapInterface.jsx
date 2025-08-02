import React, { useState } from 'react';
import './SwapInterface.css';
import { executeOsmosisToPolygonSwap, createCrossChainOrder } from '../order/crossChainOrder.js';
import { NetworkEnum } from '@1inch/fusion-sdk';

console.log(NetworkEnum.DOGECOIN, NetworkEnum.OSMOSIS, NetworkEnum.POLYGON_AMOY, NetworkEnum.ETHEREUM_SEPOLIA);

const SwapInterface = () => {
    const [fromNetwork, setFromNetwork] = useState(NETWORKS.OSMOSIS);
    const [toNetwork, setToNetwork] = useState(NETWORKS.POLYGON);
    const [fromToken, setFromToken] = useState('USDC');
    const [toToken, setToToken] = useState('USDC');
    const [amount, setAmount] = useState('');
    const [showFromNetworkDropdown, setShowFromNetworkDropdown] = useState(false);
    const [showToNetworkDropdown, setShowToNetworkDropdown] = useState(false);
    const [showFromTokenDropdown, setShowFromTokenDropdown] = useState(false);
    const [showToTokenDropdown, setShowToTokenDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [swapStatus, setSwapStatus] = useState('');

    const networks = [
        { value: NetworkEnum.DOGECOIN, label: 'Dogecoin Testnet' },
        { value: NetworkEnum.OSMOSIS, label: 'Osmosis Testnet' },
        { value: NetworkEnum.POLYGON_AMOY, label: 'Polygon Amoy' },
        { value: NetworkEnum.ETHEREUM_SEPOLIA, label: 'Ethereum Sepolia' }
    ];

    // Token addresses for the swap
    const TOKENS = {
        OSMOSIS: {
            USDC: 'osmo1facacsudmmarmshj54306q8qlwyee2l369tn9c385xa8lkcz3snqrtw9ke',
            OSMO: 'uosmo',
            ATOM: 'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
        },
        POLYGON: {
            USDC: '0xA028858A023dcd285E17F745bC46f0f6eC221e79',
            MATIC: '0x0000000000000000000000000000000000001010',
        },
        DOGECOIN: {
            DOGE: 'DOGE'
        }
    };

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

    // Update tokens when network changes
    const handleFromNetworkChange = (network) => {
        setFromNetwork(network);
        const availableTokens = getAvailableTokens(network);
        if (availableTokens.length > 0 && !availableTokens.find(t => t.value === fromToken)) {
            setFromToken(availableTokens[0].value);
        }
    };

    const handleToNetworkChange = (network) => {
        setToNetwork(network);
        const availableTokens = getAvailableTokens(network);
        if (availableTokens.length > 0 && !availableTokens.find(t => t.value === toToken)) {
            setToToken(availableTokens[0].value);
        }
    };

    const handleSwap = async () => {
        if (!amount || fromNetwork === toNetwork) {
            setSwapStatus('Please enter a valid amount and select different networks');
            return;
        }

        setIsLoading(true);
        setSwapStatus('Initiating cross-chain swap...');

        try {
            // Convert amount to smallest unit (assuming 6 decimals for most tokens)
            const amountInSmallestUnit = (parseFloat(amount) * 1000000).toString();

            // Get token addresses based on selection
            const srcTokenAddress = getTokenAddress(fromNetwork, fromToken);
            const dstTokenAddress = getTokenAddress(toNetwork, toToken);

            // For now, we'll use a placeholder wallet address
            const walletAddress = '0x3cb04058AF6Af29cB6463415B39B6C571458Ac04'; // Replace with actual wallet address

            let result;

            // Check if source and destination are supported
            if (isSupportedNetwork(fromNetwork) && isSupportedNetwork(toNetwork)) {
                setSwapStatus('Creating cross-chain order...');

                // For swap button click, create the order
                result = await createCrossChainOrder(
                    fromNetwork, // srcChainId
                    toNetwork,   // dstChainId
                    amountInSmallestUnit,
                    srcTokenAddress,
                    dstTokenAddress,
                    walletAddress
                );

                setSwapStatus(`Order created! Order Hash: ${result.hash}`);
            } else {
                setSwapStatus('Unsupported network combination. Only Osmosis, Polygon, and Dogecoin swaps are currently supported.');
                return;
            }

            console.log('Cross-chain operation result:', result);

        } catch (error) {
            console.error('Operation failed:', error);
            setSwapStatus(`Operation failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExecuteSwap = async () => {
        if (!amount || fromNetwork === toNetwork) {
            setSwapStatus('Please enter a valid amount and select different networks');
            return;
        }

        setIsLoading(true);
        setSwapStatus('Executing complete cross-chain swap...');

        try {
            // Convert amount to smallest unit (assuming 6 decimals for most tokens)
            const amountInSmallestUnit = (parseFloat(amount) * 1000000).toString();

            // Get token addresses based on selection
            const srcTokenAddress = getTokenAddress(fromNetwork, fromToken);
            const dstTokenAddress = getTokenAddress(toNetwork, toToken);

            // For now, we'll use a placeholder wallet address
            const walletAddress = '0x3cb04058AF6Af29cB6463415B39B6C571458Ac04'; // Replace with actual wallet address

            let result;

            // Check if source and destination are supported
            if (isSupportedNetwork(fromNetwork) && isSupportedNetwork(toNetwork)) {
                setSwapStatus('Executing complete cross-chain swap...');

                // Execute the complete swap (create order + submit + monitor)
                result = await executeCrossChainSwap(
                    fromNetwork, // srcChainId
                    toNetwork,   // dstChainId
                    amountInSmallestUnit,
                    srcTokenAddress,
                    dstTokenAddress,
                    walletAddress
                );

                setSwapStatus(`Swap completed! Order Hash: ${result.orderHash}`);
            } else {
                setSwapStatus('Unsupported network combination. Only Osmosis, Polygon, and Dogecoin swaps are currently supported.');
                return;
            }

            console.log('Complete cross-chain swap result:', result);

        } catch (error) {
            console.error('Complete swap failed:', error);
            setSwapStatus(`Complete swap failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
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

    // Helper function to check if network is supported
    const isSupportedNetwork = (network) => {
        return Object.values(NETWORKS).includes(network);
    };

    const CustomSelect = ({ value, onChange, options, placeholder, isOpen, setIsOpen }) => (
        <div className="custom-select">
            <div
                className="custom-select-header"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="custom-select-value">
                    {options.find(opt => opt.value === value)?.label || placeholder}
                </span>
                <span className={`custom-select-arrow ${isOpen ? 'open' : ''}`}>▼</span>
            </div>
            {isOpen && (
                <div className="custom-select-dropdown">
                    {options.map((option) => (
                        <div
                            key={option.value}
                            className={`custom-select-option ${value === option.value ? 'selected' : ''}`}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="swap-container">
            <div className="swap-card">
                <div className="swap-section">
                    <label className="swap-label">From Network</label>
                    <CustomSelect
                        value={fromNetwork}
                        onChange={handleFromNetworkChange}
                        options={networks}
                        placeholder="Select network"
                        isOpen={showFromNetworkDropdown}
                        setIsOpen={setShowFromNetworkDropdown}
                    />
                </div>

                <div className="swap-section">
                    <label className="swap-label">From Token</label>
                    <CustomSelect
                        value={fromToken}
                        onChange={setFromToken}
                        options={getAvailableTokens(fromNetwork)}
                        placeholder="Select token"
                        isOpen={showFromTokenDropdown}
                        setIsOpen={setShowFromTokenDropdown}
                    />
                </div>

                <div className="swap-section">
                    <label className="swap-label">To Network</label>
                    <CustomSelect
                        value={toNetwork}
                        onChange={handleToNetworkChange}
                        options={networks}
                        placeholder="Select network"
                        isOpen={showToNetworkDropdown}
                        setIsOpen={setShowToNetworkDropdown}
                    />
                </div>

                <div className="swap-section">
                    <label className="swap-label">To Token</label>
                    <CustomSelect
                        value={toToken}
                        onChange={setToToken}
                        options={getAvailableTokens(toNetwork)}
                        placeholder="Select token"
                        isOpen={showToTokenDropdown}
                        setIsOpen={setShowToTokenDropdown}
                    />
                </div>

                <div className="swap-section">
                    <label className="swap-label">Amount</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="swap-input"
                    />
                </div>

                <div className="button-group">
                    <button
                        onClick={handleSwap}
                        className="swap-button"
                        disabled={!amount || fromNetwork === toNetwork || isLoading}
                    >
                        {isLoading ? 'Processing...' : 'Create Order'}
                    </button>

                    <button
                        onClick={handleExecuteSwap}
                        className="swap-button execute-button"
                        disabled={!amount || fromNetwork === toNetwork || isLoading}
                    >
                        {isLoading ? 'Processing...' : 'Execute Complete Swap'}
                    </button>
                </div>

                {swapStatus && (
                    <div className="swap-status">
                        {swapStatus}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SwapInterface; 