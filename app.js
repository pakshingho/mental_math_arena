"use strict";

const STORAGE_KEY = "mentalMathArenaState.v1";
const ROUND_SECONDS = 45;
const SOLO_SECONDS = 60;
const PLAYER_NAME = "You";
const botNames = ["Vector", "Carry", "Prime", "Quotient", "Sigma", "Dash"];
const operations = ["add", "sub", "mul", "div"];

const defaultState = {
  rating: 1000,
  streak: 0,
  bestSolo: 0,
  bestBattle: 0,
  soloSessions: 0,
  soloCorrect: 0,
  soloAttempts: 0,
  wins: 0,
  losses: 0,
  paywallIntent: 0,
  leaderboard: [
    { name: "Nova", rating: 1215, best: 2280 },
    { name: "Flux", rating: 1168, best: 2060 },
    { name: "Talon", rating: 1095, best: 1870 },
    { name: PLAYER_NAME, rating: 1000, best: 0 },
    { name: "Mira", rating: 984, best: 1640 },
    { name: "Byte", rating: 942, best: 1510 }
  ],
  analytics: {
    battleStarts: 0,
    soloStarts: 0,
    paywallTaps: 0
  }
};

const state = loadState();
const solo = {
  active: false,
  op: "mix",
  level: 3,
  timer: SOLO_SECONDS,
  score: 0,
  combo: 0,
  attempts: 0,
  correct: 0,
  current: null,
  interval: null
};

const battle = {
  active: false,
  queued: false,
  op: "mix",
  level: 3,
  timer: ROUND_SECONDS,
  playerScore: 0,
  botScore: 0,
  playerCorrect: 0,
  botCorrect: 0,
  current: null,
  interval: null,
  botInterval: null,
  botName: "Opponent"
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  bindEvents();
  drawArenaCanvas();
  renderAll();
  setFormsEnabled(false, false);
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
});

function bindElements() {
  [
    "profileRating",
    "profileStreak",
    "profileIntent",
    "soloLevelLabel",
    "soloLevel",
    "startSolo",
    "resetSolo",
    "soloTimer",
    "soloScore",
    "soloCombo",
    "soloQuestion",
    "soloForm",
    "soloAnswer",
    "soloFeedback",
    "bestSolo",
    "soloAccuracy",
    "soloSessions",
    "arenaCanvas",
    "battleLevelLabel",
    "battleLevel",
    "queueBattle",
    "queueCopy",
    "playerBattleScore",
    "botBattleScore",
    "playerProgress",
    "botProgress",
    "battleTimer",
    "battleQuestion",
    "battleForm",
    "battleAnswer",
    "battleFeedback",
    "botName",
    "recordSummary",
    "bestBattle",
    "leaderboardRows",
    "clearLocalData",
    "mockSubscribe"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => showTab(button.dataset.tab));
  });

  document.querySelectorAll("[data-solo-op]").forEach((button) => {
    button.addEventListener("click", () => {
      solo.op = button.dataset.soloOp;
      setActiveChip("[data-solo-op]", button);
    });
  });

  document.querySelectorAll("[data-battle-op]").forEach((button) => {
    button.addEventListener("click", () => {
      battle.op = button.dataset.battleOp;
      setActiveChip("[data-battle-op]", button);
    });
  });

  els.soloLevel.addEventListener("input", () => {
    solo.level = Number(els.soloLevel.value);
    els.soloLevelLabel.textContent = String(solo.level);
  });

  els.battleLevel.addEventListener("input", () => {
    battle.level = Number(els.battleLevel.value);
    els.battleLevelLabel.textContent = String(battle.level);
  });

  els.startSolo.addEventListener("click", startSolo);
  els.resetSolo.addEventListener("click", resetSolo);
  els.soloForm.addEventListener("submit", submitSolo);
  els.queueBattle.addEventListener("click", queueBattle);
  els.battleForm.addEventListener("submit", submitBattle);
  els.clearLocalData.addEventListener("click", clearLocalData);
  els.mockSubscribe.addEventListener("click", recordPaywallIntent);

  window.addEventListener("resize", drawArenaCanvas);
}

