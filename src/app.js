import { DEFAULT_CONFIG, buildAirtablePayload, rankContractors, scoreJob } from "./routing.js";

const sampleJobs = [
  {
    jobName: "Roof leak repair",
    serviceType: "Roofing",
    urgency: "Emergency",
    estimatedValue: 4200,
    zipCode: "55904",
    badge: "Urgent route",
    media: "gold"
  },
  {
    jobName: "Electrical panel issue",
    serviceType: "Electrical",
    urgency: "High",
    estimatedValue: 3200,
    zipCode: "55904",
    badge: "High value",
    media: "black"
  },
  {
    jobName: "Gutter install",
    serviceType: "Gutters",
    urgency: "Medium",
    estimatedValue: 2600,
    zipCode: "55902",
    badge: "Exterior lane",
    media: "platinum"
  },
  {
    jobName: "HVAC diagnostic",
    serviceType: "HVAC",
    urgency: "High",
    estimatedValue: 1800,
    zipCode: "55906",
    badge: "Fast response",
    media: "silver"
  },
  {
    jobName: "Window replacement",
    serviceType: "Windows",
    urgency: "Medium",
    estimatedValue: 3900,
    zipCode: "55901",
    badge: "Qualified lead",
    media: "gold"
  },
  {
    jobName: "Drywall and trim repair",
    serviceType: "General Repair",
    urgency: "Low",
    estimatedValue: 650,
    zipCode: "55901",
    badge: "Standard queue",
    media: "black"
  }
];

const contractorLanes = [
  {
    name: "Emergency roofing lane",
    detail: "Licensed roofers for leaks, storm damage, and active water intrusion.",
    serviceType: "Roofing",
    urgency: "Emergency",
    estimatedValue: 4200,
    zipCode: "55904",
    badge: "Immediate",
    media: "gold"
  },
  {
    name: "Electrical response lane",
    detail: "Qualified electricians for panels, lighting, and urgent troubleshooting.",
    serviceType: "Electrical",
    urgency: "High",
    estimatedValue: 3200,
    zipCode: "55904",
    badge: "Specialized",
    media: "silver"
  },
  {
    name: "Exterior work lane",
    detail: "Gutters, siding, windows, and weather-facing repair routes.",
    serviceType: "Gutters",
    urgency: "Medium",
    estimatedValue: 2600,
    zipCode: "55902",
    badge: "Matched",
    media: "platinum"
  },
  {
    name: "Mechanical service lane",
    detail: "HVAC and plumbing requests routed by urgency and coverage.",
    serviceType: "HVAC",
    urgency: "High",
    estimatedValue: 1800,
    zipCode: "55906",
    badge: "On-call",
    media: "black"
  },
  {
    name: "General repair lane",
    detail: "Lower-urgency handyman work held cleanly in the standard queue.",
    serviceType: "General Repair",
    urgency: "Low",
    estimatedValue: 650,
    zipCode: "55901",
    badge: "Queue",
    media: "gold"
  }
];

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function renderPriorityJobs() {
  const container = document.querySelector("#priority-jobs");
  container.innerHTML = sampleJobs.map((job) => {
    const result = scoreJob(job);
    return cardTemplate({
      title: job.jobName,
      badge: job.badge,
      media: job.media,
      lineOne: `${job.serviceType} in ${job.zipCode}`,
      lineTwo: `${currency.format(job.estimatedValue)} est. value - Score ${result.score}`,
      saveLabel: result.lane === "Immediate Dispatch" ? "A" : "R"
    });
  }).join("");
}

function renderContractorLanes() {
  const container = document.querySelector("#contractor-lanes");
  container.innerHTML = contractorLanes.map((lane) => {
    const result = scoreJob(lane);
    const matches = rankContractors(lane).slice(0, 1);
    const topMatch = matches[0]?.name || result.contractorType;
    return cardTemplate({
      title: lane.name,
      badge: lane.badge,
      media: lane.media,
      lineOne: lane.detail,
      lineTwo: `${result.lane} - Top match: ${topMatch}`,
      saveLabel: "M"
    });
  }).join("");
}

function cardTemplate({ title, badge, media, lineOne, lineTwo, saveLabel }) {
  return `
    <article class="listing-card">
      <div class="card-media ${media}">
        <span class="card-badge">${badge}</span>
        <span class="card-save">${saveLabel}</span>
      </div>
      <div class="card-copy">
        <b>${title}</b>
        <span>${lineOne}</span>
        <small>${lineTwo}</small>
      </div>
    </article>
  `;
}

function readForm(selector) {
  const form = document.querySelector(selector);
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

function syncDemoForm(input) {
  const form = document.querySelector("#routing-form");
  if (!form) return;
  Object.entries(input).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field) field.value = value;
  });
}

function renderResult(input) {
  const result = scoreJob(input, DEFAULT_CONFIG);
  const matches = rankContractors(input, DEFAULT_CONFIG).slice(0, 3);

  document.querySelector("#result-score").textContent = result.score;
  document.querySelector("#result-lane").textContent = result.lane;
  document.querySelector("#result-contractor").textContent = result.contractorType;
  document.querySelector("#result-reason").textContent = result.reason;

  document.querySelector("#match-list").innerHTML = matches.map((match) => (
    `<li><strong>${match.rank}. ${match.name}</strong><br />Score ${match.matchScore}. ${match.whyMatched}</li>`
  )).join("");

  window.JobTapLastPayload = buildAirtablePayload(input, DEFAULT_CONFIG);
}

function wireForms() {
  const demoForm = document.querySelector("#routing-form");
  const quickForm = document.querySelector("#quick-route-form");

  demoForm.addEventListener("submit", (event) => {
    event.preventDefault();
    renderResult(readForm("#routing-form"));
  });

  demoForm.addEventListener("input", () => renderResult(readForm("#routing-form")));
  demoForm.addEventListener("change", () => renderResult(readForm("#routing-form")));

  quickForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = readForm("#quick-route-form");
    syncDemoForm({ ...input, description: document.querySelector("#description").value });
    renderResult({ ...input, description: document.querySelector("#description").value });
    document.querySelector("#demo").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function boot() {
  renderPriorityJobs();
  renderContractorLanes();
  renderResult(readForm("#routing-form"));
  wireForms();
}

boot();
