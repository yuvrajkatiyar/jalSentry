# AGENTS.md --- JalSentry

Instructions for AI coding agents working on JalSentry, a hackathon MVP
for the **Heat and Water** track.

## 1. Product goal

Build a usable environmental decision-support application that combines
weather signals and clearly labeled community reports to help prioritize
water-shortage verification and suspected-leak inspections.

**Core workflow:** view locations → inspect weather and reports → submit
a report → recalculate an explainable risk score → review a recommended
action → update the action status → refresh and confirm persistence.

This is a prototype prioritization tool, not an official water-safety,
heat-health, drought, or municipal water-failure prediction system.

## 2. Hackathon constraints

-   Build new project work only after the hackathon opens. Do not copy
    an old project and present it as new.
-   Keep repository history accurate and consistent with the event
    timeline.
-   The submission requires a public repository, a YouTube demo shorter
    than three minutes, and a short write-up.
-   The demo must visibly show AWS being used by the working
    application; mentioning AWS only in documentation is insufficient.
-   Credit third-party code and assets, and use only compatible
    licences.
-   List AI coding tools used in the submission write-up.
-   Verify the official event page for the exact deadline and
    track-specific judging criteria.
-   Do not claim measured impact unless it was measured. Mark simulated
    data as simulated.

## 3. Preferred stack

-   Frontend: Next.js, React, TypeScript, Tailwind CSS.
-   Map: Leaflet / React Leaflet.
-   API: Amazon API Gateway HTTP API.
-   Compute: AWS Lambda with Node.js and TypeScript.
-   Persistence: Amazon DynamoDB.
-   Weather: Open-Meteo or another documented provider with suitable
    terms.
-   Validation: Zod.
-   Tests: use the test runner already configured in the repository; if
    none exists, choose a lightweight TypeScript-compatible option.
-   Deployment: deploy the frontend where practical; the application API
    and persistent data must use AWS.

Do not add PostgreSQL, Prisma, queues, authentication, microservices, or
extra infrastructure unless a concrete MVP requirement justifies the
added setup time. Prefer one table and a small number of Lambda
handlers.

## 4. MVP priorities

### P0 --- Must work

1.  Display a small, clearly scoped set of demo locations on a map.
2.  Show weather observations with source and timestamp.
3.  Accept water-shortage and suspected-leak reports.
4.  Calculate a deterministic, explainable score from 0--100.
5.  Show ranked locations, risk bands, evidence confidence, reasons, and
    recommended actions.
6.  Persist reports and intervention status in DynamoDB.
7.  Support status updates and verify persistence after a refresh.
8.  Show loading, empty, error, and stale-weather states.
9.  Provide a deployed end-to-end flow suitable for a recorded demo.

### P1 --- Only after P0 is stable

-   Refresh weather automatically.
-   Filter reports and actions.
-   Show resolved issues and basic operational counts.
-   Add notifications only if deployment and testing time remains.

### Explicitly out of scope

-   Training a custom ML model.
-   IoT hardware or sensor integrations.
-   Full-city hydrology or water-network simulation.
-   Native mobile applications.
-   Claims of actual water saved, shortages prevented, or dispatch
    efficiency improved without measured evidence.

## 5. Architecture and boundaries

Expected flow:

`Next.js UI → API Gateway → Lambda → DynamoDB`

The Lambda backend retrieves weather from the selected provider and
returns normalized data to the UI. Do not expose provider secrets or AWS
credentials in browser code. Never allow direct unauthenticated browser
writes to DynamoDB.

Keep business logic independent from AWS SDK code where practical:

-   `calculateRiskScore()` --- pure scoring logic.
-   `buildRecommendedAction()` --- pure rule-based recommendation.
-   Weather adapter --- fetches and normalizes provider data.
-   Repository layer --- DynamoDB read/write operations.
-   Route/handler layer --- validates requests and maps errors to HTTP
    responses.

Use environment variables for table names and configuration. Grant the
Lambda execution role only the DynamoDB permissions it needs. Configure
API Gateway CORS for the deployed frontend origin; avoid unrestricted
production CORS when a known origin is available.

## 6. API conventions

Use `/api/v1` routes and JSON. Validate all user input with Zod on the
server.

Required endpoints:

-   `GET /api/v1/health`
-   `GET /api/v1/locations`
-   `GET /api/v1/locations/{id}`
-   `GET /api/v1/weather?lat={lat}&lon={lon}`
-   `POST /api/v1/reports`
-   `GET /api/v1/reports`
-   `PATCH /api/v1/reports/{id}`
-   `GET /api/v1/actions`
-   `PATCH /api/v1/actions/{id}`

Use appropriate status codes: `400` invalid input, `404` missing
resource, `429` rate limit, `502`/`503` weather-provider failure, and
`500` unexpected failure. Return safe, structured error messages; never
return secrets or stack traces.

A report should include an ID, location ID, type, severity, description,
status, observation time, creation time, and whether it is simulated or
verified. Generate the creation time and ID server-side. Validate
severity bounds, coordinates, string lengths, and timestamps.

## 7. DynamoDB data model

A single table named `JalSentry` with string partition and sort keys is
sufficient.

Suggested entities:

-   Location: `PK=LOCATION#{locationId}`, `SK=META`
-   Report: `PK=LOCATION#{locationId}`,
    `SK=REPORT#{createdAt}#{reportId}`
-   Action: `PK=ACTION#{actionId}`, `SK=META`

