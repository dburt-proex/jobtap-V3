import { DEFAULT_CONFIG, buildAirtablePayload, rankContractors, scoreJob } from "./routing.js";

const sampleJobs = [
  { jobName: "Roof leak repair", serviceType: "Roofing", urgency: "Emergency", estimatedValue: 4200, zipCode: "55904" },
  { jobName: "Panel issue", serviceType: "Electrical", urgency: "High", estimatedValue: 3200, zipCode: "55904" },
  { jobName: "Gutter install", serviceType: "Gutters", urgency: "Medium", estimatedValue: 2600, zipCode: "55902" },
  { jobName: "Drywall patch", serviceType: "General Repair", urgency: "Low", estimatedValue: 650, zipCode: "55901" }
];

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function renderDashboard() {
  const tbody = document.querySelector("#job-table");
  const rows = sampleJobs.map((job) => {
    const result = scoreJob(job);
    const route = result.lane === "Immediate Dispatch" ? result.contractorType : result.lane;
    const pillClass = job.urgency === "Emergency" || job.urgency === "High" ? "hot" : job.urgency === "Medium" ? "ok" : "";
    return `<tr><td>${job.jobName}</td><td><span class="pill ${pillClass}">${job.urgency}</span></td><td class="score">${result.score}</td><td>${route}</td></tr>`;
  }).join("");

  const totalValue = sampleJobs.reduce((sum, job) => sum + job.estimatedValue, 0);
  const urgentCount = sampleJobs.filter((job) => ["Emergency", "High"].includes(job.urgency)).length;

  tbody.innerHTML = rows;
  document.querySelector("#metric-jobs").textContent = sampleJobs.length;
  document.querySelector("#metric-value").textContent = currency.format(totalValue);
  document.querySelector("#metric-urgent").textContent = urgentCount;
}

function readForm() {
  const form = document.querySelector("#routing-form");
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
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

function boot() {
  renderDashboard();
  renderResult(readForm());

  const form = document.querySelector("#routing-form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    renderResult(readForm());
  });

  form.addEventListener("input", () => renderResult(readForm()));
  form.addEventListener("change", () => renderResult(readForm()));
}

boot();
