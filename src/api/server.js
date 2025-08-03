import 'dotenv/config';
import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import path from 'path';
import crypto from 'crypto';
import { NetworkEnum } from '@1inch/fusion-sdk';

// Environment variables - read once at the beginning
const ENV_VARS = {
  POLYGON_AMOY_RPC_URL: process.env.VITE_POLYGON_AMOY_RPC_URL,
  SEPOLIA_RPC_URL: process.env.VITE_SEPOLIA_RPC_URL,
  OSMOSIS_RPC: process.env.VITE_OSMOSIS_RPC,
  DOGECOIN_RPC: process.env.VITE_DOGECOIN_RPC,
  AUTH_KEY: process.env.VITE_AUTH_KEY || 'YOUR_API_KEY_HERE'
};

const app = express()
const PORT = 3001

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))

// Parse JSON bodies
app.use(express.json())

// RPC proxy endpoint
app.post('/api/rpc/:network', async (req, res) => {
  try {
    const { network } = req.params
    const { method, params, id } = req.body

    // Map NetworkEnum to RPC URLs
    const rpcUrls = {
      [NetworkEnum.POLYGON_AMOY]: ENV_VARS.POLYGON_AMOY_RPC_URL,
      [NetworkEnum.ETHEREUM_SEPOLIA]: ENV_VARS.SEPOLIA_RPC_URL,
      [NetworkEnum.OSMOSIS]: ENV_VARS.OSMOSIS_RPC,
      [NetworkEnum.DOGECOIN]: ENV_VARS.DOGECOIN_RPC
    }

    const rpcUrl = rpcUrls[network]
    if (!rpcUrl) {
      return res.status(400).json({ error: `Unsupported network: ${network}` })
    }

    console.log(`RPC call to ${network}: ${method}`)

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`RPC error for ${network}:`, errorData)
      return res.status(response.status).json({
        error: `RPC call failed for ${network}`,
        details: errorData
      })
    }

    const data = await response.json()
    res.json(data)
  } catch (error) {
    console.error(`Error in RPC proxy for ${req.params.network}:`, error)
    res.status(500).json({ error: error.message })
  }
})

// Gas price endpoint
app.get('/api/gas-price/:network', async (req, res) => {
  try {
    const { network } = req.params

    // Map NetworkEnum to RPC URLs
    const rpcUrls = {
      [NetworkEnum.POLYGON_AMOY]: ENV_VARS.POLYGON_AMOY_RPC_URL || 'https://polygon-rpc.com',
      [NetworkEnum.ETHEREUM_SEPOLIA]: ENV_VARS.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
      [NetworkEnum.OSMOSIS]: ENV_VARS.OSMOSIS_RPC,
      [NetworkEnum.DOGECOIN]: ENV_VARS.DOGECOIN_RPC
    }

    const rpcUrl = rpcUrls[network]
    if (!rpcUrl) {
      return res.status(400).json({ error: `Unsupported network: ${network}` })
    }

    console.log(`Getting gas price for ${network}`)

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_gasPrice',
        params: [],
        id: 1
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`Gas price error for ${network}:`, errorData)
      return res.status(response.status).json({
        error: `Gas price call failed for ${network}`,
        details: errorData
      })
    }

    const data = await response.json()
    res.json(data)
  } catch (error) {
    console.error(`Error getting gas price for ${req.params.network}:`, error)
    res.status(500).json({ error: error.message })
  }
})

