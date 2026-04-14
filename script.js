/* ── StudyFlow Feature Voting Board — script.js ─────────── */

/* ── Default seed data ───────────────────────────────────── */
const SEED_FEATURES = [
  {
    id: "f1",
    title: "AI-powered study schedule generator",
    tag: "ambitious",
    tagLabel: "Ambitious",
    votes: 34,
    isNew: false
  },
  {
    id: "f2",
    title: "Pomodoro timer with session tracking",
    tag: "core",
    tagLabel: "Must-have",
    votes: 28,
    isNew: false
  },
  {
    id: "f3",
    title: "Grade calculator and GPA predictor",
    tag: "debate",
    tagLabel: "Debated",
    votes: 21,
    isNew: false
  },
  {
    id: "f4",
    title: "Dark mode for late-night studying",
    tag: "qol",
    tagLabel: "Quality of life",
    votes: 17,
    isNew: false
  },
  {
    id: "f5",
    title: "Study group finder — match by subject",
    tag: "experiment",
    tagLabel: "Experimental",
    votes: 9,
    isNew: false
  }
];

/* ── Storage helpers ─────────────────────────────────────── */
const STORAGE_KEY_FEATURES = "studyflow_features";
const STORAGE_KEY_VOTED    = "studyflow_voted_ids";

function loadFeatures() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FEATURES);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveFeatures(features) {
  try {
    localStorage.setItem(STORAGE_KEY_FEATURES, JSON.stringify(features));
  } catch (e) { /* storage full or unavailable */ }
}

function loadVotedIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VOTED);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
}

function saveVotedIds(votedSet) {
  try {
    localStorage.setItem(STORAGE_KEY_VOTED, JSON.stringify([...votedSet]));
  } catch (e) { /* ignore */ }
}

/* ── State ───────────────────────────────────────────────── */
let features = loadFeatures() || SEED_FEATURES.map(f => ({ ...f }));
let votedIds = loadVotedIds();

/* ── Sorting ─────────────────────────────────────────────── */
function sortedFeatures() {
  return [...features].sort((a, b) => b.votes - a.votes);
}

/* ── Stats ───────────────────────────────────────────────── */
function updateStats() {
  const total  = features.reduce((sum, f) => sum + f.votes, 0);
  const topMax = sortedFeatures()[0]?.votes ?? 0;
  document.getElementById("total-votes").textContent   = total;
  document.getElementById("feature-count").textContent = features.length;
  document.getElementById("top-feature-votes").textContent = topMax;
}

/* ── Tag helper ──────────────────────────────────────────── */
function tagClass(tag) {
  const map = {
    core: "tag-core",
    debate: "tag-debate",
    qol: "tag-qol",
    ambitious: "tag-ambitious",
    experiment: "tag-experiment",
    community: "tag-community"
  };
  return map[tag] || "tag-experiment";
}

/* ── Build a single card element ─────────────────────────── */
function buildCard(feature, rank, maxVotes) {
  const voted  = votedIds.has(feature.id);
  const pct    = maxVotes > 0 ? Math.round((feature.votes / maxVotes) * 100) : 0;
  const isTop  = rank === 1;

  const li = document.createElement("li");
  li.className = "feature-card" + (isTop ? " rank-1" : "");
  li.dataset.id = feature.id;

  li.innerHTML = `
    <span class="feature-rank">#${rank}</span>

    <button
      class="vote-btn ${voted ? "voted" : ""}"
      data-id="${feature.id}"
      aria-label="${voted ? "Already voted" : "Upvote"} — ${feature.title}"
      title="${voted ? "You voted for this" : "Click to upvote"}"
    >
      <span class="vote-arrow">${voted ? "▲" : "△"}</span>
      <span class="vote-count">${feature.votes}</span>
    </button>

    <div class="feature-body">
      <p class="feature-title">${escapeHtml(feature.title)}</p>
      <div class="feature-meta">
        <span class="feature-tag ${tagClass(feature.tag)}">${escapeHtml(feature.tagLabel)}</span>
        ${feature.isNew ? '<span class="badge-new">New</span>' : ""}
      </div>
    </div>

    <div class="progress-wrap">
      <div class="progress-bar" style="width: ${pct}%"></div>
    </div>
  `;

  li.querySelector(".vote-btn").addEventListener("click", handleVote);
  return li;
}

