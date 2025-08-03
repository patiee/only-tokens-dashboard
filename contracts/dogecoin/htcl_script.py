#!/usr/bin/env python3
"""
Dogecoin HTCL (Hash Time-Locked Contract) Script Implementation

This module provides the core functionality for creating and validating
HTCL scripts for Dogecoin using Bitcoin-style scripting.
"""

import hashlib
import base58
from typing import Tuple, Optional
from dataclasses import dataclass


@dataclass
class HTCLScript:
    """Represents an HTCL script with all necessary parameters."""
    alice_pubkey: str
    bob_pubkey: str
    timelock: int
    hashlock: str  # Universal hashlock that works across all chains
    script_hex: str
    p2sh_address: str


class HTCLScriptGenerator:
    """Generates HTCL scripts for Dogecoin transactions."""
    
    # Bitcoin script opcodes
    OP_DUP = 0x76
    OP_HASH160 = 0xa9
    OP_EQUALVERIFY = 0x88
    OP_CHECKSIG = 0xac
    OP_IF = 0x63
    OP_ELSE = 0x67
    OP_ENDIF = 0x68
    OP_CHECKLOCKTIMEVERIFY = 0xb1
    OP_DROP = 0x75
    
    @staticmethod
    def create(alice_pubkey: str, bob_pubkey: str, timelock: int, hashlock: str) -> HTCLScript:
        """
        Create an HTCL script.
        
        Args:
            alice_pubkey: Alice's public key (hex string)
            bob_pubkey: Bob's public key (hex string)
            timelock: Block height or timestamp for timelock
            hashlock: Hash of the secret (hex string) - Dogecoin format
            
        Returns:
            HTCLScript object with the generated script
        """
        # Validate inputs
        if not alice_pubkey or not bob_pubkey:
            raise ValueError("Public keys cannot be empty")
        
        if timelock <= 0:
            raise ValueError("Timelock must be positive")
            
        if not hashlock or len(hashlock) != 40:  # 20 bytes = 40 hex chars
            raise ValueError("Hashlock must be 20 bytes (40 hex characters)")
        
        # Generate the script
        script_parts = []
        
        # Bob's spending path (before timelock with secret)
        script_parts.extend([
            # Push the secret (will be provided during spending)
            f"OP_DUP",  # Duplicate the secret
            f"OP_HASH160",  # Hash the secret
            f"OP_PUSHDATA({hashlock})",  # Push the expected hash
            f"OP_EQUALVERIFY",  # Verify hash matches
            f"OP_DROP",  # Drop the secret from stack
            f"OP_PUSHDATA({bob_pubkey})",  # Push Bob's public key
            f"OP_CHECKSIG",  # Verify Bob's signature
            f"OP_IF",  # If signature is valid
            f"OP_ELSE",  # Else (Alice's path)
        ])
        
        # Alice's spending path (after timelock)
        script_parts.extend([
            f"OP_PUSHDATA({timelock})",  # Push timelock
            f"OP_CHECKLOCKTIMEVERIFY",  # Verify timelock has passed
            f"OP_DROP",  # Drop timelock from stack
            f"OP_PUSHDATA({alice_pubkey})",  # Push Alice's public key
            f"OP_CHECKSIG",  # Verify Alice's signature
            f"OP_ENDIF",  # End if statement
        ])
        
        # Convert to hex script
        script_hex = HTCLScriptGenerator._script_parts_to_hex(script_parts)
        
        # Generate P2SH address
        p2sh_address = HTCLScriptGenerator._script_to_p2sh_address(script_hex)
        
        return HTCLScript(
            alice_pubkey=alice_pubkey,
            bob_pubkey=bob_pubkey,
            timelock=timelock,
            hashlock=hashlock,
            script_hex=script_hex,
            p2sh_address=p2sh_address
        )
    
    @staticmethod
    def _script_parts_to_hex(script_parts: list) -> str:
        """Convert script parts to hex string."""
        # This is a simplified version - in practice, you'd use a proper Bitcoin script compiler
        script_bytes = []
        
        for part in script_parts:
            if part.startswith("OP_"):
                # Handle opcodes
                opcode = getattr(HTCLScriptGenerator, part)
                script_bytes.append(opcode)
            elif part.startswith("OP_PUSHDATA("):
                # Handle data pushes
                data = part[12:-1]  # Remove "OP_PUSHDATA(" and ")"
                if data.startswith("0x"):
                    data = data[2:]
                
                # Add length byte and data
                data_bytes = bytes.fromhex(data)
                script_bytes.append(len(data_bytes))
                script_bytes.extend(data_bytes)
        
        return script_bytes.hex()
    
    @staticmethod
    def _script_to_p2sh_address(script_hex: str) -> str:
        """Convert script hex to P2SH address."""
        script_bytes = bytes.fromhex(script_hex)
        
        # Hash the script with SHA256 and RIPEMD160
        sha256_hash = hashlib.sha256(script_bytes).digest()
        ripemd160_hash = hashlib.new('ripemd160', sha256_hash).digest()
        
        # Add version byte for P2SH (0x05 for mainnet, 0xc4 for testnet)
        version_script_hash = b'\x05' + ripemd160_hash
        
        # Double SHA256 for checksum
        checksum = hashlib.sha256(hashlib.sha256(version_script_hash).digest()).digest()[:4]
        
        # Combine and encode as base58
        address_bytes = version_script_hash + checksum
        p2sh_address = base58.b58encode(address_bytes).decode('utf-8')
        
        return p2sh_address
    
    @staticmethod
    def validate_script(script: HTCLScript) -> bool:
        """Validate an HTCL script."""
        try:
            # Check if script can be parsed
            script_bytes = bytes.fromhex(script.script_hex)
            
            # Basic validation - script should be reasonable size
            if len(script_bytes) < 50 or len(script_bytes) > 1000:
                return False
            
            # Check if P2SH address is valid
            if not script.p2sh_address.startswith('3'):
                return False
            
            # Check if hashlock is valid hex
            bytes.fromhex(script.hashlock)
            
            # Check if public keys are valid hex
            bytes.fromhex(script.alice_pubkey)
            bytes.fromhex(script.bob_pubkey)
            
            return True
            
        except (ValueError, TypeError):
            return False


