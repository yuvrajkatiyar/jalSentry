import {
  CommunityReport,
  EvidenceConfidenceLevel,
  RiskBand,
  RiskEvaluation,
  RiskScoreComponents,
  WeatherObservation,
} from './types';

export interface ScoringInput {
  weather?: WeatherObservation | null;
  reports?: CommunityReport[];
  isSimulated?: boolean;
}

/**
 * Normalizes apparent temperature (°C) into a 0-100 heat score.
 * 15°C and below -> 0
 * 30°C -> 50
 * 45°C and above -> 100
 */
export function normalizeHeatIndex(apparentTempC: number): number {
  if (Number.isNaN(apparentTempC)) return 50;
  const clamped = Math.max(15, Math.min(45, apparentTempC));
  return Math.round(((clamped - 15) / (45 - 15)) * 100);
}

/**
 * Calculates evidence confidence (0-100) based on source freshness,
 * report counts, and verification status.
 */
export function calculateEvidenceConfidence(
  weather: WeatherObservation | null | undefined,
  activeReports: CommunityReport[]
): { score: number; level: EvidenceConfidenceLevel; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Weather signal contribution (up to 30 pts)
  if (weather) {
    if (weather.isStale) {
      score += 15;
      reasons.push('Weather data is stale; partial signal confidence applied (+15)');
    } else if (weather.isFallback) {
      score += 10;
      reasons.push('Weather data from fallback baseline (+10)');
    } else {
      score += 30;
      reasons.push('Live verified weather observation active (+30)');
    }
  } else {
    reasons.push('Missing weather telemetry reduces overall confidence');
  }

  // Reports volume contribution (up to 40 pts)
  const reportCount = activeReports.length;
  if (reportCount === 0) {
    reasons.push('No community incident reports filed');
  } else if (reportCount === 1) {
    score += 20;
    reasons.push('Single community report filed (+20)');
  } else if (reportCount <= 3) {
    score += 35;
    reasons.push(`${reportCount} corroborating community reports filed (+35)`);
  } else {
    score += 45;
    reasons.push(`High report volume (${reportCount} corroborating reports) (+45)`);
  }

  // Verified reports bonus (up to 25 pts)
  const verifiedCount = activeReports.filter((r) => r.status === 'verified' || r.status === 'investigating').length;
  if (verifiedCount > 0) {
    score += 25;
    reasons.push(`${verifiedCount} operator-verified report(s) on record (+25)`);
  }

  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  let level: EvidenceConfidenceLevel = 'weak';
  if (clampedScore >= 70) {
    level = 'strong';
  } else if (clampedScore >= 35) {
    level = 'moderate';
  }

  return { score: clampedScore, level, reasons };
}

/**
 * Pure risk scoring function:
 * risk = 0.35 * heat + 0.35 * waterShortage + 0.20 * supplyInterruption + 0.10 * evidenceConfidence
 */
export function calculateRiskScore(input: ScoringInput): RiskEvaluation {
  const missingInputs: string[] = [];
  const reasons: string[] = [];
  const reports = input.reports || [];
  
  // Filter active reports (not resolved or dismissed)
  const activeReports = reports.filter(
    (r) => r.status !== 'resolved' && r.status !== 'dismissed'
  );

  // 1. Heat component (0 - 100)
  let heatScore = 0;
  if (!input.weather) {
    missingInputs.push('weather');
    heatScore = 40; // Explicit default fallback score for missing telemetry
    reasons.push('Weather data missing; applying neutral baseline heat score (40/100).');
  } else {
    heatScore = normalizeHeatIndex(input.weather.apparentTemperatureC);
    if (input.weather.isStale) {
      reasons.push(
        `Stale weather signal: apparent temp ${input.weather.apparentTemperatureC.toFixed(1)}°C gives heat score ${heatScore}/100.`
      );
    } else {
      reasons.push(
        `Weather observation: apparent temp ${input.weather.apparentTemperatureC.toFixed(1)}°C (recorded at ${input.weather.timestamp}) yields heat score ${heatScore}/100.`
      );
    }
  }

  // 2. Water Shortage component (0 - 100)
  const shortageReports = activeReports.filter((r) => r.type === 'water_shortage');
  let waterShortageScore = 0;
  if (shortageReports.length > 0) {
    const maxSeverity = Math.max(...shortageReports.map((r) => r.severity));
    const verifiedBonus = shortageReports.some((r) => r.status === 'verified') ? 15 : 0;
    // Severity 1-5 maps to base 20-100 + multi-report corroboration bonus
    const countBonus = Math.min(20, (shortageReports.length - 1) * 10);
    const rawShortage = (maxSeverity * 18) + countBonus + verifiedBonus;
    waterShortageScore = Math.max(0, Math.min(100, Math.round(rawShortage)));
    reasons.push(
      `${shortageReports.length} water shortage report(s) (highest severity: ${maxSeverity}/5) -> water shortage score ${waterShortageScore}/100.`
    );
  } else {
    reasons.push('No active water shortage complaints logged (0/100).');
  }

  // 3. Supply Interruption component (0 - 100)
  const supplyReports = activeReports.filter(
    (r) => r.type === 'supply_interruption' || r.type === 'suspected_leak'
  );
  let supplyInterruptionScore = 0;
  if (supplyReports.length > 0) {
    const maxSeverity = Math.max(...supplyReports.map((r) => r.severity));
    const countBonus = Math.min(20, (supplyReports.length - 1) * 10);
    const leakCount = supplyReports.filter((r) => r.type === 'suspected_leak').length;
    const leakBonus = leakCount > 0 ? 10 : 0;
    const rawSupply = (maxSeverity * 18) + countBonus + leakBonus;
    supplyInterruptionScore = Math.max(0, Math.min(100, Math.round(rawSupply)));
    reasons.push(
      `${supplyReports.length} infrastructure/leak report(s) (max severity ${maxSeverity}/5) -> supply interruption score ${supplyInterruptionScore}/100.`
    );
  } else {
    reasons.push('No active infrastructure failure or leak reports logged (0/100).');
  }

  // 4. Evidence Confidence component (0 - 100)
  const evidence = calculateEvidenceConfidence(input.weather, activeReports);
  const evidenceScore = evidence.score;
  reasons.push(
    `Evidence confidence is ${evidence.level.toUpperCase()} (${evidenceScore}/100) based on source freshness and community verification.`
  );

  // Heuristic calculation:
  // risk = 0.35 * heat + 0.35 * waterShortage + 0.20 * supplyInterruption + 0.10 * evidenceConfidence
  const rawRisk =
    0.35 * heatScore +
    0.35 * waterShortageScore +
    0.20 * supplyInterruptionScore +
    0.10 * evidenceScore;

  const overallScore = Math.max(0, Math.min(100, Math.round(rawRisk)));

  let band: RiskBand = 'low';
  if (overallScore >= 75) {
    band = 'critical';
  } else if (overallScore >= 50) {
    band = 'high';
  } else if (overallScore >= 30) {
    band = 'moderate';
  } else {
    band = 'low';
  }

  const components: RiskScoreComponents = {
    heat: heatScore,
    waterShortage: waterShortageScore,
    supplyInterruption: supplyInterruptionScore,
    evidenceConfidence: evidenceScore,
  };

  return {
    overallScore,
    band,
    components,
    reasons,
    evidenceConfidenceLabel: evidence.level,
    missingInputs,
    calculatedAt: new Date().toISOString(),
    isSimulated: Boolean(input.isSimulated),
  };
}
