# JobTap.OS

AI-assisted job scoring, contractor matching, and service pipeline control for local contractor networks.

JobTap.OS is a static showcase plus working routing demo. It takes an incoming job request, scores urgency and value, identifies the right contractor lane, ranks eligible contractors, and produces an Airtable-ready handoff package.

## Current Status

This repo now contains:

- premium marketplace-style landing page
- working intake/routing flow
- contractor match ranking logic
- Airtable-ready payload generation
- GitHub Pages deployment workflow
- documented Airtable operating model
- future backend path that keeps Airtable credentials out of the browser

## Live Site

Expected GitHub Pages URL:

```text
https://dburt-proex.github.io/jobtap-V3/
```

A GitHub Actions Pages workflow is included at:

```text
.github/workflows/pages.yml
```

For GitHub Pages, the repo should use one of these settings:

```text
Settings -> Pages -> Build and deployment -> Source: GitHub Actions
```

or, for branch deploys:

```text
Settings -> Pages -> Deploy from a branch -> main / root
```

If the live URL returns `403`, the usual issue is that GitHub Pages is not enabled for the repository or the source is not set. The static files and deployment workflow are now present in the repo.

## Repo Tree

```text
jobtap-V3/
├── .github/
│   └── workflows/
│       └── pages.yml
├── data/
│   └── jobtap.routing.config.json
├── docs/
│   └── airtable-schema.md
├── src/
│   ├── app.js
│   └── routing.js
├── .nojekyll
├── 404.html
├── index.html
├── styles.css
└── README.md
```

## What It Does

JobTap.OS turns scattered service requests into routed work:

1. Captures homeowner/contact context.
2. Normalizes service type, urgency, estimated value, zip code, and notes.
3. Scores the job using deterministic routing rules.
4. Assigns a routing lane: `Immediate Dispatch`, `Priority Review`, or `Standard Queue`.
5. Ranks contractors by specialty, coverage, availability, qualification, and performance.
6. Generates Airtable-ready payloads for `Website Intake Queue`, `Jobs`, and `Matches`.

## Website UX

The homepage is intentionally structured like a premium marketplace rather than a generic SaaS page:

- sticky navigation
- centered category tabs
- rounded routing/search capsule
- horizontal priority job cards
- horizontal contractor lane cards
- operational proof strip
- live intake/routing form
- result panel with score, lane, contractor matches, and next actions
- backend model section

The public CTA is no longer a `mailto:` link. The conversion path is now the on-page intake flow.

## Routing Engine

Core logic lives in `src/routing.js`.

Main exports:

- `normalizeJob(input)`
- `scoreJob(input, config)`
- `rankContractors(input, config)`
- `buildAirtablePayload(input, config)`
- `buildWebsiteIntakeRecord(input, config)`
- `getNextActions(input, config)`
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

## Intake Flow

The browser flow does three things:

1. Scores and routes the job instantly.
2. Ranks the top contractor matches.
3. Builds an Airtable-ready handoff package.

The current static site stores submitted demo packages in `localStorage` under:

```text
jobtap.intakeQueue
```

It also exposes the latest payload for debugging/demo use:

```js
window.JobTapLastPayload
window.JobTapLastSubmission
```

This is intentional for a static GitHub Pages deployment. It proves the workflow without exposing private Airtable credentials.

## Airtable Backend

A working Airtable base named `JobTap` backs the operating model.

Core tables:

- `Website Intake Queue`
- `Homeowners`
- `Jobs`
- `Contractors`
- `Matches`
- `Tasks`
- `Payments`
- `Reviews`
- `Routing Rules`

`Website Intake Queue` is the staging table for public/demo submissions. A production server endpoint should validate the request, write a queue record, then promote qualified work into `Jobs`, `Matches`, and `Tasks`.

Detailed schema documentation is in `docs/airtable-schema.md`.

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

## Future Backend Path

Airtable is the correct early operations backend because it gives fast visibility and easy admin control. It is not the long-term production database.

Recommended path:

1. Keep Airtable as the operator cockpit now.
2. Add a secure API endpoint for website submissions.
3. Write validated submissions into `Website Intake Queue`.
4. Promote qualified records into `Jobs`, `Matches`, and `Tasks`.
5. When product usage grows, move the system of record to Postgres or another production database.
6. Keep Airtable as an admin/reporting surface if useful.

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

The first monetizable offer is:

```text
AI Job Routing Audit + Airtable Dispatch Prototype
```

Recommended starting deliverable:

- intake audit
- routing score design
- Airtable pipeline setup
- contractor matching rules
- dashboard view
- one live workflow demo

## Next Build Steps

1. Enable/confirm GitHub Pages source if the public URL still returns `403`.
2. Add a secure backend endpoint for Airtable writes.
3. Replace sample contractors with live Airtable contractor records.
4. Generate `Jobs`, `Matches`, and `Tasks` from one submitted request.
5. Add admin override and manual dispatch review.
6. Track conversion outcome and revenue generated.
7. Use closed-job feedback to improve contractor ranking.
