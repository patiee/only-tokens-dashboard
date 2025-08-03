#!/usr/bin/env python3
"""
Dogecoin HTCL Transaction Utilities

This module provides utilities for creating and spending HTCL transactions
for Dogecoin using Bitcoin-style transaction structures.
"""

import hashlib
import json
import time
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from htcl_script import HTCLScript, HTCLScriptGenerator, HTCLScriptValidator


@dataclass
class HTCLTransaction:
    """Represents an HTCL transaction with all necessary data."""
    txid: str
    version: int
    inputs: List[Dict]
    outputs: List[Dict]
    locktime: int
    script_sig: Optional[str] = None
    witness: Optional[List[str]] = None


class HTCLTransactionBuilder:
    """Builds HTCL transactions for Dogecoin."""
    
    def __init__(self, network: str = "mainnet"):
        """
        Initialize the transaction builder.
        
        Args:
            network: Network type ("mainnet" or "testnet")
        """
        self.network = network
        self.version = 1
        self.locktime = 0
    
    def create_funding_transaction(
        self,
        script: HTCLScript,
        amount: int,
        fee: int,
        input_utxos: List[Dict],
        change_address: str
    ) -> HTCLTransaction:
        """
        Create a funding transaction that sends DOGE to the HTCL script.
        
        Args:
            script: The HTCL script
            amount: Amount to send in satoshis
            fee: Transaction fee in satoshis
            input_utxos: List of UTXOs to spend
            change_address: Address to send change to
            
        Returns:
            HTCLTransaction object
        """
        # Calculate total input amount
        total_input = sum(utxo['amount'] for utxo in input_utxos)
        
        # Calculate change amount
        change_amount = total_input - amount - fee
        
        if change_amount < 0:
            raise ValueError("Insufficient funds for transaction")
        
        # Create inputs
        inputs = []
        for utxo in input_utxos:
            inputs.append({
                'txid': utxo['txid'],
                'vout': utxo['vout'],
                'script_sig': '',  # Will be filled during signing
                'sequence': 0xffffffff
            })
        
        # Create outputs
        outputs = []
        
        # HTCL output
        outputs.append({
            'value': amount,
            'script_pubkey': f"OP_HASH160 {script.p2sh_address} OP_EQUAL",
            'address': script.p2sh_address
        })
        
        # Change output (if any)
        if change_amount > 0:
            outputs.append({
                'value': change_amount,
                'script_pubkey': f"OP_DUP OP_HASH160 {change_address} OP_EQUALVERIFY OP_CHECKSIG",
                'address': change_address
            })
        
        # Create transaction
        tx = HTCLTransaction(
            txid='',  # Will be calculated after signing
            version=self.version,
            inputs=inputs,
            outputs=outputs,
            locktime=self.locktime
        )
        
        return tx
    
    def create_bob_withdrawal_transaction(
        self,
        script: HTCLScript,
        secret: str,
        amount: int,
        fee: int,
        bob_private_key: str,
        bob_address: str
    ) -> HTCLTransaction:
        """
        Create Bob's withdrawal transaction (before timelock with secret).
        
        Args:
            script: The HTCL script
            secret: The secret that hashes to the hashlock
            amount: Amount to withdraw in satoshis
            fee: Transaction fee in satoshis
            bob_private_key: Bob's private key
            bob_address: Bob's address to receive funds
            
        Returns:
            HTCLTransaction object
        """
        # Validate spending conditions
        if not HTCLScriptValidator.validate_bob_spending(
            script, secret, "dummy_signature", script.bob_pubkey
        ):
            raise ValueError("Invalid spending conditions for Bob")
        
        # Create input (spending from HTCL script)
        input_data = {
            'txid': 'previous_txid',  # Will be set to actual funding tx
            'vout': 0,
            'script_sig': f"{secret} {script.script_hex}",
            'sequence': 0xffffffff
        }
        
        # Create outputs
        outputs = []
        
        # Bob's withdrawal output
        outputs.append({
            'value': amount - fee,
            'script_pubkey': f"OP_DUP OP_HASH160 {bob_address} OP_EQUALVERIFY OP_CHECKSIG",
            'address': bob_address
        })
        
        # Create transaction
        tx = HTCLTransaction(
            txid='',
            version=self.version,
            inputs=[input_data],
            outputs=outputs,
            locktime=self.locktime
        )
        
        return tx
    
    def create_alice_withdrawal_transaction(
        self,
        script: HTCLScript,
        amount: int,
        fee: int,
        alice_private_key: str,
        alice_address: str,
        current_block: int
    ) -> HTCLTransaction:
        """
        Create Alice's withdrawal transaction (after timelock).
        
        Args:
            script: The HTCL script
            amount: Amount to withdraw in satoshis
            fee: Transaction fee in satoshis
            alice_private_key: Alice's private key
            alice_address: Alice's address to receive funds
            current_block: Current block height
            
        Returns:
            HTCLTransaction object
        """
        # Validate spending conditions
        if not HTCLScriptValidator.validate_alice_spending(
            script, "dummy_signature", script.alice_pubkey, current_block
        ):
            raise ValueError("Invalid spending conditions for Alice")
        
        # Create input (spending from HTCL script)
        input_data = {
            'txid': 'previous_txid',  # Will be set to actual funding tx
            'vout': 0,
            'script_sig': f"{script.timelock} {script.script_hex}",
            'sequence': 0xffffffff
        }
        
        # Create outputs
        outputs = []
        
        # Alice's withdrawal output
        outputs.append({
            'value': amount - fee,
            'script_pubkey': f"OP_DUP OP_HASH160 {alice_address} OP_EQUALVERIFY OP_CHECKSIG",
            'address': alice_address
        })
        
        # Create transaction
        tx = HTCLTransaction(
            txid='',
            version=self.version,
            inputs=[input_data],
            outputs=outputs,
            locktime=self.locktime
        )
        
        return tx


