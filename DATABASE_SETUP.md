# TrackPay Database Setup Guide

This guide will help you set up the Supabase database for TrackPay and configure your environment.

## Prerequisites

- A Supabase account (free tier is sufficient for development)
- Access to your Supabase project dashboard
- Basic understanding of SQL (optional - we provide all scripts)

## Step 1: Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose an organization or create one
4. Enter project details:
   - **Name**: `TrackPay` (or your preferred name)
   - **Database Password**: Create a secure password (save this!)
   - **Region**: Choose closest to your location
5. Click "Create new project"
6. Wait for project to be provisioned (2-3 minutes)

## Step 2: Get API Credentials

1. In your Supabase project dashboard, go to **Settings > API**
2. Copy the following values:
   - **Project URL** (looks like: `https://abcdefg.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`)

## Step 3: Configure Environment Variables

1. Open the `.env` file in your TrackPay project root
2. Replace the placeholder values with your actual Supabase credentials:

```bash
# TrackPay Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# App Configuration
EXPO_PUBLIC_APP_NAME=TrackPay
EXPO_PUBLIC_ENV=development
```

⚠️ **Security Note**: Never commit the `.env` file to version control. It's already in `.gitignore`.

## Step 4: Execute Database Schema

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy the entire contents of `database/schema.sql` from your project
4. Paste it into the SQL editor
5. Click **"Run"** to execute the schema

The script will create:
- All necessary tables (`trackpay_users`, `trackpay_sessions`, etc.)
- Proper relationships and constraints
- Row Level Security (RLS) policies
- Indexes for performance
- Helpful views for data aggregation

## Step 5: Verify Database Setup

After running the schema, you should see these tables in your **Table Editor**:

- ✅ `trackpay_users` - Users (providers and clients)
- ✅ `trackpay_relationships` - Provider-client associations
- ✅ `trackpay_sessions` - Work sessions
- ✅ `trackpay_payments` - Payment records
- ✅ `trackpay_requests` - Payment requests
- ✅ `trackpay_activities` - Activity feed items

## Step 6: Enable Real-time (Optional)

1. Go to **Database > Replication**
2. Enable replication for these tables:
   - `trackpay_sessions`
   - `trackpay_payments`
   - `trackpay_requests`
   - `trackpay_activities`

This enables real-time updates across devices.

## Step 7: Test Connection

1. Start your TrackPay app:
   ```bash
   npm run web
   ```
2. Check the console for connection messages
3. If you see errors, verify your environment variables are correct

## Authentication Setup (Future Phase)

Currently, TrackPay uses a simple account selection. In the next phase, we'll implement proper authentication:

1. Go to **Authentication > Settings**
2. Configure email authentication
3. Set up email templates
4. Configure redirect URLs for your app

## Troubleshooting

### Common Issues:

**Environment Variables Not Loading**
- Ensure `.env` file is in project root
- Restart your development server
- Check for typos in variable names

**Database Connection Failed**
- Verify Supabase URL and API keys
- Check your internet connection
- Ensure Supabase project is active (not paused)

**RLS Policy Errors**
- RLS policies will be configured when authentication is implemented
- For now, you may need to temporarily disable RLS for testing

**Schema Execution Errors**
- Ensure you're running the script in the correct Supabase project
- Check for any SQL syntax errors in the console
- Try running sections of the schema individually

### Getting Help:

1. Check Supabase documentation: https://supabase.com/docs
2. Review error messages in browser console
3. Check network tab for failed requests
4. Verify all environment variables are set correctly

## Next Steps

After successful database setup:

1. Test the hybrid storage service
2. Migrate existing AsyncStorage data
3. Implement authentication
4. Add real-time features
5. Enhance UI/UX

## Security Considerations

- **Never expose service_role key** in client-side code
- **Use anon key** for client operations
- **Enable RLS** on all tables (already configured in schema)
- **Regularly rotate API keys** for production
- **Use environment-specific databases** (dev/staging/prod)

## Database Backup

To backup your database:

1. Go to **Settings > Database**
2. Download a backup
3. Store securely and regularly

## Schema Updates

When updating the schema:

1. Always backup before making changes
2. Test changes in development first
3. Use migrations for production updates
4. Update this documentation as needed

---

**Need help?** Check the console logs, Supabase dashboard, or review the setup steps above.