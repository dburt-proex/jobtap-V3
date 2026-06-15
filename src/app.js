import {
  DEFAULT_CONFIG,
  buildAirtablePayload,
  buildWebsiteIntakeRecord,
  getNextActions,
  rankContractors,
  scoreJob
} from "./routing.js";

const queueKey = "jobtap.intakeQueue";

const sampleJobs = [
  {
    jobName: "Active roof leak",
    serviceType: "Roofing",
    urgency: "Emergency",
    estimatedValue: 4200,
    zipCode: "55904",
    badge: "Immediate route",
    media: "gold"
  },
  {
    jobName: "Panel replacement",
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
    detail: "Leaks, storm damage, and active water intrusion.",
    serviceType: "Roofing",
    urgency: "Emergency",
    estimatedValue: 4200,
    zipCode: "55904",
    badge: "Immediate",
    media: "gold"
  },
  {
    name: "Electrical response lane",
    detail: "Panels, lighting, and urgent troubleshooting.",
    serviceType: "Electrical",
    urgency: "High",
    estimatedValue: 3200,
    zipCode: "55904",
    badge: "Specialized",
    media: "silver"
  },
  {
    name: "Exterior work lane",
    detail: "Gutters, siding, windows, and weather-facing repair.",
    serviceType: "Gutters",
    urgency: "Medium",
    estimatedValue: 2600,
    zipCode: "55902",
    badge: "Matched",
    media: "platinum"
  },
  {
    name: "Mechanical service lane",
    detail: "HVAC and plumbing requests routed by coverage.",
    serviceType: "HVAC",
    urgency: "High",
    estimatedValue: 1800,
    zipCode: "55906",
    badge: "On-call",
    media: "black"
  },
  {
    name: "General repair lane",
    detail: "Lower-urgency work held cleanly in queue.",
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
      mediaTitle: result.lane,
      lineOne: `${job.serviceType} in ${job.zipCode}`,
      lineTwo: `${currency.format(job.estimatedValue)} est. value`,
      saveLabel: result.score,
      metrics: [result.lane, `Score ${result.score}`, result.contractorType]
    });
  }).join("");
}

function renderContractorLanes() {
  const container = document.querySelector("#contractor-lanes");
  container.innerHTML = contractorLanes.map((lane) => {
    const result = scoreJob(lane);
    const topMatch = rankContractors(lane).slice(0, 1)[0]?.name || result.contractorType;
    return cardTemplate({
      title: lane.name,
      badge: lane.badge,
      media: lane.media,
      mediaTitle: topMatch,
      lineOne: lane.detail,
      lineTwo: result.reason,
      saveLabel: "M",
      metrics: [result.lane, `Top: ${topMatch}`, `Score ${result.score}`]
    });
  }).join("");
}

