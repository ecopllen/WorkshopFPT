// src/server.js
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { db } from './db/database.js';
import { authService } from './services/authService.js';
import { privacyService } from './services/privacyService.js';
import { workshopService } from './services/workshopService.js';
import { TeamGenerator } from './services/teamGenerator.js';
import { QUESTIONS, STRENGTH_CATEGORIES, calculateStrengthResult } from './data/questions.js';
import { seedDemoData } from './db/seed_demo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Parse JSON request body helper
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // Guard against huge payload
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Cookie helper
function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (!rc) return list;
  rc.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });
  return list;
}

// Send JSON response helper
function sendJson(res, statusCode, data, headers = {}) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(json);
}

// Extract auth token from Authorization header or Cookie
function extractToken(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req);
  return cookies.session_token || null;
}

// Global server instance
export const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Helper for authentication check
  const token = extractToken(req);
  const currentUser = authService.verifySession(token);

  // Require Auth guard
  function requireAuth() {
    if (!currentUser) {
      sendJson(res, 401, { error: 'Vui lòng đăng nhập để thực hiện chức năng này.' });
      return false;
    }
    return true;
  }

  // Require Admin guard
  function requireAdmin() {
    if (!currentUser || currentUser.role !== 'admin') {
      sendJson(res, 403, { error: 'Truy cập bị từ chối. Chỉ dành riêng cho Quản trị viên dự án.' });
      return false;
    }
    return true;
  }

  try {
    // ----------------------------------------------------
    // API ROUTES
    // ----------------------------------------------------

    // Auth: Configuration info (allowed domains, Google/Supabase status)
    if (pathname === '/api/auth/config' && method === 'GET') {
      return sendJson(res, 200, {
        allowedEmailDomains: config.allowedEmailDomains,
        adminEmail: config.adminEmail,
        hasGoogleOAuth: Boolean(config.google.clientId),
        hasSupabase: Boolean(config.supabase.url)
      });
    }

    // Auth: Register (email & password)
    if (pathname === '/api/auth/register' && method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = authService.register(body);
        return sendJson(res, 201, result, {
          'Set-Cookie': `session_token=${result.token}; HttpOnly; Path=/; Max-Age=${7 * 86400}; SameSite=Lax`
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // Auth: Login (email & password)
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = authService.login(body);
        return sendJson(res, 200, result, {
          'Set-Cookie': `session_token=${result.token}; HttpOnly; Path=/; Max-Age=${7 * 86400}; SameSite=Lax`
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // Auth: Google OAuth / Supabase Auth provider endpoint
    if (pathname === '/api/auth/google' && method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = authService.handleOAuthLogin({
          email: body.email,
          fullName: body.fullName,
          avatarUrl: body.avatarUrl,
          provider: 'google'
        });
        return sendJson(res, 200, result, {
          'Set-Cookie': `session_token=${result.token}; HttpOnly; Path=/; Max-Age=${7 * 86400}; SameSite=Lax`
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // Auth: Logout
    if (pathname === '/api/auth/logout' && method === 'POST') {
      if (token) {
        authService.logout(token);
      }
      return sendJson(res, 200, { success: true }, {
        'Set-Cookie': 'session_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax'
      });
    }

    // Auth: Current authenticated user details
    if (pathname === '/api/auth/me' && method === 'GET') {
      if (!currentUser) {
        return sendJson(res, 200, { user: null });
      }

      const profileRow = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(currentUser.id);
      const assessRow = db.prepare('SELECT * FROM assessments WHERE user_id = ? ORDER BY completed_at DESC LIMIT 1').get(currentUser.id);
      const fullProfile = privacyService.sanitizeProfile(profileRow, assessRow, currentUser.id, currentUser.role === 'admin');

      return sendJson(res, 200, {
        user: {
          id: currentUser.id,
          email: currentUser.email,
          role: currentUser.role,
          fullName: currentUser.fullName,
          avatarUrl: currentUser.avatarUrl,
          isDemo: currentUser.isDemo,
          isPublished: currentUser.isPublished,
          profile: fullProfile
        }
      });
    }

    // Profile: Get own profile
    if (pathname === '/api/profile' && method === 'GET') {
      if (!requireAuth()) return;
      const profileRow = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(currentUser.id);
      const assessRow = db.prepare('SELECT * FROM assessments WHERE user_id = ? ORDER BY completed_at DESC LIMIT 1').get(currentUser.id);
      const data = privacyService.sanitizeProfile(profileRow, assessRow, currentUser.id, currentUser.role === 'admin');
      return sendJson(res, 200, data);
    }

    // Profile: Update own profile
    if (pathname === '/api/profile' && method === 'PUT') {
      if (!requireAuth()) return;
      const body = await parseBody(req);
      const now = new Date().toISOString();

      db.prepare(`
        UPDATE profiles SET
          full_name = COALESCE(?, full_name),
          student_id = COALESCE(?, student_id),
          class_year = COALESCE(?, class_year),
          avatar_url = COALESCE(?, avatar_url),
          bio = COALESCE(?, bio),
          phone = COALESCE(?, phone),
          social_link = COALESCE(?, social_link),
          skills = COALESCE(?, skills),
          project_interests = COALESCE(?, project_interests),
          desired_role = COALESCE(?, desired_role),
          team_status = COALESCE(?, team_status),
          updated_at = ?
        WHERE user_id = ?
      `).run(
        body.fullName ? body.fullName.trim() : null,
        body.studentId !== undefined ? body.studentId : null,
        body.classYear !== undefined ? body.classYear : null,
        body.avatarUrl !== undefined ? body.avatarUrl : null,
        body.bio !== undefined ? body.bio : null,
        body.phone !== undefined ? body.phone : null,
        body.socialLink !== undefined ? body.socialLink : null,
        body.skills ? JSON.stringify(body.skills) : null,
        body.projectInterests ? JSON.stringify(body.projectInterests) : null,
        body.desiredRole !== undefined ? body.desiredRole : null,
        body.teamStatus !== undefined ? body.teamStatus : null,
        now,
        currentUser.id
      );

      return sendJson(res, 200, { success: true, message: 'Cập nhật hồ sơ thành công.' });
    }

    // Profile: Update privacy visibility settings and publish status
    if (pathname === '/api/profile/privacy' && method === 'PUT') {
      if (!requireAuth()) return;
      const body = await parseBody(req);
      const now = new Date().toISOString();

      db.prepare(`
        UPDATE profiles SET
          is_published = COALESCE(?, is_published),
          directory_visible = COALESCE(?, directory_visible),
          show_email = COALESCE(?, show_email),
          show_phone = COALESCE(?, show_phone),
          show_social = COALESCE(?, show_social),
          show_strengths = COALESCE(?, show_strengths),
          updated_at = ?
        WHERE user_id = ?
      `).run(
        body.isPublished !== undefined ? (body.isPublished ? 1 : 0) : null,
        body.directoryVisible !== undefined ? (body.directoryVisible ? 1 : 0) : null,
        body.showEmail !== undefined ? (body.showEmail ? 1 : 0) : null,
        body.showPhone !== undefined ? (body.showPhone ? 1 : 0) : null,
        body.showSocial !== undefined ? (body.showSocial ? 1 : 0) : null,
        body.showStrengths !== undefined ? (body.showStrengths ? 1 : 0) : null,
        now,
        currentUser.id
      );

      return sendJson(res, 200, { success: true, message: 'Cài đặt quyền riêng tư đã được lưu.' });
    }

    // Profile: View specific student profile by ID (Strict privacy applied!)
    if (pathname.startsWith('/api/profile/') && method === 'GET') {
      if (!requireAuth()) return;
      const targetUserId = pathname.split('/')[3];
      const profileRow = db.prepare(`
        SELECT p.*, u.email
        FROM profiles p
        JOIN users u ON u.id = p.user_id
        WHERE p.user_id = ?
      `).get(targetUserId);

      if (!profileRow) {
        return sendJson(res, 404, { error: 'Không tìm thấy hồ sơ người dùng.' });
      }

      const assessRow = db.prepare('SELECT * FROM assessments WHERE user_id = ? ORDER BY completed_at DESC LIMIT 1').get(targetUserId);
      const sanitized = privacyService.sanitizeProfile(profileRow, assessRow, currentUser.id, currentUser.role === 'admin');

      if (!sanitized) {
        return sendJson(res, 404, { error: 'Hồ sơ này không được công khai trong danh bạ.' });
      }

      return sendJson(res, 200, sanitized);
    }

    // Assessment: Get 15 situational questions
    if (pathname === '/api/assessment/questions' && method === 'GET') {
      // Return questions with options (strip out the answer key strength from options for integrity!)
      const publicQuestions = QUESTIONS.map(q => ({
        id: q.id,
        title: q.title,
        scenario: q.scenario,
        options: q.options.map(opt => ({
          id: opt.id,
          text: opt.text
        }))
      }));
      return sendJson(res, 200, { questions: publicQuestions, categories: STRENGTH_CATEGORIES });
    }

    // Assessment: Submit 15 answers (Requires Auth)
    if (pathname === '/api/assessment/submit' && method === 'POST') {
      if (!requireAuth()) return;
      const body = await parseBody(req);
      const answers = body.answers; // { [questionId]: optionId } or [{ questionId, optionId }]

      if (!answers || Object.keys(answers).length !== 15) {
        return sendJson(res, 400, { error: 'Vui lòng hoàn thành đầy đủ 15 câu hỏi của bài Mini Test.' });
      }

      // Map chosen option ID back to strength key securely on the server
      const questionMap = new Map(QUESTIONS.map(q => [q.id, q]));
      const resolvedAnswers = [];

      for (let i = 1; i <= 15; i++) {
        const q = questionMap.get(i);
        const chosenOptionId = Array.isArray(answers)
          ? answers.find(a => a.questionId === i)?.optionId
          : answers[i];

        const opt = q.options.find(o => o.id === chosenOptionId);
        if (!opt) {
          return sendJson(res, 400, { error: `Câu hỏi số ${i} chưa có câu trả lời hợp lệ.` });
        }

        resolvedAnswers.push({
          questionId: i,
          optionId: chosenOptionId,
          strength: opt.strength
        });
      }

      const result = calculateStrengthResult(resolvedAnswers);
      const now = new Date().toISOString();
      const assessId = 'ass_' + crypto.randomUUID().slice(0, 12);

      // Save assessment with private answers_json
      db.prepare(`
        INSERT INTO assessments (
          id, user_id, communication_score, creativity_score, research_score,
          leadership_score, problem_solving_score, total_score, primary_strength,
          secondary_strength, answers_json, is_demo, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `).run(
        assessId,
        currentUser.id,
        result.scores.Communication,
        result.scores.Creativity,
        result.scores.Research,
        result.scores.Leadership,
        result.scores['Problem-solving'],
        result.total,
        result.primaryStrength,
        result.secondaryStrength,
        JSON.stringify(resolvedAnswers),
        now
      );

      // Update profile desired role suggestion if not yet set
      const profile = db.prepare('SELECT desired_role FROM profiles WHERE user_id = ?').get(currentUser.id);
      if (profile && !profile.desired_role) {
        const roleVi = STRENGTH_CATEGORIES[result.primaryStrength]?.role || 'Member';
        db.prepare('UPDATE profiles SET desired_role = ?, updated_at = ? WHERE user_id = ?').run(roleVi, now, currentUser.id);
      }

      return sendJson(res, 201, {
        id: assessId,
        scores: result.scores,
        totalScore: result.total,
        primaryStrength: result.primaryStrength,
        secondaryStrength: result.secondaryStrength,
        primaryCategory: STRENGTH_CATEGORIES[result.primaryStrength],
        secondaryCategory: STRENGTH_CATEGORIES[result.secondaryStrength],
        completedAt: now
      });
    }

    // Teammate Directory: Browse and search peers (Requires Auth)
    if (pathname === '/api/directory' && method === 'GET') {
      if (!requireAuth()) return;
      const strength = parsedUrl.searchParams.get('strength') || null;
      const teamStatus = parsedUrl.searchParams.get('teamStatus') || null;
      const classYear = parsedUrl.searchParams.get('classYear') || null;
      const search = parsedUrl.searchParams.get('search') || null;
      const includeDemo = parsedUrl.searchParams.get('includeDemo') === 'true';

      const directory = privacyService.getTeammateDirectory({
        viewerId: currentUser.id,
        isAdmin: currentUser.role === 'admin',
        includeDemo,
        strength,
        teamStatus,
        classYear,
        search
      });

      return sendJson(res, 200, {
        directory,
        total: directory.length,
        categories: STRENGTH_CATEGORIES
      });
    }

    // Community Board: Get posts
    if (pathname === '/api/community/posts' && method === 'GET') {
      const posts = db.prepare(`
        SELECT p.*, pr.full_name as author_name, pr.avatar_url as author_avatar,
               pr.class_year as author_class,
               a.primary_strength as author_primary_strength,
               u.is_demo as author_is_demo,
               (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count,
               (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) as user_liked
        FROM community_posts p
        JOIN users u ON u.id = p.author_id
        JOIN profiles pr ON pr.user_id = p.author_id
        LEFT JOIN assessments a ON a.user_id = p.author_id
        ORDER BY p.created_at DESC
      `).all(currentUser ? currentUser.id : null);

      return sendJson(res, 200, {
        posts: posts.map(p => ({
          ...p,
          looking_for_strengths: JSON.parse(p.looking_for_strengths || '[]'),
          user_liked: Boolean(p.user_liked),
          author_is_demo: Boolean(p.author_is_demo)
        }))
      });
    }

    // Community Board: Create post (Requires Auth)
    if (pathname === '/api/community/posts' && method === 'POST') {
      if (!requireAuth()) return;
      const body = await parseBody(req);
      if (!body.title || !body.content) {
        return sendJson(res, 400, { error: 'Tiêu đề và nội dung bài viết không được để trống.' });
      }

      const postId = 'post_' + crypto.randomUUID().slice(0, 10);
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO community_posts (id, author_id, title, content, looking_for_strengths, likes_count, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?)
      `).run(
        postId,
        currentUser.id,
        body.title.trim(),
        body.content.trim(),
        JSON.stringify(body.lookingForStrengths || []),
        now
      );

      return sendJson(res, 201, { success: true, id: postId });
    }

    // Community Board: Like post (Requires Auth)
    if (pathname.startsWith('/api/community/posts/') && pathname.endsWith('/like') && method === 'POST') {
      if (!requireAuth()) return;
      const postId = pathname.split('/')[4];
      const existing = db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(postId, currentUser.id);

      if (existing) {
        db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').run(postId, currentUser.id);
        db.prepare('UPDATE community_posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(postId);
        return sendJson(res, 200, { liked: false });
      } else {
        db.prepare('INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)').run(postId, currentUser.id, new Date().toISOString());
        db.prepare('UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = ?').run(postId);
        return sendJson(res, 200, { liked: true });
      }
    }

    // Connection Requests: Send invite (Requires Auth)
    if (pathname === '/api/connections/request' && method === 'POST') {
      if (!requireAuth()) return;
      const body = await parseBody(req);
      if (!body.receiverId) {
        return sendJson(res, 400, { error: 'Người nhận lời mời không hợp lệ.' });
      }
      if (body.receiverId === currentUser.id) {
        return sendJson(res, 400, { error: 'Bạn không thể gửi lời mời cho chính mình.' });
      }

      const existing = db.prepare('SELECT id FROM connection_requests WHERE sender_id = ? AND receiver_id = ? AND status = "pending"').get(currentUser.id, body.receiverId);
      if (existing) {
        return sendJson(res, 400, { error: 'Bạn đã gửi lời mời cho bạn này rồi.' });
      }

      const connId = 'conn_' + crypto.randomUUID().slice(0, 10);
      db.prepare(`
        INSERT INTO connection_requests (id, sender_id, receiver_id, message, status, created_at)
        VALUES (?, ?, ?, ?, 'pending', ?)
      `).run(connId, currentUser.id, body.receiverId, body.message || 'Mình muốn kết nối làm teammate đồ án!', new Date().toISOString());

      return sendJson(res, 201, { success: true, message: 'Đã gửi lời mời kết nối thành công!' });
    }

    // Connection Requests: List my requests (incoming & outgoing)
    if (pathname === '/api/connections' && method === 'GET') {
      if (!requireAuth()) return;
      const incoming = db.prepare(`
        SELECT c.*, p.full_name as sender_name, p.avatar_url as sender_avatar,
               a.primary_strength as sender_primary_strength, a.secondary_strength as sender_secondary_strength
        FROM connection_requests c
        JOIN profiles p ON p.user_id = c.sender_id
        LEFT JOIN assessments a ON a.user_id = c.sender_id
        WHERE c.receiver_id = ?
        ORDER BY c.created_at DESC
      `).all(currentUser.id);

      const outgoing = db.prepare(`
        SELECT c.*, p.full_name as receiver_name, p.avatar_url as receiver_avatar,
               a.primary_strength as receiver_primary_strength
        FROM connection_requests c
        JOIN profiles p ON p.user_id = c.receiver_id
        LEFT JOIN assessments a ON a.user_id = c.receiver_id
        WHERE c.sender_id = ?
        ORDER BY c.created_at DESC
      `).all(currentUser.id);

      return sendJson(res, 200, { incoming, outgoing });
    }

    // ----------------------------------------------------
    // ADMIN ENDPOINTS (Strict Server-Side Authorization Guarded)
    // ----------------------------------------------------

    // Admin: Metrics & Overview
    if (pathname === '/api/admin/metrics' && method === 'GET') {
      if (!requireAdmin()) return;
      const includeDemo = parsedUrl.searchParams.get('includeDemo') === 'true';
      const metrics = workshopService.getDashboardMetrics({ includeDemo });
      return sendJson(res, 200, metrics);
    }

    // Admin: Participant Table
    if (pathname === '/api/admin/participants' && method === 'GET') {
      if (!requireAdmin()) return;
      const includeDemo = parsedUrl.searchParams.get('includeDemo') === 'true';
      const participants = workshopService.getEligibleParticipants({ includeDemo });
      return sendJson(res, 200, { participants, total: participants.length });
    }

    // Admin: Generate Draft Teams ("Random nhóm" action)
    if (pathname === '/api/admin/teams/generate' && method === 'POST') {
      if (!requireAdmin()) return;
      const body = await parseBody(req);
      const includeDemo = Boolean(body.includeDemo);
      const teamCount = body.teamCount ? parseInt(body.teamCount, 10) : 6;
      const targetTeamSize = body.targetTeamSize ? parseInt(body.targetTeamSize, 10) : 5;

      const proposal = workshopService.generateDraftTeams({
        includeDemo,
        teamCount,
        targetTeamSize
      });

      return sendJson(res, 200, proposal);
    }

    // Admin: Manually Reassign a Member between Draft Teams
    if (pathname === '/api/admin/teams/reassign' && method === 'POST') {
      if (!requireAdmin()) return;
      const body = await parseBody(req);
      const { teams, userId, targetTeamNumber } = body;

      if (!teams || !userId || !targetTeamNumber) {
        return sendJson(res, 400, { error: 'Thiếu thông tin điều chuyển thành viên.' });
      }

      try {
        const result = TeamGenerator.reassignMember(teams, userId, targetTeamNumber);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // Admin: Confirm and Save Teams ("Xác nhận và lưu nhóm" action)
    if (pathname === '/api/admin/teams/confirm' && method === 'POST') {
      if (!requireAdmin()) return;
      const body = await parseBody(req);
      const { teams } = body;

      try {
        const result = workshopService.saveConfirmedTeams({
          teams,
          adminUserId: currentUser.id
        });
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // Admin: Get Confirmed Teams
    if (pathname === '/api/admin/teams/confirmed' && method === 'GET') {
      if (!requireAdmin()) return;
      const confirmed = workshopService.getConfirmedTeams();
      return sendJson(res, 200, { teams: confirmed, totalTeams: confirmed.length });
    }

    // Admin: Export workshop data (CSV / JSON)
    if (pathname === '/api/admin/export' && method === 'GET') {
      if (!requireAdmin()) return;
      const includeDemo = parsedUrl.searchParams.get('includeDemo') === 'true';
      const format = parsedUrl.searchParams.get('format') || 'json';
      const participants = workshopService.getEligibleParticipants({ includeDemo });

      if (format === 'csv') {
        let csv = 'User ID,Full Name,Student ID,Class/Year,Email,Primary Strength,Secondary Strength,Communication,Creativity,Research,Leadership,Problem Solving,Total Score,Team Status,Is Demo\n';
        for (const p of participants) {
          csv += `"${p.id}","${p.fullName}","${p.studentId}","${p.classYear}","${p.email}","${p.primaryStrength}","${p.secondaryStrength}",${p.scores.Communication},${p.scores.Creativity},${p.scores.Research},${p.scores.Leadership},${p.scores['Problem-solving']},15,"${p.teamStatus}",${p.isDemo ? 'YES' : 'NO'}\n`;
        }
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="know_your_strengths_export_${new Date().toISOString().slice(0, 10)}.csv"`
        });
        return res.end(csv);
      }

      return sendJson(res, 200, { participants, exportedAt: new Date().toISOString() });
    }

    // Admin: Seed Demo Data trigger
    if (pathname === '/api/admin/seed-demo' && method === 'POST') {
      if (!requireAdmin()) return;
      seedDemoData();
      return sendJson(res, 200, { success: true, message: 'Đã nạp 30 hồ sơ sinh viên mẫu synthetic thành công.' });
    }

    // ----------------------------------------------------
    // STATIC FILE SERVING
    // ----------------------------------------------------
    let filePath = pathname === '/' ? '/index.html' : pathname;
    let safePath = path.normalize(path.join(publicDir, filePath));

    // Security check: prevent directory traversal
    if (!safePath.startsWith(publicDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Forbidden');
    }

    if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
      const ext = path.extname(safePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
      });
      return fs.createReadStream(safePath).pipe(res);
    }

    // Single Page App fallback for non-API client routes
    const fallbackPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(fallbackPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return fs.createReadStream(fallbackPath).pipe(res);
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  } catch (err) {
    console.error('Server error:', err);
    sendJson(res, 500, { error: 'Internal Server Error' });
  }
});

// Start server if executed directly
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  server.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(`🚀 KNOW YOUR STRENGTHS - WORKSHOP PLATFORM IS RUNNING`);
    console.log(`📍 URL: http://localhost:${config.port}`);
    console.log(`👑 Configured Owner / Admin Email: ${config.adminEmail}`);
    console.log(`🔒 Allowed Domains: ${config.allowedEmailDomains.join(', ')}`);
    console.log(`=======================================================`);
  });
}
