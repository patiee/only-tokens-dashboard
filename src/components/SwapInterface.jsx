import React, { useState } from 'react';
import './SwapInterface.css';

const SwapInterface = () => {
    const [fromNetwork, setFromNetwork] = useState('osmosis');
    const [toNetwork, setToNetwork] = useState('polygon');
    const [amount, setAmount] = useState('');
    const [showFromDropdown, setShowFromDropdown] = useState(false);
    const [showToDropdown, setShowToDropdown] = useState(false);

    const networks = [
        { value: 'osmosis', label: 'Osmosis' },
        { value: 'polygon', label: 'Polygon' }
    ];

    const handleSwap = () => {
        console.log('Swap initiated:', { fromNetwork, toNetwork, amount });
        // Add swap logic here
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
                    disabled={!amount || fromNetwork === toNetwork}
                >
                    Swap
                </button>
            </div>
        </div>
    );
};

export default SwapInterface; 