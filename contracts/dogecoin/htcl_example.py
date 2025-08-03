#!/usr/bin/env python3
"""
Dogecoin HTCL Complete Example

This example demonstrates the complete HTCL workflow:
1. Create HTCL script
2. Fund the HTCL contract
3. Bob withdraws with secret (before timelock)
4. Alice withdraws after timelock (if Bob doesn't withdraw)
"""

import hashlib
import time
import json
from htcl_script import (
    HTCLScriptGenerator, 
    HTCLScriptValidator,
    generate_hashlock,
    create_random_secret
)
from htcl_transaction import (
    HTCLTransactionBuilder,
    HTCLTransactionValidator,
    HTCLTransactionSerializer,
    estimate_transaction_fee,
    get_current_block_height
)


def main():
    """Demonstrate complete HTCL workflow."""
    print("🐕 Dogecoin HTCL (Hash Time-Locked Contract) Example")
    print("=" * 60)
    
    # Step 1: Generate keys and parameters
    print("\n1. Generating HTCL Parameters...")
    
    # In a real scenario, these would be actual public keys
    alice_pubkey = "02" + "a" * 64  # Alice's public key
    bob_pubkey = "02" + "b" * 64    # Bob's public key
    
    # Generate a random secret for Bob
    secret = create_random_secret()
    print(f"   Generated secret: {secret[:16]}...")
    
    # Generate hashlock from secret
    hashlock = generate_hashlock(secret)
    print(f"   Generated hashlock: {hashlock}")
    
    # Set timelock (current block + 1000 blocks)
    current_block = get_current_block_height()
    timelock = current_block + 1000
    print(f"   Current block: {current_block}")
    print(f"   Timelock block: {timelock}")
    print(f"   Timelock expires in: {timelock - current_block} blocks")
    
    # Step 2: Create HTCL script
    print("\n2. Creating HTCL Script...")
    
    script = HTCLScriptGenerator.create(
        alice_pubkey=alice_pubkey,
        bob_pubkey=bob_pubkey,
        timelock=timelock,
        hashlock=hashlock
    )
    
    print(f"   Alice pubkey: {script.alice_pubkey[:16]}...")
    print(f"   Bob pubkey: {script.bob_pubkey[:16]}...")
    print(f"   P2SH Address: {script.p2sh_address}")
    print(f"   Script Hex: {script.script_hex[:50]}...")
    
    # Validate the script
    if HTCLScriptGenerator.validate_script(script):
        print("   ✅ Script validation passed")
    else:
        print("   ❌ Script validation failed")
        return
    
    # Step 3: Create funding transaction
    print("\n3. Creating Funding Transaction...")
    
    builder = HTCLTransactionBuilder()
    
    # Example input UTXOs (in practice, you'd get these from a wallet)
    input_utxos = [
        {
            'txid': '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            'vout': 0,
            'amount': 1000000  # 1 DOGE in satoshis
        }
    ]
    
    amount = 500000  # 0.5 DOGE
    fee = estimate_transaction_fee(len(input_utxos), 2)
    change_address = 'D8gP6wF1JP5XdQpw4VN3uXJmUixF6RT7b9'
    
    funding_tx = builder.create_funding_transaction(
        script=script,
        amount=amount,
        fee=fee,
        input_utxos=input_utxos,
        change_address=change_address
    )
    
    print(f"   Funding amount: {amount} satoshis ({amount/100000000:.8f} DOGE)")
    print(f"   Transaction fee: {fee} satoshis")
    print(f"   Change amount: {input_utxos[0]['amount'] - amount - fee} satoshis")
    
    # Validate funding transaction
    if HTCLTransactionValidator.validate_funding_transaction(funding_tx, script):
        print("   ✅ Funding transaction validation passed")
    else:
        print("   ❌ Funding transaction validation failed")
        return
    
    # Step 4: Demonstrate Bob's withdrawal (before timelock)
    print("\n4. Bob's Withdrawal (Before Timelock)...")
    
    bob_address = 'D8gP6wF1JP5XdQpw4VN3uXJmUixF6RT7b9'
    bob_private_key = 'bob_private_key_here'
    
    bob_tx = builder.create_bob_withdrawal_transaction(
        script=script,
        secret=secret,
        amount=amount,
        fee=fee,
        bob_private_key=bob_private_key,
        bob_address=bob_address
    )
    
    print(f"   Bob's secret: {secret[:16]}...")
    print(f"   Withdrawal amount: {amount - fee} satoshis")
    
    # Validate Bob's withdrawal
    if HTCLTransactionValidator.validate_bob_withdrawal_transaction(bob_tx, script, secret):
        print("   ✅ Bob's withdrawal validation passed")
    else:
        print("   ❌ Bob's withdrawal validation failed")
    
    # Step 5: Demonstrate Alice's withdrawal (after timelock)
    print("\n5. Alice's Withdrawal (After Timelock)...")
    
    # Simulate time passing
    print("   Simulating time passing...")
    future_block = timelock + 1
    print(f"   Current block: {future_block} (timelock expired)")
    
    alice_address = 'D8gP6wF1JP5XdQpw4VN3uXJmUixF6RT7b9'
    alice_private_key = 'alice_private_key_here'
    
    alice_tx = builder.create_alice_withdrawal_transaction(
        script=script,
        amount=amount,
        fee=fee,
        alice_private_key=alice_private_key,
        alice_address=alice_address,
        current_block=future_block
    )
    
    print(f"   Withdrawal amount: {amount - fee} satoshis")
    
    # Validate Alice's withdrawal
    if HTCLTransactionValidator.validate_alice_withdrawal_transaction(alice_tx, script, future_block):
        print("   ✅ Alice's withdrawal validation passed")
    else:
        print("   ❌ Alice's withdrawal validation failed")
    
    # Step 6: Demonstrate validation scenarios
    print("\n6. Validation Scenarios...")
    
    # Test Bob's withdrawal before timelock
    print("   Testing Bob's withdrawal conditions:")
    print(f"     - Secret valid: {HTCLScriptValidator.validate_bob_spending(script, secret, 'sig', script.bob_pubkey)}")
    print(f"     - Wrong secret: {HTCLScriptValidator.validate_bob_spending(script, 'wrong_secret', 'sig', script.bob_pubkey)}")
    print(f"     - Wrong pubkey: {HTCLScriptValidator.validate_bob_spending(script, secret, 'sig', 'wrong_pubkey')}")
    
    # Test Alice's withdrawal after timelock
    print("   Testing Alice's withdrawal conditions:")
    print(f"     - After timelock: {HTCLScriptValidator.validate_alice_spending(script, 'sig', script.alice_pubkey, future_block)}")
    print(f"     - Before timelock: {HTCLScriptValidator.validate_alice_spending(script, 'sig', script.alice_pubkey, current_block)}")
    print(f"     - Wrong pubkey: {HTCLScriptValidator.validate_alice_spending(script, 'sig', 'wrong_pubkey', future_block)}")
    
    # Step 7: Save transaction data
    print("\n7. Saving Transaction Data...")
    
    transaction_data = {
        'script': {
            'alice_pubkey': script.alice_pubkey,
            'bob_pubkey': script.bob_pubkey,
            'timelock': script.timelock,
            'hashlock': script.hashlock,
            'p2sh_address': script.p2sh_address,
            'script_hex': script.script_hex
        },
        'funding_transaction': HTCLTransactionSerializer.to_json(funding_tx),
        'bob_withdrawal_transaction': HTCLTransactionSerializer.to_json(bob_tx),
        'alice_withdrawal_transaction': HTCLTransactionSerializer.to_json(alice_tx),
        'secret': secret,
        'parameters': {
            'amount': amount,
            'fee': fee,
            'current_block': current_block,
            'timelock': timelock
        }
    }
    
    with open('htcl_transaction_data.json', 'w') as f:
        json.dump(transaction_data, f, indent=2)
    
    print("   ✅ Transaction data saved to 'htcl_transaction_data.json'")
    
    # Step 8: Summary
    print("\n8. HTCL Summary...")
    print("   🎯 HTCL Contract Created Successfully!")
    print(f"   📍 P2SH Address: {script.p2sh_address}")
    print(f"   🔒 Timelock: Block {timelock}")
    print(f"   🔑 Secret: {secret[:16]}...")
    print(f"   💰 Amount: {amount/100000000:.8f} DOGE")
    print("\n   📋 Usage:")
    print("     1. Send DOGE to the P2SH address")
    print("     2. Bob can withdraw with the secret (before timelock)")
    print("     3. Alice can withdraw after timelock expires")
    print("\n   ⚠️  Security Notes:")
    print("     - Keep the secret secure")
    print("     - Monitor the timelock")
    print("     - Test on testnet first")
    print("     - Verify all transaction parameters")


