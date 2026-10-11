# JalSentry (जल संतरी)

> **Hackathon MVP — Heat and Water Track**  
> An environmental decision-support system synthesizing live weather telemetry and community incident reports to prioritize municipal water-shortage verification and suspected-leak inspections during peak heat events.

---

## 1. Product Overview

In densely populated metropolitan zones, extreme summer heat accelerates municipal water consumption, depresses distribution pipeline pressure, and exacerbates acute water shortages. Water utility boards face chaotic complaint queues with little objective telemetry to prioritize field verification crews.

**JalSentry** provides an explainable, deterministic triage platform that combines:
1. **Live Open-Meteo Weather Signals:** Apparent temperature (heat stress index), humidity, precipitation, and wind.
2. **Community Incident Reports:** Citizen and ward reports of acute shortages, suspected pipeline leaks, and supply truncations.
3. **Deterministic 0–100 Risk Heuristic:** Explains exactly *why* a neighborhood is flagged and assigns rule-based municipal interventions.
4. **Cloud-Native AWS Persistence:** Amazon DynamoDB single-table store with Amazon API Gateway and AWS Lambda compute.

> **Disclaimer & Honesty Policy:** JalSentry is a prototype prioritization tool, not an official municipal failure prediction system. All initial demo fixtures are explicitly flagged as `[SIMULATED]`. Weather indicates ambient thermal vulnerability and does not prove pipeline failure. Community reports remain labeled `UNVERIFIED` until operator verification.

---

## 2. Architecture & AWS Cloud Integration

```
Next.js 14 (App Router)
       │
       ▼
Amazon API Gateway (HTTP API v2)
       │
       ▼
AWS Lambda (Node.js 20 / TypeScript) ───► Open-Meteo API (CC BY 4.0)
       │
       ▼
Amazon DynamoDB (Single Table: 'JalSentry')
   ├── PK=LOCATION#{id}, SK=META
   ├── PK=LOCATION#{id}, SK=REPORT#{timestamp}#{id}
   └── PK=ACTION#{id},   SK=META
```

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, Leaflet (interactive geospatial pins).
- **API Layer:** Amazon API Gateway HTTP API routing `/api/v1/*` routes.
- **Compute Layer:** AWS Lambda with standalone bundled handler (`dist-lambda/index.js` generated via `esbuild`).
- **Persistence Layer:** Amazon DynamoDB single-table design with conditional updates and update expressions. Includes a built-in memory/local fallback adapter for instant zero-dependency local developer evaluation.
- **Validation:** Zod schemas on all endpoints.
- **Weather Adapter:** Open-Meteo REST API integration with 10-minute in-memory caching and resilient stale-data fallback handling.

---

## 3. Explainable Risk Heuristic

Risk is computed via a pure, unit-tested deterministic function:

$$\text{Risk Score} = 0.35 \times \text{Heat} + 0.35 \times \text{WaterShortage} + 0.20 \times \text{SupplyInterruption} + 0.10 \times \text{EvidenceConfidence}$$

- Clamped strictly between `0` and `100` and rounded to the nearest integer.
- **Prototype Risk Bands:**
  - `0 – 29`: **Low** (Routine monitoring)
  - `30 – 49`: **Moderate** (Heightened surveillance)
  - `50 – 74`: **High** (Field verification recommended)
  - `75 – 100`: **Critical** (Immediate emergency tanker & pressure dispatch)

### Transparent Decision Rules
1. **Weak Evidence Rule:** When evidence confidence is weak (`< 35/100`), the system triggers field verification before dispatching heavy municipal resources.
2. **Suspected Leak Rule:** When active leak or burst reports exist, the system triggers acoustic/pressure testing prioritized by rupture severity.
3. **Severe Shortage Rule:** When reports of acute shortages intersect with extreme heat scores, emergency water tanker relief is recommended.
4. **Missing Telemetry:** If weather telemetry is offline, the system explicitly logs a neutral fallback and marks the limitation in the UI rather than assuming zero risk.

---

## 4. UI Views

The application provides three focused, mobile-responsive views:

