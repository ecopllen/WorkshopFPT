// src/services/teamGenerator.js
// Intelligent Team Generation with Multi-Objective Constraint Optimization
// Priorities:
// 1. Assign every eligible participant to exactly one team.
// 2. Keep team sizes within limits.
// 3. Maximize teams with 5 distinct primary Strength categories.
// 4. Minimize repeated primary Strengths within teams.
// 5. Use secondary Strength categories as a balancing signal.
// 6. Transparent reporting and mathematical feasibility explanation.

export const STRENGTH_KEYS = [
  'Communication',
  'Creativity',
  'Research',
  'Leadership',
  'Problem-solving'
];

export class TeamGenerator {
  /**
   * Run the team generation algorithm
   * @param {Array} participants - List of participants with primaryStrength, secondaryStrength, id, fullName, etc.
   * @param {Object} options - { teamCount: 6, targetTeamSize: 5 }
   * @returns {Object} { teams, metrics, feasibility }
   */
  static generate(participants = [], options = {}) {
    if (!Array.isArray(participants) || participants.length === 0) {
      return {
        teams: [],
        metrics: {
          totalEligible: 0,
          totalAssigned: 0,
          totalUnassigned: 0,
          teamsGenerated: 0,
          perfectTeamsCount: 0,
          teamsWithRepeatsCount: 0,
          feasibilityWarning: 'Không có người tham gia hợp lệ nào để phân nhóm.',
          categoryBreakdown: {}
        },
        unassigned: []
      };
    }

    const totalCount = participants.length;
    const targetSize = options.targetTeamSize || 5;
    // Calculate team count: if not explicitly given, derive from targetSize
    const teamCount = options.teamCount || Math.max(1, Math.round(totalCount / targetSize));

    // Calculate distribution breakdown
    const categoryBreakdown = {};
    for (const key of STRENGTH_KEYS) {
      categoryBreakdown[key] = 0;
    }
    for (const p of participants) {
      const ps = p.primaryStrength || 'Problem-solving';
      categoryBreakdown[ps] = (categoryBreakdown[ps] || 0) + 1;
    }

    // Mathematical feasibility check for perfect 5-strength teams
    // For every team to have all 5 primary strengths, every category must have count >= teamCount
    const scarceCategories = [];
    let maxPossiblePerfectTeams = teamCount;

    for (const key of STRENGTH_KEYS) {
      const count = categoryBreakdown[key] || 0;
      if (count < teamCount) {
        scarceCategories.push({ strength: key, count, needed: teamCount });
      }
      maxPossiblePerfectTeams = Math.min(maxPossiblePerfectTeams, count);
    }

    let feasibilityWarning = null;
    if (scarceCategories.length > 0) {
      const scarceDetails = scarceCategories
        .map(c => `${c.strength} (có ${c.count}/${c.needed})`)
        .join(', ');
      feasibilityWarning =
        `Không thể phân chia 100% các nhóm đủ 5 thế mạnh chính do thiếu hụt tự nhiên: ${scarceDetails}. ` +
        `Tối đa chỉ có thể có ${maxPossiblePerfectTeams} nhóm đạt đủ 5 thế mạnh chính. ` +
        `Hệ thống sẽ tự động sử dụng Thế mạnh phụ (Secondary Strength) để bù đắp các nhóm còn lại.`;
    }

    // Initialize team buckets
    const teams = [];
    for (let i = 1; i <= teamCount; i++) {
      teams.push({
        teamNumber: i,
        teamName: `Nhóm ${i}`,
        members: []
      });
    }

    // Clone participants to avoid mutation
    const pool = [...participants];

    // Group participants by primary strength
    const byStrength = {};
    for (const key of STRENGTH_KEYS) {
      byStrength[key] = pool.filter(p => p.primaryStrength === key);
    }

    // Optimization Step 1: Assign scarce categories first across teams
    // Sort categories ascending by count (rarest first)
    const sortedCategories = [...STRENGTH_KEYS].sort(
      (a, b) => (byStrength[a].length || 0) - (byStrength[b].length || 0)
    );

    // Track which team has which primary strengths
    for (const strength of sortedCategories) {
      const candidates = byStrength[strength];
      // Distribute candidates to teams that don't have this strength yet
      for (const candidate of candidates) {
        // Find best team for this candidate:
        // Priority 1: Team does not have candidate's primary strength yet AND team size is below target
        let bestTeam = teams.find(
          t => !t.members.some(m => m.primaryStrength === strength) && t.members.length < targetSize
        );

        // Priority 2: Team does not have this strength yet, even if at target size (for flexible capacity)
        if (!bestTeam) {
          bestTeam = teams.find(
            t => !t.members.some(m => m.primaryStrength === strength)
          );
        }

        // Priority 3: Team with fewest repeated strengths and smallest size
        if (!bestTeam) {
          bestTeam = teams
            .slice()
            .sort((a, b) => a.members.length - b.members.length)[0];
        }

        if (bestTeam) {
          bestTeam.members.push(candidate);
        }
      }
    }

    // Optimization Step 2: Balance team sizes (Priority 1 & 2: keep team sizes within limits)
    // Compute target min/max team sizes
    const baseSize = Math.floor(totalCount / teamCount);
    const remainder = totalCount % teamCount;
    // remainder teams get baseSize + 1, other get baseSize

    // Normalize team sizes by swapping or moving surplus members
    let attempts = 0;
    while (attempts < 100) {
      attempts++;
      teams.sort((a, b) => b.members.length - a.members.length);
      const largest = teams[0];
      const smallest = teams[teams.length - 1];

      if (largest.members.length - smallest.members.length <= 1) {
        break; // Well balanced
      }

      // Try to move a member from largest to smallest whose primary strength is already duplicated in largest
      const duplicateIdx = largest.members.findIndex(m => {
        const count = largest.members.filter(x => x.primaryStrength === m.primaryStrength).length;
        return count > 1;
      });

      if (duplicateIdx !== -1) {
        const [moved] = largest.members.splice(duplicateIdx, 1);
        smallest.members.push(moved);
      } else {
        // Move the member that least disturbs diversity
        const [moved] = largest.members.splice(largest.members.length - 1, 1);
        smallest.members.push(moved);
      }
    }

    // Optimization Step 3: Secondary strength balancing (Priority 5)
    // If a team is missing a primary strength, check if another team has a member
    // whose secondary strength can fill that gap, and try intelligent swap
    for (const team of teams) {
      const presentPrimary = new Set(team.members.map(m => m.primaryStrength));
      const missing = STRENGTH_KEYS.filter(s => !presentPrimary.has(s));

      for (const missingStrength of missing) {
        // Check if anyone in this team has this missing strength as SECONDARY
        const hasSecondary = team.members.some(m => m.secondaryStrength === missingStrength);
        if (!hasSecondary) {
          // Look for potential swap with another team
          for (const otherTeam of teams) {
            if (otherTeam === team) continue;
            // Check if otherTeam has a member with primary strength duplicated in otherTeam
            // and that member has secondaryStrength === missingStrength
            const swapCandidateIdx = otherTeam.members.findIndex(m => {
              const otherRepeats = otherTeam.members.filter(x => x.primaryStrength === m.primaryStrength).length > 1;
              return otherRepeats && m.secondaryStrength === missingStrength;
            });

            if (swapCandidateIdx !== -1) {
              // Find a member from team to swap
              const returnCandidateIdx = team.members.findIndex(m => {
                const teamRepeats = team.members.filter(x => x.primaryStrength === m.primaryStrength).length > 1;
                return teamRepeats;
              });

              if (returnCandidateIdx !== -1) {
                const fromOther = otherTeam.members[swapCandidateIdx];
                const fromThis = team.members[returnCandidateIdx];
                otherTeam.members[swapCandidateIdx] = fromThis;
                team.members[returnCandidateIdx] = fromOther;
                break;
              }
            }
          }
        }
      }
    }

    // Calculate final metrics for each team
    let perfectTeamsCount = 0;
    let teamsWithRepeatsCount = 0;
    let totalAssigned = 0;

    const evaluatedTeams = teams.map((team, idx) => {
      const primaryCounts = {};
      const secondaryCovered = new Set();

      for (const m of team.members) {
        primaryCounts[m.primaryStrength] = (primaryCounts[m.primaryStrength] || 0) + 1;
        if (m.secondaryStrength) {
          secondaryCovered.add(m.secondaryStrength);
        }
      }

      const distinctPrimary = Object.keys(primaryCounts);
      const diversityScore = distinctPrimary.length;
      const missingPrimaryStrengths = STRENGTH_KEYS.filter(k => !primaryCounts[k]);
      const repeatedPrimaryStrengths = Object.keys(primaryCounts).filter(k => primaryCounts[k] > 1);

      const hasAllFive = diversityScore === 5;
      if (hasAllFive) {
        perfectTeamsCount++;
      }
      if (repeatedPrimaryStrengths.length > 0) {
        teamsWithRepeatsCount++;
      }

      totalAssigned += team.members.length;

      return {
        teamNumber: idx + 1,
        teamName: `Nhóm ${idx + 1}`,
        members: team.members.map(m => ({
          userId: m.id || m.userId,
          fullName: m.fullName,
          studentId: m.studentId || '',
          classYear: m.classYear || '',
          avatarUrl: m.avatarUrl || '',
          primaryStrength: m.primaryStrength,
          secondaryStrength: m.secondaryStrength,
          scores: m.scores || null,
          teamStatus: m.teamStatus || 'Đang tìm teammate'
        })),
        memberCount: team.members.length,
        diversityScore,
        hasAllFive,
        missingPrimaryStrengths,
        repeatedPrimaryStrengths,
        secondaryStrengthsCovered: Array.from(secondaryCovered)
      };
    });

    const assignedIds = new Set(
      evaluatedTeams.flatMap(t => t.members.map(m => m.userId))
    );
    const unassigned = participants
      .filter(p => !assignedIds.has(p.id || p.userId))
      .map(p => ({
        userId: p.id || p.userId,
        fullName: p.fullName,
        primaryStrength: p.primaryStrength,
        reason: 'Vượt quá dung lượng nhóm được cấu hình'
      }));

    return {
      teams: evaluatedTeams,
      metrics: {
        totalEligible: totalCount,
        totalAssigned,
        totalUnassigned: unassigned.length,
        teamsGenerated: evaluatedTeams.length,
        perfectTeamsCount,
        teamsWithRepeatsCount,
        feasibilityWarning,
        categoryBreakdown
      },
      unassigned
    };
  }

