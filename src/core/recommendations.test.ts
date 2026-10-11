import { describe, expect, it } from 'vitest';
import { buildRecommendedAction } from './recommendations';
import { CommunityReport, RiskEvaluation } from './types';

function createMockRiskEvaluation(overrides: Partial<RiskEvaluation> = {}): RiskEvaluation {
  return {
    overallScore: 20,
    band: 'low',
    components: {
      heat: 20,
      waterShortage: 0,
      supplyInterruption: 0,
      evidenceConfidence: 30,
    },
    reasons: ['Baseline test'],
    evidenceConfidenceLabel: 'weak',
    missingInputs: [],
    calculatedAt: new Date().toISOString(),
    isSimulated: true,
    ...overrides,
  };
}

describe('buildRecommendedAction', () => {
  it('returns routine monitoring when no active reports and risk is low', () => {
    const action = buildRecommendedAction({
      locationId: 'loc1',
      locationName: 'Test Zone',
      reports: [],
      riskEvaluation: createMockRiskEvaluation({ band: 'low', evidenceConfidenceLabel: 'weak' }),
    });

    expect(action).not.toBeNull();
    expect(action?.type).toBe('monitor');
    expect(action?.priority).toBe('low');
    expect(action?.status).toBe('resolved');
  });

  it('triggers verification rather than confirmed emergency when evidence confidence is weak', () => {
    const reports: CommunityReport[] = [
      {
        id: 'r1',
        locationId: 'loc1',
        type: 'water_shortage',
        severity: 4,
        description: 'Single unverified report',
        status: 'unverified',
        observationTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isSimulated: false,
      },
    ];

    const action = buildRecommendedAction({
      locationId: 'loc1',
      locationName: 'Test Zone',
      reports,
      riskEvaluation: createMockRiskEvaluation({
        band: 'moderate',
        evidenceConfidenceLabel: 'weak',
        components: { heat: 40, waterShortage: 72, supplyInterruption: 0, evidenceConfidence: 20 },
      }),
    });

    expect(action).not.toBeNull();
    expect(action?.type).toBe('verify_shortage');
    expect(action?.title).toContain('Verify Uncorroborated');
    expect(action?.confidence).toBe('weak');
  });

  it('recommends urgent acoustic leak inspection when suspected leak is reported', () => {
    const reports: CommunityReport[] = [
      {
        id: 'r1',
        locationId: 'loc1',
        type: 'suspected_leak',
        severity: 4,
        description: 'Main pipe burst under sidewalk',
        status: 'unverified',
        observationTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isSimulated: false,
      },
    ];

    const action = buildRecommendedAction({
      locationId: 'loc1',
      locationName: 'Test Zone',
      reports,
      riskEvaluation: createMockRiskEvaluation({
        band: 'high',
        evidenceConfidenceLabel: 'moderate',
        components: { heat: 50, waterShortage: 0, supplyInterruption: 82, evidenceConfidence: 50 },
      }),
    });

    expect(action).not.toBeNull();
    expect(action?.type).toBe('inspect_leak');
    expect(action?.priority).toBe('critical');
    expect(action?.title).toContain('Suspected Distribution Pipeline Leak');
  });

  it('recommends priority water relief when severe shortage reports are verified with high heat', () => {
    const reports: CommunityReport[] = [
      {
        id: 'r1',
        locationId: 'loc1',
        type: 'water_shortage',
        severity: 5,
        description: 'No water for 3 days',
        status: 'verified',
        observationTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isSimulated: true,
      },
    ];

    const action = buildRecommendedAction({
      locationId: 'loc1',
      locationName: 'Test Zone',
      reports,
      riskEvaluation: createMockRiskEvaluation({
        band: 'critical',
        evidenceConfidenceLabel: 'strong',
        components: { heat: 85, waterShortage: 95, supplyInterruption: 0, evidenceConfidence: 75 },
      }),
    });

    expect(action).not.toBeNull();
    expect(action?.type).toBe('verify_shortage');
    expect(action?.priority).toBe('critical');
    expect(action?.title).toContain('Deploy Emergency Water Relief');
  });
});
