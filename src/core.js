/* ExpertOS: transparent, evidence-led offer discovery. No API keys required. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ExpertOS = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SIGNALS = ['urgency', 'frequency', 'paidIntent', 'expertFit', 'deliverability'];
  const WEIGHTS = { urgency: 0.20, frequency: 0.15, paidIntent: 0.25, expertFit: 0.25, deliverability: 0.15 };
  const requireText = (value, label) => {
    if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} must be a non-empty string`);
    return value.trim();
  };

  function validateOpportunity(idea) {
    if (!idea || typeof idea !== 'object') throw new TypeError('Opportunity must be an object');
    for (const key of ['id', 'problem', 'audience', 'outcome', 'deliverable', 'whyExpert']) {
      requireText(idea[key], key);
    }
    if (!idea.signals || typeof idea.signals !== 'object') throw new TypeError('signals are required');
    for (const name of SIGNALS) {
      if (!Number.isInteger(idea.signals[name]) || idea.signals[name] < 1 || idea.signals[name] > 5) {
        throw new RangeError(`signals.${name} must be an integer from 1 to 5`);
      }
    }
    if (!Number.isSafeInteger(idea.priceINR) || idea.priceINR <= 0) {
      throw new RangeError('priceINR must be a positive whole number');
    }
    if (!Array.isArray(idea.evidence)) throw new TypeError('evidence must be an array');
    idea.evidence.forEach((item, i) => {
      if (!item || typeof item !== 'object') throw new TypeError(`evidence[${i}] must be an object`);
      requireText(item.sourceId, `evidence[${i}].sourceId`);
      requireText(item.observation, `evidence[${i}].observation`);
    });
    return idea;
  }

  function scoreOpportunity(idea) {
    validateOpportunity(idea);
    const independentEvidence = new Set(idea.evidence.map(e => e.sourceId.trim())).size;
    const rawScore = SIGNALS.reduce((sum, name) => sum + (idea.signals[name] / 5) * WEIGHTS[name] * 100, 0);
    const explanation = [];
    let score = Math.round(rawScore);
    // Strong-sounding ideas without independent observations cannot lead the shortlist.
    if (independentEvidence < 2) {
      score = Math.min(score, 45);
      explanation.push('Limited independent evidence: validate this problem before building.');
    }
    if (idea.signals.paidIntent <= 2) explanation.push('Payment intent is weak: test a real offer before investing in production.');
    if (idea.whyExpert.trim().length < 20) explanation.push('Clarify the expert advantage over a generic AI-generated product.');
    return {
      id: idea.id,
      score,
      evidenceSources: independentEvidence,
      evidenceGrade: independentEvidence >= 3 ? 'promising' : independentEvidence === 2 ? 'early' : 'unverified',
      explanation,
      signals: { ...idea.signals },
      scoreWeights: { ...WEIGHTS }
    };
  }

  function rankOpportunities(input) {
    if (!input || typeof input !== 'object') throw new TypeError('Input must be an object');
    if (!input.expert || typeof input.expert !== 'object') throw new TypeError('expert is required');
    requireText(input.expert.field, 'expert.field');
    if (!Array.isArray(input.opportunities) || input.opportunities.length === 0) {
      throw new TypeError('At least one opportunity is required');
    }
    const ids = new Set();
    const ranked = input.opportunities.map(idea => {
      const score = scoreOpportunity(idea);
      if (ids.has(idea.id)) throw new Error(`Duplicate idea ID: ${idea.id}`);
      ids.add(idea.id);
      return { ...score, opportunity: idea };
    }).sort((a, b) => b.score - a.score || b.evidenceSources - a.evidenceSources || a.id.localeCompare(b.id));
    return { project: 'ExpertOS', prototype: true, expertField: input.expert.field, ranked };
  }

  function buildValidationPlan(idea) {
    const scored = scoreOpportunity(idea);
    return {
      ideaId: idea.id,
      offerHypothesis: `A ${idea.deliverable} for ${idea.audience}, designed to help with: ${idea.outcome}.`,
      priceHypothesisINR: idea.priceINR,
      whyThisExpert: idea.whyExpert,
      evidenceStatus: scored.evidenceGrade,
      nextExperiments: [
        'Ask five people in the target audience to describe the problem in their own words. Do not pitch first.',
        'Show a one-page outline and ask what they would remove, change, and pay for.',
        'Test a real purchase or refundable preorder with clear terms before building the full product.'
      ],
      guardrails: [
        'This is a scored hypothesis, not proof of demand or guaranteed income.',
        'Do not present synthetic observations as real customer interviews.',
        'Keep personally identifiable customer information out of public example files.'
      ]
    };
  }

  return { validateOpportunity, scoreOpportunity, rankOpportunities, buildValidationPlan, WEIGHTS };
});