  /**
   * Manually reassign a member between teams and recalculate metrics
   */
  static reassignMember(teams, userId, targetTeamNumber) {
    let memberToMove = null;
    let sourceTeamNumber = null;

    // Remove from source team
    for (const team of teams) {
      const idx = team.members.findIndex(m => m.userId === userId);
      if (idx !== -1) {
        [memberToMove] = team.members.splice(idx, 1);
        sourceTeamNumber = team.teamNumber;
        break;
      }
    }

    if (!memberToMove) {
      throw new Error(`Không tìm thấy sinh viên ID ${userId} trong các nhóm.`);
    }

    // Add to target team
    const targetTeam = teams.find(t => t.teamNumber === Number(targetTeamNumber));
    if (!targetTeam) {
      throw new Error(`Không tìm thấy Nhóm ${targetTeamNumber}.`);
    }

    targetTeam.members.push(memberToMove);

    // Recalculate metrics for all teams
    let perfectTeamsCount = 0;
    let teamsWithRepeatsCount = 0;

    for (const team of teams) {
      const primaryCounts = {};
      const secondaryCovered = new Set();

      for (const m of team.members) {
        primaryCounts[m.primaryStrength] = (primaryCounts[m.primaryStrength] || 0) + 1;
        if (m.secondaryStrength) {
          secondaryCovered.add(m.secondaryStrength);
        }
      }

      team.diversityScore = Object.keys(primaryCounts).length;
      team.hasAllFive = team.diversityScore === 5;
      team.missingPrimaryStrengths = STRENGTH_KEYS.filter(k => !primaryCounts[k]);
      team.repeatedPrimaryStrengths = Object.keys(primaryCounts).filter(k => primaryCounts[k] > 1);
      team.secondaryStrengthsCovered = Array.from(secondaryCovered);
      team.memberCount = team.members.length;

      if (team.hasAllFive) perfectTeamsCount++;
      if (team.repeatedPrimaryStrengths.length > 0) teamsWithRepeatsCount++;
    }

    return {
      teams,
      moved: {
        userId,
        fullName: memberToMove.fullName,
        fromTeam: sourceTeamNumber,
        toTeam: Number(targetTeamNumber)
      },
      metrics: {
        perfectTeamsCount,
        teamsWithRepeatsCount
      }
    };
  }
}
