import {
  ActionType,
  CommunityReport,
  RecommendedAction,
  RiskBand,
  RiskEvaluation,
} from './types';

export interface RecommendationInput {
  locationId: string;
  locationName: string;
  reports: CommunityReport[];
  riskEvaluation: RiskEvaluation;
  existingActionId?: string;
}

/**
 * Pure rule-based recommendation generator.
 * Transparent heuristics for municipal water-shortage verification and suspected-leak inspections.
 */
export function buildRecommendedAction(input: RecommendationInput): RecommendedAction | null {
  const { locationId, locationName, reports, riskEvaluation } = input;
  const activeReports = reports.filter(
    (r) => r.status !== 'resolved' && r.status !== 'dismissed'
  );

  const now = new Date().toISOString();
  const actionId = input.existingActionId || `act-${locationId}-${Date.now().toString(36)}`;
  const isSimulated = reports.some((r) => r.isSimulated);

  // If there are no active reports and risk is low, no urgent intervention required
  if (activeReports.length === 0 && riskEvaluation.band === 'low') {
    return {
      id: actionId,
      locationId,
      locationName,
      title: 'Routine Environmental Telemetry Monitoring',
      type: 'monitor',
      priority: 'low',
      status: 'resolved',
      reason: 'No active community incident reports. Ambient weather and supply conditions remain within baseline parameters.',
      confidence: riskEvaluation.evidenceConfidenceLabel,
      createdAt: now,
      updatedAt: now,
      isSimulated,
    };
  }

  // 1. Weak evidence rule: weak evidence should trigger verification, not assertion of confirmed failure
  if (riskEvaluation.evidenceConfidenceLabel === 'weak' && activeReports.length > 0) {
    const primaryReport = activeReports[0];
    return {
      id: actionId,
      locationId,
      locationName,
      title: `Dispatch Field Agent: Verify Uncorroborated ${primaryReport.type.replace('_', ' ').toUpperCase()} Report`,
      type: 'verify_shortage',
      priority: 'moderate',
      status: 'pending',
      reason: `Preliminary community report received (Severity ${primaryReport.severity}/5), but evidence confidence is weak (${riskEvaluation.components.evidenceConfidence}/100). On-site verification required before resource dispatch.`,
      confidence: 'weak',
      createdAt: now,
      updatedAt: now,
      isSimulated,
    };
  }

  // 2. Suspected Leak inspection rule
  const leakReports = activeReports.filter((r) => r.type === 'suspected_leak');
  if (leakReports.length > 0) {
    const maxSeverity = Math.max(...leakReports.map((r) => r.severity));
    const priority: RiskBand = maxSeverity >= 4 ? 'critical' : maxSeverity >= 3 ? 'high' : 'moderate';
    return {
      id: actionId,
      locationId,
      locationName,
      title: `Urgent Inspection: Suspected Distribution Pipeline Leak`,
      type: 'inspect_leak',
      priority,
      status: 'pending',
      reason: `${leakReports.length} report(s) of suspected water loss or visible pipe rupture (max severity ${maxSeverity}/5). Immediate acoustic/pressure testing recommended to prevent systemic supply loss during heat stress.`,
      confidence: riskEvaluation.evidenceConfidenceLabel,
      createdAt: now,
      updatedAt: now,
      isSimulated,
    };
  }

  // 3. Severe Water Shortage verification & emergency tanker routing
  const shortageReports = activeReports.filter((r) => r.type === 'water_shortage');
  if (shortageReports.length > 0) {
    const maxSeverity = Math.max(...shortageReports.map((r) => r.severity));
    const isCritical = riskEvaluation.band === 'critical' || maxSeverity >= 4;
    return {
      id: actionId,
      locationId,
      locationName,
      title: isCritical
        ? 'Priority Response: Deploy Emergency Water Relief & Inspect Supply Feeder'
        : 'Verify Water Shortage & Audit Valve Operations',
      type: 'verify_shortage',
      priority: riskEvaluation.band,
      status: 'pending',
      reason: `${shortageReports.length} resident report(s) of water deficit combined with heat score ${riskEvaluation.components.heat}/100. Verification needed to assess reservoir booster pump state and schedule emergency supply.`,
      confidence: riskEvaluation.evidenceConfidenceLabel,
      createdAt: now,
      updatedAt: now,
      isSimulated,
    };
  }

  // 4. Supply Interruption rule
  const supplyReports = activeReports.filter((r) => r.type === 'supply_interruption');
  if (supplyReports.length > 0) {
    return {
      id: actionId,
      locationId,
      locationName,
      title: 'Audit Distribution Pressure & Feeder Line Status',
      type: 'check_supply',
      priority: riskEvaluation.band,
      status: 'pending',
      reason: `${supplyReports.length} report(s) citing supply interruption. Coordinate with municipal water board to verify schedule adherence.`,
      confidence: riskEvaluation.evidenceConfidenceLabel,
      createdAt: now,
      updatedAt: now,
      isSimulated,
    };
  }

  // Fallback monitoring rule
  return {
    id: actionId,
    locationId,
    locationName,
    title: 'Monitor Zone Conditions',
    type: 'monitor',
    priority: riskEvaluation.band,
    status: 'pending',
    reason: `Elevated environmental heat stress (${riskEvaluation.components.heat}/100). Maintain surveillance on neighborhood consumption and report queues.`,
    confidence: riskEvaluation.evidenceConfidenceLabel,
    createdAt: now,
    updatedAt: now,
    isSimulated,
  };
}
