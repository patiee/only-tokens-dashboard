import crypto from 'crypto';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Dogecoin HTCL implementation using Python scripts
 */
export class DogecoinHTCL {
    constructor() {
        this.pythonPath = 'python3';
        this.scriptDir = path.join(process.cwd(), 'contracts', 'dogecoin');
    }

    /**
     * Generate a random secret for HTCL
     * @returns {string} Random secret in hex format
     */
    generateSecret() {
        return '0x' + crypto.randomBytes(32).toString('hex');
    }

    /**
     * Generate hashlock from secret (Dogecoin format)
     * @param {string} secret - The secret to hash
     * @returns {string} Hashlock in hex format
     */
    generateHashlock(secret) {
        // Remove 0x prefix if present
        const cleanSecret = secret.replace('0x', '');
        const secretBuffer = Buffer.from(cleanSecret, 'hex');
        
        // Use SHA256 + RIPEMD160 (like Bitcoin/Dogecoin)
        const sha256Hash = crypto.createHash('sha256').update(secretBuffer).digest();
        const ripemd160Hash = crypto.createHash('ripemd160').update(sha256Hash).digest();
        
        return ripemd160Hash.toString('hex');
    }

    /**
     * Create HTCL script for Dogecoin
     * @param {string} alicePubkey - Alice's public key
     * @param {string} bobPubkey - Bob's public key
     * @param {number} timelock - Timelock block height
     * @param {string} hashlock - Hashlock
     * @returns {Promise<Object>} HTCL script details
     */
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

    /**
     * Create funding transaction for HTCL
     * @param {Object} script - HTCL script object
     * @param {number} amount - Amount in satoshis
     * @param {string} privateKey - Private key for funding
     * @returns {Promise<Object>} Funding transaction details
     */
    async createFundingTransaction(script, amount, privateKey) {
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(this.scriptDir, 'htcl_transaction.py');
            
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

    /**
     * Create Bob's withdrawal transaction (with secret)
     * @param {Object} script - HTCL script object
     * @param {string} secret - The secret for withdrawal
     * @param {number} amount - Amount in satoshis
     * @param {string} privateKey - Bob's private key
     * @param {string} address - Bob's address
     * @returns {Promise<Object>} Withdrawal transaction details
     */
    async createBobWithdrawal(script, secret, amount, privateKey, address) {
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(this.scriptDir, 'htcl_transaction.py');
            
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

    /**
     * Create Alice's withdrawal transaction (after timelock)
     * @param {Object} script - HTCL script object
     * @param {number} amount - Amount in satoshis
     * @param {string} privateKey - Alice's private key
     * @param {string} address - Alice's address
     * @returns {Promise<Object>} Withdrawal transaction details
     */
    async createAliceWithdrawal(script, amount, privateKey, address) {
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(this.scriptDir, 'htcl_transaction.py');
            
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

    /**
     * Get current block height from Dogecoin network
     * @returns {Promise<number>} Current block height
     */
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