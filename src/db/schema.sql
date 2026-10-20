-- Schema for Know Your Strengths Platform
-- Supports strict isolation of demo data (is_demo = 1)
-- Supports granular privacy visibility controls

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT,
  auth_provider TEXT DEFAULT 'local',
  email_verified INTEGER DEFAULT 0,
  role TEXT DEFAULT 'student',
  is_demo INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_demo ON users(is_demo);

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  student_id TEXT,
  class_year TEXT,
  avatar_url TEXT,
  bio TEXT,
  phone TEXT,
  social_link TEXT,
  skills TEXT DEFAULT '[]',
  project_interests TEXT DEFAULT '[]',
  desired_role TEXT,
  team_status TEXT DEFAULT 'Đang tìm teammate',
  is_published INTEGER DEFAULT 0,
  directory_visible INTEGER DEFAULT 1,
  show_email INTEGER DEFAULT 0,
  show_phone INTEGER DEFAULT 0,
  show_social INTEGER DEFAULT 1,
  show_strengths INTEGER DEFAULT 1,
  is_demo INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_published ON profiles(is_published, directory_visible);
CREATE INDEX IF NOT EXISTS idx_profiles_team_status ON profiles(team_status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_demo ON profiles(is_demo);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  communication_score INTEGER NOT NULL,
  creativity_score INTEGER NOT NULL,
  research_score INTEGER NOT NULL,
  leadership_score INTEGER NOT NULL,
  problem_solving_score INTEGER NOT NULL,
  total_score INTEGER NOT NULL,
  primary_strength TEXT NOT NULL,
  secondary_strength TEXT NOT NULL,
  answers_json TEXT NOT NULL, -- Private: individual answers to the 15 questions
  is_demo INTEGER DEFAULT 0,
  completed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_primary ON assessments(primary_strength);
CREATE INDEX IF NOT EXISTS idx_assessments_is_demo ON assessments(is_demo);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS workshop_teams (
  id TEXT PRIMARY KEY,
  team_number INTEGER NOT NULL,
  team_name TEXT NOT NULL,
  status TEXT DEFAULT 'draft', -- 'draft' or 'confirmed'
  diversity_score INTEGER DEFAULT 0,
  missing_strengths TEXT DEFAULT '[]',
  repeated_strengths TEXT DEFAULT '[]',
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workshop_teams_status ON workshop_teams(status);

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES workshop_teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_role TEXT,
  is_manual INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  looking_for_strengths TEXT DEFAULT '[]',
  likes_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);

CREATE TABLE IF NOT EXISTS connection_requests (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conn_receiver ON connection_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_conn_sender ON connection_requests(sender_id);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_logs(created_at DESC);
