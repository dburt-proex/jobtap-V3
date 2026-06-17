import {
  DEFAULT_CONFIG,
  buildAirtablePayload,
  buildWebsiteIntakeRecord,
  getNextActions,
  rankContractors,
  scoreJob
} from "./routing.js";

const queueKey = "jobtap.intakeQueue";
const pendingRouteKey = "jobtap.pendingRoute";

const sampleJobs = [
  { jobName: "Active roof leak", serviceType: "Roofing", urgency: "Emergency", estimatedValue: 4200, zipCode: "55904", badge: "Immediate route", media: "gold" },
  { jobName: "Panel replacement", serviceType: "Electrical", urgency: "High", estimatedValue: 3200, zipCode: "55904", badge: "High value", media: "black" },
  { jobName: "Siding repair", serviceType: "Siding", urgency: "High", estimatedValue: 3600, zipCode: "55902", badge: "Exterior lane", media: "platinum" },
  { jobName: "Gutter install", serviceType: "Gutters", urgency: "Medium", estimatedValue: 2600, zipCode: "55902", badge: "Drainage route", media: "platinum" },
  { jobName: "HVAC diagnostic", serviceType: "HVAC", urgency: "High", estimatedValue: 1800, zipCode: "55906", badge: "Fast response", media: "silver" },
  { jobName: "Window replacement", serviceType: "Windows", urgency: "Medium", estimatedValue: 3900, zipCode: "55901", badge: "Qualified lead", media: "gold" },
  { jobName: "Plumbing leak", serviceType: "Plumbing", urgency: "Emergency", estimatedValue: 2100, zipCode: "55904", badge: "Emergency route", media: "silver" },
  { jobName: "Drywall and trim repair", serviceType: "General Repair", urgency: "Low", estimatedValue: 650, zipCode: "55901", badge: "Standard queue", media: "black" }
];

const contractorLanes = [
  { name: "Emergency roofing lane", detail: "Leaks, storm damage, and active water intrusion.", serviceType: "Roofing", urgency: "Emergency", estimatedValue: 4200, zipCode: "55904", badge: "Immediate", media: "gold" },
  { name: "Electrical response lane", detail: "Panels, lighting, and urgent troubleshooting.", serviceType: "Electrical", urgency: "High", estimatedValue: 3200, zipCode: "55904", badge: "Specialized", media: "silver" },
  { name: "Siding crew lane", detail: "Weather-facing siding repair, install, and exterior finish work.", serviceType: "Siding", urgency: "High", estimatedValue: 3600, zipCode: "55902", badge: "Exterior", media: "platinum" },
  { name: "Exterior drainage lane", detail: "Gutters, downspouts, fascia, and runoff control.", serviceType: "Gutters", urgency: "Medium", estimatedValue: 2600, zipCode: "55902", badge: "Matched", media: "platinum" },
  { name: "Mechanical service lane", detail: "HVAC and plumbing requests routed by coverage.", serviceType: "HVAC", urgency: "High", estimatedValue: 1800, zipCode: "55906", badge: "On-call", media: "black" },
  { name: "General repair lane", detail: "Lower-urgency work held cleanly in queue.", serviceType: "General Repair", urgency: "Low", estimatedValue: 650, zipCode: "55901", badge: "Queue", media: "gold" }
];

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function renderPriorityJobs() {
  const container = document.querySelector("#priority-jobs");
  if (!container) return;
  const jobs = document.body.dataset.preview === "true" ? sampleJobs.slice(0, 4) : sampleJobs;
  container.innerHTML = jobs.map((job) => {
    const result = scoreJob(job);
    return cardTemplate({
      title: job.jobName,
      badge: job.badge,
      media: job.media,
      serviceType: job.serviceType,
      mediaTitle: representativeLabel(job.serviceType),
      lineOne: `${job.serviceType} in ${job.zipCode}`,
      lineTwo: `${currency.format(job.estimatedValue)} est. value`,
      saveLabel: result.score,
      metrics: [result.lane, `Score ${result.score}`, result.contractorType]
    });
  }).join("");
}

function renderContractorLanes() {
  const container = document.querySelector("#contractor-lanes");
  if (!container) return;
  const lanes = document.body.dataset.preview === "true" ? contractorLanes.slice(0, 4) : contractorLanes;
  container.innerHTML = lanes.map((lane) => {
    const result = scoreJob(lane);
    const topMatch = rankContractors(lane).slice(0, 1)[0]?.name || result.contractorType;
    return cardTemplate({
      title: lane.name,
      badge: lane.badge,
      media: lane.media,
      serviceType: lane.serviceType,
      mediaTitle: representativeLabel(lane.serviceType),
      lineOne: lane.detail,
      lineTwo: result.reason,
      saveLabel: "M",
      metrics: [result.lane, `Top: ${topMatch}`, `Score ${result.score}`]
    });
  }).join("");
}

function cardTemplate({ title, badge, media, serviceType, mediaTitle, lineOne, lineTwo, saveLabel, metrics }) {
  const serviceClass = `service-${slugify(serviceType)}`;
  return `
    <article class="listing-card">
      <div class="card-media ${escapeHtml(media)} ${escapeHtml(serviceClass)}">
        <span class="card-badge">${escapeHtml(badge)}</span>
        <span class="card-save">${escapeHtml(String(saveLabel))}</span>
        <div class="service-symbol" aria-hidden="true"></div>
        <div class="media-shell">
          <b>${escapeHtml(mediaTitle)}</b>
          <div class="media-bars"><span></span><span></span><span></span></div>
        </div>
      </div>
      <div class="card-copy">
        <b>${escapeHtml(title)}</b>
        <span>${escapeHtml(lineOne)}</span>
        <small>${escapeHtml(lineTwo)}</small>
        <div class="card-metrics">${metrics.map((item) => `<em>${escapeHtml(item)}</em>`).join("")}</div>
      </div>
    </article>
  `;
}

