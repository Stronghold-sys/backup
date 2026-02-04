CREATE TABLE IF NOT EXISTS users_adb995ba (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  avatar TEXT,
  phone TEXT,
  addresses JSONB DEFAULT '[]'::jsonb,
  access_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users_adb995ba(email);
CREATE INDEX IF NOT EXISTS idx_users_access_token ON users_adb995ba(access_token);
CREATE INDEX IF NOT EXISTS idx_users_role ON users_adb995ba(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users_adb995ba(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users_adb995ba(created_at DESC);

-- Add table comment
COMMENT ON TABLE users_adb995ba IS 'MarketHub users table - stores all user accounts with email verification';

-- Add column comments
COMMENT ON COLUMN users_adb995ba.id IS 'Unique user ID (UUID format)';
COMMENT ON COLUMN users_adb995ba.email IS 'User email address (unique, used for login)';
COMMENT ON COLUMN users_adb995ba.password IS 'Hashed password (SHA-256)';
COMMENT ON COLUMN users_adb995ba.name IS 'User full name';
COMMENT ON COLUMN users_adb995ba.role IS 'User role: user or admin';
COMMENT ON COLUMN users_adb995ba.status IS 'Account status: active, suspended, or banned';
COMMENT ON COLUMN users_adb995ba.avatar IS 'Profile photo URL (nullable)';
COMMENT ON COLUMN users_adb995ba.phone IS 'Phone number (nullable)';
COMMENT ON COLUMN users_adb995ba.addresses IS 'Array of shipping addresses in JSONB format';
COMMENT ON COLUMN users_adb995ba.access_token IS 'Session access token (nullable)';
COMMENT ON COLUMN users_adb995ba.created_at IS 'Account creation timestamp';
COMMENT ON COLUMN users_adb995ba.updated_at IS 'Last update timestamp';

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users_adb995ba;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users_adb995ba
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify table created successfully
SELECT 
  'users_adb995ba table created successfully! 🎉' as message,
  COUNT(*) as existing_users
FROM users_adb995ba;

-- Show table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users_adb995ba'
ORDER BY ordinal_position;