/* ── Render list ─────────────────────────────────────────── */
function render() {
  const list    = document.getElementById("feature-list");
  const sorted  = sortedFeatures();
  const maxVotes = sorted[0]?.votes ?? 1;

  /* Capture current order by id for transition detection */
  const oldOrder = [...list.querySelectorAll(".feature-card")].map(el => el.dataset.id);

  /* Build new cards */
  const newCards = sorted.map((f, i) => buildCard(f, i + 1, maxVotes));

  /* If same ids in same order, just patch counts to avoid full re-render */
  const newOrder = sorted.map(f => f.id);
  const sameOrder = JSON.stringify(oldOrder) === JSON.stringify(newOrder);

  if (sameOrder && oldOrder.length === newOrder.length) {
    /* Just update vote counts and styles in-place */
    sorted.forEach((f, i) => {
      const card = list.querySelector(`[data-id="${f.id}"]`);
      if (!card) return;
      card.querySelector(".vote-count").textContent = f.votes;
      const pct = maxVotes > 0 ? Math.round((f.votes / maxVotes) * 100) : 0;
      card.querySelector(".progress-bar").style.width = pct + "%";
      const isTop = i === 0;
      card.classList.toggle("rank-1", isTop);
    });
  } else {
    /* Full replacement with smooth reorder */
    list.innerHTML = "";
    newCards.forEach(card => list.appendChild(card));
  }

  updateStats();
}

/* ── Vote handler ────────────────────────────────────────── */
function handleVote(e) {
  const btn = e.currentTarget;
  const id  = btn.dataset.id;

  if (votedIds.has(id)) return; /* one vote per feature */

  const feature = features.find(f => f.id === id);
  if (!feature) return;

  feature.votes += 1;
  votedIds.add(id);

  saveFeatures(features);
  saveVotedIds(votedIds);

  render();

  /* Pulse animation on the card that just got voted */
  setTimeout(() => {
    const card = document.querySelector(`[data-id="${id}"]`);
    if (card) {
      card.classList.add("just-voted");
      card.addEventListener("animationend", () => card.classList.remove("just-voted"), { once: true });
    }
  }, 0);
}

/* ── Submit new feature ──────────────────────────────────── */
function handleSubmit() {
  const input = document.getElementById("feature-input");
  const title = input.value.trim();

  if (!title) {
    input.focus();
    return;
  }

  const newFeature = {
    id:       "u_" + Date.now(),
    title:    title,
    tag:      "community",
    tagLabel: "Community",
    votes:    1,
    isNew:    true
  };

  features.push(newFeature);
  votedIds.add(newFeature.id); /* auto-vote your own idea */

  saveFeatures(features);
  saveVotedIds(votedIds);

  input.value = "";
  updateCharCount(0);
  render();

  /* Scroll to the new card */
  setTimeout(() => {
    const card = document.querySelector(`[data-id="${newFeature.id}"]`);
    if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 60);
}

/* ── Char counter ────────────────────────────────────────── */
function updateCharCount(len) {
  const el = document.getElementById("char-count");
  el.textContent = len + " / 120";
  el.style.color = len > 100 ? "#BA7517" : "";
}

/* ── Escape HTML ─────────────────────────────────────────── */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/* ── Event bindings ──────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  render();

  const submitBtn = document.getElementById("submit-btn");
  const input     = document.getElementById("feature-input");

  submitBtn.addEventListener("click", handleSubmit);

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") handleSubmit();
  });

  input.addEventListener("input", () => updateCharCount(input.value.length));
});
