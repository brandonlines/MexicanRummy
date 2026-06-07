# Supabase Setup Guide

This guide walks you through setting up the Mexican Rummy Scoring app with Supabase.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up or log in
2. Click "New Project"
3. Fill in the details:
   - **Project name**: `mexican-rummy` (or your preferred name)
   - **Database password**: Create a strong password (save it somewhere safe)
   - **Region**: Choose the region closest to you
4. Wait for the project to be created (2-3 minutes)

## Step 2: Get Your API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL**: Copy this value
   - **Anon/Public Key**: Copy this value
3. Create a `.env` file in the project root (copy from `.env.example`):
   ```
   VITE_SUPABASE_URL=your_project_url_here
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

## Step 3: Create Database Tables

1. In your Supabase project, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire contents of `supabase-setup.sql` from this repo
4. Click **Run** (the play button)
5. Wait for the query to complete successfully

You should now see these tables in the **Table Editor**:
- games
- players
- hand_progress
- hands_reference

## Step 4: Enable Realtime (Optional but Recommended)

1. Go to **Database** → **Replication**
2. Enable replication for these tables:
   - games
   - players
   - hand_progress
3. This allows real-time updates across connected clients

## Step 5: Test the Connection

Run the development server:
```bash
npm run dev
```

The app should now connect to Supabase. You can test by creating a game and seeing if data appears in the Supabase Table Editor.

## Troubleshooting

### "Invalid API Key"
- Check that `.env` variables are correct (copy-paste from Settings → API)
- Ensure the `.env` file is in the project root
- Restart the dev server after adding `.env`

### "Database connection failed"
- Verify the `VITE_SUPABASE_URL` is correct (should be a full URL)
- Check that the database tables were created (go to Table Editor in Supabase)
- Ensure RLS policies are enabled

### "Real-time updates not working"
- Go to Supabase Settings → Replication and enable for the tables you're using
- Refresh the page in your browser

## Next Steps

Once connected, the app will:
1. Allow players to create and join games
2. Track hand progress in real-time
3. Manage scores and game state
4. Sync data across all connected devices

For development/testing, you can:
- Delete games: Go to Table Editor → games → select row → Delete
- Reset hand progress: Table Editor → hand_progress → Delete rows
- View real-time subscriptions: Open browser DevTools Console
