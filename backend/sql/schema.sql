-- ============================================================
-- Harmony Music Player - Complete Database Schema
-- Supabase PostgreSQL
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  bio TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  country TEXT DEFAULT 'US',
  language TEXT DEFAULT 'en',
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
  is_premium BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ARTISTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  bio TEXT,
  image_url TEXT,
  cover_url TEXT,
  country TEXT,
  genre TEXT[],
  verified BOOLEAN DEFAULT FALSE,
  followers_count INTEGER DEFAULT 0,
  monthly_listeners INTEGER DEFAULT 0,
  social_links JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ALBUMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.albums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  cover_url TEXT,
  release_date DATE,
  genre TEXT,
  description TEXT,
  total_tracks INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_trending BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SONGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  album_id UUID REFERENCES public.albums(id) ON DELETE SET NULL,
  audio_url TEXT NOT NULL,
  cover_url TEXT,
  duration INTEGER NOT NULL DEFAULT 0,
  track_number INTEGER,
  genre TEXT,
  year INTEGER,
  lyrics TEXT,
  play_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_trending BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PLAYLISTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  is_collaborative BOOLEAN DEFAULT FALSE,
  total_tracks INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PLAYLIST SONGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.playlist_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(playlist_id, song_id)
);

-- ============================================================
-- FAVORITES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, song_id)
);

-- ============================================================
-- RECENTLY PLAYED TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.recently_played (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ DEFAULT NOW(),
  duration_listened INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- LISTENING HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.listening_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ DEFAULT NOW(),
  duration_listened INTEGER DEFAULT 0,
  device_type TEXT,
  completed BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  volume NUMERIC(3,2) DEFAULT 1.0 CHECK (volume >= 0 AND volume <= 1),
  playback_speed NUMERIC(3,2) DEFAULT 1.0,
  shuffle BOOLEAN DEFAULT FALSE,
  repeat_mode TEXT DEFAULT 'none' CHECK (repeat_mode IN ('none', 'one', 'all')),
  equalizer_preset TEXT DEFAULT 'flat',
  quality TEXT DEFAULT 'high' CHECK (quality IN ('low', 'medium', 'high', 'lossless')),
  autoplay BOOLEAN DEFAULT TRUE,
  crossfade INTEGER DEFAULT 0,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  sleep_timer INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'system')),
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_songs_artist_id ON public.songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_songs_album_id ON public.songs(album_id);
CREATE INDEX IF NOT EXISTS idx_songs_genre ON public.songs(genre);
CREATE INDEX IF NOT EXISTS idx_songs_featured ON public.songs(is_featured);
CREATE INDEX IF NOT EXISTS idx_songs_trending ON public.songs(is_trending);
CREATE INDEX IF NOT EXISTS idx_songs_play_count ON public.songs(play_count DESC);
CREATE INDEX IF NOT EXISTS idx_albums_artist_id ON public.albums(artist_id);
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist_id ON public.playlist_songs(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_song_id ON public.playlist_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_song_id ON public.favorites(song_id);
CREATE INDEX IF NOT EXISTS idx_recently_played_user_id ON public.recently_played(user_id);
CREATE INDEX IF NOT EXISTS idx_recently_played_played_at ON public.recently_played(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_listening_history_user_id ON public.listening_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- ============================================================
-- FULL TEXT SEARCH INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_songs_fts ON public.songs USING GIN(
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(genre, ''))
);
CREATE INDEX IF NOT EXISTS idx_artists_fts ON public.artists USING GIN(
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(bio, ''))
);
CREATE INDEX IF NOT EXISTS idx_albums_fts ON public.albums USING GIN(
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(genre, ''))
);

-- ============================================================
-- TRIGGERS - Updated At
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_artists_updated_at BEFORE UPDATE ON public.artists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_albums_updated_at BEFORE UPDATE ON public.albums
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_songs_updated_at BEFORE UPDATE ON public.songs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_playlists_updated_at BEFORE UPDATE ON public.playlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- TRIGGER - Auto create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  INSERT INTO public.settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER - Update playlist stats
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_playlist_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.playlists
    SET total_tracks = total_tracks + 1,
        total_duration = total_duration + (SELECT duration FROM public.songs WHERE id = NEW.song_id)
    WHERE id = NEW.playlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.playlists
    SET total_tracks = GREATEST(total_tracks - 1, 0),
        total_duration = GREATEST(total_duration - (SELECT COALESCE(duration, 0) FROM public.songs WHERE id = OLD.song_id), 0)
    WHERE id = OLD.playlist_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_playlist_songs_stats
  AFTER INSERT OR DELETE ON public.playlist_songs
  FOR EACH ROW EXECUTE FUNCTION public.update_playlist_stats();

