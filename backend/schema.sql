-- FruityStory.io production schema
-- PostgreSQL. Run this schema against the database configured by DATABASE_URL.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), username TEXT NOT NULL UNIQUE, email TEXT UNIQUE, password_hash TEXT,
  display_name TEXT NOT NULL DEFAULT '', bio TEXT NOT NULL DEFAULT '', avatar_url TEXT, verified BOOLEAN NOT NULL DEFAULT FALSE,
  followers_count BIGINT NOT NULL DEFAULT 0, following_count BIGINT NOT NULL DEFAULT 0, likes_count BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS follows (follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (follower_id, following_id), CHECK (follower_id <> following_id));
CREATE TABLE IF NOT EXISTS videos (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, video_url TEXT NOT NULL, thumbnail_url TEXT, caption TEXT NOT NULL DEFAULT '', visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','friends','private')), allow_comments BOOLEAN NOT NULL DEFAULT TRUE, allow_duet BOOLEAN NOT NULL DEFAULT TRUE, allow_stitch BOOLEAN NOT NULL DEFAULT TRUE, allow_download BOOLEAN NOT NULL DEFAULT FALSE, views_count BIGINT NOT NULL DEFAULT 0, likes_count BIGINT NOT NULL DEFAULT 0, comments_count BIGINT NOT NULL DEFAULT 0, shares_count BIGINT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS video_hashtags (video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE, hashtag TEXT NOT NULL, PRIMARY KEY (video_id, hashtag));
CREATE TABLE IF NOT EXISTS video_likes (video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (video_id, user_id));
CREATE TABLE IF NOT EXISTS favorites (video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (video_id, user_id));
CREATE TABLE IF NOT EXISTS comments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE, author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, body TEXT NOT NULL, likes_count BIGINT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS stories (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, media_url TEXT NOT NULL, caption TEXT NOT NULL DEFAULT '', expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS playlists (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')), created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS playlist_videos (playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE, video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE, position INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (playlist_id, video_id));
CREATE TABLE IF NOT EXISTS conversations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS conversation_members (conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY (conversation_id, user_id));
CREATE TABLE IF NOT EXISTS messages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, body TEXT NOT NULL DEFAULT '', video_id UUID REFERENCES videos(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS notifications (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, type TEXT NOT NULL, actor_id UUID REFERENCES users(id) ON DELETE SET NULL, video_id UUID REFERENCES videos(id) ON DELETE SET NULL, read_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS ai_jobs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, provider TEXT NOT NULL, prompt TEXT NOT NULL, duration INTEGER, aspect_ratio TEXT, status TEXT NOT NULL DEFAULT 'queued', provider_job_id TEXT, output_url TEXT, error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS credit_ledger (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, amount BIGINT NOT NULL, type TEXT NOT NULL, reference TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_reference_unique ON credit_ledger(reference) WHERE reference IS NOT NULL;
CREATE TABLE IF NOT EXISTS promote_campaigns (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE, objective TEXT NOT NULL, audience JSONB NOT NULL DEFAULT '{}'::jsonb, budget NUMERIC(12,2) NOT NULL, duration_days INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', metrics JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL, stripe_subscription_id TEXT NOT NULL UNIQUE, stripe_price_id TEXT NOT NULL,
  plan_id TEXT NOT NULL CHECK (plan_id IN ('standard','premium','pro','ultra_pro')), status TEXT NOT NULL,
  current_period_end TIMESTAMPTZ, cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS subscriptions_customer_idx ON subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS videos_created_idx ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS videos_author_idx ON videos(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS comments_video_idx ON comments(video_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_jobs_user_idx ON ai_jobs(user_id, created_at DESC);
