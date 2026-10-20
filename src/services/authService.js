// src/services/authService.js
import crypto from 'node:crypto';
import { db, transaction } from '../db/database.js';
import { config } from '../config.js';

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

export function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

export const authService = {
  // Validate email domain according to configured policy
  validateEmailDomain(email) {
    if (!config.isDomainAllowed(email)) {
      throw new Error(
        `Email không hợp lệ. Hệ thống chỉ chấp nhận các tên miền: ${config.allowedEmailDomains.join(', ')}`
      );
    }
  },

  // Register new student/user via email and password
  register({ email, password, fullName }) {
    if (!email || !password || !fullName) {
      throw new Error('Vui lòng điền đầy đủ email, mật khẩu và họ tên.');
    }

    const cleanEmail = email.trim().toLowerCase();
    this.validateEmailDomain(cleanEmail);

    if (password.length < 6) {
      throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      throw new Error('Email này đã được đăng ký trong hệ thống.');
    }

    const salt = generateSalt();
    const passwordHash = `${salt}:${hashPassword(password, salt)}`;
    const userId = 'usr_' + crypto.randomUUID().slice(0, 12);
    const now = new Date().toISOString();

    // Bootstrap initial owner: strictly check if email matches configured ADMIN_EMAIL
    const isOwnerAdmin = cleanEmail === config.adminEmail;
    const role = isOwnerAdmin ? 'admin' : 'student';

    return transaction(() => {
      // 1. Insert user
      db.prepare(`
        INSERT INTO users (id, email, password_hash, auth_provider, email_verified, role, is_demo, created_at, updated_at)
        VALUES (?, ?, ?, 'local', 1, ?, 0, ?, ?)
      `).run(userId, cleanEmail, passwordHash, role, now, now);

      // 2. Insert initial draft profile (user must complete setup before publishing)
      db.prepare(`
        INSERT INTO profiles (
          user_id, full_name, student_id, class_year, avatar_url, bio, phone, social_link,
          skills, project_interests, desired_role, team_status, is_published, directory_visible,
          show_email, show_phone, show_social, show_strengths, is_demo, created_at, updated_at
        ) VALUES (?, ?, '', '', '', '', '', '', '[]', '[]', '', 'Đang tìm teammate', 0, 1, 0, 0, 1, 1, 0, ?, ?)
      `).run(userId, fullName.trim(), now, now);

      // Audit log if admin bootstrapped
      if (isOwnerAdmin) {
        db.prepare(`
          INSERT INTO admin_audit_logs (id, admin_id, action, details, created_at)
          VALUES (?, ?, 'BOOTSTRAP_ADMIN', ?, ?)
        `).run('log_' + crypto.randomUUID().slice(0, 8), userId, `First owner account bootstrap for email: ${cleanEmail}`, now);
      }

      // 3. Create session
      const session = this.createSession(userId);

      return {
        user: {
          id: userId,
          email: cleanEmail,
          role,
          fullName: fullName.trim(),
          isDemo: 0,
          isPublished: 0
        },
        token: session.token,
        expiresAt: session.expiresAt
      };
    });
  },

  // Authenticate user via email and password
  login({ email, password }) {
    if (!email || !password) {
      throw new Error('Vui lòng nhập email và mật khẩu.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
    if (!user || !user.password_hash) {
      throw new Error('Email hoặc mật khẩu không chính xác.');
    }

    const [salt, storedHash] = user.password_hash.split(':');
    const computedHash = hashPassword(password, salt);

    if (computedHash !== storedHash) {
      throw new Error('Email hoặc mật khẩu không chính xác.');
    }

    // Server-side check: if user matches ADMIN_EMAIL and role is not yet admin, promote securely
    let currentRole = user.role;
    if (cleanEmail === config.adminEmail && currentRole !== 'admin') {
      db.prepare("UPDATE users SET role = 'admin', updated_at = ? WHERE id = ?").run(
        new Date().toISOString(),
        user.id
      );
      currentRole = 'admin';
      db.prepare(`
        INSERT INTO admin_audit_logs (id, admin_id, action, details, created_at)
        VALUES (?, ?, 'PROMOTE_TO_ADMIN', 'Owner email matched ADMIN_EMAIL config', ?)
      `).run('log_' + crypto.randomUUID().slice(0, 8), user.id, new Date().toISOString());
    }

    const profile = db.prepare('SELECT full_name, is_published, avatar_url FROM profiles WHERE user_id = ?').get(user.id);
    const session = this.createSession(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: currentRole,
        fullName: profile ? profile.full_name : '',
        avatarUrl: profile ? profile.avatar_url : '',
        isDemo: user.is_demo,
        isPublished: profile ? profile.is_published : 0
      },
      token: session.token,
      expiresAt: session.expiresAt
    };
  },

  // Google OAuth / Supabase Auth provider login/signup handler
  handleOAuthLogin({ email, fullName, avatarUrl, provider = 'google' }) {
    if (!email) {
      throw new Error('Email từ nhà cung cấp xác thực không được để trống.');
    }

    const cleanEmail = email.trim().toLowerCase();
    this.validateEmailDomain(cleanEmail);

    const now = new Date().toISOString();
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

    if (!user) {
      // Create new user (preventing duplicates: user was not present)
      const userId = 'usr_' + crypto.randomUUID().slice(0, 12);
      const isOwnerAdmin = cleanEmail === config.adminEmail;
      const role = isOwnerAdmin ? 'admin' : 'student';

      transaction(() => {
        db.prepare(`
          INSERT INTO users (id, email, password_hash, auth_provider, email_verified, role, is_demo, created_at, updated_at)
          VALUES (?, ?, NULL, ?, 1, ?, 0, ?, ?)
        `).run(userId, cleanEmail, provider, role, now, now);

        db.prepare(`
          INSERT INTO profiles (
            user_id, full_name, student_id, class_year, avatar_url, bio, phone, social_link,
            skills, project_interests, desired_role, team_status, is_published, directory_visible,
            show_email, show_phone, show_social, show_strengths, is_demo, created_at, updated_at
          ) VALUES (?, ?, '', '', ?, '', '', '', '[]', '[]', '', 'Đang tìm teammate', 0, 1, 0, 0, 1, 1, 0, ?, ?)
        `).run(userId, fullName || cleanEmail.split('@')[0], avatarUrl || '', now, now);

        if (isOwnerAdmin) {
          db.prepare(`
            INSERT INTO admin_audit_logs (id, admin_id, action, details, created_at)
            VALUES (?, ?, 'BOOTSTRAP_ADMIN_OAUTH', ?, ?)
          `).run('log_' + crypto.randomUUID().slice(0, 8), userId, `First owner OAuth bootstrap for email: ${cleanEmail}`, now);
        }
      });

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    } else {
      // Existing user: DO NOT create a new profile! Maintain existing profile
      if (cleanEmail === config.adminEmail && user.role !== 'admin') {
        db.prepare("UPDATE users SET role = 'admin', updated_at = ? WHERE id = ?").run(now, user.id);
        user.role = 'admin';
      }
    }

    const profile = db.prepare('SELECT full_name, is_published, avatar_url FROM profiles WHERE user_id = ?').get(user.id);
    const session = this.createSession(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: profile ? profile.full_name : '',
        avatarUrl: profile ? profile.avatar_url : '',
        isDemo: user.is_demo,
        isPublished: profile ? profile.is_published : 0
      },
      token: session.token,
      expiresAt: session.expiresAt
    };
  },

  // Create persistent session token
  createSession(userId) {
    const token = generateSessionToken();
    const expires = new Date();
    expires.setDate(expires.getDate() + config.sessionDurationDays);
    const expiresAt = expires.toISOString();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(token, userId, expiresAt, now);

    return { token, expiresAt };
  },

  // Verify active session token
  verifySession(token) {
    if (!token) return null;

    const row = db.prepare(`
      SELECT s.token, s.expires_at, u.id, u.email, u.role, u.is_demo, u.email_verified,
             p.full_name, p.avatar_url, p.is_published
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE s.token = ?
    `).get(token);

    if (!row) return null;

    // Check expiration
    if (new Date(row.expires_at) < new Date()) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return null;
    }

    return {
      id: row.id,
      email: row.email,
      role: row.role,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      isDemo: row.is_demo,
      isPublished: row.is_published,
      emailVerified: row.email_verified
    };
  },

  // Invalidate session on sign-out
  logout(token) {
    if (!token) return;
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
};
