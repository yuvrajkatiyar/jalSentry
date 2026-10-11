export type RiskBand = 'low' | 'moderate' | 'high' | 'critical';
export type EvidenceConfidenceLevel = 'weak' | 'moderate' | 'strong';

export type ReportType = 
  | 'water_shortage'
  | 'suspected_leak'
  | 'supply_interruption'
  | 'water_quality';

export type ReportStatus = 
  | 'unverified'
  | 'verified'
  | 'investigating'
  | 'resolved'
  | 'dismissed';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface DemoLocation {
  id: string;
  name: string;
  zone: string;
  coordinates: LocationCoordinates;
  description: string;
  populationServed: number;
  isSimulated: boolean;
}

export interface WeatherObservation {
  latitude: number;
  longitude: number;
  temperatureC: number;
  apparentTemperatureC: number;
  relativeHumidityPercent: number;
  precipitationMm: number;
  windSpeedKmh: number;
  source: string;
  timestamp: string; // ISO 8601 UTC
  isStale: boolean;
  isFallback: boolean;
  heatNormalized: number; // 0 - 100 normalized heat stress
}

export interface CommunityReport {
  id: string;
  locationId: string;
  type: ReportType;
  severity: number; // 1 - 5 scale
  description: string;
  status: ReportStatus;
  observationTime: string; // ISO 8601
  createdAt: string; // ISO 8601 UTC
  isSimulated: boolean;
  reporterContact?: string;
}

export interface RiskScoreComponents {
  heat: number; // 0 - 100
  waterShortage: number; // 0 - 100
  supplyInterruption: number; // 0 - 100
  evidenceConfidence: number; // 0 - 100
}

export interface RiskEvaluation {
  overallScore: number; // 0 - 100
  band: RiskBand;
  components: RiskScoreComponents;
  reasons: string[];
  evidenceConfidenceLabel: EvidenceConfidenceLevel;
  missingInputs: string[];
  calculatedAt: string;
  isSimulated: boolean;
}

export type ActionType = 
  | 'verify_shortage'
  | 'inspect_leak'
  | 'check_supply'
  | 'monitor';

export type ActionStatus = 
  | 'pending'
  | 'in_progress'
  | 'resolved'
  | 'dismissed';

export interface RecommendedAction {
  id: string;
  locationId: string;
  locationName: string;
  title: string;
  type: ActionType;
  priority: RiskBand;
  status: ActionStatus;
  reason: string;
  confidence: EvidenceConfidenceLevel;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isSimulated: boolean;
}

export interface LocationHotspot extends DemoLocation {
  weather?: WeatherObservation;
  reports: CommunityReport[];
  riskEvaluation: RiskEvaluation;
  recommendedAction?: RecommendedAction;
}
