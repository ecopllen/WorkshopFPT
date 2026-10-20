// tests/adminBootstrap.test.js
import test from 'node:test';
import assert from 'node:assert';
import { authService } from '../src/services/authService.js';
import { config } from '../src/config.js';
import { db } from '../src/db/database.js';

test('Admin Bootstrap - Initial owner registration gets admin role', () => {
  const adminEmail = config.adminEmail; // 'owner.admin@gmail.com'

  // Delete previous test user if exists
  db.prepare('DELETE FROM users WHERE email = ?').run(adminEmail);

  const result = authService.register({
    email: adminEmail,
    password: 'securePassword123',
    fullName: 'Project Owner Admin'
  });

  assert.strictEqual(result.user.role, 'admin', 'Account matching ADMIN_EMAIL must be provisioned as admin');

  // Verify in database
  const userInDb = db.prepare('SELECT role FROM users WHERE email = ?').get(adminEmail);
  assert.strictEqual(userInDb.role, 'admin');
});

test('Admin Bootstrap - Regular student registration gets student role, cannot elevate', () => {
  const studentEmail = 'student.regular@gmail.com';
  db.prepare('DELETE FROM users WHERE email = ?').run(studentEmail);

  const result = authService.register({
    email: studentEmail,
    password: 'studentPassword123',
    fullName: 'Regular Student'
  });

  assert.strictEqual(result.user.role, 'student', 'Regular email must receive student role');

  const userInDb = db.prepare('SELECT role FROM users WHERE email = ?').get(studentEmail);
  assert.strictEqual(userInDb.role, 'student');
});

test('Auth - Domain policy strictly enforced', () => {
  assert.throws(() => {
    authService.register({
      email: 'hacker@unauthorized-domain.xyz',
      password: 'password123',
      fullName: 'Attacker'
    });
  }, /Hệ thống chỉ chấp nhận các tên miền/);
});
