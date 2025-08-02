import 'dotenv/config'; 
import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'

const app = express()
const PORT = 3001

// Enable CORS for all routes with proper configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}))

app.use(express.json())

// Add OPTIONS handler for preflight requests
app.options('*', cors())

// Proxy endpoint for getting tokens by chain ID
app.get('/api/tokens/:chainId', async (req, res) => {
  try {
    const { chainId } = req.params
    
    const API_KEY = process.env.VITE_1INCH_API_KEY || 'YOUR_API_KEY_HERE'
    const API_BASE_URL = 'https://api.1inch.dev'

    console.log(`fetching tokens for chainId: ${chainId} ${API_KEY} ${API_BASE_URL}/token/v1.2/${chainId}?provider=1inch&country=US`)
    
    const response = await fetch(
      `${API_BASE_URL}/token/v1.2/${chainId}?provider=1inch&country=US`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'content-type': 'application/json',
          'accept': 'application/json',
        },
      }
    )
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`Token fetch failed: ${response.status} - ${errorData.message || response.statusText}`)
      return res.status(response.status).json({
        error: `Failed to fetch tokens: ${response.status} - ${errorData.message || response.statusText}`
      })
    }
    
    const data = await response.json()
    // console.log(`Successfully fetched ${Object.keys(data.tokens || {}).length} tokens for chain ${chainId}`)
    res.json(data)
  } catch (error) {
    console.error('Token fetch error:', error)
    res.status(500).json({ error: `Token fetch error: ${error.message}` })
  }
})

// Proxy endpoint for 1inch API
app.get('/api/quote', async (req, res) => {
  try {
    const { srcChain, destChain, srcTokenAddress, dstTokenAddress, amount, walletAddress } = req.query
    
    const API_KEY = process.env.VITE_1INCH_API_KEY || 'YOUR_API_KEY_HERE'
    const API_BASE_URL = 'https://api.1inch.dev'
    
    const response = await fetch(
      `${API_BASE_URL}/fusion-plus/v1.0/quote/receive?` +
      `srcChain=${srcChain}&` +
      `destChain=${destChain}&` +
      `srcTokenAddress=${srcTokenAddress}&` +
      `dstTokenAddress=${dstTokenAddress}&` +
      `amount=${amount}&` +
      `walletAddress=${walletAddress}&` +
      `enableEstimate=false&` +
      `fee=1`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return res.status(response.status).json({
        error: `Quote failed: ${response.status} - ${errorData.message || response.statusText}`
      })
    }
    
    const data = await response.json()
    res.json(data)
  } catch (error) {
    console.error('Proxy error:', error)
    res.status(500).json({ error: `Proxy error: ${error.message}` })
  }
})

// Proxy endpoint for swap execution
app.post('/api/swap', async (req, res) => {
  try {
    const { srcChain, destChain, srcTokenAddress, dstTokenAddress, amount, walletAddress, quoteId } = req.body
    
    const API_KEY = process.env.VITE_1INCH_API_KEY || 'YOUR_API_KEY_HERE'
    const API_BASE_URL = 'https://api.1inch.dev'
    
    const response = await fetch(`${API_BASE_URL}/fusion-plus/v1.0/swap`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        srcChain,
        destChain,
        srcTokenAddress,
        dstTokenAddress,
        amount,
        walletAddress,
        quoteId,
        fee: 1
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return res.status(response.status).json({
        error: `Swap failed: ${response.status} - ${errorData.message || response.statusText}`
      })
    }
    
    const data = await response.json()
    res.json(data)
  } catch (error) {
    console.error('Proxy error:', error)
    res.status(500).json({ error: `Proxy error: ${error.message}` })
  }
})

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`)
  console.log('CORS enabled for:', ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'])
}) 