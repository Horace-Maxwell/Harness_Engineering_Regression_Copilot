export function round(value, digits = 1) {
  return Number(value.toFixed(digits));
}

export function mean(values) {
  if (!values.length) {
    throw new Error("Cannot compute the mean of an empty array.");
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function standardDeviation(values) {
  if (!values.length) {
    throw new Error("Cannot compute the standard deviation of an empty array.");
  }
  if (values.length === 1) {
    return 0;
  }

  const average = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function coefficientOfVariationPct(values) {
  const average = mean(values);
  if (average === 0) {
    return 0;
  }
  return (standardDeviation(values) / average) * 100;
}

export function median(values) {
  if (!values.length) {
    throw new Error("Cannot compute the median of an empty array.");
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export function percentile(values, p) {
  if (!values.length) {
    throw new Error("Cannot compute the percentile of an empty array.");
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

export function buildBinarySeries(totalCount, successCount) {
  if (totalCount < 0 || successCount < 0 || successCount > totalCount) {
    throw new Error("Invalid binary series parameters.");
  }
  return [
    ...Array.from({ length: successCount }, () => 1),
    ...Array.from({ length: totalCount - successCount }, () => 0),
  ];
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleWithReplacement(values, rng) {
  const sample = new Array(values.length);
  for (let index = 0; index < values.length; index += 1) {
    sample[index] = values[Math.floor(rng() * values.length)];
  }
  return sample;
}

function samplePairedWithReplacement(left, right, rng) {
  const sampledLeft = new Array(left.length);
  const sampledRight = new Array(right.length);
  for (let index = 0; index < left.length; index += 1) {
    const sampledIndex = Math.floor(rng() * left.length);
    sampledLeft[index] = left[sampledIndex];
    sampledRight[index] = right[sampledIndex];
  }
  return { sampledLeft, sampledRight };
}

function confidenceBounds(sorted, confidence) {
  const alpha = (1 - confidence) / 2;
  const lowerIndex = Math.max(0, Math.floor(alpha * sorted.length));
  const upperIndex = Math.min(sorted.length - 1, Math.ceil((1 - alpha) * sorted.length) - 1);
  return { lowerIndex, upperIndex };
}

export function bootstrapConfidenceInterval(
  values,
  statisticFn = mean,
  { iterations = 4000, confidence = 0.95, seed = 20260410, transform = (value) => value } = {},
) {
  if (!values.length) {
    throw new Error("Cannot bootstrap an empty sample.");
  }

  const rng = mulberry32(seed);
  const estimates = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    estimates.push(statisticFn(sampleWithReplacement(values, rng)));
  }
  estimates.sort((a, b) => a - b);

  const { lowerIndex, upperIndex } = confidenceBounds(estimates, confidence);

  return {
    point: round(transform(statisticFn(values))),
    lower: round(transform(estimates[lowerIndex])),
    upper: round(transform(estimates[upperIndex])),
    iterations,
    confidenceLevelPct: round(confidence * 100, 0),
  };
}

export function pairedBootstrapDifference(
  before,
  after,
  statisticFn = mean,
  { iterations = 4000, confidence = 0.95, seed = 20260410, transform = (value) => value } = {},
) {
  if (!before.length || before.length !== after.length) {
    throw new Error("Paired bootstrap samples must be non-empty and have the same length.");
  }

  const rng = mulberry32(seed);
  const estimates = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const { sampledLeft, sampledRight } = samplePairedWithReplacement(before, after, rng);
    estimates.push(statisticFn(sampledRight) - statisticFn(sampledLeft));
  }
  estimates.sort((a, b) => a - b);

  const { lowerIndex, upperIndex } = confidenceBounds(estimates, confidence);

  return {
    point: round(transform(statisticFn(after) - statisticFn(before))),
    lower: round(transform(estimates[lowerIndex])),
    upper: round(transform(estimates[upperIndex])),
    iterations,
    confidenceLevelPct: round(confidence * 100, 0),
  };
}