function showTab(tab) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `${tab}View`);
  });
  if (tab === "train") drawArenaCanvas();
  renderAll();
}

function setActiveChip(selector, active) {
  document.querySelectorAll(selector).forEach((button) => button.classList.remove("active"));
  active.classList.add("active");
}

function startSolo() {
  resetSolo(false);
  solo.active = true;
  solo.timer = SOLO_SECONDS;
  solo.score = 0;
  solo.combo = 0;
  solo.attempts = 0;
  solo.correct = 0;
  solo.current = generateQuestion(solo.op, solo.level);
  state.analytics.soloStarts += 1;
  saveState();
  setFormsEnabled(true, battle.active);
  els.soloFeedback.textContent = "Go.";
  els.soloFeedback.className = "feedback";
  renderSolo();
  els.soloAnswer.focus();
  solo.interval = setInterval(() => {
    solo.timer -= 1;
    if (solo.timer <= 0) finishSolo();
    renderSolo();
  }, 1000);
}

function resetSolo(render = true) {
  clearInterval(solo.interval);
  solo.active = false;
  solo.timer = SOLO_SECONDS;
  solo.score = 0;
  solo.combo = 0;
  solo.attempts = 0;
  solo.correct = 0;
  solo.current = null;
  els.soloAnswer.value = "";
  setFormsEnabled(false, battle.active);
  if (render) {
    els.soloQuestion.textContent = "Ready";
    els.soloFeedback.textContent = "Pick a mode and start the drill.";
    els.soloFeedback.className = "feedback";
    renderSolo();
  }
}

function submitSolo(event) {
  event.preventDefault();
  if (!solo.active || !solo.current) return;
  const answer = parseNumericAnswer(els.soloAnswer.value);
  if (answer === null) return;

  solo.attempts += 1;
  const correct = answer === solo.current.answer;
  if (correct) {
    solo.combo += 1;
    solo.correct += 1;
    solo.score += 80 + solo.level * 18 + Math.min(solo.combo, 10) * 6;
    els.soloFeedback.textContent = "Correct.";
    els.soloFeedback.className = "feedback good";
    solo.current = generateQuestion(solo.op, solo.level);
  } else {
    solo.combo = 0;
    els.soloFeedback.textContent = `Missed. ${solo.current.expression} = ${solo.current.answer}`;
    els.soloFeedback.className = "feedback bad";
    solo.current = generateQuestion(solo.op, solo.level);
  }
  els.soloAnswer.value = "";
  renderSolo();
}

function finishSolo() {
  clearInterval(solo.interval);
  solo.active = false;
  state.bestSolo = Math.max(state.bestSolo, solo.score);
  state.soloSessions += 1;
  state.soloCorrect += solo.correct;
  state.soloAttempts += solo.attempts;
  state.streak = solo.score > 0 ? state.streak + 1 : 0;
  saveState();
  setFormsEnabled(false, battle.active);
  els.soloQuestion.textContent = "Time";
  els.soloFeedback.textContent = `Final score ${solo.score}. Accuracy ${formatPercent(solo.correct, solo.attempts)}.`;
  els.soloFeedback.className = "feedback good";
  renderAll();
}

function queueBattle() {
  if (battle.active || battle.queued) return;
  battle.queued = true;
  battle.botName = botNames[Math.floor(Math.random() * botNames.length)];
  els.queueBattle.disabled = true;
  els.queueCopy.textContent = "Searching...";
  els.battleQuestion.textContent = "Matching";
  els.botName.textContent = battle.botName;
  setTimeout(startBattle, 900 + Math.random() * 900);
}