function cardTemplate({ title, badge, media, mediaTitle, lineOne, lineTwo, saveLabel, metrics }) {
  return `
    <article class="listing-card">
      <div class="card-media ${escapeHtml(media)}">
        <span class="card-badge">${escapeHtml(badge)}</span>
        <span class="card-save">${escapeHtml(String(saveLabel))}</span>
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

function readForm(selector) {
  const form = document.querySelector(selector);
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

function syncIntakeForm(input) {
  const form = document.querySelector("#routing-form");
  if (!form) return;
  Object.entries(input).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field) field.value = value;
  });
}

function renderResult(input, options = {}) {
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
  const count = getQueue().length;
  document.querySelector("#queue-status").textContent = message;
  document.querySelector("#queue-count").textContent = `${count} package${count === 1 ? "" : "s"} queued in this browser session.`;
}

function wireForms() {
  const demoForm = document.querySelector("#routing-form");
  const quickForm = document.querySelector("#quick-route-form");
  const copyButton = document.querySelector("#copy-payload");

  demoForm.addEventListener("submit", (event) => {
    event.preventDefault();
    renderResult(readForm("#routing-form"), { persist: true });
  });

  demoForm.addEventListener("input", () => renderResult(readForm("#routing-form")));
  demoForm.addEventListener("change", () => renderResult(readForm("#routing-form")));

  quickForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = readForm("#quick-route-form");
    const description = document.querySelector("#description").value;
    syncIntakeForm({ ...input, description });
    renderResult({ ...readForm("#routing-form"), ...input, description });
    document.querySelector("#intake").scrollIntoView({ behavior: "smooth", block: "start" });
  });

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

function wireHeroCanvas() {
  const canvas = document.querySelector("#hero-canvas");
  if (!canvas) return;
  const context = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pointer = { x: 0, y: 0, active: false };
  let width = 0;
  let height = 0;
  let frame = 0;
  let animationId = 0;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw() {
    frame += reduceMotion ? 0 : 1;
    const t = frame / 60;
    const px = pointer.active ? (pointer.x - .5) * 28 : Math.sin(t * .35) * 8;
    const py = pointer.active ? (pointer.y - .5) * 18 : Math.cos(t * .28) * 6;

    context.clearRect(0, 0, width, height);
    drawBackdrop(context, width, height, t, px, py);
    drawHouse(context, width, height, t, px, py);
    drawRouteOverlay(context, width, height, t);
    drawCrew(context, width, height, t, px, py);

    if (!reduceMotion) animationId = requestAnimationFrame(draw);
  }

  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / rect.width;
    pointer.y = (event.clientY - rect.top) / rect.height;
    pointer.active = true;
  }

  window.addEventListener("resize", () => {
    resize();
    if (reduceMotion) draw();
  });
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", () => { pointer.active = false; });

  resize();
  draw();
  return () => cancelAnimationFrame(animationId);
}

function drawBackdrop(ctx, width, height, t, px, py) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#191919");
  gradient.addColorStop(.48, "#2a2418");
  gradient.addColorStop(1, "#0d0d0d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = .22;
  for (let i = 0; i < 42; i += 1) {
    const x = ((i * 173 + t * 12) % (width + 160)) - 80 + px * .25;
    const y = 80 + ((i * 71) % Math.max(1, height - 160)) + py * .18;
    ctx.fillStyle = i % 3 === 0 ? "#b9934c" : "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, i % 3 === 0 ? 1.8 : 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHouse(ctx, width, height, t, px, py) {
  const houseW = Math.min(760, width * .48);
  const houseH = Math.min(440, height * .54);
  const x = width - houseW - 74 + px;
  const y = height * .2 + py;
  const panelH = houseH / 12;

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(255,255,255,.08)";
  ctx.fillRect(0, 64, houseW, houseH);

  ctx.fillStyle = "rgba(185,147,76,.88)";
  ctx.beginPath();
  ctx.moveTo(-22, 72);
  ctx.lineTo(houseW * .5, 0);
  ctx.lineTo(houseW + 22, 72);
  ctx.lineTo(houseW, 96);
  ctx.lineTo(0, 96);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < 12; i += 1) {
    const progress = Math.min(1, Math.max(0, (t * .24 + i * .12) % 1.35));
    const slide = (1 - progress) * 92;
    ctx.fillStyle = i % 2 === 0 ? "rgba(238,232,219,.82)" : "rgba(199,194,181,.82)";
    ctx.fillRect(slide, 100 + i * panelH, houseW - slide, panelH - 3);
    ctx.fillStyle = "rgba(17,17,17,.18)";
    ctx.fillRect(slide, 100 + i * panelH + panelH - 5, houseW - slide, 2);
  }

  drawWindow(ctx, houseW * .18, 165, 106, 88);
  drawWindow(ctx, houseW * .62, 178, 120, 98);
  ctx.fillStyle = "rgba(17,17,17,.72)";
  ctx.fillRect(houseW * .42, houseH + 14, 92, 124);
  ctx.restore();
}

function drawWindow(ctx, x, y, w, h) {
  ctx.fillStyle = "rgba(17,17,17,.72)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(255,255,255,.42)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + 10);
  ctx.lineTo(x + w / 2, y + h - 10);
  ctx.moveTo(x + 10, y + h / 2);
  ctx.lineTo(x + w - 10, y + h / 2);
  ctx.stroke();
}

function drawCrew(ctx, width, height, t, px, py) {
  const baseY = height * .74;
  const workerX = width * .67 + Math.sin(t * 1.4) * 8 + px * .4;
  const helperX = width * .83 + Math.cos(t * 1.1) * 5 + px * .25;
  drawWorker(ctx, workerX, baseY + py * .2, t, "#b9934c");
  drawWorker(ctx, helperX, baseY + 28 + py * .16, t + 1.4, "#ded8cc");

  ctx.strokeStyle = "rgba(185,147,76,.68)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(workerX + 28, baseY - 72);
  ctx.lineTo(workerX + 116 + Math.sin(t * 1.7) * 14, baseY - 112);
  ctx.stroke();
}

function drawWorker(ctx, x, y, t, accent) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(0, -92, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(17,17,17,.82)";
  ctx.fillRect(-14, -76, 28, 52);
  ctx.strokeStyle = "rgba(255,255,255,.74)";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, -58);
  ctx.lineTo(-26 + Math.sin(t * 1.8) * 4, -30);
  ctx.moveTo(8, -58);
  ctx.lineTo(31 + Math.cos(t * 1.5) * 5, -34);
  ctx.moveTo(-7, -24);
  ctx.lineTo(-18, 10);
  ctx.moveTo(8, -24);
  ctx.lineTo(20, 10);
  ctx.stroke();
  ctx.restore();
}

function drawRouteOverlay(ctx, width, height, t) {
  const startX = width * .58;
  const startY = height * .31;
  const endX = width * .86;
  const endY = height * .58;
  ctx.save();
  ctx.strokeStyle = "rgba(185,147,76,.42)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 12]);
  ctx.lineDashOffset = -t * 18;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(width * .7, height * .22, width * .78, height * .7, endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);
  [
    [startX, startY, "87"],
    [width * .72, height * .43, "match"],
    [endX, endY, "dispatch"]
  ].forEach(([x, y, label]) => {
    ctx.fillStyle = "rgba(17,17,17,.72)";
    ctx.beginPath();
    ctx.roundRect(x - 38, y - 18, 76, 36, 18);
    ctx.fill();
    ctx.fillStyle = "#b9934c";
    ctx.font = "800 13px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y + 1);
  });
  ctx.restore();
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
  wireHeroCanvas();
  renderPriorityJobs();
  renderContractorLanes();
  renderResult(readForm("#routing-form"));
  wireForms();
  wireScrolling();
  wireMobileMenu();
}

boot();