def demonstrate_htcl_workflow():
    """Demonstrate the complete HTCL workflow with detailed explanations."""
    print("\n" + "="*60)
    print("🔍 HTCL Workflow Demonstration")
    print("="*60)
    
    # Create a simple example
    alice_pubkey = "02" + "a" * 64
    bob_pubkey = "02" + "b" * 64
    secret = "my_secret_key_for_htcl_contract_2024"
    hashlock = generate_hashlock(secret)
    timelock = get_current_block_height() + 100
    
    print(f"📝 Creating HTCL with parameters:")
    print(f"   Alice: {alice_pubkey[:16]}...")
    print(f"   Bob: {bob_pubkey[:16]}...")
    print(f"   Secret: {secret}")
    print(f"   Hashlock: {hashlock}")
    print(f"   Timelock: {timelock}")
    
    # Create script
    script = HTCLScriptGenerator.create(
        alice_pubkey=alice_pubkey,
        bob_pubkey=bob_pubkey,
        timelock=timelock,
        hashlock=hashlock
    )
    
    print(f"\n✅ HTCL Script Created:")
    print(f"   P2SH Address: {script.p2sh_address}")
    print(f"   Script Size: {len(script.script_hex)//2} bytes")
    
    # Test spending conditions
    print(f"\n🧪 Testing Spending Conditions:")
    
    # Bob's path
    bob_valid = HTCLScriptValidator.validate_bob_spending(
        script, secret, "signature", bob_pubkey
    )
    print(f"   Bob's withdrawal (with secret): {'✅ Valid' if bob_valid else '❌ Invalid'}")
    
    # Alice's path
    alice_valid = HTCLScriptValidator.validate_alice_spending(
        script, "signature", alice_pubkey, timelock + 1
    )
    print(f"   Alice's withdrawal (after timelock): {'✅ Valid' if alice_valid else '❌ Invalid'}")
    
    print(f"\n🎯 HTCL is ready for use!")
    print(f"   Send DOGE to: {script.p2sh_address}")
    print(f"   Bob's secret: {secret}")
    print(f"   Timelock expires at block: {timelock}")


if __name__ == "__main__":
    try:
        main()
        print("\n" + "="*60)
        demonstrate_htcl_workflow()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc() 