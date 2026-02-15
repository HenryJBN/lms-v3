"""
Encryption Utilities

Provides secure encryption/decryption for sensitive credentials using Fernet symmetric encryption.
Implements write-only credential pattern for maximum security.
"""

import os
from typing import Optional
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

# Get encryption key from environment variable
# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')

# Initialize Fernet cipher if key is available
_cipher = None
if ENCRYPTION_KEY:
    try:
        _cipher = Fernet(ENCRYPTION_KEY.encode())
    except Exception as e:
        print(f"[ENCRYPTION] Warning: Failed to initialize encryption cipher: {e}")
        print("[ENCRYPTION] Email credentials will not be encrypted. Set ENCRYPTION_KEY in .env")


def encrypt_credential(value: str) -> Optional[str]:
    """
    Encrypt a credential using Fernet symmetric encryption.
    
    Args:
        value: Plain text credential to encrypt
        
    Returns:
        Encrypted credential as base64 string, or None if encryption fails
        
    Example:
        >>> encrypted = encrypt_credential("my_password")
        >>> print(encrypted)
        'gAAAAABh...'
    """
    if not value:
        return None
        
    if not _cipher:
        print("[ENCRYPTION] Warning: Encryption not available, storing credential in plain text")
        return value
    
    try:
        encrypted_bytes = _cipher.encrypt(value.encode())
        return encrypted_bytes.decode()
    except Exception as e:
        print(f"[ENCRYPTION] Error encrypting credential: {e}")
        return None


def decrypt_credential(encrypted_value: str) -> Optional[str]:
    """
    Decrypt a credential that was encrypted with encrypt_credential.
    
    Args:
        encrypted_value: Encrypted credential as base64 string
        
    Returns:
        Decrypted plain text credential, or None if decryption fails
        
    Example:
        >>> decrypted = decrypt_credential("gAAAAABh...")
        >>> print(decrypted)
        'my_password'
    """
    if not encrypted_value:
        return None
        
    if not _cipher:
        print("[ENCRYPTION] Warning: Encryption not available, returning value as-is")
        return encrypted_value
    
    try:
        decrypted_bytes = _cipher.decrypt(encrypted_value.encode())
        return decrypted_bytes.decode()
    except Exception as e:
        print(f"[ENCRYPTION] Error decrypting credential: {e}")
        # If decryption fails, it might be plain text (backward compatibility)
        print("[ENCRYPTION] Attempting to use value as plain text")
        return encrypted_value


def mask_credential(value: str, visible_chars: int = 3) -> str:
    """
    Mask a credential for display purposes.
    
    Shows first few characters and masks the rest for security.
    For email addresses, shows partial username and domain.
    
    Args:
        value: Credential to mask
        visible_chars: Number of characters to show at the start
        
    Returns:
        Masked credential string
        
    Examples:
        >>> mask_credential("user@example.com")
        'use***@***.com'
        >>> mask_credential("smtp.gmail.com")
        'smt***'
        >>> mask_credential("mypassword", visible_chars=2)
        'my***'
    """
    if not value:
        return ""
    
    # Special handling for email addresses
    if "@" in value:
        try:
            username, domain = value.split("@", 1)
            # Mask username
            if len(username) <= visible_chars:
                masked_username = username[0] + "***"
            else:
                masked_username = username[:visible_chars] + "***"
            
            # Mask domain (show TLD)
            domain_parts = domain.split(".")
            if len(domain_parts) > 1:
                masked_domain = "***." + domain_parts[-1]
            else:
                masked_domain = "***"
            
            return f"{masked_username}@{masked_domain}"
        except:
            pass
    
    # Default masking for non-email values
    if len(value) <= visible_chars:
        return value[0] + "***" if len(value) > 0 else "***"
    
    return value[:visible_chars] + "***"


def is_encryption_available() -> bool:
    """
    Check if encryption is properly configured.
    
    Returns:
        True if encryption key is set and cipher is initialized
    """
    return _cipher is not None

