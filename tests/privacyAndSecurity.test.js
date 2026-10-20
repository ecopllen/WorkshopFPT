// tests/privacyAndSecurity.test.js
import test from 'node:test';
import assert from 'node:assert';
import { privacyService } from '../src/services/privacyService.js';

test('Privacy - Student cannot view another student\'s private 15 answers', () => {
  const profileRow = {
    user_id: 'target_student_id',
    full_name: 'Nguyễn Văn A',
    email: 'student_a@gmail.com',
    student_id: 'DE17001',
    is_published: 1,
    directory_visible: 1,
    show_email: 0,
    show_phone: 0,
    show_strengths: 1
  };

  const assessmentRow = {
    id: 'assess_1',
    primary_strength: 'Leadership',
    secondary_strength: 'Communication',
    communication_score: 4,
    creativity_score: 2,
    research_score: 2,
    leadership_score: 5,
    problem_solving_score: 2,
    total_score: 15,
    answers_json: JSON.stringify([
      { questionId: 1, strength: 'Leadership' },
      { questionId: 2, strength: 'Communication' }
    ])
  };

  // Peer view (viewerId !== profileRow.user_id)
  const peerSanitized = privacyService.sanitizeProfile(profileRow, assessmentRow, 'peer_student_id', false);

  assert.ok(peerSanitized);
  assert.strictEqual(peerSanitized.fullName, 'Nguyễn Văn A');
  assert.strictEqual(peerSanitized.assessment.primaryStrength, 'Leadership');
  // Strict test: individual answers MUST NEVER be visible to peer!
  assert.strictEqual(peerSanitized.assessment.answers, undefined, 'Peers must NEVER see answers_json');
  assert.strictEqual(peerSanitized.email, undefined, 'show_email is 0, email must not be returned');
  assert.strictEqual(peerSanitized.phone, undefined, 'show_phone is 0, phone must not be returned');

  // Owner view (viewerId === profileRow.user_id)
  const ownerSanitized = privacyService.sanitizeProfile(profileRow, assessmentRow, 'target_student_id', false);
  assert.ok(ownerSanitized);
  assert.ok(ownerSanitized.assessment.answers, 'Owner CAN see their own answers');
  assert.strictEqual(ownerSanitized.assessment.answers.length, 2);
  assert.strictEqual(ownerSanitized.email, 'student_a@gmail.com', 'Owner sees their own email');
});

test('Privacy - When student hides strengths (show_strengths = 0), peer sees null assessment', () => {
  const profileRow = {
    user_id: 'secret_student',
    full_name: 'Trần Thị B',
    email: 'secret@gmail.com',
    is_published: 1,
    directory_visible: 1,
    show_email: 0,
    show_phone: 0,
    show_strengths: 0 // opted out of sharing strengths
  };

  const assessmentRow = {
    id: 'assess_2',
    primary_strength: 'Creativity',
    secondary_strength: 'Research',
    communication_score: 2,
    creativity_score: 6,
    research_score: 4,
    leadership_score: 1,
    problem_solving_score: 2,
    total_score: 15,
    answers_json: '[]'
  };

  const peerView = privacyService.sanitizeProfile(profileRow, assessmentRow, 'peer_viewer', false);
  assert.ok(peerView);
  assert.strictEqual(peerView.assessment, null, 'Assessment must be null when show_strengths is 0');
});

test('Privacy - Unpublished or hidden profile returns null for peer', () => {
  const unpublished = {
    user_id: 'draft_student',
    full_name: 'Lê Văn C',
    is_published: 0,
    directory_visible: 1
  };
  assert.strictEqual(privacyService.sanitizeProfile(unpublished, null, 'peer_viewer', false), null);

  const hidden = {
    user_id: 'hidden_student',
    full_name: 'Phạm Thị D',
    is_published: 1,
    directory_visible: 0
  };
  assert.strictEqual(privacyService.sanitizeProfile(hidden, null, 'peer_viewer', false), null);
});