1. **Operations Dashboard (`/`):**
   - High-level KPIs (Critical Hotspots, Active Reports, Pending Interventions).
   - Interactive Leaflet map with colored risk pins and detail popups.
   - Ranked hotspots list with component score breakdowns (Heat, Shortage, Supply, Confidence).
   - Modal trigger for submitting incident reports.

2. **Community Report Form & Feed (`/reports`):**
   - Input form for reporting water shortages, leaks, or supply interruptions.
   - Feed of past and active reports with severity tags and simulated indicators.
   - Operator action buttons to transition reports (`Unverified` → `Verified` → `Resolved`).

3. **Intervention Queue (`/interventions`):**
   - Prioritized queue of recommended field dispatches.
   - Operational reasons and evidence confidence ratings.
   - Controls to assign field crews, record dispatch notes, and mark tasks `In Progress` or `Resolved`.
   - Persistence confirmed directly from DynamoDB across browser reloads.

---

## 5. Verification & Testing

The project includes 25 automated unit and integration tests covering:
- Pure risk scoring logic, temperature normalization, and boundary clamping.
- Missing telemetry behavior and stale weather indicator handling.
- Pure recommendation rules for shortages, suspected leaks, and weak evidence.
- Zod schema bounds and error status mapping (`400`, `404`, `502`).
- End-to-end report creation, risk recalculation, and intervention status updates.

Run test suite:
```bash
npm test
```
Result: **25 passed (4 test files, 100% green)**.

---

## 6. Getting Started

### Prerequisites
- Node.js 18+ (tested on Node.js v22.15.0)
- npm 9+ (tested on npm 11.6.4)

### Installation
```bash
git clone <repo-url>
cd jalsentry
npm install
```

### Local Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

In local mode, the application automatically uses the built-in DynamoDB single-table fallback adapter seeded with simulated Delhi NCR demo hotspots. If AWS credentials are set, it connects directly to AWS DynamoDB!

### Build Verification
```bash
# Verify Next.js production build
npm run build

# Bundle standalone AWS Lambda package
npm run build:lambda
```

---

## 7. AWS Deployment (SAM / CloudFormation)

The project includes an AWS Serverless Application Model (SAM) template at `aws/template.yaml`:

### Manual Deploy Steps
1. Configure AWS CLI credentials:
   ```bash
   aws configure
   ```
2. Build the Lambda artifact:
   ```bash
   npm run build:lambda
   ```
3. Deploy stack via SAM:
   ```bash
   # Windows PowerShell
   .\aws\deploy.ps1 -StackName jalsentry-prod -Region us-east-1

   # Linux / macOS
   ./aws/deploy.sh jalsentry-prod us-east-1
   ```
4. Copy the output `HttpApiUrl` from CloudFormation and set `NEXT_PUBLIC_API_URL` in `.env.local`.

---

## 8. Three-Minute Demo Sequence

1. `0:00 – 0:25` — **Problem & Map:** Introduce the heat and water vulnerability problem. Point out the AWS status indicator on the header and explore the live Leaflet map with ranked Delhi hotspots.
2. `0:25 – 1:00` — **Weather & Submit Report:** Inspect weather provenance (Open-Meteo CC BY 4.0). Open the report modal and submit a severe shortage report (Severity 5) for Sangam Vihar.
3. `1:00 – 1:40` — **Recalculation:** Show how the risk score immediately recalculates, the hotspot rank rises to Critical (82/100), and evidence reasons are updated.
4. `1:40 – 2:20` — **Intervention Queue & Persistence:** Navigate to the Intervention Queue (`/interventions`), assign "Field Unit 4", set status to "In Progress", reload the page, and confirm persistence from DynamoDB.
5. `2:20 – 2:45` — **AWS Provenance:** Show the AWS SAM template, Lambda bundle, and DynamoDB single-table keys (`PK=LOCATION#...`, `SK=REPORT#...`).
6. `2:45 – 3:00` — **Wrap-up:** Summarize operational benefits for municipal triage and reiterate prototype limitations.

---

## 9. Credits & Attribution
- **Weather Data:** [Open-Meteo](https://open-meteo.com/) (Licensed under CC BY 4.0).
- **Map Tiles:** &copy; [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
- **Icons:** [Lucide React](https://lucide.dev/).
- **AI Coding Assistance:** Antigravity (Gemini 3.8 Flash).
