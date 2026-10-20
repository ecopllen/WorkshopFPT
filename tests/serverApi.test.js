// tests/serverApi.test.js
import test from 'node:test';
import assert from 'node:assert';
import { server } from '../src/server.js';
import { config } from '../src/config.js';
import { db } from '../src/db/database.js';

let baseUrl;
let testServer;

test.before(async () => {
  await new Promise((resolve) => {
    testServer = server.listen(0, () => {
      const port = testServer.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => testServer.close(resolve));
});

test('API - Registration and Domain Policy Enforcement', async () => {
  // 1. Invalid domain should fail
  const badDomainRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'hacker@unauthorized-school.edu',
      password: 'password123',
      fullName: 'Hacker User'
    })
  });
  assert.strictEqual(badDomainRes.status, 400);
  const badData = await badDomainRes.json();
  assert.match(badData.error, /Hệ thống chỉ chấp nhận các tên miền/);

  // 2. Valid domain succeeds
  const cleanEmail = `test_student_${Date.now()}@gmail.com`;
  const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: cleanEmail,
      password: 'password123',
      fullName: 'Nguyễn Văn Test'
    })
  });
  assert.strictEqual(registerRes.status, 201);
  const regData = await registerRes.json();
  assert.ok(regData.token);
  assert.strictEqual(regData.user.role, 'student');
});

test('API - Initial Admin Provisioning via ADMIN_EMAIL', async () => {
  const adminEmail = config.adminEmail; // e.g. 'owner.admin@gmail.com'

  // Clean up if exists
  db.prepare('DELETE FROM users WHERE email = ?').run(adminEmail);

  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: adminEmail,
      password: 'adminPassword123',
      fullName: 'Owner Administrator'
    })
  });

  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.strictEqual(data.user.role, 'admin', 'Configured owner email must be provisioned as admin');
});

test('API - Assessment submission, score sum to 15, and privacy protection', async () => {
  // Register student
  const studentEmail = `student_${Date.now()}@fpt.edu.vn`;
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentEmail,
      password: 'password123',
      fullName: 'Đỗ Thị Lan'
    })
  });
  const regData = await regRes.json();
  const token = regData.token;
  const studentId = regData.user.id;

  // Submit all 15 answers
  const answers = {};
  for (let i = 1; i <= 15; i++) {
    // Pick option A, B, C, D, or E
    answers[i] = ['A', 'B', 'C', 'D', 'E'][(i - 1) % 5];
  }

  const submitRes = await fetch(`${baseUrl}/api/assessment/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ answers })
  });

  assert.strictEqual(submitRes.status, 201);
  const result = await submitRes.json();
  assert.strictEqual(result.totalScore, 15, 'Total assessment score must strictly sum to 15');
  assert.ok(result.primaryStrength);
  assert.ok(result.secondaryStrength);

  // Update privacy: hide email and phone, publish profile
  await fetch(`${baseUrl}/api/profile/privacy`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      isPublished: true,
      directoryVisible: true,
      showStrengths: true,
      showEmail: false,
      showPhone: false
    })
  });

  // Another peer student looks at Lan's profile
  const peerEmail = `peer_${Date.now()}@gmail.com`;
  const peerReg = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: peerEmail,
      password: 'password123',
      fullName: 'Bạn Học Khác'
    })
  });
  const peerData = await peerReg.json();

  const peerViewRes = await fetch(`${baseUrl}/api/profile/${studentId}`, {
    headers: { 'Authorization': `Bearer ${peerData.token}` }
  });

  assert.strictEqual(peerViewRes.status, 200);
  const peerViewData = await peerViewRes.json();

  // Strict privacy assertions:
  assert.strictEqual(peerViewData.email, undefined, 'Peer cannot see private email');
  assert.strictEqual(peerViewData.phone, undefined, 'Peer cannot see private phone');
  assert.ok(peerViewData.assessment);
  assert.strictEqual(peerViewData.assessment.answers, undefined, 'Peer CANNOT see individual 15 answers');
});

test('API - Non-admin cannot access admin endpoints', async () => {
  const studentEmail = `regular_${Date.now()}@gmail.com`;
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentEmail,
      password: 'password123',
      fullName: 'Học Viên Bình Thường'
    })
  });
  const regData = await regRes.json();

  // Try accessing admin metrics
  const metricRes = await fetch(`${baseUrl}/api/admin/metrics`, {
    headers: { 'Authorization': `Bearer ${regData.token}` }
  });
  assert.strictEqual(metricRes.status, 403);

  // Try generating teams
  const groupRes = await fetch(`${baseUrl}/api/admin/teams/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${regData.token}`
    },
    body: JSON.stringify({ teamCount: 6 })
  });
  assert.strictEqual(groupRes.status, 403);
});
