# Only Tokens Dashboard

A React application for interacting with the Only Tokens Chrome extension and Cosmos blockchain.

## Features

- Connect to Only Tokens Chrome extension
- Send transactions on Osmosis testnet
- Interact with smart contracts
- Real-time extension status monitoring
- Beautiful, modern UI with status indicators

## Prerequisites

1. **Only Tokens Chrome Extension**: You need to have the Only Tokens Chrome extension installed
2. **Node.js**: Version 16 or higher
3. **npm or yarn**: For package management

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd only-tokens-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

### Connecting to the Extension

1. Make sure the Only Tokens Chrome extension is installed and active
2. Open the dashboard in your browser
3. The dashboard will automatically detect if the extension is available
4. Click "Connect Only Tokens Wallet" to establish a connection
5. Approve the connection request in the extension

### Sending Transactions

Once connected, you can:
- Send tokens to other addresses
- Interact with smart contracts
- View transaction hashes and status

### Troubleshooting

#### Extension Not Detected
- Ensure the Only Tokens Chrome extension is installed
- Refresh the page after installing the extension
- Check the browser console for debug information

#### Connection Issues
- Make sure you have accounts set up in the extension
- Try disconnecting and reconnecting
- Check the network connection

#### CSP Errors
The application includes proper Content Security Policy settings to allow communication with Chrome extensions. If you encounter CSP errors, ensure the `index.html` file contains the correct CSP meta tag.

## Configuration

You can modify the following settings in `src/components/CosmWasmInteraction.jsx`:

- `rpcEndpoint`: The RPC endpoint for the blockchain
- `chainId`: The chain ID for the network
- `contractAddress`: Your smart contract address

## Development

### Project Structure

```
src/
├── components/
│   └── CosmWasmInteraction.jsx    # Main component
├── utils/
│   └── extensionUtils.js          # Extension utilities
├── App.jsx                        # Main app component
└── main.jsx                       # Entry point
```

### Key Features

- **Extension Detection**: Automatically detects the Only Tokens extension
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Loading States**: Visual feedback during operations
- **Status Indicators**: Clear status indicators for extension and connection state
- **Debug Utilities**: Console logging for troubleshooting

## Security

- The application uses Content Security Policy to prevent XSS attacks
- Extension communication is properly sandboxed
- No sensitive data is stored locally

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
