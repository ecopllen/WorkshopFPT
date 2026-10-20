// src/db/seed_demo.js
// Idempotent seed script for 30 synthetic demo student profiles
import crypto from 'node:crypto';
import { db, transaction } from './database.js';
import { DEMO_PROFILES, validateDemoProfiles } from '../data/demoProfiles.js';
import { QUESTIONS } from '../data/questions.js';

export function seedDemoData() {
  validateDemoProfiles();

  console.log('Seeding 30 synthetic demo student profiles...');

  const now = new Date().toISOString();

  // Prepared statements
  const findUserByEmail = db.prepare('SELECT id FROM users WHERE email = ?');
  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, auth_provider, email_verified, role, is_demo, created_at, updated_at)
    VALUES (?, ?, ?, 'local', 1, 'student', 1, ?, ?)
  `);

  const findProfileByUserId = db.prepare('SELECT user_id FROM profiles WHERE user_id = ?');
  const insertProfile = db.prepare(`
    INSERT INTO profiles (
      user_id, full_name, student_id, class_year, avatar_url, bio, phone, social_link,
      skills, project_interests, desired_role, team_status, is_published, directory_visible,
      show_email, show_phone, show_social, show_strengths, is_demo, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  const updateProfile = db.prepare(`
    UPDATE profiles SET
      full_name = ?, student_id = ?, class_year = ?, avatar_url = ?, bio = ?, phone = ?, social_link = ?,
      skills = ?, project_interests = ?, desired_role = ?, team_status = ?, is_published = ?, directory_visible = ?,
      show_email = ?, show_phone = ?, show_social = ?, show_strengths = ?, updated_at = ?
    WHERE user_id = ?
  `);

  const findAssessmentByUserId = db.prepare('SELECT id FROM assessments WHERE user_id = ? AND is_demo = 1');
  const insertAssessment = db.prepare(`
    INSERT INTO assessments (
      id, user_id, communication_score, creativity_score, research_score, leadership_score,
      problem_solving_score, total_score, primary_strength, secondary_strength, answers_json,
      is_demo, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 15, ?, ?, ?, 1, ?)
  `);

  let usersCreated = 0;
  let profilesCreated = 0;
  let assessmentsCreated = 0;

  transaction(() => {
    for (const p of DEMO_PROFILES) {
      // 1. Check or insert user
      let userRow = findUserByEmail.get(p.email.toLowerCase());
      let userId;

      if (!userRow) {
        userId = 'usr_' + crypto.randomUUID().slice(0, 12);
        // Default demo password hash (demo123456)
        const demoHash = crypto.createHash('sha256').update('demo123456:demo_salt').digest('hex');
        insertUser.run(userId, p.email.toLowerCase(), demoHash, now, now);
        usersCreated++;
      } else {
        userId = userRow.id;
      }

      // 2. Check or upsert profile
      const profRow = findProfileByUserId.get(userId);
      const skillsJson = JSON.stringify(p.skills || []);
      const interestsJson = JSON.stringify(p.projectInterests || []);

      if (!profRow) {
        insertProfile.run(
          userId,
          p.fullName,
          p.studentId,
          p.classYear,
          p.avatarUrl,
          p.bio,
          p.phone,
          p.socialLink,
          skillsJson,
          interestsJson,
          p.desiredRole,
          p.teamStatus,
          p.privacy.isPublished,
          p.privacy.directoryVisible,
          p.privacy.showEmail,
          p.privacy.showPhone,
          p.privacy.showSocial,
          p.privacy.showStrengths,
          now,
          now
        );
        profilesCreated++;
      } else {
        updateProfile.run(
          p.fullName,
          p.studentId,
          p.classYear,
          p.avatarUrl,
          p.bio,
          p.phone,
          p.socialLink,
          skillsJson,
          interestsJson,
          p.desiredRole,
          p.teamStatus,
          p.privacy.isPublished,
          p.privacy.directoryVisible,
          p.privacy.showEmail,
          p.privacy.showPhone,
          p.privacy.showSocial,
          p.privacy.showStrengths,
          now,
          userId
        );
      }

      // 3. Check or insert assessment
      const assessRow = findAssessmentByUserId.get(userId);
      if (!assessRow) {
        // Construct synthetic 15 private answers reflecting the exact scores
        const answers = [];
        const remainingScores = { ...p.scores };
        for (let i = 1; i <= 15; i++) {
          // Find strength that still needs points
          const available = Object.keys(remainingScores).filter(k => remainingScores[k] > 0);
          const chosenStrength = available[0] || p.primaryStrength;
          remainingScores[chosenStrength] = Math.max(0, (remainingScores[chosenStrength] || 0) - 1);
          answers.push({
            questionId: i,
            strength: chosenStrength
          });
        }

        const assessId = 'ass_' + crypto.randomUUID().slice(0, 12);
        insertAssessment.run(
          assessId,
          userId,
          p.scores.Communication || 0,
          p.scores.Creativity || 0,
          p.scores.Research || 0,
          p.scores.Leadership || 0,
          p.scores['Problem-solving'] || 0,
          p.primaryStrength,
          p.secondaryStrength,
          JSON.stringify(answers),
          now
        );
        assessmentsCreated++;
      }
    }

    // Seed 3 sample community posts if none exist
    const postCountRow = db.prepare('SELECT COUNT(*) as cnt FROM community_posts WHERE author_id IN (SELECT id FROM users WHERE is_demo = 1)').get();
    if (postCountRow.cnt === 0) {
      const firstUser = findUserByEmail.get(DEMO_PROFILES[0].email.toLowerCase());
      const secondUser = findUserByEmail.get(DEMO_PROFILES[9].email.toLowerCase());
      const thirdUser = findUserByEmail.get(DEMO_PROFILES[16].email.toLowerCase());

      if (firstUser) {
        db.prepare(`
          INSERT INTO community_posts (id, author_id, title, content, looking_for_strengths, likes_count, created_at)
          VALUES (?, ?, ?, ?, ?, 5, ?)
        `).run(
          'post_demo_1',
          firstUser.id,
          'Tìm kiếm 1 bạn Research & 1 bạn Problem-solving cho đề tài Smart Campus',
          'Nhóm mình hiện đã có 3 thành viên (Leadership, Communication, Creativity). Đang cần tìm 1 bạn có điểm mạnh Research để thẩm định số liệu và 1 bạn Problem-solving để hỗ trợ phần kiến trúc backend. Mục tiêu nộp hồ sơ Capstone kỳ tới!',
          JSON.stringify(['Research', 'Problem-solving']),
          now
        );
      }

      if (secondUser) {
        db.prepare(`
          INSERT INTO community_posts (id, author_id, title, content, looking_for_strengths, likes_count, created_at)
          VALUES (?, ?, ?, ?, ?, 3, ?)
        `).run(
          'post_demo_2',
          secondUser.id,
          'Giao lưu tìm nhóm làm đề tài Green Campus & Tái chế rác thải sinh viên',
          'Chào các bạn K17-K18, mình là Thu Hà, thế mạnh chính là Communication & Pitching. Mình có ý tưởng làm dự án giảm thiểu rác thải nhựa tại canteen FUDA. Rất muốn kết nối với các bạn thích đề tài xã hội.',
          JSON.stringify(['Leadership', 'Creativity']),
          now
        );
      }

      if (thirdUser) {
        db.prepare(`
          INSERT INTO community_posts (id, author_id, title, content, looking_for_strengths, likes_count, created_at)
          VALUES (?, ?, ?, ?, ?, 4, ?)
        `).run(
          'post_demo_3',
          thirdUser.id,
          'Designer tìm nhóm làm Capstone hướng EdTech / AI Assistant',
          'Mình chuyên về UI/UX và Design Thinking (Creativity), đã có sẵn một vài bản prototype trên Figma về ứng dụng hỗ trợ học tập cho sinh viên. Cần tìm đồng đội giỏi code và quản lý dự án!',
          JSON.stringify(['Problem-solving', 'Leadership']),
          now
        );
      }
    }
  });

  console.log(`Seed completed: ${usersCreated} users created, ${profilesCreated} profiles created, ${assessmentsCreated} assessments created.`);
  console.log('Seed is idempotent. Rerunning will not create duplicate records.');
}

// If executed directly
if (process.argv[1] && process.argv[1].endsWith('seed_demo.js')) {
  seedDemoData();
  process.exit(0);
}
