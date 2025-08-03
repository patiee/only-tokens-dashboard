#!/usr/bin/env python3
"""
Unit Tests for Dogecoin HTCL Implementation

This module contains comprehensive tests for the HTCL script generation,
transaction creation, and validation functionality.
"""

import unittest
import hashlib
import time
from htcl_script import (
    HTCLScriptGenerator,
    HTCLScriptValidator,
    generate_hashlock,
    create_random_secret,
    HTCLScript
)
from htcl_transaction import (
    HTCLTransactionBuilder,
    HTCLTransactionValidator,
    HTCLTransactionSerializer,
    estimate_transaction_fee,
    get_current_block_height
)


class TestHTCLScript(unittest.TestCase):
    """Test HTCL script generation and validation."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.alice_pubkey = "02" + "a" * 64
        self.bob_pubkey = "02" + "b" * 64
        self.timelock = 1000000
        self.secret = "test_secret_for_htcl_contract"
        self.hashlock = generate_hashlock(self.secret)
    
    def test_create_valid_script(self):
        """Test creating a valid HTCL script."""
        script = HTCLScriptGenerator.create(
            alice_pubkey=self.alice_pubkey,
            bob_pubkey=self.bob_pubkey,
            timelock=self.timelock,
            hashlock=self.hashlock
        )
        
        self.assertIsInstance(script, HTCLScript)
        self.assertEqual(script.alice_pubkey, self.alice_pubkey)
        self.assertEqual(script.bob_pubkey, self.bob_pubkey)
        self.assertEqual(script.timelock, self.timelock)
        self.assertEqual(script.hashlock, self.hashlock)
        self.assertTrue(script.script_hex)
        self.assertTrue(script.p2sh_address.startswith('3'))
    
    def test_create_script_invalid_pubkey(self):
        """Test creating script with invalid public key."""
        with self.assertRaises(ValueError):
            HTCLScriptGenerator.create(
                alice_pubkey="",
                bob_pubkey=self.bob_pubkey,
                timelock=self.timelock,
                hashlock=self.hashlock
            )
    
    def test_create_script_invalid_timelock(self):
        """Test creating script with invalid timelock."""
        with self.assertRaises(ValueError):
            HTCLScriptGenerator.create(
                alice_pubkey=self.alice_pubkey,
                bob_pubkey=self.bob_pubkey,
                timelock=0,
                hashlock=self.hashlock
            )
    
    def test_create_script_invalid_hashlock(self):
        """Test creating script with invalid hashlock."""
        with self.assertRaises(ValueError):
            HTCLScriptGenerator.create(
                alice_pubkey=self.alice_pubkey,
                bob_pubkey=self.bob_pubkey,
                timelock=self.timelock,
                hashlock="invalid_hash"
            )
    
    def test_validate_script(self):
        """Test script validation."""
        script = HTCLScriptGenerator.create(
            alice_pubkey=self.alice_pubkey,
            bob_pubkey=self.bob_pubkey,
            timelock=self.timelock,
            hashlock=self.hashlock
        )
        
        self.assertTrue(HTCLScriptGenerator.validate_script(script))
    
    def test_generate_hashlock(self):
        """Test hashlock generation."""
        secret = "test_secret"
        hashlock = generate_hashlock(secret)
        
        self.assertEqual(len(hashlock), 40)  # 20 bytes = 40 hex chars
        self.assertTrue(all(c in '0123456789abcdef' for c in hashlock))
        
        # Verify it's deterministic
        hashlock2 = generate_hashlock(secret)
        self.assertEqual(hashlock, hashlock2)
    
    def test_create_random_secret(self):
        """Test random secret generation."""
        secret1 = create_random_secret()
        secret2 = create_random_secret()
        
        self.assertEqual(len(secret1), 64)  # 32 bytes = 64 hex chars
        self.assertEqual(len(secret2), 64)
        self.assertNotEqual(secret1, secret2)  # Should be different


class TestHTCLScriptValidator(unittest.TestCase):
    """Test HTCL script validation."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.alice_pubkey = "02" + "a" * 64
        self.bob_pubkey = "02" + "b" * 64
        self.timelock = 1000000
        self.secret = "test_secret_for_htcl_contract"
        self.hashlock = generate_hashlock(self.secret)
        
        self.script = HTCLScriptGenerator.create(
            alice_pubkey=self.alice_pubkey,
            bob_pubkey=self.bob_pubkey,
            timelock=self.timelock,
            hashlock=self.hashlock
        )
    
    def test_validate_bob_spending_valid(self):
        """Test valid Bob spending conditions."""
        result = HTCLScriptValidator.validate_bob_spending(
            self.script,
            self.secret,
            "valid_signature",
            self.bob_pubkey
        )
        self.assertTrue(result)
    
    def test_validate_bob_spending_invalid_secret(self):
        """Test Bob spending with invalid secret."""
        result = HTCLScriptValidator.validate_bob_spending(
            self.script,
            "wrong_secret",
            "valid_signature",
            self.bob_pubkey
        )
        self.assertFalse(result)
    
    def test_validate_bob_spending_invalid_pubkey(self):
        """Test Bob spending with invalid public key."""
        result = HTCLScriptValidator.validate_bob_spending(
            self.script,
            self.secret,
            "valid_signature",
            "wrong_pubkey"
        )
        self.assertFalse(result)
    
    def test_validate_alice_spending_valid(self):
        """Test valid Alice spending conditions."""
        result = HTCLScriptValidator.validate_alice_spending(
            self.script,
            "valid_signature",
            self.alice_pubkey,
            self.timelock + 1  # After timelock
        )
        self.assertTrue(result)
    
    def test_validate_alice_spending_before_timelock(self):
        """Test Alice spending before timelock."""
        result = HTCLScriptValidator.validate_alice_spending(
            self.script,
            "valid_signature",
            self.alice_pubkey,
            self.timelock - 1  # Before timelock
        )
        self.assertFalse(result)
    
    def test_validate_alice_spending_invalid_pubkey(self):
        """Test Alice spending with invalid public key."""
        result = HTCLScriptValidator.validate_alice_spending(
            self.script,
            "valid_signature",
            "wrong_pubkey",
            self.timelock + 1
        )
        self.assertFalse(result)


