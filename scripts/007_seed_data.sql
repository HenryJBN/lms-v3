-- Migration 007: Seed data for initial setup
-- Run after all previous migrations

-- Insert default categories
INSERT INTO categories (id, name, slug, description, icon, color, sort_order) VALUES
    (uuid_generate_v4(), 'Web Development', 'web-dev', 'Learn modern web development technologies', 'Code', '#3B82F6', 1),
    (uuid_generate_v4(), 'Blockchain', 'blockchain', 'Master blockchain and cryptocurrency technologies', 'Link', '#8B5CF6', 2),
    (uuid_generate_v4(), 'Artificial Intelligence', 'ai', 'Explore AI and machine learning concepts', 'Brain', '#EF4444', 3),
    (uuid_generate_v4(), 'Filmmaking', 'filmmaking', 'Create compelling visual stories', 'Video', '#F59E0B', 4),
    (uuid_generate_v4(), '3D Animation', '3d-animation', 'Bring your imagination to life with 3D', 'Box', '#10B981', 5),
    (uuid_generate_v4(), 'Business', 'business', 'Develop essential business skills', 'Briefcase', '#6366F1', 6);

-- Insert default admin user (password should be hashed in real implementation)
INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, status, email_verified) VALUES
    (uuid_generate_v4(), 'admin@lms.com', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjPyV8Cpu', 'System', 'Administrator', 'admin', 'active', true);

-- Insert default system settings
INSERT INTO system_settings (key, value, data_type, description, is_public, category) VALUES
    ('site_name', 'MagikPro LMS', 'string', 'Name of the learning platform', true, 'general'),
    ('site_description', 'Advanced Learning Management System with Blockchain Integration', 'string', 'Site description for SEO', true, 'general'),
    ('default_currency', 'USD', 'string', 'Default currency for course pricing', true, 'payments'),
    ('platform_fee_percentage', '10', 'number', 'Platform commission percentage', false, 'payments'),
    ('max_file_upload_size', '100', 'number', 'Maximum file upload size in MB', false, 'system'),
    ('email_verification_required', 'true', 'boolean', 'Whether email verification is required for new users', false, 'authentication'),
    ('allow_course_reviews', 'true', 'boolean', 'Whether students can review courses', true, 'courses'),
    ('default_tokens_per_lesson', '10', 'number', 'Default L-Tokens awarded per lesson completion', false, 'blockchain'),
    ('default_tokens_per_quiz', '15', 'number', 'Default L-Tokens awarded per quiz completion', false, 'blockchain'),
    ('certificate_minting_enabled', 'true', 'boolean', 'Whether NFT certificates are automatically minted', false, 'blockchain');

-- Insert default notification templates
INSERT INTO notification_templates (name, type, subject, title, content, variables, created_by) VALUES
    ('welcome_email', 'email', 'Welcome to {{site_name}}!', 'Welcome!', 
     'Hi {{user_name}},\n\nWelcome to {{site_name}}! We''re excited to have you join our learning community.\n\nGet started by exploring our courses and begin your learning journey today.\n\nBest regards,\nThe {{site_name}} Team', 
     '{"user_name": "User''s first name", "site_name": "Platform name"}', 
     (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
    
    ('course_enrollment', 'email', 'You''ve enrolled in {{course_title}}', 'Course Enrollment Confirmed', 
     'Hi {{user_name}},\n\nYou have successfully enrolled in "{{course_title}}".\n\nStart learning now: {{course_url}}\n\nHappy learning!', 
     '{"user_name": "User''s first name", "course_title": "Course title", "course_url": "Link to course"}', 
     (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
    
    ('lesson_completed', 'in_app', NULL, 'Lesson Completed!', 
     'Congratulations! You''ve completed "{{lesson_title}}" and earned {{tokens_earned}} L-Tokens.', 
     '{"lesson_title": "Lesson title", "tokens_earned": "Number of tokens earned"}', 
     (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
    
    ('certificate_issued', 'email', 'Your certificate for {{course_title}} is ready!', 'Certificate Issued', 
     'Congratulations {{user_name}}!\n\nYou have successfully completed "{{course_title}}" and your NFT certificate has been issued.\n\nView your certificate: {{certificate_url}}\n\nShare your achievement with the world!', 
     '{"user_name": "User''s first name", "course_title": "Course title", "certificate_url": "Link to certificate"}', 
     (SELECT id FROM users WHERE role = 'admin' LIMIT 1));

-- Insert default token rewards
INSERT INTO token_rewards (action_type, reward_amount, description, is_active) VALUES
    ('lesson_completed', 10.00000000, 'Tokens awarded for completing a lesson', true),
    ('quiz_passed', 15.00000000, 'Tokens awarded for passing a quiz (70% or higher)', true),
    ('course_completed', 50.00000000, 'Bonus tokens awarded for completing an entire course', true),
    ('first_course_enrollment', 25.00000000, 'Welcome bonus for enrolling in first course', true),
    ('daily_login', 5.00000000, 'Daily login bonus tokens', true),
    ('course_review', 5.00000000, 'Tokens awarded for leaving a course review', true);

-- Insert default forum categories
INSERT INTO forum_categories (name, description, sort_order, is_active) VALUES
    ('General Discussion', 'General topics and community discussions', 1, true),
    ('Course Help', 'Get help with specific courses and lessons', 2, true),
    ('Technical Support', 'Technical issues and platform support', 3, true),
    ('Feature Requests', 'Suggest new features and improvements', 4, true),
    ('Showcase', 'Share your projects and achievements', 5, true);

-- Insert default feature flags
INSERT INTO feature_flags (name, description, is_enabled, rollout_percentage, created_by) VALUES
    ('new_video_player', 'New enhanced video player with better controls', false, 0, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
    ('ai_course_recommendations', 'AI-powered course recommendations', true, 100, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
    ('social_learning_features', 'Social features like study groups and peer learning', false, 25, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
    ('advanced_analytics', 'Advanced learning analytics dashboard', true, 50, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
    ('mobile_app_integration', 'Integration with mobile app features', false, 0, (SELECT id FROM users WHERE role = 'admin' LIMIT 1));

-- Insert sample content pages
INSERT INTO content_pages (title, slug, content, excerpt, meta_title, meta_description, status, type, author_id, published_at) VALUES
    ('About Us', 'about', 
     '<h1>About MagikPro LMS</h1><p>We are revolutionizing online education through blockchain technology and innovative learning experiences.</p><p>Our platform combines traditional learning management with cutting-edge Web3 features, including NFT certificates and learning tokens.</p>', 
     'Learn about our mission to revolutionize online education', 
     'About MagikPro LMS - Blockchain-Powered Learning', 
     'Discover how MagikPro LMS is transforming online education with blockchain technology, NFT certificates, and innovative learning experiences.', 
     'published', 'static', 
     (SELECT id FROM users WHERE role = 'admin' LIMIT 1), 
     NOW()),
    
    ('Privacy Policy', 'privacy', 
     '<h1>Privacy Policy</h1><p>This privacy policy explains how we collect, use, and protect your personal information.</p><p>Last updated: ' || TO_CHAR(NOW(), 'Month DD, YYYY') || '</p>', 
     'Our commitment to protecting your privacy and personal data', 
     'Privacy Policy - MagikPro LMS', 
     'Learn about how MagikPro LMS protects your privacy and handles your personal information.', 
     'published', 'legal', 
     (SELECT id FROM users WHERE role = 'admin' LIMIT 1), 
     NOW()),
    
    ('Terms of Service', 'terms', 
     '<h1>Terms of Service</h1><p>By using our platform, you agree to these terms and conditions.</p><p>Last updated: ' || TO_CHAR(NOW(), 'Month DD, YYYY') || '</p>', 
     'Terms and conditions for using our learning platform', 
     'Terms of Service - MagikPro LMS', 
     'Read the terms and conditions for using MagikPro LMS learning platform.', 
     'published', 'legal', 
     (SELECT id FROM users WHERE role = 'admin' LIMIT 1), 
     NOW());

-- Create some initial analytics data (last 30 days)
INSERT INTO user_analytics_daily (date, new_users, active_users, course_enrollments, lesson_completions, quiz_attempts, tokens_earned, certificates_issued)
SELECT 
    date_series.date,
    FLOOR(RANDOM() * 50 + 10)::INTEGER as new_users,
    FLOOR(RANDOM() * 200 + 100)::INTEGER as active_users,
    FLOOR(RANDOM() * 80 + 20)::INTEGER as course_enrollments,
    FLOOR(RANDOM() * 300 + 150)::INTEGER as lesson_completions,
    FLOOR(RANDOM() * 150 + 75)::INTEGER as quiz_attempts,
    ROUND((RANDOM() * 5000 + 1000)::NUMERIC, 8) as tokens_earned,
    FLOOR(RANDOM() * 20 + 5)::INTEGER as certificates_issued
FROM generate_series(
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE - INTERVAL '1 day',
    INTERVAL '1 day'
) AS date_series(date);

-- Add some constraints and additional indexes for performance
ALTER TABLE course_enrollments ADD CONSTRAINT check_progress_percentage CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
ALTER TABLE lesson_progress ADD CONSTRAINT check_lesson_progress_percentage CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
ALTER TABLE quiz_attempts ADD CONSTRAINT check_quiz_score CHECK (score IS NULL OR (score >= 0 AND score <= 100));
ALTER TABLE course_reviews ADD CONSTRAINT check_rating_range CHECK (rating >= 1 AND rating <= 5);

-- Create composite indexes for common query patterns
CREATE INDEX idx_course_enrollments_user_course ON course_enrollments(user_id, course_id);
CREATE INDEX idx_lesson_progress_user_lesson ON lesson_progress(user_id, lesson_id);
CREATE INDEX idx_quiz_attempts_user_quiz ON quiz_attempts(user_id, quiz_id);
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX idx_analytics_events_user_date ON analytics_events(user_id, created_at);

-- Add some helpful views for common queries
CREATE VIEW active_enrollments AS
SELECT 
    ce.*,
    c.title as course_title,
    c.thumbnail_url,
    u.first_name,
    u.last_name,
    u.email
FROM course_enrollments ce
JOIN courses c ON ce.course_id = c.id
JOIN users u ON ce.user_id = u.id
WHERE ce.status = 'active';

CREATE VIEW course_completion_stats AS
SELECT 
    c.id as course_id,
    c.title,
    COUNT(ce.id) as total_enrollments,
    COUNT(CASE WHEN ce.status = 'completed' THEN 1 END) as completions,
    ROUND(
        COUNT(CASE WHEN ce.status = 'completed' THEN 1 END)::NUMERIC / 
        NULLIF(COUNT(ce.id), 0) * 100, 2
    ) as completion_rate,
    AVG(ce.progress_percentage) as avg_progress
FROM courses c
LEFT JOIN course_enrollments ce ON c.id = ce.course_id
WHERE c.status = 'published'
GROUP BY c.id, c.title;

CREATE VIEW user_learning_stats AS
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.email,
    COUNT(DISTINCT ce.course_id) as enrolled_courses,
    COUNT(DISTINCT CASE WHEN ce.status = 'completed' THEN ce.course_id END) as completed_courses,
    COUNT(DISTINCT lp.lesson_id) as completed_lessons,
    COUNT(DISTINCT qa.quiz_id) as quiz_attempts,
    COALESCE(lt.balance, 0) as token_balance,
    COUNT(DISTINCT cert.id) as certificates_earned
FROM users u
LEFT JOIN course_enrollments ce ON u.id = ce.user_id
LEFT JOIN lesson_progress lp ON u.id = lp.user_id AND lp.status = 'completed'
LEFT JOIN quiz_attempts qa ON u.id = qa.user_id
LEFT JOIN l_tokens lt ON u.id = lt.user_id
LEFT JOIN certificates cert ON u.id = cert.user_id AND cert.status = 'minted'
WHERE u.role = 'student'
GROUP BY u.id, u.first_name, u.last_name, u.email, lt.balance;

-- Add comments to tables for documentation
COMMENT ON TABLE users IS 'Core user accounts for students, instructors, and administrators';
COMMENT ON TABLE courses IS 'Course catalog with metadata, pricing, and instructor information';
COMMENT ON TABLE lessons IS 'Individual lessons within courses, supporting various content types';
COMMENT ON TABLE course_enrollments IS 'Tracks user enrollment and progress in courses';
COMMENT ON TABLE lesson_progress IS 'Detailed progress tracking for individual lessons';
COMMENT ON TABLE l_tokens IS 'Learning token balances for gamification and rewards';
COMMENT ON TABLE certificates IS 'NFT certificates issued upon course completion';
COMMENT ON TABLE notifications IS 'In-app and email notifications for user engagement';
COMMENT ON TABLE analytics_events IS 'Event tracking for user behavior analysis';
COMMENT ON TABLE admin_audit_log IS 'Audit trail for all administrative actions';

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'Database schema creation completed successfully!';
    RAISE NOTICE 'Total tables created: %', (
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    );
    RAISE NOTICE 'Run these migrations in order: 001 -> 002 -> 003 -> 004 -> 005 -> 006 -> 007';
END $$;