function representativeLabel(serviceType) {
  return {
    Roofing: "Shingle roof",
    Electrical: "Panel work",
    Siding: "Siding crew",
    Gutters: "Gutter run",
    HVAC: "HVAC unit",
    Windows: "Window install",
    Plumbing: "Pipe repair",
    "General Repair": "Tool crew"
  }[serviceType] || "Service route";
}

function slugify(value) {
  return String(value || "service").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function readForm(selector) {
  const form = document.querySelector(selector);
  if (!form) return {};
  return Object.fromEntries(new FormData(form).entries());
}

function syncIntakeForm(input) {
  const form = document.querySelector("#routing-form");
  if (!form) return;
  Object.entries(input).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field) field.value = value;
  });
}

function applyPendingRoute() {
  const form = document.querySelector("#routing-form");
  if (!form) return;
  try {
    const pending = JSON.parse(sessionStorage.getItem(pendingRouteKey) || "null");
    if (!pending) return;
    sessionStorage.removeItem(pendingRouteKey);
    syncIntakeForm({ ...pending, description: document.querySelector("#description")?.value || "" });
  } catch {
    sessionStorage.removeItem(pendingRouteKey);
  }
}

function renderResult(input, options = {}) {
  if (!document.querySelector(".result-panel")) return null;
  const result = scoreJob(input, DEFAULT_CONFIG);
  const matches = rankContractors(input, DEFAULT_CONFIG).slice(0, 3);
  const intakeRecord = buildWebsiteIntakeRecord(input, DEFAULT_CONFIG);
  const actions = getNextActions(input, DEFAULT_CONFIG);

  document.querySelector("#result-score").textContent = result.score;
  document.querySelector("#result-lane").textContent = result.lane;
  document.querySelector("#result-contractor").textContent = result.contractorType;
  document.querySelector("#result-reason").textContent = result.reason;

  document.querySelector("#match-list").innerHTML = matches.map((match) => (
    `<li><strong>${match.rank}. ${escapeHtml(match.name)}</strong><br />Score ${match.matchScore}. ${escapeHtml(match.whyMatched)}</li>`
  )).join("");
  document.querySelector("#action-list").innerHTML = actions.map((action) => `<li>${escapeHtml(action)}</li>`).join("");

  window.JobTapLastPayload = buildAirtablePayload(input, DEFAULT_CONFIG);
  window.JobTapLastSubmission = intakeRecord;

  if (options.persist) {
    persistSubmission(intakeRecord);
    updateQueueStatus(`Queued ${intakeRecord.fields["Submission ID"]} for secure API handoff.`);
  } else {
    updateQueueStatus("Ready to submit.");
  }
  return intakeRecord;
}

function persistSubmission(intakeRecord) {
  const queue = getQueue();
  queue.unshift({ ...intakeRecord, queuedAt: new Date().toISOString() });
  localStorage.setItem(queueKey, JSON.stringify(queue.slice(0, 25)));
}

function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(queueKey) || "[]");
  } catch {
    return [];
  }
}

function updateQueueStatus(message) {
  const status = document.querySelector("#queue-status");
  const countLabel = document.querySelector("#queue-count");
  if (!status || !countLabel) return;
  const count = getQueue().length;
  status.textContent = message;
  countLabel.textContent = `${count} package${count === 1 ? "" : "s"} queued in this browser session.`;
}

function wireForms() {
  const demoForm = document.querySelector("#routing-form");
  const quickForm = document.querySelector("#quick-route-form");
  const copyButton = document.querySelector("#copy-payload");

  if (demoForm) {
    demoForm.addEventListener("submit", (event) => {
      event.preventDefault();
      renderResult(readForm("#routing-form"), { persist: true });
    });
    demoForm.addEventListener("input", () => renderResult(readForm("#routing-form")));
    demoForm.addEventListener("change", () => renderResult(readForm("#routing-form")));
  }

  if (quickForm) {
    quickForm.addEventListener("submit", (event) => {
      event.preventDefault();
      sessionStorage.setItem(pendingRouteKey, JSON.stringify(readForm("#quick-route-form")));
      window.location.href = "intake.html";
    });
  }

  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      const current = JSON.stringify(window.JobTapLastSubmission || {}, null, 2);
      try {
        await navigator.clipboard.writeText(current);
        updateQueueStatus("Copied current intake package to clipboard.");
      } catch {
        updateQueueStatus("Current package is available at window.JobTapLastSubmission.");
      }
    });
  }
}

function wireScrolling() {
  document.querySelectorAll("[data-scroll-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.scrollTarget);
      const direction = button.dataset.scrollDirection === "prev" ? -1 : 1;
      if (!target) return;
      target.scrollBy({ left: direction * Math.round(target.clientWidth * 0.85), behavior: "smooth" });
    });
  });
}

function wireMobileMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector("#mobile-menu");
  if (!toggle || !menu) return;
  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    menu.hidden = isOpen;
  });
  menu.addEventListener("click", (event) => {
    if (event.target.tagName !== "A") return;
    toggle.setAttribute("aria-expanded", "false");
    menu.hidden = true;
  });
}

function markActiveNav() {
  const page = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-page]").forEach((link) => {
    if (link.dataset.page === page) link.setAttribute("aria-current", "page");
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[char]));
}

function boot() {
  applyPendingRoute();
  renderPriorityJobs();
  renderContractorLanes();
  renderResult(readForm("#routing-form"));
  wireForms();
  wireScrolling();
  wireMobileMenu();
  markActiveNav();
}

boot();
