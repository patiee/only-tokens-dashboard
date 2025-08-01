import React, { useState } from 'react';
import './SwapInterface.css';
import { executeOsmosisToPolygonSwap } from '../order/crossChainOrder.js';
import { NetworkEnum } from '@1inch/cross-chain-sdk';

const SwapInterface = () => {
    const [fromNetwork, setFromNetwork] = useState('osmosis');
    const [toNetwork, setToNetwork] = useState('polygon');
    const [amount, setAmount] = useState('');
    const [showFromDropdown, setShowFromDropdown] = useState(false);
    const [showToDropdown, setShowToDropdown] = useState(false);
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
            USDC: '0x...',
            OSMO: '0x...',
        },
        POLYGON: {
            USDC: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
            MATIC: '0x0000000000000000000000000000000000001010',
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
            // Convert amount to smallest unit (assuming 6 decimals for USDC)
            const amountInSmallestUnit = (parseFloat(amount) * 1000000).toString();

            // Get token addresses based on selection
            const srcTokenAddress = fromNetwork === 'osmosis' ? TOKENS.OSMOSIS.USDC : TOKENS.POLYGON.USDC;
            const dstTokenAddress = toNetwork === 'osmosis' ? TOKENS.OSMOSIS.USDC : TOKENS.POLYGON.USDC;

            // For now, we'll use a placeholder wallet address
            const walletAddress = '0x...'; // Replace with actual wallet address

            setSwapStatus('Creating cross-chain order...');

            const result = await executeOsmosisToPolygonSwap(
                amountInSmallestUnit,
                srcTokenAddress,
                dstTokenAddress,
                walletAddress
            );

            setSwapStatus(`Swap completed! Order Hash: ${result.orderHash}`);
            console.log('Cross-chain swap result:', result);

        } catch (error) {
            console.error('Swap failed:', error);
            setSwapStatus(`Swap failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
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
                    <label className="swap-label">From</label>
                    <CustomSelect
                        value={fromNetwork}
                        onChange={setFromNetwork}
                        options={networks}
                        placeholder="Select network"
                        isOpen={showFromDropdown}
                        setIsOpen={setShowFromDropdown}
                    />
                </div>

                <div className="swap-section">
                    <label className="swap-label">To</label>
                    <CustomSelect
                        value={toNetwork}
                        onChange={setToNetwork}
                        options={networks}
                        placeholder="Select network"
                        isOpen={showToDropdown}
                        setIsOpen={setShowToDropdown}
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

                <button
                    onClick={handleSwap}
                    className="swap-button"
                    disabled={!amount || fromNetwork === toNetwork || isLoading}
                >
                    {isLoading ? 'Processing...' : 'Swap'}
                </button>

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