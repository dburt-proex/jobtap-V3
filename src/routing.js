const DEFAULT_CONFIG = {
  urgencyWeights: {
    Emergency: 45,
    High: 34,
    Medium: 22,
    Low: 10
  },
  serviceFitWeights: {
    specialized: 16,
    general: 8
  },
  value: {
    dollarsPerPoint: 160,
    maxPoints: 35
  },
  lanes: [
    { name: "Immediate Dispatch", minScore: 85 },
    { name: "Priority Review", minScore: 65 },
    { name: "Standard Queue", minScore: 0 }
  ],
  contractorTypes: {
    Roofing: "Licensed Roofer",
    Electrical: "Licensed Electrician",
    HVAC: "HVAC Technician",
    Plumbing: "Licensed Plumber",
    "General Repair": "General Repair Contractor",
    Gutters: "Exterior Crew",
    Siding: "Exterior Crew",
    Windows: "Window Installer",
    Doors: "Door Installer"
  },
  specializedServices: ["Roofing", "Electrical", "HVAC", "Plumbing", "Gutters", "Siding", "Windows", "Doors"],
  contractors: [
    {
      name: "Northline Roofing Crew",
      specialties: ["Roofing", "Gutters", "Siding"],
      availability: "Open",
      qualificationStatus: "Qualified",
      performanceScore: 94,
      zipCoverage: ["55901", "55902", "55904", "55906"],
      minimumJobValue: 500
    },
    {
      name: "Med City Electrical",
      specialties: ["Electrical", "Lighting"],
      availability: "On-call",
      qualificationStatus: "Qualified",
      performanceScore: 91,
      zipCoverage: ["55901", "55902", "55904"],
      minimumJobValue: 300
    },
    {
      name: "Summit Mechanical",
      specialties: ["HVAC", "Plumbing"],
      availability: "Limited",
      qualificationStatus: "Qualified",
      performanceScore: 86,
      zipCoverage: ["55902", "55904", "55906"],
      minimumJobValue: 450
    },
    {
      name: "Fixxer General Repair",
      specialties: ["General Repair", "Drywall Repair", "Carpentry"],
      availability: "Open",
      qualificationStatus: "Qualified",
      performanceScore: 82,
      zipCoverage: ["55901", "55904", "55906"],
      minimumJobValue: 150
    }
  ]
};

const SERVICE_ALIASES = {
  roofing: "Roofing",
  electrical: "Electrical",
  hvac: "HVAC",
  plumbing: "Plumbing",
  "general repair": "General Repair",
  general: "General Repair",
  gutters: "Gutters",
  gutter: "Gutters",
  siding: "Siding",
  windows: "Windows",
  window: "Windows",
  doors: "Doors",
  door: "Doors"
};

const URGENCY_ALIASES = {
  emergency: "Emergency",
  high: "High",
  medium: "Medium",
  low: "Low"
};

function canonicalize(value, aliases, fallback) {
  const key = String(value || "").trim().replace(/[-_]+/g, " ").toLowerCase();
  return aliases[key] || fallback;
}

export function normalizeJob(input) {
  return {
    jobName: input.jobName || `${input.serviceType || "Service"} request`,
    serviceType: canonicalize(input.serviceType, SERVICE_ALIASES, "General Repair"),
    urgency: canonicalize(input.urgency, URGENCY_ALIASES, "Low"),
    estimatedValue: Math.max(0, Number(input.estimatedValue || 0)),
    zipCode: String(input.zipCode || "").trim(),
    description: String(input.description || "").trim()
  };
}

