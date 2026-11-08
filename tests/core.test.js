const test = require('node:test');
const assert = require('node:assert/strict');
const fixture = require('../examples/fictional-phonics-teacher.json');
const { scoreOpportunity, rankOpportunities, buildValidationPlan } = require('../src/core');

test('evidence-led opportunity ranks over generic printable', () => {
  const ranked = rankOpportunities(fixture).ranked;
  assert.equal(ranked[0].id, 'sound-out-words');
  assert.equal(ranked.at(-1).id, 'generic-ai-coloring-pack');
});
test('independent sources are counted once', () => {
  const idea = structuredClone(fixture.opportunities[0]);
  idea.evidence[1].sourceId = idea.evidence[0].sourceId;
  assert.equal(scoreOpportunity(idea).evidenceSources, 2);
});
test('claims without evidence are capped regardless of score', () => {
  const idea = structuredClone(fixture.opportunities[0]);
  idea.evidence = [];
  assert.ok(scoreOpportunity(idea).score <= 45);
  assert.equal(scoreOpportunity(idea).evidenceGrade, 'unverified');
});
test('invalid signals fail rather than silently being accepted', () => {
  const idea = structuredClone(fixture.opportunities[0]);
  idea.signals.paidIntent = 9;
  assert.throws(() => scoreOpportunity(idea), RangeError);
});
test('repeated ID is rejected', () => {
  const data = structuredClone(fixture);
  data.opportunities.push(structuredClone(data.opportunities[0]));
  assert.throws(() => rankOpportunities(data), /Duplicate idea ID/);
});
test('validation plan labels pricing as hypothesis', () => {
  const plan = buildValidationPlan(fixture.opportunities[0]);
  assert.equal(plan.priceHypothesisINR, 499);
  assert.match(plan.guardrails.join(' '), /not proof of demand/);
});
test('input opportunities are not mutated', () => {
  const before = JSON.stringify(fixture);
  rankOpportunities(fixture);
  assert.equal(JSON.stringify(fixture), before);
});
