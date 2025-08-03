# Dogecoin HTCL (Hash Time-Locked Contract)

This directory contains a Hash Time-Locked Contract (HTCL) implementation for Dogecoin using Bitcoin-style scripting with P2SH (Pay-to-Script-Hash) addresses.

## Overview

HTCL is a cryptographic protocol that enables conditional payments with time and hash-based constraints:

- **Alice (creator)**: Can withdraw DOGE only after the timelock expires with the correct hashlock
- **Bob (recipient)**: Can withdraw DOGE only before the timelock expires with the correct hashlock

## How it Works

1. **Setup Phase**: Alice creates a transaction with a special script that includes:
   - A timelock (block height or timestamp)
   - A hashlock (hash of a secret that Bob knows)
   - Two spending conditions

2. **Bob's Withdrawal**: Bob can spend the funds before the timelock expires by providing:
   - The secret that hashes to the hashlock
   - A valid signature

3. **Alice's Withdrawal**: Alice can spend the funds after the timelock expires by providing:
   - A valid signature
   - Proof that the timelock has expired

## Script Structure

The HTCL script uses the following Bitcoin script operations:
- `OP_IF`: Conditional execution
- `OP_CHECKLOCKTIMEVERIFY`: Verify timelock expiration
- `OP_HASH160`: Hash the provided secret
- `OP_EQUALVERIFY`: Verify hash matches
- `OP_CHECKSIG`: Verify signature

## Files

- `htcl_script.py`: Core HTCL script generation and validation
- `htcl_transaction.py`: Transaction creation and spending utilities
- `htcl_example.py`: Complete example of HTCL usage
- `requirements.txt`: Python dependencies
- `test_htcl.py`: Unit tests for the HTCL implementation

## Usage

```python
from htcl_script import HTCLScript
from htcl_transaction import HTCLTransaction

# Create HTCL script
script = HTCLScript.create(
    alice_pubkey="alice_public_key",
    bob_pubkey="bob_public_key", 
    timelock=1000000,  # Block height
    hashlock="hash_of_secret"
)

# Create funding transaction
tx = HTCLTransaction.create_funding_tx(
    script=script,
    amount=1000000,  # DOGE amount in satoshis
    fee=1000
)

# Bob withdraws with secret
tx = HTCLTransaction.create_bob_withdrawal_tx(
    script=script,
    secret="bob_secret",
    amount=1000000
)

# Alice withdraws after timelock
tx = HTCLTransaction.create_alice_withdrawal_tx(
    script=script,
    amount=1000000
)
```

## Security Considerations

- Always verify script parameters before creating transactions
- Use secure random secrets for hashlock generation
- Test on testnet before mainnet deployment
- Consider transaction fees and network conditions
- Ensure proper key management and signature verification

## Dependencies

- `bitcoin-utils`: Bitcoin/Dogecoin transaction utilities
- `hashlib`: For hash calculations
- `time`: For timestamp operations 