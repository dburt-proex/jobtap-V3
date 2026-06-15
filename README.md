# JobTap.OS

AI-assisted job scoring, contractor matching, and service pipeline control.

JobTap.OS is a lightweight operations layer for local service workflows. It takes an incoming job request, scores urgency and value, identifies the right contractor lane, ranks eligible contractors, and produces a clear dispatch recommendation.

The current repo contains a complete static showcase site plus deterministic routing logic that mirrors the Airtable backend model.

## What It Does

JobTap.OS turns scattered service requests into routed work:

1. Intake a homeowner or service request.
2. Normalize service type, urgency, estimated value, zip code, and notes.
3. Score the job using deterministic routing rules.
4. Assign a routing lane: `Immediate Dispatch`, `Priority Review`, or `Standard Queue`.
5. Rank contractors by specialty, coverage, availability, qualification, and performance.
6. Generate Airtable-ready payloads for `Jobs` and `Matches`.

## Why It Exists

Local service operations often lose value during the handoff: texts, calls, spreadsheets, unclear urgency, slow response, and weak contractor matching.

JobTap.OS solves the first operational bottleneck: deciding which jobs matter most and who should get them first.

## Repo Tree

```text
jobtap-V3/
├── index.html
├── styles.css
├── src/
│   ├── app.js
│   └── routing.js
├── data/
│   └── jobtap.routing.config.json
├── docs/
│   └── airtable-schema.md
└── README.md
```

## Website

`index.html` is the public-facing JobTap.OS showcase page. It includes:

- product positioning
- dashboard preview
- system feature sections
- workflow overview
- interactive routing demo
- Airtable backend model summary
- demo request CTA

The site is intentionally dependency-free. It can run as a static page on GitHub Pages or any basic static host.

## Routing Engine

Core logic lives in `src/routing.js`.

Main exports:

- `normalizeJob(input)`
- `scoreJob(input, config)`
- `rankContractors(input, config)`
- `buildAirtablePayload(input, config)`
- `DEFAULT_CONFIG`

### Score Formula

```text
job_score = urgency_points + value_points + service_fit_points
```

### Urgency Weights

```text
Emergency = 45
High      = 34
Medium    = 22
Low       = 10
```

### Value Weight

```text
value_points = floor(estimated_value / 160)
max_value_points = 35
```

### Service Fit

```text
specialized_trade = 16
general_repair    = 8
```

Specialized services currently include:

- Roofing
- Electrical
- HVAC
- Plumbing
- Gutters
- Siding
- Windows
- Doors

### Routing Lanes

```text
Immediate Dispatch: score >= 85
Priority Review:    score >= 65
Standard Queue:     score < 65
```

## Contractor Matching

Contractor ranking considers:

- service specialty fit
- zip code coverage
- availability
- qualification status
- minimum job value
- contractor performance score

The browser demo uses sample contractor profiles inside `DEFAULT_CONFIG`. In production, those contractor profiles should come from the Airtable `Contractors` table or a server-side API.

## Airtable Backend

A working Airtable base named `JobTap` backs the operating model.

Existing core tables:

- `Homeowners`
- `Jobs`
- `Contractors`
- `Matches`
- `Tasks`
- `Payments`
- `Reviews`

Added table:

- `Routing Rules`

The `Routing Rules` table stores deterministic scoring and routing logic that mirrors the website engine. Seeded rules include urgency boosts, value thresholds, specialized service fit, and routing lane thresholds.

Detailed schema documentation is in `docs/airtable-schema.md`.

## Airtable Mapping

`buildAirtablePayload()` returns a safe object shaped for backend insertion.

Example output shape:

```js
{
  Jobs: {
    "Job Name": "Roofing request",
    "Service Type": "Roofing",
    Urgency: "Emergency",
    "Estimated Value": 4200,
    "Zip Code": "55904",
    "Job Score (AI)": 87,
    "Routing Status": "Immediate Dispatch",
    "Qualified Lead": true
  },
  Matches: [
    {
      Contractor: "Northline Roofing Crew",
      "Priority Score": 87,
      "Match Score": 90,
      Rank: 1,
      "Dispatch Order": 1,
      "Match Status": "Assigned"
    }
  ]
}
```

## Security Rule

Do not expose Airtable API tokens in the browser.

The public site does not include:

- Airtable API keys
- base IDs
- field IDs
- private connector identifiers

Recommended production architecture:

```text
Public website -> secure API endpoint -> routing engine -> Airtable
```

The server endpoint should validate the request, call the routing logic, then write records to Airtable using server-side credentials.

## Local Use

No build step is required. Open `index.html` in a browser or serve the folder with any static server.

Example:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Commercial Wedge

JobTap.OS is strongest as a service-ops proof project and a sellable workflow audit/demo for:

- local contractors
- property managers
- handyman networks
- restoration companies
- emergency repair dispatch
- lead generation operators

The first monetizable offer is not the full software platform. The faster wedge is:

```text
AI Job Routing Audit + Airtable Dispatch Prototype
```

Recommended starting offer:

- intake audit
- routing score design
- Airtable pipeline setup
- contractor matching rules
- dashboard view
- one live workflow demo

## Next Build Steps

1. Add a secure backend endpoint for Airtable writes.
2. Replace sample contractors with live Airtable contractor records.
3. Add real intake form submission.
4. Generate `Jobs`, `Matches`, and `Tasks` from one submitted request.
5. Add admin override and manual dispatch review.
6. Track conversion outcome and revenue generated.
7. Use closed-job feedback to improve contractor ranking.

## Positioning

JobTap.OS is not just a landing page. It is an applied AI operations system showing:

- workflow design
- deterministic scoring
- lead qualification
- contractor matching
- Airtable backend architecture
- revenue-aware routing logic

That makes it a strong AI showcase project because it connects AI workflow logic to operational speed, revenue capture, and field execution.