function startBattle() {
  battle.queued = false;
  battle.active = true;
  battle.timer = ROUND_SECONDS;
  battle.playerScore = 0;
  battle.botScore = 0;
  battle.playerCorrect = 0;
  battle.botCorrect = 0;
  battle.current = generateQuestion(battle.op, battle.level);
  state.analytics.battleStarts += 1;
  saveState();
  els.queueCopy.textContent = `${battle.botName} joined.`;
  els.battleFeedback.textContent = "Battle live.";
  els.battleFeedback.className = "feedback";
  setFormsEnabled(solo.active, true);
  renderBattle();
  els.battleAnswer.focus();

  battle.interval = setInterval(() => {
    battle.timer -= 1;
    if (battle.timer <= 0) finishBattle();
    renderBattle();
  }, 1000);

  scheduleBotAnswer();
}

function submitBattle(event) {
  event.preventDefault();
  if (!battle.active || !battle.current) return;
  const answer = parseNumericAnswer(els.battleAnswer.value);
  if (answer === null) return;

  if (answer === battle.current.answer) {
    battle.playerCorrect += 1;
    battle.playerScore += 100 + battle.level * 20;
    els.battleFeedback.textContent = "Hit.";
    els.battleFeedback.className = "feedback good";
    battle.current = generateQuestion(battle.op, battle.level);
  } else {
    battle.playerScore = Math.max(0, battle.playerScore - 35);
    els.battleFeedback.textContent = "Miss.";
    els.battleFeedback.className = "feedback bad";
  }
  els.battleAnswer.value = "";
  renderBattle();
}

function scheduleBotAnswer() {
  clearTimeout(battle.botInterval);
  if (!battle.active) return;
  const baseDelay = 2100 - battle.level * 180;
  const ratingPressure = Math.max(-350, Math.min(350, state.rating - 1000));
  const adjusted = baseDelay - ratingPressure * 0.9 + Math.random() * 900;
  const delay = Math.max(620, adjusted);
  battle.botInterval = setTimeout(() => {
    if (!battle.active) return;
    const accuracy = Math.max(0.56, 0.9 - battle.level * 0.055);
    if (Math.random() < accuracy) {
      battle.botCorrect += 1;
      battle.botScore += 100 + battle.level * 20;
    } else {
      battle.botScore = Math.max(0, battle.botScore - 20);
    }
    renderBattle();
    scheduleBotAnswer();
  }, delay);
}

function finishBattle() {
  clearInterval(battle.interval);
  clearTimeout(battle.botInterval);
  battle.active = false;
  els.queueBattle.disabled = false;
  setFormsEnabled(solo.active, false);

  const won = battle.playerScore >= battle.botScore;
  const delta = won ? 24 : -18;
  state.rating = Math.max(100, state.rating + delta);
  state.bestBattle = Math.max(state.bestBattle, battle.playerScore);
  if (won) {
    state.wins += 1;
    state.streak += 1;
  } else {
    state.losses += 1;
    state.streak = 0;
  }
  syncPlayerLeaderboard();
  saveState();

  els.battleQuestion.textContent = won ? "Victory" : "Defeat";
  els.battleFeedback.textContent = `${battle.playerScore} - ${battle.botScore}. Rating ${delta > 0 ? "+" : ""}${delta}.`;
  els.battleFeedback.className = won ? "feedback good" : "feedback bad";
  els.queueCopy.textContent = "Ready for the next match.";
  renderAll();
}

function generateQuestion(op, level) {
  const selected = op === "mix" ? operations[Math.floor(Math.random() * operations.length)] : op;
  if (selected === "add") return generateAddition(level);
  if (selected === "sub") return generateSubtraction(level);
  if (selected === "mul") return generateMultiplication(level);
  return generateDivision(level);
}

function generateAddition(level) {
  const [min, max] = rangeFor(level);
  const a = randomInt(min, max);
  const b = randomInt(min, max);
  const c = level >= 4 ? randomInt(10, Math.floor(max / 2)) : 0;
  const answer = a + b + c;
  return { expression: c ? `${a} + ${b} + ${c}` : `${a} + ${b}`, answer };
}

