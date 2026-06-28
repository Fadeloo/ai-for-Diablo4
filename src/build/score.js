export function scoreAffixes(affixes, weights) {
  return affixes.map((affix) => {
    const categoryWeight = weights[affix.categoryId] ?? 0;
    const value = Number(affix.normalizedValue ?? affix.value ?? 1);
    const score = categoryWeight * value;
    return {
      ...affix,
      score
    };
  });
}

export function summarizeGearScore(affixes, weights) {
  const scoredAffixes = scoreAffixes(affixes, weights);
  return {
    totalScore: scoredAffixes.reduce((sum, affix) => sum + affix.score, 0),
    scoredAffixes: scoredAffixes.sort((a, b) => b.score - a.score)
  };
}

export function validateBuildWeights(weights, knownCategoryIds) {
  const unknown = Object.keys(weights).filter((key) => !knownCategoryIds.includes(key));
  return {
    ok: unknown.length === 0,
    unknown
  };
}