class TestHTCLTransaction(unittest.TestCase):
    """Test HTCL transaction creation and validation."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.alice_pubkey = "02" + "a" * 64
        self.bob_pubkey = "02" + "b" * 64
        self.timelock = 1000000
        self.secret = "test_secret_for_htcl_contract"
        self.hashlock = generate_hashlock(self.secret)
        
        self.script = HTCLScriptGenerator.create(
            alice_pubkey=self.alice_pubkey,
            bob_pubkey=self.bob_pubkey,
            timelock=self.timelock,
            hashlock=self.hashlock
        )
        
        self.builder = HTCLTransactionBuilder()
        
        self.input_utxos = [{
            'txid': '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            'vout': 0,
            'amount': 1000000
        }]
    
    def test_create_funding_transaction(self):
        """Test creating funding transaction."""
        amount = 500000
        fee = 1000
        change_address = 'D8gP6wF1JP5XdQpw4VN3uXJmUixF6RT7b9'
        
        tx = self.builder.create_funding_transaction(
            script=self.script,
            amount=amount,
            fee=fee,
            input_utxos=self.input_utxos,
            change_address=change_address
        )
        
        self.assertIsInstance(tx, HTCLTransaction)
        self.assertEqual(len(tx.inputs), 1)
        self.assertEqual(len(tx.outputs), 2)  # HTCL output + change output
        self.assertEqual(tx.outputs[0]['value'], amount)
    
    def test_create_funding_transaction_insufficient_funds(self):
        """Test funding transaction with insufficient funds."""
        amount = 2000000  # More than available
        fee = 1000
        change_address = 'D8gP6wF1JP5XdQpw4VN3uXJmUixF6RT7b9'
        
        with self.assertRaises(ValueError):
            self.builder.create_funding_transaction(
                script=self.script,
                amount=amount,
                fee=fee,
                input_utxos=self.input_utxos,
                change_address=change_address
            )
    
    def test_create_bob_withdrawal_transaction(self):
        """Test creating Bob's withdrawal transaction."""
        amount = 500000
        fee = 1000
        bob_address = 'D8gP6wF1JP5XdQpw4VN3uXJmUixF6RT7b9'
        
        tx = self.builder.create_bob_withdrawal_transaction(
            script=self.script,
            secret=self.secret,
            amount=amount,
            fee=fee,
            bob_private_key='bob_private_key',
            bob_address=bob_address
        )
        
        self.assertIsInstance(tx, HTCLTransaction)
        self.assertEqual(len(tx.inputs), 1)
        self.assertEqual(len(tx.outputs), 1)
        self.assertEqual(tx.outputs[0]['value'], amount - fee)
    
    def test_create_alice_withdrawal_transaction(self):
        """Test creating Alice's withdrawal transaction."""
        amount = 500000
        fee = 1000
        alice_address = 'D8gP6wF1JP5XdQpw4VN3uXJmUixF6RT7b9'
        current_block = self.timelock + 1  # After timelock
        
        tx = self.builder.create_alice_withdrawal_transaction(
            script=self.script,
            amount=amount,
            fee=fee,
            alice_private_key='alice_private_key',
            alice_address=alice_address,
            current_block=current_block
        )
        
        self.assertIsInstance(tx, HTCLTransaction)
        self.assertEqual(len(tx.inputs), 1)
        self.assertEqual(len(tx.outputs), 1)
        self.assertEqual(tx.outputs[0]['value'], amount - fee)
    
    def test_validate_funding_transaction(self):
        """Test funding transaction validation."""
        amount = 500000
        fee = 1000
        change_address = 'D8gP6wF1JP5XdQpw4VN3uXJmUixF6RT7b9'
        
        tx = self.builder.create_funding_transaction(
            script=self.script,
            amount=amount,
            fee=fee,
            input_utxos=self.input_utxos,
            change_address=change_address
        )
        
        self.assertTrue(HTCLTransactionValidator.validate_funding_transaction(tx, self.script))
    
    def test_validate_bob_withdrawal_transaction(self):
        """Test Bob's withdrawal transaction validation."""
        amount = 500000
        fee = 1000
        bob_address = 'D8gP6wF1JP5XdQpw4VN3uXJmUixF6RT7b9'
        
        tx = self.builder.create_bob_withdrawal_transaction(
            script=self.script,
            secret=self.secret,
            amount=amount,
            fee=fee,
            bob_private_key='bob_private_key',
            bob_address=bob_address
        )
        
        self.assertTrue(HTCLTransactionValidator.validate_bob_withdrawal_transaction(tx, self.script, self.secret))
    
    def test_validate_alice_withdrawal_transaction(self):
        """Test Alice's withdrawal transaction validation."""
        amount = 500000
        fee = 1000
        alice_address = 'D8gP6wF1JP5XdQpw4VN3uXJmUixF6RT7b9'
        current_block = self.timelock + 1
        
        tx = self.builder.create_alice_withdrawal_transaction(
            script=self.script,
            amount=amount,
            fee=fee,
            alice_private_key='alice_private_key',
            alice_address=alice_address,
            current_block=current_block
        )
        
        self.assertTrue(HTCLTransactionValidator.validate_alice_withdrawal_transaction(tx, self.script, current_block))