export function scoreJob(input, config = DEFAULT_CONFIG) {
  const job = normalizeJob(input);
  const urgencyPoints = config.urgencyWeights[job.urgency] || 0;
  const valuePoints = Math.min(config.value.maxPoints, Math.floor(job.estimatedValue / config.value.dollarsPerPoint));
  const isSpecialized = config.specializedServices.includes(job.serviceType);
  const serviceFitPoints = isSpecialized ? config.serviceFitWeights.specialized : config.serviceFitWeights.general;
  const score = Math.min(99, urgencyPoints + valuePoints + serviceFitPoints);
  const lane = config.lanes.find((item) => score >= item.minScore) || config.lanes[config.lanes.length - 1];
  const contractorType = config.contractorTypes[job.serviceType] || "Qualified Service Contractor";

  return {
    job,
    score,
    lane: lane.name,
    contractorType,
    reason: buildReason(job, score, lane.name, contractorType),
    components: {
      urgency: urgencyPoints,
      value: valuePoints,
      serviceFit: serviceFitPoints
    }
  };
}

export function rankContractors(input, config = DEFAULT_CONFIG) {
  const result = scoreJob(input, config);
  const { job } = result;

  return config.contractors
    .map((contractor) => {
      const specialtyFit = contractor.specialties.includes(job.serviceType) ? 24 : 0;
      const zipFit = contractor.zipCoverage.includes(job.zipCode) ? 12 : 0;
      const availabilityFit = contractor.availability === "Open" ? 10 : contractor.availability === "On-call" ? 8 : contractor.availability === "Limited" ? 4 : -20;
      const qualificationFit = contractor.qualificationStatus === "Qualified" ? 12 : -30;
      const valueFit = job.estimatedValue >= contractor.minimumJobValue ? 8 : -18;
      const performanceFit = Math.round(contractor.performanceScore * 0.22);
      const matchScore = Math.max(0, Math.min(99, specialtyFit + zipFit + availabilityFit + qualificationFit + valueFit + performanceFit));

      return {
        ...contractor,
        matchScore,
        whyMatched: explainMatch(contractor, job, matchScore)
      };
    })
    .filter((contractor) => contractor.matchScore >= 35)
    .sort((a, b) => b.matchScore - a.matchScore)
    .map((contractor, index) => ({ ...contractor, rank: index + 1 }));
}

export function buildAirtablePayload(input, config = DEFAULT_CONFIG) {
  const result = scoreJob(input, config);
  const matches = rankContractors(input, config);

  return {
    Jobs: {
      "Job Name": result.job.jobName,
      "Service Type": result.job.serviceType,
      Urgency: result.job.urgency,
      Description: result.job.description,
      "Estimated Value": result.job.estimatedValue,
      "Zip Code": result.job.zipCode,
      "Job Score (AI)": result.score,
      "Routing Status": result.lane,
      "Qualified Lead": result.score >= 65
    },
    Matches: matches.slice(0, 3).map((contractor) => ({
      Contractor: contractor.name,
      "Priority Score": result.score,
      "Match Score": contractor.matchScore,
      Rank: contractor.rank,
      "Dispatch Order": contractor.rank,
      "Why Matched": contractor.whyMatched,
      "Match Status": result.lane === "Immediate Dispatch" ? "Assigned" : "Pending"
    }))
  };
}

function buildReason(job, score, lane, contractorType) {
  if (lane === "Immediate Dispatch") {
    return `${job.urgency} ${job.serviceType.toLowerCase()} request with strong value and a clear ${contractorType.toLowerCase()} fit.`;
  }
  if (lane === "Priority Review") {
    return `${job.serviceType} request is valuable enough to confirm quickly before dispatch.`;
  }
  return `${job.serviceType} request can stay in the standard queue until capacity opens.`;
}

function explainMatch(contractor, job, matchScore) {
  const reasons = [];
  if (contractor.specialties.includes(job.serviceType)) reasons.push("service specialty fit");
  if (contractor.zipCoverage.includes(job.zipCode)) reasons.push("zip coverage fit");
  if (contractor.availability === "Open" || contractor.availability === "On-call") reasons.push("available capacity");
  if (contractor.performanceScore >= 90) reasons.push("high performance score");
  return `${contractor.name} scored ${matchScore} from ${reasons.join(", ") || "baseline eligibility"}.`;
}

export { DEFAULT_CONFIG };