-- ============================================================
-- TRIGGER - Increment song play count
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_song_play_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.songs SET play_count = play_count + 1 WHERE id = NEW.song_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_increment_play_count
  AFTER INSERT ON public.recently_played
  FOR EACH ROW EXECUTE FUNCTION public.increment_song_play_count();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recently_played ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listening_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES - Profiles
-- ============================================================
CREATE POLICY "Profiles: public read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Profiles: owner update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Profiles: owner delete" ON public.profiles FOR DELETE USING (auth.uid() = id);
CREATE POLICY "Profiles: auth insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- RLS POLICIES - Artists & Albums & Songs (public read)
-- ============================================================
CREATE POLICY "Artists: public read" ON public.artists FOR SELECT USING (true);
CREATE POLICY "Albums: public read" ON public.albums FOR SELECT USING (true);
CREATE POLICY "Songs: public read" ON public.songs FOR SELECT USING (is_active = true);

-- ============================================================
-- RLS POLICIES - Playlists
-- ============================================================
CREATE POLICY "Playlists: read own or public" ON public.playlists FOR SELECT
  USING (user_id = auth.uid() OR is_public = true);
CREATE POLICY "Playlists: owner insert" ON public.playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Playlists: owner update" ON public.playlists FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Playlists: owner delete" ON public.playlists FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES - Playlist Songs
-- ============================================================
CREATE POLICY "Playlist songs: read if playlist visible" ON public.playlist_songs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.playlists p
    WHERE p.id = playlist_id AND (p.user_id = auth.uid() OR p.is_public = true)
  ));
CREATE POLICY "Playlist songs: owner insert" ON public.playlist_songs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Playlist songs: owner delete" ON public.playlist_songs FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()
  ));

-- ============================================================
-- RLS POLICIES - Favorites
-- ============================================================
CREATE POLICY "Favorites: owner only" ON public.favorites FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES - Recently Played & Listening History
-- ============================================================
CREATE POLICY "Recently played: owner only" ON public.recently_played FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Listening history: owner only" ON public.listening_history FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES - Settings
-- ============================================================
CREATE POLICY "Settings: owner only" ON public.settings FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES - Notifications
-- ============================================================
CREATE POLICY "Notifications: owner only" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- SEED DATA - Sample Artists
-- ============================================================
INSERT INTO public.artists (name, slug, bio, genre, verified, monthly_listeners) VALUES
  ('The Weeknd', 'the-weeknd', 'Canadian singer, songwriter, and record producer.', ARRAY['R&B', 'Pop'], true, 95000000),
  ('Dua Lipa', 'dua-lipa', 'English-Albanian singer and songwriter.', ARRAY['Pop', 'Dance'], true, 80000000),
  ('Drake', 'drake', 'Canadian rapper, singer, and actor.', ARRAY['Hip-Hop', 'R&B'], true, 90000000),
  ('Taylor Swift', 'taylor-swift', 'American singer-songwriter.', ARRAY['Pop', 'Country'], true, 98000000),
  ('Billie Eilish', 'billie-eilish', 'American singer and songwriter.', ARRAY['Pop', 'Electropop'], true, 75000000)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- STORAGE BUCKETS (run in Supabase dashboard or via API)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('songs', 'songs', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('artists', 'artists', true);

-- Storage RLS policies (run after creating buckets):
-- CREATE POLICY "Public covers read" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
-- CREATE POLICY "Auth covers upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.role() = 'authenticated');
-- CREATE POLICY "Public songs read" ON storage.objects FOR SELECT USING (bucket_id = 'songs');
-- CREATE POLICY "Public avatars read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- CREATE POLICY "Auth avatars upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated' AND auth.uid()::text = (storage.foldername(name))[1]);
