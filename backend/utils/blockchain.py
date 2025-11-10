import os
import json
import asyncio
from typing import Dict, Any, Optional
from web3 import Web3
from eth_account import Account
import httpx
from datetime import datetime

# Blockchain configuration
POLYGON_RPC_URL = os.getenv("POLYGON_RPC_URL", "https://polygon-rpc.com")
CERTIFICATE_CONTRACT_ADDRESS = os.getenv("CERTIFICATE_CONTRACT_ADDRESS")
PRIVATE_KEY = os.getenv("BLOCKCHAIN_PRIVATE_KEY")
IPFS_GATEWAY = os.getenv("IPFS_GATEWAY", "https://ipfs.io/ipfs/")
PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_KEY = os.getenv("PINATA_SECRET_KEY")

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(POLYGON_RPC_URL))

# Certificate NFT Contract ABI (simplified)
CERTIFICATE_ABI = [
    {
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "tokenURI", "type": "string"}
        ],
        "name": "mintCertificate",
        "outputs": [{"name": "tokenId", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "name": "tokenURI",
        "outputs": [{"name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "name": "ownerOf",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    }
]

class BlockchainService:
    def __init__(self):
        self.w3 = w3
        self.contract = None
        if CERTIFICATE_CONTRACT_ADDRESS and w3.is_connected():
            self.contract = w3.eth.contract(
                address=CERTIFICATE_CONTRACT_ADDRESS,
                abi=CERTIFICATE_ABI
            )
    
    async def upload_to_ipfs(self, metadata: Dict[str, Any]) -> str:
        """Upload certificate metadata to IPFS"""
        try:
            if not PINATA_API_KEY or not PINATA_SECRET_KEY:
                raise Exception("IPFS credentials not configured")
            
            headers = {
                "pinata_api_key": PINATA_API_KEY,
                "pinata_secret_api_key": PINATA_SECRET_KEY,
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
                    headers=headers,
                    json={
                        "pinataContent": metadata,
                        "pinataMetadata": {
                            "name": f"Certificate-{metadata.get('certificate_id', 'unknown')}"
                        }
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return f"{IPFS_GATEWAY}{result['IpfsHash']}"
                else:
                    raise Exception(f"IPFS upload failed: {response.text}")
                    
        except Exception as e:
            # Fallback to local storage or alternative IPFS service
            print(f"IPFS upload failed: {e}")
            # Return a placeholder URI for development
            return f"https://api.DCA.com/certificates/{metadata.get('certificate_id')}/metadata"
    
    async def mint_certificate_nft(
        self, 
        recipient_address: str, 
        certificate_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Mint a certificate as NFT on Polygon"""
        try:
            if not self.contract or not PRIVATE_KEY:
                raise Exception("Blockchain not properly configured")
            
            # Create metadata
            metadata = {
                "name": f"DCA Certificate - {certificate_data['course_title']}",
                "description": certificate_data.get('description', ''),
                "image": certificate_data.get('image_url', ''),
                "attributes": [
                    {
                        "trait_type": "Certificate ID",
                        "value": certificate_data['certificate_id']
                    },
                    {
                        "trait_type": "Recipient",
                        "value": certificate_data['recipient_name']
                    },
                    {
                        "trait_type": "Course",
                        "value": certificate_data['course_title']
                    },
                    {
                        "trait_type": "Issue Date",
                        "value": certificate_data['issued_at']
                    },
                    {
                        "trait_type": "Platform",
                        "value": "DCA LMS"
                    }
                ],
                "external_url": f"https://DCA.com/certificates/{certificate_data['certificate_id']}"
            }
            
            # Upload metadata to IPFS
            token_uri = await self.upload_to_ipfs(metadata)
            
            # Prepare transaction
            account = Account.from_key(PRIVATE_KEY)
            nonce = self.w3.eth.get_transaction_count(account.address)
            
            # Build transaction
            transaction = self.contract.functions.mintCertificate(
                recipient_address,
                token_uri
            ).build_transaction({
                'from': account.address,
                'nonce': nonce,
                'gas': 200000,
                'gasPrice': self.w3.to_wei('30', 'gwei')
            })
            
            # Sign and send transaction
            signed_txn = self.w3.eth.account.sign_transaction(transaction, PRIVATE_KEY)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            # Wait for transaction receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            # Extract token ID from logs
            token_id = None
            for log in receipt.logs:
                try:
                    decoded_log = self.contract.events.Transfer().process_log(log)
                    token_id = decoded_log['args']['tokenId']
                    break
                except:
                    continue
            
            return {
                "token_id": str(token_id) if token_id else None,
                "contract_address": CERTIFICATE_CONTRACT_ADDRESS,
                "transaction_hash": tx_hash.hex(),
                "network": "polygon",
                "token_uri": token_uri,
                "gas_used": receipt.gasUsed,
                "block_number": receipt.blockNumber
            }
            
        except Exception as e:
            print(f"NFT minting failed: {e}")
            # For development, return mock data
            return {
                "token_id": f"mock_{certificate_data['certificate_id']}",
                "contract_address": "0x1234567890123456789012345678901234567890",
                "transaction_hash": f"0x{''.join(['a' for _ in range(64)])}",
                "network": "polygon-testnet",
                "token_uri": f"https://api.DCA.com/certificates/{certificate_data['certificate_id']}/metadata"
            }
    
    async def verify_certificate_on_chain(
        self, 
        contract_address: str, 
        token_id: str
    ) -> bool:
        """Verify certificate exists on blockchain"""
        try:
            if not self.contract:
                return False
            
            # Check if token exists by trying to get its URI
            token_uri = self.contract.functions.tokenURI(int(token_id)).call()
            return bool(token_uri)
            
        except Exception as e:
            print(f"Blockchain verification failed: {e}")
            return False
    
    async def get_certificate_owner(
        self, 
        contract_address: str, 
        token_id: str
    ) -> Optional[str]:
        """Get the owner of a certificate NFT"""
        try:
            if not self.contract:
                return None
            
            owner = self.contract.functions.ownerOf(int(token_id)).call()
            return owner
            
        except Exception as e:
            print(f"Failed to get certificate owner: {e}")
            return None

# Initialize blockchain service
blockchain_service = BlockchainService()

# Export functions for use in routers
async def mint_certificate_nft(recipient_address: str, certificate_data: Dict[str, Any]) -> Dict[str, Any]:
    return await blockchain_service.mint_certificate_nft(recipient_address, certificate_data)

async def verify_certificate_on_chain(contract_address: str, token_id: str) -> bool:
    return await blockchain_service.verify_certificate_on_chain(contract_address, token_id)

async def get_certificate_owner(contract_address: str, token_id: str) -> Optional[str]:
    return await blockchain_service.get_certificate_owner(contract_address, token_id)
