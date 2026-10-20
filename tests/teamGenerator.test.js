// tests/teamGenerator.test.js
import test from 'node:test';
import assert from 'node:assert';
import { TeamGenerator, STRENGTH_KEYS } from '../src/services/teamGenerator.js';

test('TeamGenerator - Perfectly balanced distribution (6 of each category = 30 students)', () => {
  const participants = [];
  let id = 1;

  for (const strength of STRENGTH_KEYS) {
    for (let i = 0; i < 6; i++) {
      participants.push({
        id: `user_${id++}`,
        fullName: `Sinh viên ${strength} ${i + 1}`,
        primaryStrength: strength,
        secondaryStrength: 'Communication'
      });
    }
  }

  assert.strictEqual(participants.length, 30);

  const result = TeamGenerator.generate(participants, { teamCount: 6, targetTeamSize: 5 });

  assert.strictEqual(result.teams.length, 6);
  assert.strictEqual(result.metrics.totalAssigned, 30);
  assert.strictEqual(result.metrics.totalUnassigned, 0);
  assert.strictEqual(result.metrics.perfectTeamsCount, 6, 'All 6 teams must have 5 distinct primary strengths');
  assert.strictEqual(result.metrics.teamsWithRepeatsCount, 0, 'No team should have repeated strengths');
  assert.strictEqual(result.metrics.feasibilityWarning, null, 'No warning when distribution is balanced');

  for (const team of result.teams) {
    assert.strictEqual(team.members.length, 5);
    assert.strictEqual(team.diversityScore, 5);
    assert.strictEqual(team.hasAllFive, true);
    assert.strictEqual(team.repeatedPrimaryStrengths.length, 0);
  }
});

test('TeamGenerator - Highly uneven distribution (10 Leadership, 2 Research, 6 Comm, 6 Creat, 6 Prob)', () => {
  const participants = [];
  let id = 1;

  // 10 Leadership
  for (let i = 0; i < 10; i++) {
    participants.push({
      id: `lead_${id++}`,
      fullName: `Leader ${i + 1}`,
      primaryStrength: 'Leadership',
      secondaryStrength: 'Research' // Secondary strength can balance!
    });
  }

  // 2 Research (scarce!)
  for (let i = 0; i < 2; i++) {
    participants.push({
      id: `res_${id++}`,
      fullName: `Researcher ${i + 1}`,
      primaryStrength: 'Research',
      secondaryStrength: 'Problem-solving'
    });
  }

  // 6 Communication
  for (let i = 0; i < 6; i++) {
    participants.push({
      id: `comm_${id++}`,
      fullName: `Communicator ${i + 1}`,
      primaryStrength: 'Communication',
      secondaryStrength: 'Creativity'
    });
  }

  // 6 Creativity
  for (let i = 0; i < 6; i++) {
    participants.push({
      id: `creat_${id++}`,
      fullName: `Creator ${i + 1}`,
      primaryStrength: 'Creativity',
      secondaryStrength: 'Leadership'
    });
  }

  // 6 Problem-solving
  for (let i = 0; i < 6; i++) {
    participants.push({
      id: `prob_${id++}`,
      fullName: `Problem Solver ${i + 1}`,
      primaryStrength: 'Problem-solving',
      secondaryStrength: 'Research'
    });
  }

  assert.strictEqual(participants.length, 30);

  const result = TeamGenerator.generate(participants, { teamCount: 6, targetTeamSize: 5 });

  // 1. All participants must be assigned (Priority 1)
  assert.strictEqual(result.metrics.totalAssigned, 30);
  assert.strictEqual(result.metrics.totalUnassigned, 0);

  // 2. All 6 teams must have exactly 5 members (Priority 2)
  for (const team of result.teams) {
    assert.strictEqual(team.members.length, 5);
  }

  // 3. Mathematical impossibility warning must be present
  assert.ok(result.metrics.feasibilityWarning);
  assert.match(result.metrics.feasibilityWarning, /Research/);
  assert.match(result.metrics.feasibilityWarning, /Tối đa chỉ có thể có 2 nhóm đạt đủ 5 thế mạnh chính/);

  // 4. The 2 Research-primary students must be assigned to DIFFERENT teams
  const teamsWithResearch = result.teams.filter(t =>
    t.members.some(m => m.primaryStrength === 'Research')
  );
  assert.strictEqual(teamsWithResearch.length, 2, 'The 2 Research students must be in 2 different teams');

  // 5. Teams without primary Research must cover Research via secondary strengths
  const teamsWithoutPrimaryResearch = result.teams.filter(
    t => !t.members.some(m => m.primaryStrength === 'Research')
  );
  assert.strictEqual(teamsWithoutPrimaryResearch.length, 4);

  for (const team of teamsWithoutPrimaryResearch) {
    assert.ok(
      team.secondaryStrengthsCovered.includes('Research'),
      'Teams lacking primary Research should have secondary Research covered'
    );
  }
});

test('TeamGenerator - Odd participant counts (31 participants, 6 teams)', () => {
  const participants = [];
  for (let i = 1; i <= 31; i++) {
    const strength = STRENGTH_KEYS[(i - 1) % 5];
    participants.push({
      id: `odd_${i}`,
      fullName: `Student ${i}`,
      primaryStrength: strength,
      secondaryStrength: 'Communication'
    });
  }

  const result = TeamGenerator.generate(participants, { teamCount: 6, targetTeamSize: 5 });

  assert.strictEqual(result.metrics.totalAssigned, 31, 'All 31 students must be assigned');
  assert.strictEqual(result.metrics.totalUnassigned, 0);

  // 5 teams of 5, 1 team of 6 (sizes remain within 5-6)
  const sizes = result.teams.map(t => t.members.length);
  assert.strictEqual(sizes.filter(s => s === 5).length, 5);
  assert.strictEqual(sizes.filter(s => s === 6).length, 1);
});

test('TeamGenerator - Manual member reassignment and metrics update', () => {
  const participants = [];
  for (let i = 1; i <= 10; i++) {
    participants.push({
      id: `reassign_${i}`,
      fullName: `User ${i}`,
      primaryStrength: i <= 5 ? STRENGTH_KEYS[i - 1] : STRENGTH_KEYS[(i - 6) % 5],
      secondaryStrength: 'Communication'
    });
  }

  const generated = TeamGenerator.generate(participants, { teamCount: 2, targetTeamSize: 5 });
  assert.strictEqual(generated.teams[0].members.length, 5);
  assert.strictEqual(generated.teams[1].members.length, 5);

  const memberToMove = generated.teams[0].members[0];

  const updateResult = TeamGenerator.reassignMember(
    generated.teams,
    memberToMove.userId,
    2 // move to team 2
  );

  assert.strictEqual(updateResult.moved.fromTeam, 1);
  assert.strictEqual(updateResult.moved.toTeam, 2);
  assert.strictEqual(generated.teams[0].members.length, 4);
  assert.strictEqual(generated.teams[1].members.length, 6);
});
