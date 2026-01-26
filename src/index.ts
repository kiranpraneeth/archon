/**
 * Archon — AI-Native Developer Experience Platform
 *
 * Entry point for the platform. Currently sets up the foundation
 * for agent orchestration.
 */

import { createReviewAgent } from './agents/reviewer/index.js';

async function main(): Promise<void> {
  console.log('🏛️  Archon — AI-Native Developer Experience Platform');
  console.log('━'.repeat(50));

  // Initialize the Code Review Agent
  const reviewer = createReviewAgent();

  console.log(`\n✓ ${reviewer.name} initialized`);
  console.log(`  Role: ${reviewer.role}`);
  console.log(`  Status: ${reviewer.status}`);

  console.log('\n📋 Available agents:');
  console.log('  • Reviewer (Code Review Agent) — Active');
  console.log('  • Tester (Test Generation Agent) — Planned');
  console.log('  • Documenter (Documentation Agent) — Planned');
  console.log('  • Onboarder (Codebase Guide Agent) — Planned');

  console.log('\n' + '━'.repeat(50));
  console.log('Platform ready. Use Claude Code commands to interact with agents.');
}

main().catch(console.error);
