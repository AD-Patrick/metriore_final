-- Finalize Unified Schema Migration
-- This migration ensures the remote database matches the unified schema
-- It only adds missing tables, columns, functions, and policies

-- Create user_channels table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  channel_id TEXT NOT NULL,
  title TEXT,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'connected',
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  uploads_playlist_id TEXT,
  UNIQUE(user_id, channel_id)
);

-- Enable RLS on user_channels if not already enabled
ALTER TABLE public.user_channels ENABLE ROW LEVEL SECURITY;

-- Add missing columns to existing tables if they don't exist
DO $$ 
BEGIN
    -- Add color column to topics if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'topics' 
        AND column_name = 'color'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.topics ADD COLUMN color TEXT DEFAULT '#3b82f6';
    END IF;

    -- Add is_short column to youtube_videos if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'youtube_videos' 
        AND column_name = 'is_short'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.youtube_videos ADD COLUMN is_short BOOLEAN DEFAULT false;
    END IF;

    -- Add auto_link_attempted column to youtube_videos if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'youtube_videos' 
        AND column_name = 'auto_link_attempted'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.youtube_videos ADD COLUMN auto_link_attempted BOOLEAN DEFAULT false;
    END IF;

    -- Add missing columns to youtube_channels if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'youtube_channels' 
        AND column_name = 'thumbnail_url'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.youtube_channels ADD COLUMN thumbnail_url TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'youtube_channels' 
        AND column_name = 'subscriber_count'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.youtube_channels ADD COLUMN subscriber_count BIGINT DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'youtube_channels' 
        AND column_name = 'video_count'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.youtube_channels ADD COLUMN video_count BIGINT DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'youtube_channels' 
        AND column_name = 'view_count'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.youtube_channels ADD COLUMN view_count BIGINT DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'youtube_channels' 
        AND column_name = 'last_synced_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.youtube_channels ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add missing columns to youtube_videos if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'youtube_videos' 
        AND column_name = 'content_video_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.youtube_videos ADD COLUMN content_video_id UUID REFERENCES public.content_videos(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'youtube_videos' 
        AND column_name = 'topic_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.youtube_videos ADD COLUMN topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'youtube_videos' 
        AND column_name = 'tags'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.youtube_videos ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'youtube_videos' 
        AND column_name = 'last_synced_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.youtube_videos ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add missing columns to youtube_settings if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'youtube_settings' 
        AND column_name = 'auto_sync_enabled'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.youtube_settings ADD COLUMN auto_sync_enabled BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'youtube_settings' 
        AND column_name = 'refresh_mode'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.youtube_settings ADD COLUMN refresh_mode TEXT NOT NULL DEFAULT 'auto';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'youtube_settings' 
        AND column_name = 'last_full_sync'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.youtube_settings ADD COLUMN last_full_sync TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create missing indexes
CREATE INDEX IF NOT EXISTS idx_youtube_videos_auto_link_attempted ON youtube_videos(auto_link_attempted);
CREATE INDEX IF NOT EXISTS idx_team_members_account_id ON team_members(account_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_account_id ON youtube_videos(account_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_channel_id ON youtube_videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_content_videos_account_id ON content_videos(account_id);
CREATE INDEX IF NOT EXISTS idx_content_videos_topic_id ON content_videos(topic_id);
CREATE INDEX IF NOT EXISTS idx_topics_account_id ON topics(account_id);

-- Create or replace functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_next_content_video_number(account_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_number INTEGER;
  max_video_number INTEGER;
BEGIN
  -- Get the current max video number
  SELECT COALESCE(MAX(video_number), 0)
  INTO max_video_number
  FROM content_videos 
  WHERE account_id = account_uuid;
  
  -- Use MAX + 1 for next number
  next_number := max_video_number + 1;
  
  RETURN next_number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_content_video_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.video_number IS NULL THEN
    NEW.video_number := public.get_next_content_video_number(NEW.account_id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_personal_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create personal account for new user
  INSERT INTO accounts (user_id, name, is_personal)
  VALUES (NEW.user_id, 'Personal', true)
  ON CONFLICT DO NOTHING;
  
  -- Set the personal account as last used if no other account is set
  UPDATE profiles 
  SET last_used_account_id = (
    SELECT id FROM accounts 
    WHERE user_id = NEW.user_id AND is_personal = true 
    LIMIT 1
  )
  WHERE user_id = NEW.user_id AND last_used_account_id IS NULL;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_team_members_with_profiles(account_uuid uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  role app_role,
  status text,
  invited_at timestamptz,
  invited_by uuid,
  joined_at timestamptz,
  email text,
  full_name text,
  avatar_url text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tm.id,
    tm.user_id,
    tm.role,
    tm.status,
    tm.invited_at,
    tm.invited_by,
    tm.joined_at,
    au.email::text,
    p.full_name,
    p.avatar_url
  FROM team_members tm
  LEFT JOIN profiles p ON p.user_id = tm.user_id
  LEFT JOIN auth.users au ON au.id = tm.user_id
  WHERE tm.account_id = account_uuid
  ORDER BY tm.created_at ASC;
END;
$$;

-- Create or replace triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_accounts_updated_at ON public.accounts;
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_members_updated_at ON public.team_members;
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_topics_updated_at ON public.topics;
CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_content_videos_updated_at ON public.content_videos;
CREATE TRIGGER update_content_videos_updated_at BEFORE UPDATE ON public.content_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_youtube_channels_updated_at ON public.youtube_channels;
CREATE TRIGGER update_youtube_channels_updated_at BEFORE UPDATE ON public.youtube_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_youtube_videos_updated_at ON public.youtube_videos;
CREATE TRIGGER update_youtube_videos_updated_at BEFORE UPDATE ON public.youtube_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_youtube_settings_updated_at ON public.youtube_settings;
CREATE TRIGGER update_youtube_settings_updated_at BEFORE UPDATE ON public.youtube_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS assign_content_video_number_trigger ON public.content_videos;
CREATE TRIGGER assign_content_video_number_trigger BEFORE INSERT ON public.content_videos
  FOR EACH ROW EXECUTE FUNCTION public.assign_content_video_number();

DROP TRIGGER IF EXISTS ensure_personal_account_trigger ON public.profiles;
CREATE TRIGGER ensure_personal_account_trigger AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_personal_account();

-- Create or replace RLS policies for user_channels
DROP POLICY IF EXISTS "Users can manage their channels" ON public.user_channels;
CREATE POLICY "Users can manage their channels" ON public.user_channels
  FOR ALL USING (user_id = auth.uid());

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_team_members_with_profiles(uuid) TO authenticated;

-- Add comment explaining this is the finalized unified schema
COMMENT ON SCHEMA public IS 'Unified schema - finalized and consolidated from all previous migrations';
