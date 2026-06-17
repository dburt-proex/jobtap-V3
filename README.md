# JobTap.OS

AI-assisted job scoring, contractor matching, and service pipeline control for local contractor networks.

JobTap.OS is now structured as a multi-page business website instead of a single mixed landing page/demo. The site separates the product narrative, priority jobs, contractor lanes, live intake, and backend model into clear pages.

## Current Status

This repo contains:

- multi-page business website
- premium home page with quick routing entry
- dedicated priority jobs page
- dedicated contractor lanes page
- dedicated live intake/routing page
- dedicated backend/Airtable operations page
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

Core pages:

```text
/
/jobs.html
/contractors.html
/intake.html
/backend.html
```

A GitHub Actions Pages workflow is included at:

```text
.github/workflows/pages.yml
```

Recommended GitHub Pages setting:

```text
Settings -> Pages -> Build and deployment -> Source: GitHub Actions
```

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
│   ├── routing.js
│   └── tile-backgrounds.css
├── .nojekyll
├── 404.html
├── backend.html
├── contractors.html
├── index.html
├── intake.html
├── jobs.html
├── styles.css
└── README.md
```

## Site Structure

### `index.html`

Business homepage and navigation hub. It explains the JobTap.OS offer, shows the hero motion background, provides a quick route form, and links users into the deeper pages.

### `jobs.html`

Priority job routing page. It shows representative jobs scored by urgency, value, trade fit, and dispatch lane.

### `contractors.html`

Contractor lanes page. It explains how JobTap routes work by specialty, coverage, availability, qualification, and future performance data.

### `intake.html`

Live operational demo. A user can submit a job request, see the score, view the recommended routing lane, inspect top contractor matches, and queue a browser-local handoff package.

### `backend.html`

Airtable/admin model page. It explains how Airtable is used as the early operator cockpit and why production writes should eventually move behind a secure API and production database.

## What It Does

JobTap.OS turns scattered service requests into routed work:

1. Captures homeowner/contact context.
2. Normalizes service type, urgency, estimated value, zip code, and notes.
3. Scores the job using deterministic routing rules.
4. Assigns a routing lane: `Immediate Dispatch`, `Priority Review`, or `Standard Queue`.
5. Ranks contractors by specialty, coverage, availability, qualification, and performance.
6. Generates Airtable-ready payloads for `Website Intake Queue`, `Jobs`, and `Matches`.

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

The home page quick route form stores the request temporarily in `sessionStorage` and opens `intake.html`, where the intake form and result panel load the pending route.

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

1. Add a secure backend endpoint for Airtable writes.
2. Replace sample contractors with live Airtable contractor records.
3. Generate `Jobs`, `Matches`, and `Tasks` from one submitted request.
4. Add admin override and manual dispatch review.
5. Track conversion outcome and revenue generated.
6. Use closed-job feedback to improve contractor ranking.
