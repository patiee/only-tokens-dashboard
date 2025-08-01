import React, { useState } from 'react';
import './SwapInterface.css';

const SwapInterface = () => {
    const [fromNetwork, setFromNetwork] = useState('osmosis');
    const [toNetwork, setToNetwork] = useState('polygon');
    const [amount, setAmount] = useState('');

    const handleSwap = () => {
        console.log('Swap initiated:', { fromNetwork, toNetwork, amount });
        // Add swap logic here
    };

    return (
        <div className="swap-container">
            <div className="swap-card">
                <div className="swap-section">
                    <label className="swap-label">From</label>
                    <select
                        value={fromNetwork}
                        onChange={(e) => setFromNetwork(e.target.value)}
                        className="swap-select"
                    >
                        <option value="osmosis">Osmosis</option>
                        <option value="polygon">Polygon</option>
                    </select>
                </div>

                <div className="swap-section">
                    <label className="swap-label">To</label>
                    <select
                        value={toNetwork}
                        onChange={(e) => setToNetwork(e.target.value)}
                        className="swap-select"
                    >
                        <option value="osmosis">Osmosis</option>
                        <option value="polygon">Polygon</option>
                    </select>
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