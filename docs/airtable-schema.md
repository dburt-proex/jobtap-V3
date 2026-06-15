# JobTap.OS Airtable Backend Schema

This document describes the Airtable operating model behind JobTap.OS without exposing private base IDs, field IDs, API keys, or connector identifiers.

## Backend Status

The working Airtable base is named `JobTap`. It already contains the main operational tables required for the product. A `Routing Rules` table was added to hold deterministic scoring and routing rules that mirror the website routing engine.

## Core Tables

### Homeowners
Stores customer and lead context.

Recommended fields:

- `Name`
- `Email`
- `Phone`
- `Address`
- `City`
- `State`
- `Zip`
- `Lead Source`
- `Homeowner Notes`
- `Lead Score (AI)`
- `Preferred Contact Method`
- `Property Type`
- `Intent Level`
- `Budget Band`
- `Lifecycle Stage`
- `Response Status`
- `Acquisition Cost`
- linked `Jobs`
- linked `Reviews`

### Jobs
Stores incoming service requests and the AI-assisted routing score.

Recommended fields:

- `Job Name`
- `Service Type`
- `Description`
- `Urgency`
- `Status`
- `Date Requested`
- `Estimated Value`
- `Homeowner`
- `Job Location`
- `Zip Code`
- `City`
- `State`
- `Job Score (AI)`
- `Routing Status`
- `Qualified Lead`
- `First Response Time (mins)`
- `Conversion Stage`
- `Revenue Outcome`
- linked `Matches`
- linked `Tasks`

### Contractors
Stores contractor capability, availability, service area, and performance.

Recommended fields:

- `Contractor Name`
- `Email`
- `Phone`
- `Service Specialties`
- `Certifications`
- `Service Area`
- `Zip Coverage`
- `Availability`
- `Qualification Status`
- `Verified Status`
- `Performance Score`
- `Auto Performance Rating (AI)`
- `Response Time Score`
- `Acceptance Rate`
- `Close Rate`
- `Reliability Score`
- `Minimum Job Value`
- `Max Concurrent Jobs`
- `Priority Tier`
- linked `Matches`
- linked `Tasks`
- linked `Payments`
- linked `Reviews`

### Matches
Stores the contractor ranking and dispatch path for each job.

Recommended fields:

- `Job`
- `Contractor`
- `Match Status`
- `Priority Score`
- `Match Score`
- `Rank`
- `Dispatch Order`
- `Why Matched`
- `Manual Override`
- `Assigned Date`
- `Accepted At`
- `Rejected At`
- `Time to Accept (mins)`
- `Outcome`
- `Revenue Generated`
- `Loss Reason`
- linked `Tasks`
- linked `Payments`
- linked `Reviews`

### Tasks
Stores workflow actions created from job routing events.

Recommended fields:

- `Task Name`
- `Task Type`
- `Description`
- `Due Date`
- `Status`
- `Priority`
- `Task Score (AI)`
- `Execution Lane`
- `Triggered By`
- `Gate Decision`
- `Risk Level`
- `Payload`
- `Result`
- `Webhook Status`
- `External Action ID`
- `Created By Rule`
- linked `Job`
- linked `Contractor`
- linked `Match`

### Payments
Stores money movement and platform fee tracking.

Recommended fields:

- `Payment ID`
- `Match`
- `Contractor`
- `Payment Date`
- `Platform Fee`
- `Contractor Payout`
- `Total Payment Amount`
- `Payment Status`
- `Payment Source`
- `Payment Notes`

### Reviews
Stores feedback loops used to improve contractor routing quality.

Recommended fields:

- `Review ID`
- `Match`
- `Contractor`
- `Homeowner`
- `Review Date`
- `Review Text`
- `Review Score`
- `Review Category`
- `Public Response`
- `Review Source`

### Routing Rules
Stores deterministic scoring and routing rules.

Recommended fields:

- `Rule Name`
- `Rule Type`
- `Applies To Service Type`
- `Applies To Urgency`
- `Score Impact`
- `Routing Lane`
- `Trigger Condition`
- `Action`
- `Status`
- `Notes`

Seeded active rules:

- Emergency urgency boost
- High urgency review
- Specialized service fit
- High value dispatch threshold
- Immediate dispatch lane
- Priority review lane
- Standard queue lane

## Routing Logic

The public website uses the same high-level deterministic model as Airtable:

```text
job_score = urgency_points + value_points + service_fit_points
```

Where:

- `urgency_points`: Emergency 45, High 34, Medium 22, Low 10
- `value_points`: 1 point per $160 estimated value, capped at 35
- `service_fit_points`: 16 for specialized trades, 8 for general repair

Routing lanes:

- `Immediate Dispatch`: score >= 85
- `Priority Review`: score >= 65 and < 85
- `Standard Queue`: score < 65

Contractor match scoring considers:

- service specialty fit
- zip coverage fit
- availability
- qualification status
- minimum job value
- performance score

## Secure Integration Pattern

Do not call Airtable directly from the public browser using a personal token.

Recommended production pattern:

1. Public form submits job intake to a server endpoint.
2. Server validates and normalizes the request.
3. Server applies the routing engine.
4. Server writes the job to `Jobs`.
5. Server ranks eligible contractors from `Contractors`.
6. Server writes top candidates to `Matches`.
7. Server creates follow-up `Tasks` when dispatch, review, or nurture work is needed.

This keeps Airtable credentials server-side and preserves operational control.
