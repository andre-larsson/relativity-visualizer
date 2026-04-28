const EPSILON = 1e-9

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function formatNumber(value, digits = 3) {
  const normalized = Math.abs(value) < EPSILON ? 0 : value
  return normalized.toFixed(digits)
}

export function atanh(value) {
  return 0.5 * Math.log((1 + value) / (1 - value))
}

export function getBoost(beta) {
  const safeBeta = clamp(beta, -0.999, 0.999)
  const gamma = 1 / Math.sqrt(1 - safeBeta * safeBeta)
  const rapidity = atanh(safeBeta)
  const gammaBeta = gamma * safeBeta

  return {
    beta: safeBeta,
    gamma,
    gammaBeta,
    rapidity,
    matrix: [
      [gamma, -gammaBeta],
      [-gammaBeta, gamma],
    ],
    inverse: [
      [gamma, gammaBeta],
      [gammaBeta, gamma],
    ],
  }
}

export function transformContravariant(point, beta) {
  const boost = getBoost(beta)

  return {
    t: boost.gamma * point.t - boost.gammaBeta * point.x,
    x: boost.gamma * point.x - boost.gammaBeta * point.t,
  }
}

export function transformCovariant(covector, beta) {
  const boost = getBoost(beta)

  return {
    t: boost.gamma * covector.t + boost.gammaBeta * covector.x,
    x: boost.gammaBeta * covector.t + boost.gamma * covector.x,
  }
}

export function lowerIndex(point) {
  return { t: point.t, x: -point.x }
}

export function basisVectors(beta) {
  const boost = getBoost(beta)

  return {
    time: { t: boost.gamma, x: boost.gammaBeta },
    space: { t: boost.gammaBeta, x: boost.gamma },
  }
}

export function vectorScale(vector, scalar) {
  return {
    t: vector.t * scalar,
    x: vector.x * scalar,
  }
}

export function interval(point) {
  return point.t * point.t - point.x * point.x
}

export function classifyInterval(sSquared) {
  if (Math.abs(sSquared) < 0.025) {
    return {
      label: 'Lightlike',
      explanation: 'The event lies on the light cone, so every frame keeps t² - x² at zero.',
    }
  }

  if (sSquared > 0) {
    return {
      label: 'Timelike',
      explanation: 'Time separation dominates, so some inertial frame can place the event on its time axis.',
    }
  }

  return {
    label: 'Spacelike',
    explanation: 'Spatial separation dominates, so some inertial frame can place the event on its space axis.',
  }
}
