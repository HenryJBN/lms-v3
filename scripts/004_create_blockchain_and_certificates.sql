-- Migration 004: Create blockchain and certificates tables
-- Run after 003_create_enrollments_and_progress.sql

-- Create enum types for blockchain and tokens
CREATE TYPE token_transaction_type AS ENUM ('earned', 'spent', 'received', 'bonus', 'refund');
CREATE TYPE certificate_status AS ENUM ('pending', 'minted', 'failed', 'revoked');
CREATE TYPE blockchain_network AS ENUM ('ethereum', 'polygon', 'binance_smart_chain', 'avalanche');

-- L-Tokens (Learning Tokens) table
CREATE TABLE l_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(18,8) NOT NULL DEFAULT 0,
    total_earned DECIMAL(18,8) NOT NULL DEFAULT 0,
    total_spent DECIMAL(18,8) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Token transactions table
CREATE TABLE token_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type token_transaction_type NOT NULL,
    amount DECIMAL(18,8) NOT NULL,
    balance_after DECIMAL(18,8) NOT NULL,
    description TEXT NOT NULL,
    reference_type VARCHAR(50), -- 'course_completion', 'quiz_passed', 'lesson_completed', 'purchase', etc.
    reference_id UUID, -- ID of the related entity (course, lesson, quiz, etc.)
    metadata JSONB,
    transaction_hash VARCHAR(66), -- Blockchain transaction hash if applicable
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NFT Certificates table
CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status certificate_status NOT NULL DEFAULT 'pending',
    blockchain_network blockchain_network NOT NULL DEFAULT 'polygon',
    contract_address VARCHAR(42), -- Ethereum address format
    token_id VARCHAR(100), -- NFT token ID
    token_uri TEXT, -- IPFS or other URI for metadata
    transaction_hash VARCHAR(66), -- Minting transaction hash
    image_url TEXT,
    metadata JSONB, -- Additional certificate metadata
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    minted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- Blockchain wallets table (for users who connect external wallets)
CREATE TABLE user_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) NOT NULL, -- Ethereum address format
    wallet_type VARCHAR(50) NOT NULL, -- 'metamask', 'walletconnect', 'coinbase', etc.
    is_primary BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Smart contract interactions log
CREATE TABLE blockchain_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    blockchain_network blockchain_network NOT NULL,
    contract_address VARCHAR(42),
    function_name VARCHAR(100),
    transaction_type VARCHAR(50), -- 'mint_certificate', 'transfer_tokens', etc.
    status VARCHAR(20) NOT NULL, -- 'pending', 'confirmed', 'failed'
    gas_used BIGINT,
    gas_price BIGINT,
    block_number BIGINT,
    block_timestamp TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Token rewards configuration
CREATE TABLE token_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type VARCHAR(50) NOT NULL, -- 'lesson_completed', 'quiz_passed', 'course_completed', etc.
    reward_amount DECIMAL(18,8) NOT NULL,
    minimum_score INTEGER, -- For quiz-based rewards
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_l_tokens_user_id ON l_tokens(user_id);

CREATE INDEX idx_token_transactions_user_id ON token_transactions(user_id);
CREATE INDEX idx_token_transactions_type ON token_transactions(type);
CREATE INDEX idx_token_transactions_reference ON token_transactions(reference_type, reference_id);
CREATE INDEX idx_token_transactions_created_at ON token_transactions(created_at);

CREATE INDEX idx_certificates_user_id ON certificates(user_id);
CREATE INDEX idx_certificates_course_id ON certificates(course_id);
CREATE INDEX idx_certificates_status ON certificates(status);
CREATE INDEX idx_certificates_blockchain_network ON certificates(blockchain_network);
CREATE INDEX idx_certificates_token_id ON certificates(token_id);

CREATE INDEX idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX idx_user_wallets_address ON user_wallets(wallet_address);
CREATE INDEX idx_user_wallets_is_primary ON user_wallets(user_id, is_primary);

CREATE INDEX idx_blockchain_transactions_hash ON blockchain_transactions(transaction_hash);
CREATE INDEX idx_blockchain_transactions_user_id ON blockchain_transactions(user_id);
CREATE INDEX idx_blockchain_transactions_network ON blockchain_transactions(blockchain_network);
CREATE INDEX idx_blockchain_transactions_status ON blockchain_transactions(status);

CREATE INDEX idx_token_rewards_action_type ON token_rewards(action_type);
CREATE INDEX idx_token_rewards_is_active ON token_rewards(is_active);

-- Apply updated_at triggers
CREATE TRIGGER update_l_tokens_updated_at BEFORE UPDATE ON l_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_certificates_updated_at BEFORE UPDATE ON certificates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_wallets_updated_at BEFORE UPDATE ON user_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blockchain_transactions_updated_at BEFORE UPDATE ON blockchain_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_token_rewards_updated_at BEFORE UPDATE ON token_rewards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
