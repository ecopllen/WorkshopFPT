// src/services/privacyService.js
// Enforces granular privacy visibility, data filtering, and isolation

import { db } from '../db/database.js';

export const privacyService = {
  // Filter student profile for public or peer directory viewing
  // viewerId: null if unauthenticated, or user.id
  // isAdmin: boolean
  sanitizeProfile(profileRow, assessmentRow, viewerId, isAdmin = false) {
    if (!profileRow) return null;

    const isOwner = viewerId && profileRow.user_id === viewerId;

    // Full access for the owner or an authorized administrator
    if (isOwner || isAdmin) {
      return {
        userId: profileRow.user_id,
        email: profileRow.email,
        fullName: profileRow.full_name,
        studentId: profileRow.student_id,
        classYear: profileRow.class_year,
        avatarUrl: profileRow.avatar_url,
        bio: profileRow.bio,
        phone: profileRow.phone,
        socialLink: profileRow.social_link,
        skills: typeof profileRow.skills === 'string' ? JSON.parse(profileRow.skills || '[]') : profileRow.skills,
        projectInterests: typeof profileRow.project_interests === 'string' ? JSON.parse(profileRow.project_interests || '[]') : profileRow.project_interests,
        desiredRole: profileRow.desired_role,
        teamStatus: profileRow.team_status,
        isPublished: Boolean(profileRow.is_published),
        directoryVisible: Boolean(profileRow.directory_visible),
        showEmail: Boolean(profileRow.show_email),
        showPhone: Boolean(profileRow.show_phone),
        showSocial: Boolean(profileRow.show_social),
        showStrengths: Boolean(profileRow.show_strengths),
        isDemo: Boolean(profileRow.is_demo),
        createdAt: profileRow.created_at,
        assessment: assessmentRow ? {
          id: assessmentRow.id,
          primaryStrength: assessmentRow.primary_strength,
          secondaryStrength: assessmentRow.secondary_strength,
          scores: {
            Communication: assessmentRow.communication_score,
            Creativity: assessmentRow.creativity_score,
            Research: assessmentRow.research_score,
            Leadership: assessmentRow.leadership_score,
            'Problem-solving': assessmentRow.problem_solving_score
          },
          totalScore: assessmentRow.total_score,
          completedAt: assessmentRow.completed_at,
          // Individual 15 answers are ONLY returned to owner, NEVER to other students (and not needed by admin either)
          answers: isOwner && assessmentRow.answers_json ? JSON.parse(assessmentRow.answers_json) : undefined
        } : null
      };
    }

    // Peer / public student view - STRICT PRIVACY ENFORCEMENT
    // 1. If profile is not published or hidden from directory, peers cannot view it
    if (!profileRow.is_published || !profileRow.directory_visible) {
      return null;
    }

    const sanitized = {
      userId: profileRow.user_id,
      fullName: profileRow.full_name,
      studentId: profileRow.student_id, // displayed in class context
      classYear: profileRow.class_year,
      avatarUrl: profileRow.avatar_url,
      bio: profileRow.bio,
      skills: typeof profileRow.skills === 'string' ? JSON.parse(profileRow.skills || '[]') : profileRow.skills,
      projectInterests: typeof profileRow.project_interests === 'string' ? JSON.parse(profileRow.project_interests || '[]') : profileRow.project_interests,
      desiredRole: profileRow.desired_role,
      teamStatus: profileRow.team_status,
      isDemo: Boolean(profileRow.is_demo),
      // Granular opt-in checks:
      email: profileRow.show_email ? profileRow.email : undefined,
      phone: profileRow.show_phone ? profileRow.phone : undefined,
      socialLink: profileRow.show_social ? profileRow.social_link : undefined
    };

    // Assessment strengths are only visible if the student explicitly opted to share them
    if (profileRow.show_strengths && assessmentRow) {
      sanitized.assessment = {
        primaryStrength: assessmentRow.primary_strength,
        secondaryStrength: assessmentRow.secondary_strength,
        scores: {
          Communication: assessmentRow.communication_score,
          Creativity: assessmentRow.creativity_score,
          Research: assessmentRow.research_score,
          Leadership: assessmentRow.leadership_score,
          'Problem-solving': assessmentRow.problem_solving_score
        }
        // Note: answers_json is NEVER included for peers!
      };
    } else {
      sanitized.assessment = null;
    }

    return sanitized;
  },

  // Query teammate directory with search, filters, privacy enforcement, and demo data isolation
  getTeammateDirectory({ viewerId, isAdmin = false, includeDemo = false, strength, teamStatus, classYear, search }) {
    let sql = `
      SELECT p.*, u.email, a.id as assess_id, a.primary_strength, a.secondary_strength,
             a.communication_score, a.creativity_score, a.research_score, a.leadership_score,
             a.problem_solving_score, a.total_score, a.completed_at
      FROM profiles p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN assessments a ON a.user_id = p.user_id
      WHERE 1=1
    `;

    const params = [];

    // Privacy rule: Only published & directory_visible profiles appear in the teammate directory
    if (!isAdmin) {
      sql += ' AND p.is_published = 1 AND p.directory_visible = 1';
    }

    // Isolation rule: Exclude demo profiles unless explicitly enabled (or viewer requested)
    if (!includeDemo) {
      sql += ' AND p.is_demo = 0';
    }

    // Filter by primary strength
    if (strength) {
      sql += ' AND a.primary_strength = ?';
      params.push(strength);
    }

    // Filter by team-search status
    if (teamStatus) {
      sql += ' AND p.team_status = ?';
      params.push(teamStatus);
    }

    // Filter by class / year
    if (classYear) {
      sql += ' AND p.class_year = ?';
      params.push(classYear);
    }

    // Text search on full_name, bio, skills
    if (search) {
      sql += ' AND (p.full_name LIKE ? OR p.bio LIKE ? OR p.skills LIKE ? OR p.project_interests LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY p.is_demo ASC, p.updated_at DESC';

    const rows = db.prepare(sql).all(...params);

    return rows.map(row => {
      const assessRow = row.assess_id ? {
        id: row.assess_id,
        primary_strength: row.primary_strength,
        secondary_strength: row.secondary_strength,
        communication_score: row.communication_score,
        creativity_score: row.creativity_score,
        research_score: row.research_score,
        leadership_score: row.leadership_score,
        problem_solving_score: row.problem_solving_score,
        total_score: row.total_score,
        completed_at: row.completed_at
      } : null;

      return this.sanitizeProfile(row, assessRow, viewerId, isAdmin);
    }).filter(Boolean);
  }
};
