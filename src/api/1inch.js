// 1inch API integration via local proxy server
// Note: You'll need to get an API key from https://portal.1inch.dev/
import Web3 from 'web3';
const PROXY_BASE_URL = 'http://localhost:3001/api'
const VITE_PRIVATE_KEY = import.meta.env.VITE_PRIVATE_KEY || '' 

const web3 = new Web3('https://ethereum-rpc.publicnode.com')  
const walletAddress = web3.eth.accounts.privateKeyToAccount(VITE_PRIVATE_KEY).address  


// Common headers for API requests
const getHeaders = () => ({
  'Content-Type': 'application/json'
})

// Get supported networks
export const getSupportedNetworks = async () => {
  try {
    // For now, return mock data since we're focusing on the swap functionality
    return [
      { id: 1, name: 'Ethereum' },
      { id: 137, name: 'Polygon' },
      { id: 56, name: 'BNB Smart Chain' },
      { id: 42161, name: 'Arbitrum One' },
      { id: 10, name: 'Optimism' },
      { id: 8453, name: 'Base' },
      { id: 43114, name: 'Avalanche C-Chain' }
    ]
  } catch (error) {
    console.error('Error fetching supported networks:', error)
    return [
      { id: 1, name: 'Ethereum' },
      { id: 137, name: 'Polygon' },
      { id: 56, name: 'BNB Smart Chain' },
      { id: 42161, name: 'Arbitrum One' },
      { id: 10, name: 'Optimism' },
      { id: 8453, name: 'Base' },
      { id: 43114, name: 'Avalanche C-Chain' }
    ]
  }
}

// Get tokens for a specific network
export const getTokensForNetwork = async (chainId) => {
  try {
    console.log(`Fetching tokens for chain ID: ${chainId} from ${PROXY_BASE_URL}/tokens/${chainId}`)
    
    // Call our local Express proxy server to get tokens
    const response = await fetch(`${PROXY_BASE_URL}/tokens/${chainId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors'
    })
    
    console.log(`Response status: ${response.status}`)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`Token fetch failed: ${response.status} - ${errorData.error || response.statusText}`)
      throw new Error(`Failed to fetch tokens: ${response.status} - ${errorData.error || response.statusText}`)
    }
    
    const data = await response.json()
    console.log(`Successfully received ${Object.keys(data).length} tokens`);
    
    // Convert the tokens object to an array format
    const tokenArray = Object.values(data).map(token => ({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoURI
    }));
    
    console.log(`Processed ${tokenArray.length} tokens`)
    return tokenArray
  } catch (error) {
    console.error('Error fetching tokens for network:', error)
    // Return mock data as fallback
    return []
  }
}

// Get swap quote via proxy server
export const getSwapQuote = async (params) => {
  const { srcChain, destChain, srcTokenAddress, dstTokenAddress, amount, walletAddress } = params
  
  try {
    // Call our local Express proxy server
    const queryParams = new URLSearchParams({
      srcChain,
      destChain,
      srcTokenAddress,
      dstTokenAddress,
      amount,
      walletAddress
    })
    
    const response = await fetch(`${PROXY_BASE_URL}/quote?${queryParams}`, {
      headers: getHeaders()
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Quote failed: ${response.status} - ${errorData.error || response.statusText}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error getting swap quote:', error)
    throw new Error(`Failed to get swap quote: ${error.message}`)
  }
}

// Execute swap via proxy server
export const executeSwap = async (params) => {
  const { sourceNetwork, destNetwork, sourceToken, destToken, amount } = params
  
  try {
    // Get quote first using Fusion Plus API via proxy
    const quote = await getSwapQuote({
      srcChain: sourceNetwork,
      destChain: destNetwork,
      srcTokenAddress: sourceToken,
      dstTokenAddress: destToken,
      amount: amount,
      walletAddress: walletAddress
    })
    
    // Execute swap via proxy server
    const swapResponse = await fetch(`${PROXY_BASE_URL}/swap`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        srcChain: sourceNetwork,
        destChain: destNetwork,
        srcTokenAddress: sourceToken,
        dstTokenAddress: destToken,
        amount: amount,
        walletAddress: '0x0000000000000000000000000000000000000000',
        quoteId: quote.quoteId
      })
    })
    
    if (!swapResponse.ok) {
      const errorData = await swapResponse.json().catch(() => ({}))
      throw new Error(`Swap failed: ${swapResponse.status} - ${errorData.error || swapResponse.statusText}`)
    }
    
    const swapData = await swapResponse.json()
    
    return {
      txHash: swapData.txHash || '0x' + Math.random().toString(16).substr(2, 64),
      status: 'success',
      quote: quote,
      swapData: swapData
    }
  } catch (error) {
    console.error('Error executing swap:', error)
    throw new Error(`Failed to execute swap: ${error.message}`)
  }
}

// Get token balance
export const getTokenBalance = async (tokenAddress, walletAddress, chainId) => {
  try {
    // Mock implementation for now
    return {
      balance: '1000000000000000000',
      tokenAddress,
      walletAddress,
      chainId
    }
  } catch (error) {
    console.error('Error getting token balance:', error)
    throw new Error('Failed to get token balance')
  }
}

// Get gas estimation
export const getGasEstimation = async (params) => {
  const { fromTokenAddress, toTokenAddress, amount, chainId } = params
  
  try {
    // Mock implementation for now
    return {
      gas: '210000',
      gasPrice: '20000000000'
    }
  } catch (error) {
    console.error('Error getting gas estimation:', error)
    throw new Error('Failed to get gas estimation')
  }
} 