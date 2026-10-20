// tests/demoIsolation.test.js
import test from 'node:test';
import assert from 'node:assert';
import { workshopService } from '../src/services/workshopService.js';
import { privacyService } from '../src/services/privacyService.js';
import { DEMO_PROFILES, validateDemoProfiles } from '../src/data/demoProfiles.js';
import { seedDemoData } from '../src/db/seed_demo.js';

test('Demo Isolation - Synthetic profiles validation', () => {
  assert.strictEqual(validateDemoProfiles(), true);
  assert.strictEqual(DEMO_PROFILES.length, 30);

  // Every score sum is 15
  for (const p of DEMO_PROFILES) {
    const sum = Object.values(p.scores).reduce((a, b) => a + b, 0);
    assert.strictEqual(sum, 15, `Score of ${p.fullName} must sum to 15`);
  }
});

test('Demo Isolation - Official dashboard metrics exclude demo profiles by default', () => {
  seedDemoData();

  const officialMetrics = workshopService.getDashboardMetrics({ includeDemo: false });
  const demoMetrics = workshopService.getDashboardMetrics({ includeDemo: true });

  assert.strictEqual(officialMetrics.includeDemo, false);
  assert.strictEqual(demoMetrics.includeDemo, true);

  // Official count should not include the 30 demo students
  assert.ok(demoMetrics.totalStudents >= 30, 'Demo metrics should include at least 30 synthetic students');
  assert.ok(demoMetrics.totalStudents >= officialMetrics.totalStudents, 'Demo metrics should include demo profiles');
});

test('Demo Isolation - Teammate directory excludes demo profiles by default', () => {
  seedDemoData();

  const officialDirectory = privacyService.getTeammateDirectory({
    viewerId: null,
    isAdmin: false,
    includeDemo: false
  });

  for (const student of officialDirectory) {
    assert.strictEqual(student.isDemo, false, 'No demo profile should appear in official directory');
  }

  const demoDirectory = privacyService.getTeammateDirectory({
    viewerId: null,
    isAdmin: false,
    includeDemo: true
  });

  const demoCount = demoDirectory.filter(s => s.isDemo).length;
  assert.ok(demoCount > 0, 'Demo profiles should be returned when includeDemo is true');
});