Store timestamps in ISO 8601 UTC format. Add a secondary index only if a
demonstrated query needs it. For a tiny seeded demo dataset, a simpler
ID-keyed table is acceptable if it materially speeds delivery; document
the trade-off.

Use DynamoDB conditional writes or update expressions where useful to
avoid accidentally overwriting unrelated fields. Keep all AWS SDK
operations on the server.

## 8. Risk-scoring rules

Use a deterministic, documented prototype heuristic:

`risk = 0.35 × heat + 0.35 × waterShortage + 0.20 × supplyInterruption + 0.10 × evidenceConfidence`

Each input is normalized to the range 0--100. Clamp the final result to
0--100 and round consistently.

Prototype bands:

-   0--29: low
-   30--49: moderate
-   50--74: high
-   75--100: critical

These are demonstration thresholds, not validated scientific or
public-health thresholds.

Implementation requirements:

-   Keep scoring in a pure, unit-tested function.
-   Handle missing inputs explicitly; do not silently interpret missing
    data as zero risk.
-   Distinguish observed data, user-reported data, and simulated data.
-   Display reasons behind each score and an evidence-confidence label.
-   If data is stale or incomplete, expose that limitation in the UI.
-   Do not imply weather alone proves a local water shortage.
-   Use transparent rule-based recommendations, such as verifying a
    severe shortage report, inspecting a suspected leak, or checking
    supply status.
-   Weak evidence should trigger verification, not an assertion that an
    incident is confirmed.

## 9. Data sourcing and honesty

-   Weather provider: document the exact endpoint, fields, attribution
    requirements, and terms used.
-   Community reports: clearly labeled as unverified until an
    operator verifies them.
-   Seeded locations/reports: mark them as simulated in both the UI and
    API responses.
-   Weather failures: show an error or a cached value with its original
    timestamp and a stale indicator. Never label fallback or seeded
    values as live.
-   Avoid scraping sources or using data without a clear right to use
    it.
-   Never fabricate real-time readings, incidents, verification, or
    impact metrics.

## 10. UI requirements

Build three focused screens or views:

1.  **Operations dashboard:** risk summary, map, ranked hotspots,
    filters, timestamp and data mode.
2.  **Report form:** location, issue type, severity, description,
    observation time, validation and submission feedback.
3.  **Intervention queue:** priority, reason, confidence, status, and
    actions to mark in progress or resolved.

Keep the interface readable on mobile and desktop. Prioritize the
complete workflow over decorative charts. Use accessible labels,
keyboard-friendly controls, clear status text, and visible error states.

## 11. Implementation order

Work in this order and keep the application deployable after each
milestone:

1.  Inspect the existing repository and follow its conventions; do not
    overwrite working code without understanding it.
2.  Scaffold the UI, types, seeded demo fixtures, and basic dashboard.
3.  Implement and test the pure scoring and recommendation functions.
4.  Create DynamoDB and a minimal Lambda/API Gateway vertical slice.
5.  Prove a deployed create-and-read report flow before building more
    UI.
6.  Add weather integration, source timestamps, and stale-data handling.
7.  Connect map, reports, scoring, and intervention status to the real
    API.
8.  Test persistence after refresh and common failure cases.
9.  Deploy and verify the public app and AWS API.
10. Record the demo, finish README/write-up, and submit before the
    official deadline.

If time is short, drop P1 features before compromising the core
end-to-end flow.

## 12. Testing and acceptance criteria

At minimum, test:

-   Risk score boundaries, clamping, and missing-input behavior.
-   Recommendation rules for shortage, suspected leak, weak evidence,
    and resolved cases.
-   Invalid report payloads and severity bounds.
-   Unknown location/report IDs.
-   Weather-provider errors and stale readings.
-   Report creation and retrieval against the deployed API.
-   Action status update and persistence after a browser refresh.
-   UI loading, empty, error, and simulated-data states.
-   Mobile layout and public-link accessibility.

The project is demo-ready only when a new report visibly changes the
relevant location's displayed risk or ranking, a recommendation is shown
with reasons, an action status can be updated, and the change persists
after refresh.

## 13. Three-minute demo sequence

-   `0:00–0:25` --- Explain the local heat/water problem and show the
    map.
-   `0:25–1:00` --- Show weather provenance and submit a shortage
    report.
-   `1:00–1:40` --- Show the recalculated score, ranking, reasons, and
    confidence.
-   `1:40–2:20` --- Create/update an intervention and refresh to prove
    persistence.
-   `2:20–2:45` --- Show the deployed API, Lambda execution/log, and
    DynamoDB record.
-   `2:45–3:00` --- State the intended operational benefit and the
    limitations of the prototype.

Keep the recorded video under three minutes. Verify it opens in a
signed-out browser. Do not rely on features that are mentioned but not
shown working.

## 14. Agent working rules

-   Start by inspecting the repository, package scripts, and current
    implementation.
-   Make small, coherent changes and run the relevant checks after each
    change.
-   Reuse existing dependencies and conventions when reasonable.
-   Do not introduce abstractions or dependencies without a concrete
    need.
-   Do not claim tests, deployment, or AWS operations succeeded unless
    actually verified.
-   Never commit credentials, `.env` files, access keys, private data,
    or unredacted logs.
-   Provide `.env.example` with names and safe placeholders only.
-   Document manual AWS setup steps and required environment variables.
-   Before finishing, report what changed, what was tested, what remains
    incomplete, and the exact commands needed to run the project.