// Proxy endpoint for getting tokens by chain ID
app.get('/api/tokens/:chainId', async (req, res) => {
  try {
    const { chainId } = req.params

    const API_BASE_URL = 'https://api.1inch.dev'

    console.log(`fetching tokens for chainId: ${chainId} ${ENV_VARS.AUTH_KEY} ${API_BASE_URL}/token/v1.2/${chainId}?provider=1inch&country=US`)

    const response = await fetch(
      `${API_BASE_URL}/token/v1.2/${chainId}?provider=1inch&country=US`,
      {
        headers: {
          'Authorization': `Bearer ${ENV_VARS.AUTH_KEY}`,
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
          'Authorization': `Bearer ${ENV_VARS.AUTH_KEY}`,
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

    const API_BASE_URL = 'https://api.1inch.dev'

    const response = await fetch(`${API_BASE_URL}/fusion-plus/v1.0/swap`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ENV_VARS.AUTH_KEY}`,
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

// Dogecoin HTCL class for server-side operations
class DogecoinHTCL {
  constructor() {
    this.pythonPath = 'python3';
    this.scriptDir = path.join(process.cwd(), 'contracts', 'dogecoin');
  }

  generateSecret() {
    return '0x' + crypto.randomBytes(32).toString('hex');
  }

  generateHashlock(secret) {
    const cleanSecret = secret.replace('0x', '');
    const secretBuffer = Buffer.from(cleanSecret, 'hex');
    const sha256Hash = crypto.createHash('sha256').update(secretBuffer).digest();
    const ripemd160Hash = crypto.createHash('ripemd160').update(sha256Hash).digest();
    return ripemd160Hash.toString('hex');
  }

  async createHTCLScript(alicePubkey, bobPubkey, timelock, hashlock) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.scriptDir, 'htcl_script.py');
      const pythonProcess = spawn(this.pythonPath, [
        scriptPath,
        '--alice-pubkey', alicePubkey,
        '--bob-pubkey', bobPubkey,
        '--timelock', timelock.toString(),
        '--hashlock', hashlock
      ]);

      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch (e) {
            reject(new Error('Failed to parse Python output'));
          }
        } else {
          reject(new Error(`Python script failed: ${error}`));
        }
      });
    });
  }

  async createFundingTransaction(script, amount, isAlice = true) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.scriptDir, 'htcl_transaction.py');
      const privateKey = isAlice ? process.env.VITE_PRIVATE_KEY_1 : process.env.VITE_PRIVATE_KEY_2;
      const pythonProcess = spawn(this.pythonPath, [
        scriptPath,
        '--action', 'fund',
        '--script', JSON.stringify(script),
        '--amount', amount.toString(),
        '--private-key', privateKey
      ]);

      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch (e) {
            reject(new Error('Failed to parse Python output'));
          }
        } else {
          reject(new Error(`Python script failed: ${error}`));
        }
      });
    });
  }

  async createBobWithdrawal(script, secret, amount, address, isAlice = false) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.scriptDir, 'htcl_transaction.py');
      const privateKey = isAlice ? process.env.VITE_PRIVATE_KEY_1 : process.env.VITE_PRIVATE_KEY_2;
      const pythonProcess = spawn(this.pythonPath, [
        scriptPath,
        '--action', 'bob-withdraw',
        '--script', JSON.stringify(script),
        '--secret', secret,
        '--amount', amount.toString(),
        '--private-key', privateKey,
        '--address', address
      ]);

      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch (e) {
            reject(new Error('Failed to parse Python output'));
          }
        } else {
          reject(new Error(`Python script failed: ${error}`));
        }
      });
    });
  }

  async createAliceWithdrawal(script, amount, address, isAlice = true) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.scriptDir, 'htcl_transaction.py');
      const privateKey = isAlice ? process.env.VITE_PRIVATE_KEY_1 : process.env.VITE_PRIVATE_KEY_2;
      const pythonProcess = spawn(this.pythonPath, [
        scriptPath,
        '--action', 'alice-withdraw',
        '--script', JSON.stringify(script),
        '--amount', amount.toString(),
        '--private-key', privateKey,
        '--address', address
      ]);

      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch (e) {
            reject(new Error('Failed to parse Python output'));
          }
        } else {
          reject(new Error(`Python script failed: ${error}`));
        }
      });
    });
  }

  async getCurrentBlockHeight() {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.scriptDir, 'htcl_transaction.py');
      const pythonProcess = spawn(this.pythonPath, [
        scriptPath,
        '--action', 'get-block-height'
      ]);

      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result.block_height);
          } catch (e) {
            reject(new Error('Failed to parse Python output'));
          }
        } else {
          reject(new Error(`Python script failed: ${error}`));
        }
      });
    });
  }
}

const dogecoinHTCL = new DogecoinHTCL();

// Dogecoin HTCL endpoints
app.post('/api/dogecoin/htcl/create-script', async (req, res) => {
  try {
    const { alicePubkey, bobPubkey, timelock, hashlock } = req.body;
    const script = await dogecoinHTCL.createHTCLScript(alicePubkey, bobPubkey, timelock, hashlock);
    res.json(script);
  } catch (error) {
    console.error('Error creating Dogecoin HTCL script:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/dogecoin/htcl/fund', async (req, res) => {
  try {
    const { script, amount, isAlice = true } = req.body;
    const result = await dogecoinHTCL.createFundingTransaction(script, amount, isAlice);
    res.json(result);
  } catch (error) {
    console.error('Error funding Dogecoin HTCL:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/dogecoin/htcl/withdraw', async (req, res) => {
  try {
    const { script, secret, amount, address, isAlice } = req.body;

    let result;
    if (isAlice) {
      result = await dogecoinHTCL.createAliceWithdrawal(script, amount, address, isAlice);
    } else {
      result = await dogecoinHTCL.createBobWithdrawal(script, secret, amount, address, isAlice);
    }

    res.json(result);
  } catch (error) {
    console.error('Error withdrawing from Dogecoin HTCL:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dogecoin/block-height', async (req, res) => {
  try {
    const blockHeight = await dogecoinHTCL.getCurrentBlockHeight();
    res.json({ block_height: blockHeight });
  } catch (error) {
    console.error('Error getting Dogecoin block height:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/dogecoin/htcl/generate-secret', (req, res) => {
  try {
    const secret = dogecoinHTCL.generateSecret();
    const hashlock = dogecoinHTCL.generateHashlock(secret);
    res.json({ secret, hashlock });
  } catch (error) {
    console.error('Error generating Dogecoin secret:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`)
  console.log('CORS enabled for:', ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'])
}) 