function generateSubtraction(level) {
  const [min, max] = rangeFor(level);
  let a = randomInt(min, max);
  let b = randomInt(min, max);
  if (level < 5 && b > a) [a, b] = [b, a];
  const answer = a - b;
  return { expression: `${a} - ${b}`, answer };
}

function generateMultiplication(level) {
  const ranges = [
    [2, 9, 2, 9],
    [4, 12, 3, 12],
    [8, 24, 4, 16],
    [12, 60, 6, 24],
    [20, 99, 11, 35]
  ];
  const [amin, amax, bmin, bmax] = ranges[level - 1];
  const a = randomInt(amin, amax);
  const b = randomInt(bmin, bmax);
  return { expression: `${a} x ${b}`, answer: a * b };
}

function generateDivision(level) {
  const divisorRanges = [
    [2, 9],
    [3, 12],
    [4, 16],
    [6, 24],
    [8, 35]
  ];
  const quotientRanges = [
    [2, 9],
    [3, 12],
    [5, 18],
    [8, 32],
    [12, 60]
  ];
  const [dmin, dmax] = divisorRanges[level - 1];
  const [qmin, qmax] = quotientRanges[level - 1];
  const divisor = randomInt(dmin, dmax);
  const quotient = randomInt(qmin, qmax);
  return { expression: `${divisor * quotient} / ${divisor}`, answer: quotient };
}

