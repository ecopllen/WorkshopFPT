// src/services/workshopService.js
import crypto from 'node:crypto';
import { db, transaction } from '../db/database.js';
import { TeamGenerator } from './teamGenerator.js';

export const workshopService = {
  // Get participants eligible for workshop grouping
  getEligibleParticipants({ includeDemo = false } = {}) {
    let sql = `
      SELECT u.id as user_id, u.email, u.is_demo, p.full_name, p.student_id, p.class_year,
             p.avatar_url, p.team_status, a.primary_strength, a.secondary_strength,
             a.communication_score, a.creativity_score, a.research_score,
             a.leadership_score, a.problem_solving_score, a.total_score, a.completed_at
      FROM users u
      JOIN profiles p ON p.user_id = u.id
      JOIN assessments a ON a.user_id = u.id
      WHERE 1=1
    `;

    if (!includeDemo) {
      sql += ' AND u.is_demo = 0';
    }

    sql += ' ORDER BY u.is_demo ASC, a.completed_at DESC';

    const rows = db.prepare(sql).all();

    return rows.map(r => ({
      id: r.user_id,
      userId: r.user_id,
      email: r.email,
      fullName: r.full_name,
      studentId: r.student_id,
      classYear: r.class_year,
      avatarUrl: r.avatar_url,
      teamStatus: r.team_status,
      primaryStrength: r.primary_strength,
      secondaryStrength: r.secondary_strength,
      isDemo: Boolean(r.is_demo),
      scores: {
        Communication: r.communication_score,
        Creativity: r.creativity_score,
        Research: r.research_score,
        Leadership: r.leadership_score,
        'Problem-solving': r.problem_solving_score
      }
    }));
  },

  // Generate preview of proposed teams (draft, in-memory)
  generateDraftTeams({ includeDemo = false, teamCount = 6, targetTeamSize = 5 } = {}) {
    const participants = this.getEligibleParticipants({ includeDemo });
    return TeamGenerator.generate(participants, { teamCount, targetTeamSize });
  },

  // Save confirmed teams to database
  saveConfirmedTeams({ teams, adminUserId }) {
    if (!Array.isArray(teams) || teams.length === 0) {
      throw new Error('Danh sách nhóm cần lưu không hợp lệ.');
    }

    const now = new Date().toISOString();

    return transaction(() => {
      // Archive or delete previous confirmed teams
      db.prepare("DELETE FROM workshop_teams WHERE status = 'confirmed'").run();

      const insertTeam = db.prepare(`
        INSERT INTO workshop_teams (id, team_number, team_name, status, diversity_score, missing_strengths, repeated_strengths, created_by, created_at, updated_at)
        VALUES (?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?)
      `);

      const insertMember = db.prepare(`
        INSERT INTO team_members (id, team_id, user_id, assigned_role, is_manual, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const t of teams) {
        const teamId = 'wt_' + crypto.randomUUID().slice(0, 10);
        insertTeam.run(
          teamId,
          t.teamNumber,
          t.teamName || `Nhóm ${t.teamNumber}`,
          t.diversityScore || 0,
          JSON.stringify(t.missingPrimaryStrengths || []),
          JSON.stringify(t.repeatedPrimaryStrengths || []),
          adminUserId || null,
          now,
          now
        );

        if (Array.isArray(t.members)) {
          for (const m of t.members) {
            insertMember.run(
              'tm_' + crypto.randomUUID().slice(0, 10),
              teamId,
              m.userId,
              m.primaryStrength || '',
              m.isManual ? 1 : 0,
              now
            );
          }
        }
      }

      // Log audit
      if (adminUserId) {
        db.prepare(`
          INSERT INTO admin_audit_logs (id, admin_id, action, details, created_at)
          VALUES (?, ?, 'CONFIRM_WORKSHOP_TEAMS', ?, ?)
        `).run('log_' + crypto.randomUUID().slice(0, 8), adminUserId, `Confirmed ${teams.length} teams with ${teams.reduce((acc, t) => acc + (t.members?.length || 0), 0)} members`, now);
      }

      return { success: true, teamCount: teams.length, savedAt: now };
    });
  },

  // Get currently confirmed teams from database
  getConfirmedTeams() {
    const teams = db.prepare("SELECT * FROM workshop_teams WHERE status = 'confirmed' ORDER BY team_number ASC").all();

    return teams.map(t => {
      const members = db.prepare(`
        SELECT tm.id as membership_id, tm.is_manual, u.id as user_id, u.email, u.is_demo,
               p.full_name, p.student_id, p.class_year, p.avatar_url, p.phone,
               a.primary_strength, a.secondary_strength,
               a.communication_score, a.creativity_score, a.research_score,
               a.leadership_score, a.problem_solving_score
        FROM team_members tm
        JOIN users u ON u.id = tm.user_id
        JOIN profiles p ON p.user_id = u.id
        LEFT JOIN assessments a ON a.user_id = u.id
        WHERE tm.team_id = ?
        ORDER BY tm.created_at ASC
      `).all(t.id);

      return {
        id: t.id,
        teamNumber: t.team_number,
        teamName: t.team_name,
        diversityScore: t.diversity_score,
        missingPrimaryStrengths: JSON.parse(t.missing_strengths || '[]'),
        repeatedPrimaryStrengths: JSON.parse(t.repeated_strengths || '[]'),
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        members: members.map(m => ({
          userId: m.user_id,
          email: m.email,
          fullName: m.full_name,
          studentId: m.student_id,
          classYear: m.class_year,
          avatarUrl: m.avatar_url,
          phone: m.phone,
          primaryStrength: m.primary_strength,
          secondaryStrength: m.secondary_strength,
          isDemo: Boolean(m.is_demo),
          scores: {
            Communication: m.communication_score,
            Creativity: m.creativity_score,
            Research: m.research_score,
            Leadership: m.leadership_score,
            'Problem-solving': m.problem_solving_score
          }
        }))
      };
    });
  },

  // Admin dashboard metrics (strictly separating demo data)
  getDashboardMetrics({ includeDemo = false } = {}) {
    const demoFilter = includeDemo ? '' : 'WHERE is_demo = 0';
    const demoFilterAnd = includeDemo ? '' : 'AND is_demo = 0';

    const totalStudents = db.prepare(`SELECT COUNT(*) as count FROM users ${demoFilter}`).get().count;
    const completedAssessments = db.prepare(`SELECT COUNT(*) as count FROM assessments ${demoFilter}`).get().count;
    const totalPosts = db.prepare(`SELECT COUNT(*) as count FROM community_posts WHERE author_id IN (SELECT id FROM users ${demoFilter})`).get().count;

    // Primary strength distribution
    const strengthDistRows = db.prepare(`
      SELECT primary_strength, COUNT(*) as count
      FROM assessments
      ${demoFilter}
      GROUP BY primary_strength
    `).all();

    const strengthDist = {
      Communication: 0,
      Creativity: 0,
      Research: 0,
      Leadership: 0,
      'Problem-solving': 0
    };
    for (const r of strengthDistRows) {
      strengthDist[r.primary_strength] = r.count;
    }

    // Team search status distribution
    const statusDistRows = db.prepare(`
      SELECT team_status, COUNT(*) as count
      FROM profiles
      ${demoFilter}
      GROUP BY team_status
    `).all();

    const statusDist = {};
    for (const r of statusDistRows) {
      statusDist[r.team_status] = r.count;
    }

    const confirmedTeamsCount = db.prepare("SELECT COUNT(*) as count FROM workshop_teams WHERE status = 'confirmed'").get().count;

    return {
      includeDemo,
      totalStudents,
      completedAssessments,
      totalPosts,
      confirmedTeamsCount,
      strengthDist,
      statusDist
    };
  }
};
