-- TrackPay Authentication Integration Migration
-- This script adds authentication support to the existing trackpay_users table

-- Step 1: Add auth_user_id column to link with Supabase auth.users
ALTER TABLE trackpay_users
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Add display_name column for user profiles
ALTER TABLE trackpay_users
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Step 3: Create index for faster auth_user_id lookups
CREATE INDEX IF NOT EXISTS idx_trackpay_users_auth_user_id
ON trackpay_users(auth_user_id);

-- Step 4: Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_trackpay_users_email
ON trackpay_users(email);

-- Step 5: Add Row Level Security (RLS) policies
ALTER TABLE trackpay_users ENABLE ROW LEVEL SECURITY;

-- Step 6: Create policy for users to see their own data
CREATE POLICY "Users can view their own profile" ON trackpay_users
    FOR SELECT USING (auth.uid() = auth_user_id);

-- Step 7: Create policy for users to update their own data
CREATE POLICY "Users can update their own profile" ON trackpay_users
    FOR UPDATE USING (auth.uid() = auth_user_id);

-- Step 8: Create policy for users to insert their own data
CREATE POLICY "Users can insert their own profile" ON trackpay_users
    FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- Step 9: Add similar RLS for sessions (users can only see their own sessions)
ALTER TABLE trackpay_sessions ENABLE ROW LEVEL SECURITY;

-- Step 10: Sessions policies - users can only see sessions where they are the provider
CREATE POLICY "Users can view their own sessions" ON trackpay_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trackpay_users
            WHERE trackpay_users.id = trackpay_sessions.provider_id
            AND trackpay_users.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own sessions" ON trackpay_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM trackpay_users
            WHERE trackpay_users.id = trackpay_sessions.provider_id
            AND trackpay_users.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own sessions" ON trackpay_sessions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM trackpay_users
            WHERE trackpay_users.id = trackpay_sessions.provider_id
            AND trackpay_users.auth_user_id = auth.uid()
        )
    );

-- Step 11: Add RLS for payments
ALTER TABLE trackpay_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments" ON trackpay_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trackpay_users
            WHERE trackpay_users.id = trackpay_payments.provider_id
            AND trackpay_users.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own payments" ON trackpay_payments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM trackpay_users
            WHERE trackpay_users.id = trackpay_payments.provider_id
            AND trackpay_users.auth_user_id = auth.uid()
        )
    );

-- Step 12: Add RLS for activities
ALTER TABLE trackpay_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activities" ON trackpay_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trackpay_users
            WHERE trackpay_users.id = trackpay_activities.provider_id
            AND trackpay_users.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own activities" ON trackpay_activities
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM trackpay_users
            WHERE trackpay_users.id = trackpay_activities.provider_id
            AND trackpay_users.auth_user_id = auth.uid()
        )
    );

-- Step 13: Create a function to automatically set display_name from email
CREATE OR REPLACE FUNCTION set_display_name_from_email()
RETURNS TRIGGER AS $$
BEGIN
    -- If display_name is not provided, extract from email
    IF NEW.display_name IS NULL OR NEW.display_name = '' THEN
        NEW.display_name := SPLIT_PART(NEW.email, '@', 1);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 14: Create trigger to auto-set display_name
CREATE TRIGGER trigger_set_display_name_from_email
    BEFORE INSERT OR UPDATE ON trackpay_users
    FOR EACH ROW
    EXECUTE FUNCTION set_display_name_from_email();

-- Step 15: Migrate existing users (optional - for development/testing)
-- This would need to be adapted based on your specific needs
-- UPDATE trackpay_users SET display_name = SPLIT_PART(email, '@', 1) WHERE display_name IS NULL;

-- Step 16: Create function to handle user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new user signs up, create their profile in trackpay_users
    -- This would be triggered by auth.users inserts
    -- Note: This is just an example - you might want to handle this in your app instead
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: To create a trigger on auth.users, you would need to run:
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION handle_new_user();
-- However, this might require additional permissions in Supabase.

-- Step 17: Grant necessary permissions (if needed)
-- GRANT USAGE ON SCHEMA auth TO authenticated;
-- GRANT SELECT ON auth.users TO authenticated;

COMMENT ON COLUMN trackpay_users.auth_user_id IS 'Links to Supabase auth.users.id for authentication';
COMMENT ON COLUMN trackpay_users.display_name IS 'User display name for the profile';

-- Migration complete
SELECT 'TrackPay authentication migration completed successfully!' AS status;