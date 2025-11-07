-- Migration 006: Create admin and analytics tables
-- Run after 005_create_notifications_and_communications.sql

-- Create enum types for admin functionality
CREATE TYPE admin_action_type AS ENUM (
    'user_created', 'user_updated', 'user_deleted', 'user_suspended', 'user_activated',
    'course_created', 'course_updated', 'course_deleted', 'course_published', 'course_unpublished',
    'lesson_created', 'lesson_updated', 'lesson_deleted',
    'notification_sent', 'bulk_notification_sent',
    'certificate_issued', 'certificate_revoked',
    'tokens_awarded', 'tokens_deducted',
    'system_settings_updated', 'backup_created', 'data_exported'
);

CREATE TYPE page_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE page_type AS ENUM ('static', 'dynamic', 'landing', 'legal');

-- Admin audit log
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action admin_action_type NOT NULL,
    target_type VARCHAR(50), -- 'user', 'course', 'lesson', etc.
    target_id UUID, -- ID of the affected entity
    description TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB, -- Additional context data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    data_type VARCHAR(20) NOT NULL DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE, -- Whether this setting can be accessed by non-admin users
    category VARCHAR(50) DEFAULT 'general',
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content pages (for CMS functionality)
CREATE TABLE IF NOT EXISTS content_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT,
    excerpt TEXT,
    meta_title VARCHAR(255),
    meta_description TEXT,
    status page_status NOT NULL DEFAULT 'draft',
    type page_type NOT NULL DEFAULT 'static',
    template VARCHAR(100),
    featured_image_url TEXT,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics events tracking
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL, -- 'page_view', 'course_view', 'lesson_start', 'lesson_complete', etc.
    event_name VARCHAR(255) NOT NULL,
    properties JSONB, -- Event properties and metadata
    page_url TEXT,
    referrer TEXT,
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    country VARCHAR(2), -- ISO country code
    city VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course analytics summary (daily aggregates)
CREATE TABLE IF NOT EXISTS course_analytics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    enrollments INTEGER DEFAULT 0,
    completions INTEGER DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    avg_rating DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, date)
);

-- User analytics summary (daily aggregates)
CREATE TABLE IF NOT EXISTS user_analytics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    new_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    course_enrollments INTEGER DEFAULT 0,
    lesson_completions INTEGER DEFAULT 0,
    quiz_attempts INTEGER DEFAULT 0,
    tokens_earned DECIMAL(18,8) DEFAULT 0,
    certificates_issued INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date)
);

-- Revenue tracking
CREATE TABLE IF NOT EXISTS revenue_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_method VARCHAR(50), -- 'stripe', 'paypal', 'crypto', etc.
    payment_id VARCHAR(255), -- External payment provider ID
    instructor_share DECIMAL(10,2), -- Amount that goes to instructor
    platform_fee DECIMAL(10,2), -- Platform commission
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'refunded', 'failed'
    metadata JSONB,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Instructor payouts
CREATE TABLE IF NOT EXISTS instructor_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    payout_method VARCHAR(50), -- 'bank_transfer', 'paypal', 'stripe', etc.
    payout_details JSONB, -- Bank account, PayPal email, etc.
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature flags for A/B testing and gradual rollouts
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_enabled BOOLEAN DEFAULT FALSE,
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    target_users UUID[], -- Specific user IDs to target
    target_roles user_role[], -- Specific roles to target
    conditions JSONB, -- Additional conditions for flag activation
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user_id ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_is_public ON system_settings(is_public);

CREATE INDEX IF NOT EXISTS idx_content_pages_slug ON content_pages(slug);
CREATE INDEX IF NOT EXISTS idx_content_pages_status ON content_pages(status);
CREATE INDEX IF NOT EXISTS idx_content_pages_type ON content_pages(type);
CREATE INDEX IF NOT EXISTS idx_content_pages_author_id ON content_pages(author_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

CREATE INDEX IF NOT EXISTS idx_course_analytics_daily_course_id ON course_analytics_daily(course_id);
CREATE INDEX IF NOT EXISTS idx_course_analytics_daily_date ON course_analytics_daily(date);

CREATE INDEX IF NOT EXISTS idx_user_analytics_daily_date ON user_analytics_daily(date);

CREATE INDEX IF NOT EXISTS idx_revenue_records_user_id ON revenue_records(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_records_course_id ON revenue_records(course_id);
CREATE INDEX IF NOT EXISTS idx_revenue_records_instructor_id ON revenue_records(instructor_id);
CREATE INDEX IF NOT EXISTS idx_revenue_records_status ON revenue_records(status);
CREATE INDEX IF NOT EXISTS idx_revenue_records_created_at ON revenue_records(created_at);

CREATE INDEX IF NOT EXISTS idx_instructor_payouts_instructor_id ON instructor_payouts(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_payouts_status ON instructor_payouts(status);
CREATE INDEX IF NOT EXISTS idx_instructor_payouts_period ON instructor_payouts(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(name);
CREATE INDEX IF NOT EXISTS idx_feature_flags_is_enabled ON feature_flags(is_enabled);

-- Apply updated_at triggers
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_pages_updated_at BEFORE UPDATE ON content_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_instructor_payouts_updated_at BEFORE UPDATE ON instructor_payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