function rangeFor(level) {
  const ranges = [
    [1, 9],
    [10, 49],
    [25, 99],
    [80, 499],
    [150, 999]
  ];
  return ranges[level - 1];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function parseNumericAnswer(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function renderAll() {
  renderProfile();
  renderSolo();
  renderBattle();
  renderLeaderboard();
}

function renderProfile() {
  els.profileRating.textContent = String(state.rating);
  els.profileStreak.textContent = String(state.streak);
  els.profileIntent.textContent = String(state.paywallIntent);
}

function renderSolo() {
  els.soloLevelLabel.textContent = String(solo.level);
  els.soloTimer.textContent = String(Math.max(0, solo.timer));
  els.soloScore.textContent = String(solo.score);
  els.soloCombo.textContent = String(solo.combo);
  els.bestSolo.textContent = String(state.bestSolo);
  els.soloSessions.textContent = String(state.soloSessions);
  els.soloAccuracy.textContent = formatPercent(state.soloCorrect, state.soloAttempts);
  if (solo.current && solo.active) els.soloQuestion.textContent = solo.current.expression;
}

function renderBattle() {
  els.battleLevelLabel.textContent = String(battle.level);
  els.battleTimer.textContent = String(Math.max(0, battle.timer));
  els.playerBattleScore.textContent = String(battle.playerScore);
  els.botBattleScore.textContent = String(battle.botScore);
  els.botName.textContent = battle.botName;
  if (battle.current && battle.active) els.battleQuestion.textContent = battle.current.expression;
  const maxScore = Math.max(1200, battle.playerScore, battle.botScore);
  els.playerProgress.style.width = `${Math.min(100, (battle.playerScore / maxScore) * 100)}%`;
  els.botProgress.style.width = `${Math.min(100, (battle.botScore / maxScore) * 100)}%`;
}

function renderLeaderboard() {
  syncPlayerLeaderboard();
  const rows = [...state.leaderboard].sort((a, b) => b.rating - a.rating || b.best - a.best);
  els.leaderboardRows.innerHTML = rows
    .map((entry, index) => {
      const current = entry.name === PLAYER_NAME ? " class=\"current-player\"" : "";
      return `<tr${current}><td>${index + 1}</td><td>${escapeHtml(entry.name)}</td><td>${entry.rating}</td><td>${entry.best}</td></tr>`;
    })
    .join("");
  els.recordSummary.textContent = `${state.wins}-${state.losses}`;
  els.bestBattle.textContent = String(state.bestBattle);
}

function setFormsEnabled(soloEnabled, battleEnabled) {
  els.soloAnswer.disabled = !soloEnabled;
  els.battleAnswer.disabled = !battleEnabled;
}

function formatPercent(correct, attempts) {
  if (!attempts) return "0%";
  return `${Math.round((correct / attempts) * 100)}%`;
}

function syncPlayerLeaderboard() {
  const player = state.leaderboard.find((entry) => entry.name === PLAYER_NAME);
  if (player) {
    player.rating = state.rating;
    player.best = state.bestBattle;
  } else {
    state.leaderboard.push({ name: PLAYER_NAME, rating: state.rating, best: state.bestBattle });
  }
}

function recordPaywallIntent() {
  state.paywallIntent += 1;
  state.analytics.paywallTaps += 1;
  saveState();
  renderProfile();
  els.mockSubscribe.textContent = "Intent Recorded";
  setTimeout(() => {
    els.mockSubscribe.textContent = "Unlock Pro";
  }, 1100);
}

function clearLocalData() {
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(state, clone(defaultState));
  saveState();
  resetSolo();
  clearInterval(battle.interval);
  clearTimeout(battle.botInterval);
  battle.active = false;
  battle.queued = false;
  battle.timer = ROUND_SECONDS;
  battle.playerScore = 0;
  battle.botScore = 0;
  battle.current = null;
  els.queueBattle.disabled = false;
  els.battleQuestion.textContent = "Queue for a match";
  els.battleFeedback.textContent = "Win battles to climb the season board.";
  els.battleFeedback.className = "feedback";
  els.queueCopy.textContent = "Bot-backed matching keeps early battles instant.";
  renderAll();
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return clone(defaultState);
    return mergeState(clone(defaultState), JSON.parse(saved));
  } catch {
    return clone(defaultState);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeState(base, saved) {
  Object.keys(base).forEach((key) => {
    if (saved && Object.prototype.hasOwnProperty.call(saved, key)) {
      if (typeof base[key] === "object" && !Array.isArray(base[key]) && base[key] !== null) {
        base[key] = { ...base[key], ...saved[key] };
      } else {
        base[key] = saved[key];
      }
    }
  });
  return base;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function drawArenaCanvas() {
  const canvas = els.arenaCanvas || document.getElementById("arenaCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#101412";
  ctx.fillRect(0, 0, width, height);

  for (let x = 0; x < width; x += 28) {
    ctx.strokeStyle = x % 56 === 0 ? "rgba(244,240,232,0.16)" : "rgba(244,240,232,0.06)";
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y < height; y += 28) {
    ctx.strokeStyle = y % 56 === 0 ? "rgba(244,240,232,0.16)" : "rgba(244,240,232,0.06)";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const pulses = [
    { x: 92, y: 74, r: 38, c: "#f0c84b", t: "+37" },
    { x: 238, y: 166, r: 50, c: "#1f9d7a", t: "84/7" },
    { x: 414, y: 88, r: 44, c: "#4db7b3", t: "16x9" },
    { x: 526, y: 188, r: 35, c: "#e7503c", t: "-58" }
  ];

  pulses.forEach((pulse) => {
    const gradient = ctx.createRadialGradient(pulse.x, pulse.y, 2, pulse.x, pulse.y, pulse.r);
    gradient.addColorStop(0, `${pulse.c}dd`);
    gradient.addColorStop(1, `${pulse.c}00`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(pulse.x, pulse.y, pulse.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f4f0e8";
    ctx.font = "800 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(pulse.t, pulse.x, pulse.y);
  });

  ctx.strokeStyle = "rgba(240,200,75,0.62)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(92, 74);
  ctx.lineTo(238, 166);
  ctx.lineTo(414, 88);
  ctx.lineTo(526, 188);
  ctx.stroke();
}
