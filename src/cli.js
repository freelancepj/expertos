#!/usr/bin/env node
const fs = require('node:fs');
const { rankOpportunities, buildValidationPlan } = require('./core');

const file = process.argv[2];
if (!file || process.argv.includes('--help')) {
  console.log('Usage: node src/cli.js examples/fictional-phonics-teacher.json');
  process.exit(file ? 0 : 1);
}
try {
  const input = JSON.parse(fs.readFileSync(file, 'utf8'));
  const result = rankOpportunities(input);
  const top = result.ranked[0];
  console.log(JSON.stringify({
    project: result.project,
    expertField: result.expertField,
    shortlist: result.ranked.map(({ opportunity, ...score }) => score),
    recommendedExperiment: buildValidationPlan(top.opportunity)
  }, null, 2));
} catch (error) {
  console.error(`Could not analyze ideas: ${error.message}`);
  process.exitCode = 1;
}