class HTCLTransactionValidator:
    """Validates HTCL transactions."""
    
    @staticmethod
    def validate_funding_transaction(tx: HTCLTransaction, script: HTCLScript) -> bool:
        """Validate a funding transaction."""
        try:
            # Check if there's an output to the HTCL address
            htcl_output = None
            for output in tx.outputs:
                if output.get('address') == script.p2sh_address:
                    htcl_output = output
                    break
            
            if not htcl_output:
                return False
            
            # Check if script is valid
            if not HTCLScriptGenerator.validate_script(script):
                return False
            
            return True
            
        except Exception:
            return False
    
    @staticmethod
    def validate_bob_withdrawal_transaction(
        tx: HTCLTransaction,
        script: HTCLScript,
        secret: str
    ) -> bool:
        """Validate Bob's withdrawal transaction."""
        try:
            # Check if input contains the secret
            if not tx.inputs:
                return False
            
            input_script = tx.inputs[0].get('script_sig', '')
            if secret not in input_script:
                return False
            
            # Validate the secret
            if not HTCLScriptValidator.validate_bob_spending(
                script, secret, "dummy", script.bob_pubkey
            ):
                return False
            
            return True
            
        except Exception:
            return False
    
    @staticmethod
    def validate_alice_withdrawal_transaction(
        tx: HTCLTransaction,
        script: HTCLScript,
        current_block: int
    ) -> bool:
        """Validate Alice's withdrawal transaction."""
        try:
            # Check if input contains the timelock
            if not tx.inputs:
                return False
            
            input_script = tx.inputs[0].get('script_sig', '')
            if str(script.timelock) not in input_script:
                return False
            
            # Validate timelock has expired
            if current_block < script.timelock:
                return False
            
            return True
            
        except Exception:
            return False


class HTCLTransactionSerializer:
    """Serializes and deserializes HTCL transactions."""
    
    @staticmethod
    def to_json(tx: HTCLTransaction) -> str:
        """Convert transaction to JSON string."""
        return json.dumps({
            'txid': tx.txid,
            'version': tx.version,
            'inputs': tx.inputs,
            'outputs': tx.outputs,
            'locktime': tx.locktime,
            'script_sig': tx.script_sig,
            'witness': tx.witness
        }, indent=2)
    
    @staticmethod
    def from_json(json_str: str) -> HTCLTransaction:
        """Create transaction from JSON string."""
        data = json.loads(json_str)
        return HTCLTransaction(
            txid=data['txid'],
            version=data['version'],
            inputs=data['inputs'],
            outputs=data['outputs'],
            locktime=data['locktime'],
            script_sig=data.get('script_sig'),
            witness=data.get('witness')
        )
    
    @staticmethod
    def to_hex(tx: HTCLTransaction) -> str:
        """Convert transaction to hex string (simplified)."""
        # This is a simplified version - in practice, you'd use proper Bitcoin serialization
        tx_data = {
            'version': tx.version,
            'inputs': tx.inputs,
            'outputs': tx.outputs,
            'locktime': tx.locktime
        }
        return json.dumps(tx_data).encode().hex()


def estimate_transaction_fee(input_count: int, output_count: int, network_fee_rate: int = 1) -> int:
    """
    Estimate transaction fee in satoshis.
    
    Args:
        input_count: Number of inputs
        output_count: Number of outputs
        network_fee_rate: Fee rate in satoshis per byte
        
    Returns:
        Estimated fee in satoshis
    """
    # Simplified fee estimation
    # In practice, you'd calculate actual transaction size
    base_size = 10  # Version + locktime
    input_size = input_count * 150  # Approximate input size
    output_size = output_count * 34  # Approximate output size
    
    total_size = base_size + input_size + output_size
    return total_size * network_fee_rate


def get_current_block_height() -> int:
    """Get current block height (placeholder)."""
    # In practice, you'd query a Dogecoin node or API
    return int(time.time() / 60)  # Rough estimate: 1 block per minute


if __name__ == "__main__":
    # Example usage
    from htcl_script import create_random_secret, generate_hashlock
    
    # Create script
    alice_pubkey = "02" + "a" * 64
    bob_pubkey = "02" + "b" * 64
    timelock = 1000000
    secret = create_random_secret()
    hashlock = generate_hashlock(secret)
    
    script = HTCLScriptGenerator.create(
        alice_pubkey=alice_pubkey,
        bob_pubkey=bob_pubkey,
        timelock=timelock,
        hashlock=hashlock
    )
    
    # Create transaction builder
    builder = HTCLTransactionBuilder()
    
    # Example input UTXOs
    input_utxos = [{
        'txid': 'previous_tx_hash',
        'vout': 0,
        'amount': 1000000
    }]
    
    # Create funding transaction
    funding_tx = builder.create_funding_transaction(
        script=script,
        amount=500000,
        fee=1000,
        input_utxos=input_utxos,
        change_address='D8gP6wF1JP5XdQpw4VN3uXJmUixF6RT7b9'
    )
    
    print("Funding Transaction:")
    print(HTCLTransactionSerializer.to_json(funding_tx))
    
    # Create Bob's withdrawal transaction
    bob_tx = builder.create_bob_withdrawal_transaction(
        script=script,
        secret=secret,
        amount=500000,
        fee=1000,
        bob_private_key='bob_private_key',
        bob_address='D8gP6wF1JP5XdQpw4VN3uXJmUixF6RT7b9'
    )
    
    print("\nBob's Withdrawal Transaction:")
    print(HTCLTransactionSerializer.to_json(bob_tx)) 