class TestHTCLTransactionSerializer(unittest.TestCase):
    """Test HTCL transaction serialization."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.tx = HTCLTransaction(
            txid='test_txid',
            version=1,
            inputs=[{'txid': 'input_txid', 'vout': 0}],
            outputs=[{'value': 1000000, 'address': 'test_address'}],
            locktime=0
        )
    
    def test_to_json(self):
        """Test transaction to JSON conversion."""
        json_str = HTCLTransactionSerializer.to_json(self.tx)
        self.assertIsInstance(json_str, str)
        
        # Parse back to verify
        data = json.loads(json_str)
        self.assertEqual(data['txid'], 'test_txid')
        self.assertEqual(data['version'], 1)
        self.assertEqual(len(data['inputs']), 1)
        self.assertEqual(len(data['outputs']), 1)
    
    def test_from_json(self):
        """Test transaction from JSON conversion."""
        json_str = HTCLTransactionSerializer.to_json(self.tx)
        tx2 = HTCLTransactionSerializer.from_json(json_str)
        
        self.assertEqual(tx2.txid, self.tx.txid)
        self.assertEqual(tx2.version, self.tx.version)
        self.assertEqual(len(tx2.inputs), len(self.tx.inputs))
        self.assertEqual(len(tx2.outputs), len(self.tx.outputs))
    
    def test_to_hex(self):
        """Test transaction to hex conversion."""
        hex_str = HTCLTransactionSerializer.to_hex(self.tx)
        self.assertIsInstance(hex_str, str)
        self.assertTrue(len(hex_str) > 0)


class TestUtilityFunctions(unittest.TestCase):
    """Test utility functions."""
    
    def test_estimate_transaction_fee(self):
        """Test transaction fee estimation."""
        fee = estimate_transaction_fee(2, 3, 1)
        self.assertIsInstance(fee, int)
        self.assertGreater(fee, 0)
    
    def test_get_current_block_height(self):
        """Test current block height function."""
        block_height = get_current_block_height()
        self.assertIsInstance(block_height, int)
        self.assertGreater(block_height, 0)


class TestHTCLIntegration(unittest.TestCase):
    """Integration tests for complete HTCL workflow."""
    
    def test_complete_htcl_workflow(self):
        """Test complete HTCL workflow."""
        # Create script
        alice_pubkey = "02" + "a" * 64
        bob_pubkey = "02" + "b" * 64
        timelock = 1000000
        secret = "integration_test_secret"
        hashlock = generate_hashlock(secret)
        
        script = HTCLScriptGenerator.create(
            alice_pubkey=alice_pubkey,
            bob_pubkey=bob_pubkey,
            timelock=timelock,
            hashlock=hashlock
        )
        
        # Validate script
        self.assertTrue(HTCLScriptGenerator.validate_script(script))
        
        # Create funding transaction
        builder = HTCLTransactionBuilder()
        input_utxos = [{'txid': 'test_txid', 'vout': 0, 'amount': 1000000}]
        
        funding_tx = builder.create_funding_transaction(
            script=script,
            amount=500000,
            fee=1000,
            input_utxos=input_utxos,
            change_address='D8gP6wF1JP5XdQpw4VN3uXJmUixF6RT7b9'
        )
        
        # Validate funding transaction
        self.assertTrue(HTCLTransactionValidator.validate_funding_transaction(funding_tx, script))
        
        # Test Bob's withdrawal
        bob_tx = builder.create_bob_withdrawal_transaction(
            script=script,
            secret=secret,
            amount=500000,
            fee=1000,
            bob_private_key='bob_key',
            bob_address='D8gP6wF1JP5XdQpw4VN3uXJmUixF6RT7b9'
        )
        
        self.assertTrue(HTCLTransactionValidator.validate_bob_withdrawal_transaction(bob_tx, script, secret))
        
        # Test Alice's withdrawal
        alice_tx = builder.create_alice_withdrawal_transaction(
            script=script,
            amount=500000,
            fee=1000,
            alice_private_key='alice_key',
            alice_address='D8gP6wF1JP5XdQpw4VN3uXJmUixF6RT7b9',
            current_block=timelock + 1
        )
        
        self.assertTrue(HTCLTransactionValidator.validate_alice_withdrawal_transaction(alice_tx, script, timelock + 1))


if __name__ == '__main__':
    # Run tests
    unittest.main(verbosity=2) 