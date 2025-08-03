#!/bin/bash

# Dogecoin HTCL Deployment Script
# This script sets up and runs the HTCL implementation

echo "🐕 Dogecoin HTCL Deployment Script"
echo "=================================="

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is required but not installed."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pip3 install -r requirements.txt

# Run tests
echo "🧪 Running tests..."
python3 test_htcl.py

# Run example
echo "🚀 Running HTCL example..."
python3 htcl_example.py

echo "✅ Deployment complete!"
echo ""
echo "📁 Files created:"
echo "   - htcl_transaction_data.json (if example ran successfully)"
echo ""
echo "📖 Usage:"
echo "   - python3 htcl_script.py (run script generation example)"
echo "   - python3 htcl_transaction.py (run transaction example)"
echo "   - python3 htcl_example.py (run complete example)"
echo "   - python3 test_htcl.py (run tests)"