class HTCLScriptValidator:
    """Validates HTCL script spending conditions."""
    
    @staticmethod
    def validate_bob_spending(script: HTCLScript, secret: str, signature: str, pubkey: str) -> bool:
        """
        Validate Bob's spending conditions.
        
        Args:
            script: The HTCL script
            secret: The secret that hashes to the hashlock
            signature: Bob's signature
            pubkey: Bob's public key
            
        Returns:
            True if spending conditions are met
        """
        try:
            # Verify the secret hashes to the hashlock
            secret_hash = hashlib.new('ripemd160', hashlib.sha256(secret.encode()).digest()).hexdigest()
            if secret_hash != script.hashlock:
                return False
            
            # Verify the public key matches Bob's
            if pubkey != script.bob_pubkey:
                return False
            
            # In a real implementation, you'd verify the signature here
            # For now, we'll assume it's valid if the format is correct
            if not signature or len(signature) < 64:
                return False
            
            return True
            
        except Exception:
            return False
    
    @staticmethod
    def validate_alice_spending(script: HTCLScript, signature: str, pubkey: str, current_block: int) -> bool:
        """
        Validate Alice's spending conditions.
        
        Args:
            script: The HTCL script
            signature: Alice's signature
            pubkey: Alice's public key
            current_block: Current block height
            
        Returns:
            True if spending conditions are met
        """
        try:
            # Verify timelock has expired
            if current_block < script.timelock:
                return False
            
            # Verify the public key matches Alice's
            if pubkey != script.alice_pubkey:
                return False
            
            # In a real implementation, you'd verify the signature here
            # For now, we'll assume it's valid if the format is correct
            if not signature or len(signature) < 64:
                return False
            
            return True
            
        except Exception:
            return False


def generate_hashlock(secret: str) -> str:
    """
    Generate a hashlock from a secret.
    
    Args:
        secret: The secret string
        
    Returns:
        Hex string of the hashlock (20 bytes)
    """
    # Use SHA256 + RIPEMD160 (same as Bitcoin address generation)
    sha256_hash = hashlib.sha256(secret.encode()).digest()
    ripemd160_hash = hashlib.new('ripemd160', sha256_hash).digest()
    return ripemd160_hash.hex()


def create_random_secret() -> str:
    """Create a random secret for hashlock generation."""
    import secrets
    return secrets.token_hex(32)  # 64 hex characters = 32 bytes


if __name__ == "__main__":
    # Example usage
    alice_pubkey = "02" + "a" * 64  # Example public key
    bob_pubkey = "02" + "b" * 64    # Example public key
    timelock = 1000000               # Block height
    secret = create_random_secret()
    hashlock = generate_hashlock(secret)
    
    script = HTCLScriptGenerator.create(
        alice_pubkey=alice_pubkey,
        bob_pubkey=bob_pubkey,
        timelock=timelock,
        hashlock=hashlock
    )
    
    print(f"HTCL Script created:")
    print(f"Alice pubkey: {script.alice_pubkey}")
    print(f"Bob pubkey: {script.bob_pubkey}")
    print(f"Timelock: {script.timelock}")
    print(f"Hashlock: {script.hashlock}")
    print(f"P2SH Address: {script.p2sh_address}")
    print(f"Script Hex: {script.script_hex}") 