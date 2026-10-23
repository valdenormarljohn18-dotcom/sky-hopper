const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");
const overlay = document.querySelector("#overlay");
const playButton = document.querySelector("#play-button");
const scoreDisplay = document.querySelector("#score");
const bestDisplay = document.querySelector("#best");
const overlayIcon = document.querySelector("#overlay-icon");
const overlayKicker = document.querySelector("#overlay-kicker");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const buttonLabel = document.querySelector("#button-label");
const liveMessage = document.querySelector("#live-message");
const worldNameDisplay = document.querySelector("#world-name");
const stageTitleDisplay = document.querySelector("#stage-title");
const stageLabelDisplay = document.querySelector("#stage-label");
const gateProgressLabel = document.querySelector("#gate-progress-label");
const progressBar = document.querySelector("#stage-progress");
const progressFill = document.querySelector("#progress-fill");
const questDescription = document.querySelector("#quest-description");
const questCountDisplay = document.querySelector("#quest-count");
const mapProgressDisplay = document.querySelector("#map-progress");
const stageGrid = document.querySelector("#stage-grid");
const flightMap = document.querySelector(".flight-map");
const musicToggle = document.querySelector("#music-toggle");
const musicLabel = document.querySelector("#music-label");
const musicIcon = document.querySelector("#music-icon");
const installButton = document.querySelector("#install-button");
const fullscreenToggle = document.querySelector("#fullscreen-toggle");
const gameShell = document.querySelector(".game-shell");
const authForm = document.querySelector("#auth-form");
const signedInPanel = document.querySelector("#signed-in");
const accountName = document.querySelector("#account-name");
const accountMessage = document.querySelector("#account-message");
const backendStatus = document.querySelector("#backend-status");
const syncStatus = document.querySelector("#sync-status");
const leaderboardList = document.querySelector("#leaderboard-list");
const logoutButton = document.querySelector("#logout-button");

const WIDTH = 800;
const HEIGHT = 500;
const PLANE_X = 190;
const GATE_WIDTH = 56;
const GATES_PER_STAGE = 5;
const QUEST_GOAL = 3;
const FLOOR_Y = 464;
const SAVE_KEY = "skyHopperAdventure";
const SCENES = [
  { name: "Emerald Isles", icon: "🌿", stages: "STAGES 1–33" },
  { name: "Sunfire Canyon", icon: "🏜️", stages: "STAGES 34–66" },
  { name: "Starlight Frontier", icon: "🌌", stages: "STAGES 67–100" }
];
const STAGE_NAMES = [
  "The First Flight", "Cloudpath Crossing", "The Lost Postcard", "Meadow Breeze",
  "A Tiny Tailwind", "The Floating Garden", "Daisy's Delivery", "The Sunny Shortcut",
  "Up, Up and Away", "The Meadow Festival", "Highland Hop", "Whistling Ridge",
  "The Windmill Run", "Featherlight Flight", "The Shepherd's Sky", "Kite Hill",
  "The Northwind Post", "Hilltop Hideaway", "The Eagle's View", "Highland Hero",
  "Seashell Search", "The Lighthouse Loop", "Tidepool Treasure", "Pelican Pass",
  "The Bluewater Breeze", "Reef Runner", "The Captain's Compass", "Wavewatch",
  "Message in a Bottle", "Coastal Champion", "Cloud Castle", "The Pillow Fort",
  "The Royal Air Mail", "Nimbus Navigator", "The Cloud Shepherd", "Silver Lining",
  "The Raindrop Race", "The Sky Library", "The Moonbeam Bridge", "Cloud Kingdom Cup",
  "Cactus Courier", "The Sandcastle Sky", "Mirage Miles", "The Dune Drifter",
  "Oasis Overflight", "The Lost Caravan", "Saffron Sunset", "The Great Sand Sea",
  "Scarab's Secret", "Desert Star", "Moonrise Pass", "The Quiet Peak",
  "Snowcap Sprint", "The Night Watch", "Mountain Post", "The Alpine Arch",
  "The Hushed Valley", "Silver Summit", "The Stargazer's Map", "Moonlit Marathon",
  "Peak Performer", "Crystal Clear", "The Shimmering Tunnel", "Gemstone Glide",
  "The Echo Chamber", "Prism Passage", "The Hidden Geode", "Cavern Courier",
  "The Diamond Drift", "Crystal Champion", "Sea Spray Sprint", "The Storm Bell",
  "Thunderhead Trail", "The Sunken Signal", "Seafarer's Sky", "The Rainmaker",
  "The Last Lighthouse", "Stormfront Flyer", "The Tempest Treasure", "Ocean's Friend",
  "Aurora Arrival", "The Green Ribbon", "Polar Post", "The Ice Lantern",
  "Northern Lights Run", "The Midnight Mail", "Frostwing Flight", "The Aurora Atlas",
  "Skyfire Signal", "Dawn of the Stars", "The Comet's Call", "Celestial Crossing",
  "The Last Star Map", "Galaxy Glider", "The Final Gate", "Starlight Messenger",
  "The Summit Secret", "Home Among the Stars", "The Grand Sky Parade", "Skybound Legend"
];
const SCENE_PALETTES = [
  ["#63c9e8", "#e0f7ef", "#4b9b70", "#a5df91"],
  ["#f3a85b", "#ffe6a1", "#a94e35", "#e98d48"],
  ["#171d4e", "#754e9f", "#514c91", "#a38bd8"]
];
const MUSIC_MELODY = [
  659.25, 0, 783.99, 880, 0, 783.99, 659.25, 587.33,
  523.25, 0, 587.33, 659.25, 0, 783.99, 659.25, 587.33
];

let state = "ready";
let planeY = HEIGHT / 2;
let planeVelocity = 0;
let obstacles = [];
let clouds = [];
let score = 0;
let best = 0;
let lastFrame = 0;
let animationFrame = 0;
let currentStage = 1;
let unlockedStage = 1;
let totalStars = 0;
let completedStages = {};
let gatesCreated = 0;
let questStars = 0;
let particles = [];
let animationTime = 0;
let screenShake = 0;
let toastTimer = 0;
let musicEnabled = true;
let audioContext = null;
let musicGain = null;
let musicTimer = null;
let musicStep = 0;
let installPrompt = null;
let currentUser = null;
let backendAvailable = false;

function updateMusicControl() {
  musicToggle.setAttribute("aria-pressed", String(musicEnabled));
  musicToggle.setAttribute("aria-label", musicEnabled ? "Turn music off" : "Turn music on");
  musicLabel.textContent = musicEnabled ? "Music on" : "Music off";
  musicIcon.textContent = musicEnabled ? "♫" : "♪";
  musicToggle.classList.toggle("is-muted", !musicEnabled);
}

function initializeInstallSupport() {
  if (!("serviceWorker" in navigator) ||
      !["http:", "https:"].includes(window.location.protocol)) return;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    installButton.hidden = true;
    liveMessage.textContent = "Sky Hopper is installed on your device.";
  });

  navigator.serviceWorker.register("./sw.js").catch((error) => {
    console.error("Could not enable offline game support.", error);
  });
}

installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  try {
    await installPrompt.prompt();
    await installPrompt.userChoice;
  } catch (error) {
    console.error("Could not open the app installation prompt.", error);
  } finally {
    installPrompt = null;
    installButton.hidden = true;
  }
});

function updateFullscreenControl() {
  const isFullscreen = document.fullscreenElement === gameShell ||
    gameShell.classList.contains("is-fullscreen-fallback");
  const label = isFullscreen ? "Exit fullscreen" : "Enter fullscreen";
  fullscreenToggle.setAttribute("aria-pressed", String(isFullscreen));
  fullscreenToggle.setAttribute("aria-label", label);
  fullscreenToggle.title = label;
}

fullscreenToggle.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement === gameShell) {
      await document.exitFullscreen();
    } else if (gameShell.classList.contains("is-fullscreen-fallback")) {
      gameShell.classList.remove("is-fullscreen-fallback");
    } else if (document.fullscreenEnabled && gameShell.requestFullscreen) {
      await gameShell.requestFullscreen();
    } else {
      gameShell.classList.add("is-fullscreen-fallback");
    }
  } catch (error) {
    console.error("Could not toggle fullscreen gameplay.", error);
    liveMessage.textContent = "Fullscreen couldn't be enabled. Try your browser's fullscreen control.";
  }
  updateFullscreenControl();
});

document.addEventListener("fullscreenchange", updateFullscreenControl);

function playMusicTone(frequency, startTime, duration, volume, type) {
  const oscillator = audioContext.createOscillator();
  const envelope = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  envelope.gain.setValueAtTime(0.0001, startTime);
  envelope.gain.exponentialRampToValueAtTime(volume, startTime + 0.035);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(envelope);
  envelope.connect(musicGain);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

function playMusicStep() {
  if (!audioContext || !musicGain || state !== "playing" || !musicEnabled) return;
  const now = audioContext.currentTime;
  const note = MUSIC_MELODY[musicStep];
  if (note > 0) {
    playMusicTone(note, now, 0.31, 0.12, "triangle");
    playMusicTone(note / 2, now, 0.38, 0.035, "sine");
  }
  if (musicStep % 4 === 0) {
    const bassNotes = [196, 174.61, 146.83, 164.81];
    playMusicTone(bassNotes[Math.floor(musicStep / 4) % bassNotes.length], now, 0.62, 0.045, "sine");
  }
  musicStep = (musicStep + 1) % MUSIC_MELODY.length;
}

async function startMusic() {
  if (!musicEnabled || state !== "playing" || musicTimer !== null) return;
  const AudioContextType = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextType) {
    musicEnabled = false;
    updateMusicControl();
    liveMessage.textContent = "Music is not supported by this browser.";
    return;
  }

  try {
    if (!audioContext) {
      audioContext = new AudioContextType();
      musicGain = audioContext.createGain();
      musicGain.gain.value = 0;
      musicGain.connect(audioContext.destination);
    }
    await audioContext.resume();
    if (!musicEnabled || state !== "playing") return;
    musicGain.gain.cancelScheduledValues(audioContext.currentTime);
    musicGain.gain.setTargetAtTime(0.7, audioContext.currentTime, 0.12);
    musicStep = 0;
    playMusicStep();
    musicTimer = window.setInterval(playMusicStep, 280);
  } catch (error) {
    console.error("Could not start the flight music.", error);
    musicEnabled = false;
    updateMusicControl();
    liveMessage.textContent = "Music could not start. Check your browser audio settings.";
  }
}

function stopMusic() {
  if (musicTimer !== null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
  if (audioContext && musicGain) {
    musicGain.gain.cancelScheduledValues(audioContext.currentTime);
    musicGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.08);
  }
}

function showToast(message, style = "reward") {
  const toast = document.querySelector("#game-toast");
  toast.textContent = message;
  toast.dataset.style = style;
  toast.classList.remove("is-visible");
  void toast.offsetWidth;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1450);
}

function burstParticles(x, y, color, count = 14, force = 1) {
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.35;
    const speed = (1 + Math.random() * 2.8) * force;
    const life = 24 + Math.random() * 22;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 3,
      color,
      life,
      maxLife: life,
      gravity: 0.035,
      text: ""
    });
  }
}

function floatReward(x, y, text, color = "#fff4bc") {
  particles.push({
    x,
    y,
    vx: 0,
    vy: -1.1,
    size: 15,
    color,
    life: 42,
    maxLife: 42,
    gravity: -0.008,
    text
  });
}

function pulseElement(element) {
  element.classList.remove("is-pulsing");
  void element.offsetWidth;
  element.classList.add("is-pulsing");
  window.setTimeout(() => element.classList.remove("is-pulsing"), 430);
}

function updateParticles(step) {
  for (const particle of particles) {
    particle.x += particle.vx * step;
    particle.y += particle.vy * step;
    particle.vy += particle.gravity * step;
    particle.life -= step;
  }
  particles = particles.filter((particle) => particle.life > 0);
  screenShake = Math.max(0, screenShake - step * 0.6);
}

function drawParticles() {
  for (const particle of particles) {
    context.save();
    context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    context.fillStyle = particle.color;
    if (particle.text) {
      context.font = `900 ${particle.size}px "Trebuchet MS", sans-serif`;
      context.textAlign = "center";
      context.shadowColor = "rgba(27, 61, 80, 0.5)";
      context.shadowBlur = 5;
      context.fillText(particle.text, particle.x, particle.y);
    } else {
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size * particle.life / particle.maxLife, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }
}

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(endpoint, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || `The server returned ${response.status}.`);
  }
  return result;
}

function setAccountMessage(message, isError = false) {
  accountMessage.textContent = message;
  accountMessage.classList.toggle("is-error", isError);
}

function updateAccountPanel() {
  authForm.hidden = Boolean(currentUser);
  signedInPanel.hidden = !currentUser;
  if (currentUser) accountName.textContent = currentUser.username;
}

function renderLeaderboard(entries) {
  leaderboardList.replaceChildren();
  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "leaderboard-empty";
    empty.textContent = "Be the first pilot on the leaderboard!";
    leaderboardList.append(empty);
    return;
  }

  entries.forEach((entry, index) => {
    const row = document.createElement("li");
    row.className = "leaderboard-entry";
    const rank = document.createElement("span");
    rank.className = "leaderboard-rank";
    rank.textContent = String(index + 1).padStart(2, "0");
    const name = document.createElement("span");
    name.className = "leaderboard-name";
    name.textContent = entry.username;
    const stats = document.createElement("span");
    stats.className = "leaderboard-stats";
    stats.textContent = `Stage ${entry.unlockedStage} · ${entry.sideQuestBadges} ✦`;
    row.append(rank, name, stats);
    leaderboardList.append(row);
  });
}

async function refreshLeaderboard() {
  if (!backendAvailable) return;
  try {
    const result = await apiRequest("/api/leaderboard?limit=10");
    renderLeaderboard(result.leaderboard);
  } catch (error) {
    console.error("Could not load the leaderboard.", error);
    leaderboardList.replaceChildren();
    const failed = document.createElement("li");
    failed.className = "leaderboard-empty is-error";
    failed.textContent = "Leaderboard couldn't load. Try refreshing.";
    leaderboardList.append(failed);
  }
}

function adoptCloudProgress(cloudProgress) {
  unlockedStage = Math.max(unlockedStage, cloudProgress.unlockedStage);
  best = Math.max(best, cloudProgress.bestScore);
  const mergedStages = { ...completedStages };
  for (const [stage, questComplete] of Object.entries(cloudProgress.completedStages)) {
    mergedStages[stage] = mergedStages[stage] === true || questComplete;
  }
  completedStages = mergedStages;
  totalStars = Object.values(completedStages).filter(Boolean).length;
  currentStage = Math.min(100, Math.max(currentStage, cloudProgress.unlockedStage));
  scoreDisplay.textContent = String(score);
  renderCampaign();
  buildStageMap();
  draw();
}

async function syncProgress() {
  if (!backendAvailable || !currentUser) return;
  syncStatus.textContent = "Syncing progress…";
  const result = await apiRequest("/api/progress", {
    method: "PUT",
    body: JSON.stringify({
      unlockedStage,
      bestScore: best,
      completedStages
    })
  });
  adoptCloudProgress(result.progress);
  syncStatus.textContent = "Progress synced to your account.";
  await refreshLeaderboard();
}

async function initializeBackend() {
  if (!["http:", "https:"].includes(window.location.protocol)) {
    backendStatus.textContent = "Start the game server to use accounts.";
    renderLeaderboard([]);
    return;
  }
  try {
    const result = await apiRequest("/api/me");
    backendAvailable = true;
    currentUser = result.user;
    updateAccountPanel();
    adoptCloudProgress(result.progress);
    backendStatus.textContent = "Game server connected";
    setAccountMessage("");
    await syncProgress();
  } catch (error) {
    if (error.message === "Please sign in to continue." ||
        error.message === "Your session expired. Please sign in again.") {
      backendAvailable = true;
      currentUser = null;
      updateAccountPanel();
      backendStatus.textContent = "Game server connected · sign in to sync";
      await refreshLeaderboard();
      return;
    }
    console.error("Could not connect to the game backend.", error);
    backendStatus.textContent = "Game server unavailable";
    setAccountMessage("Accounts need the game server. Your local game still works.", true);
    renderLeaderboard([]);
  }
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
    unlockedStage = Math.min(100, Math.max(1, Number(saved.unlockedStage) || 1));
    totalStars = Math.max(0, Number(saved.totalStars) || 0);
    best = Math.max(0, Number(saved.best) || 0);
    completedStages = saved.completedStages && typeof saved.completedStages === "object"
      ? saved.completedStages
      : {};
  } catch (error) {
    console.warn("Could not load saved adventure progress.", error);
  }
}

function saveProgress() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      unlockedStage,
      totalStars,
      best,
      completedStages
    }));
  } catch (error) {
    console.error("Could not save adventure progress.", error);
  }
  if (backendAvailable && currentUser) {
    void syncProgress().catch((error) => {
      console.error("Could not sync adventure progress.", error);
      syncStatus.textContent = "Sync failed. Check your connection and try again.";
      setAccountMessage("Your progress is saved on this device, but cloud sync failed.", true);
    });
  }
}

function worldForStage(stage) {
  if (stage <= 33) return 0;
  if (stage <= 66) return 1;
  return 2;
}

function gapHeightForStage(stage) {
  return Math.max(132, 166 - Math.floor((stage - 1) / 8) * 3);
}

function speedForStage(stage) {
  return 3.25 + Math.min(1.1, Math.floor((stage - 1) / 12) * 0.14);
}

function renderCampaign() {
  const worldIndex = worldForStage(currentStage);
  const world = SCENES[worldIndex];
  const progress = Math.min(score, GATES_PER_STAGE);
  worldNameDisplay.textContent = `SCENERY ${worldIndex + 1} · ${world.name.toUpperCase()}`;
  stageTitleDisplay.textContent = STAGE_NAMES[currentStage - 1];
  stageLabelDisplay.textContent = `STAGE ${currentStage} OF 100`;
  gateProgressLabel.textContent = `${progress} / ${GATES_PER_STAGE} gates`;
  progressBar.setAttribute("aria-valuenow", String(progress));
  progressFill.setAttribute("data-progress", String(progress));
  questDescription.textContent = `Collect ${QUEST_GOAL} sky stars`;
  questCountDisplay.textContent = `${questStars} / ${QUEST_GOAL}`;
  bestDisplay.textContent = String(best);
  mapProgressDisplay.textContent = `Stage ${unlockedStage} ${unlockedStage === 1 ? "unlocked" : "unlocked"}`;
}

function buildStageMap() {
  stageGrid.replaceChildren();
  for (let stage = 1; stage <= 100; stage += 1) {
    const sceneIndex = worldForStage(stage);
    if (stage === 1 || stage === 34 || stage === 67) {
      const sceneHeading = document.createElement("div");
      sceneHeading.className = `stage-region stage-region-${sceneIndex + 1}`;
      sceneHeading.textContent = `${SCENES[sceneIndex].icon}  SCENERY ${sceneIndex + 1} · ${SCENES[sceneIndex].name} · ${SCENES[sceneIndex].stages}`;
      stageGrid.append(sceneHeading);
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stage-node";
    button.textContent = String(stage);
    button.disabled = stage > unlockedStage;
    button.setAttribute("aria-label", `Stage ${stage}${stage > unlockedStage ? ", locked" : ""}`);
    if (stage === currentStage) button.classList.add("is-current");
    if (completedStages[stage]) button.classList.add("is-complete");
    if (completedStages[stage] === true) button.title = "Side quest complete";
    else if (completedStages[stage] === false) button.title = "Stage complete";
    button.addEventListener("click", () => {
      if (stage > unlockedStage || state === "playing") return;
      currentStage = stage;
      state = "ready";
      score = 0;
      questStars = 0;
      scoreDisplay.textContent = "0";
      overlayIcon.textContent = SCENES[worldForStage(stage)].icon;
      overlayKicker.textContent = `SCENERY ${worldForStage(stage) + 1} · STAGE ${stage}`;
      overlayTitle.textContent = STAGE_NAMES[stage - 1];
      overlayCopy.textContent = `Take on ${GATES_PER_STAGE} gates, collect ${QUEST_GOAL} bonus stars, and explore ${SCENES[worldForStage(stage)].name}.`;
      buttonLabel.textContent = "Start stage";
      overlay.classList.remove("is-hidden");
      flightMap.open = false;
      renderCampaign();
      buildStageMap();
      draw();
    });
    stageGrid.append(button);
  }
}

function resizeCanvas() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = WIDTH * pixelRatio;
  canvas.height = HEIGHT * pixelRatio;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  draw();
}

function makeClouds() {
  clouds = Array.from({ length: 7 }, (_, index) => ({
    x: 70 + index * 145,
    y: 45 + Math.random() * 275,
    size: 0.65 + Math.random() * 0.75,
    speed: 0.22 + Math.random() * 0.32
  }));
}

function makeObstacle(x) {
  const margin = 66;
  const gapHeight = gapHeightForStage(currentStage);
  const center = margin + gapHeight / 2 +
    Math.random() * (FLOOR_Y - margin * 2 - gapHeight);
  return {
    x,
    center,
    starY: center + (Math.random() - 0.5) * 34,
    starCollected: false,
    passed: false
  };
}

function startGame() {
  state = "playing";
  planeY = HEIGHT / 2;
  planeVelocity = -5.6;
  particles = [];
  screenShake = 0;
  obstacles = [makeObstacle(900), makeObstacle(1250), makeObstacle(1600)];
  gatesCreated = obstacles.length;
  questStars = 0;
  score = 0;
  scoreDisplay.textContent = "0";
  renderCampaign();
  void startMusic();
  overlay.classList.add("is-hidden");
  liveMessage.textContent = `Stage ${currentStage} started. Collect ${QUEST_GOAL} stars for the side quest.`;
  lastFrame = 0;
}

function flap() {
  if (state === "ready" || state === "gameover") {
    startGame();
    return;
  }
  if (state === "playing") planeVelocity = -6.5;
}

function showOverlay(icon, kicker, title, copy, action) {
  overlayIcon.textContent = icon;
  overlayKicker.textContent = kicker;
  overlayTitle.textContent = title;
  overlayCopy.textContent = copy;
  buttonLabel.textContent = action;
  overlay.classList.remove("is-hidden");
}

function endGame() {
  if (state !== "playing") return;
  burstParticles(PLANE_X, planeY, "#fff0a6", 22, 1.25);
  screenShake = 8;
  state = "gameover";
  stopMusic();
  best = Math.max(best, score);
  saveProgress();
  renderCampaign();
  showOverlay("💫", "FLIGHT COMPLETE", "A brave attempt, pilot!",
    `You reached ${score} of ${GATES_PER_STAGE} gates. ${questStars >= QUEST_GOAL ? "Side quest complete!" : `You found ${questStars} of ${QUEST_GOAL} stars.`} Give it another go?`,
    "Retry stage");
  liveMessage.textContent = `Stage ${currentStage} ended. ${score} gates passed; ${questStars} side quest stars collected.`;
  draw();
}

function completeStage() {
  if (state !== "playing") return;
  burstParticles(PLANE_X, planeY, "#fff0a6", 42, 1.7);
  state = currentStage === 100 ? "campaigncomplete" : "stageclear";
  stopMusic();
  const questComplete = questStars >= QUEST_GOAL;
  const previousStars = completedStages[currentStage] === true;
  if (questComplete && !previousStars) totalStars += 1;
  completedStages[currentStage] = questComplete || previousStars;
  unlockedStage = Math.max(unlockedStage, Math.min(100, currentStage + 1));
  best = Math.max(best, score);
  saveProgress();
  renderCampaign();
  buildStageMap();
  if (state === "campaigncomplete") {
    showOverlay("🏆", "ADVENTURE COMPLETE", "Skybound legend!",
      `You conquered all 100 stages and earned ${totalStars} side quest badges. The sky is yours!`,
      "Fly stage 100 again");
  } else {
    showOverlay(questComplete ? "🌟" : "🎉", questComplete ? "SIDE QUEST COMPLETE" : "STAGE COMPLETE",
      questComplete ? "Star collector!" : "On to the next sky!",
      questComplete
        ? `Stage ${currentStage} cleared and side quest completed! Stage ${currentStage + 1} is unlocked.`
        : `Stage ${currentStage} cleared! You found ${questStars} of ${QUEST_GOAL} stars. Stage ${currentStage + 1} is unlocked.`,
      "Next stage");
  }
  liveMessage.textContent = `Stage ${currentStage} complete. ${questComplete ? "Side quest complete." : `${questStars} of ${QUEST_GOAL} stars collected.`}`;
  draw();
}

function update(delta) {
  const step = Math.min(delta, 2);
  planeVelocity += 0.38 * step;
  planeVelocity = Math.min(planeVelocity, 8.5);
  planeY += planeVelocity * step;

  for (const obstacle of obstacles) {
    obstacle.x -= speedForStage(currentStage) * step;
    const starX = obstacle.x + GATE_WIDTH + 76;
    if (!obstacle.starCollected &&
        Math.abs(starX - PLANE_X) < 24 &&
        Math.abs(obstacle.starY - planeY) < 26) {
      obstacle.starCollected = true;
      questStars += 1;
      questCountDisplay.textContent = `${questStars} / ${QUEST_GOAL}`;
      pulseElement(questCountDisplay);
      pulseElement(document.querySelector("#side-quest"));
      burstParticles(starX, obstacle.starY, "#fff0a6", 18, 1.3);
      floatReward(starX, obstacle.starY - 8, "+ STAR");
      showToast(questStars === QUEST_GOAL ? "SIDE QUEST COMPLETE! +1 BADGE" : "STAR COLLECTED!", "quest");
      liveMessage.textContent = `Side quest: ${questStars} of ${QUEST_GOAL} sky stars collected`;
    }
    if (!obstacle.passed && obstacle.x + GATE_WIDTH < PLANE_X - 23) {
      obstacle.passed = true;
      score += 1;
      scoreDisplay.textContent = String(score);
      pulseElement(scoreDisplay);
      burstParticles(PLANE_X + 22, planeY, "#d8fff0", 8, 0.55);
      floatReward(PLANE_X + 38, planeY - 20, `GATE ${score}`, "#ffffff");
      showToast(score === GATES_PER_STAGE ? "FINAL GATE!" : "GATE CLEARED!", "gate");
      gateProgressLabel.textContent = `${Math.min(score, GATES_PER_STAGE)} / ${GATES_PER_STAGE} gates`;
      progressBar.setAttribute("aria-valuenow", String(Math.min(score, GATES_PER_STAGE)));
      progressFill.setAttribute("data-progress", String(Math.min(score, GATES_PER_STAGE)));
      if (score >= GATES_PER_STAGE) {
        completeStage();
        return;
      }
    }
  }
  obstacles = obstacles.filter((obstacle) => obstacle.x > -GATE_WIDTH);
  if (obstacles.length < 4 && gatesCreated < GATES_PER_STAGE) {
    const lastObstacle = obstacles[obstacles.length - 1];
    obstacles.push(makeObstacle(lastObstacle ? lastObstacle.x + 350 : WIDTH + 120));
    gatesCreated += 1;
  }

  if (planeY < 18 || planeY + 17 > FLOOR_Y || hitsObstacle()) {
    endGame();
  }
}

function hitsObstacle() {
  const planeLeft = PLANE_X - 24;
  const planeRight = PLANE_X + 27;
  const planeTop = planeY - 15;
  const planeBottom = planeY + 15;

  return obstacles.some((obstacle) => {
    const overlapsHorizontally =
      planeRight > obstacle.x && planeLeft < obstacle.x + GATE_WIDTH;
    if (!overlapsHorizontally) return false;
    const gapHeight = gapHeightForStage(currentStage);
    const gapTop = obstacle.center - gapHeight / 2;
    const gapBottom = obstacle.center + gapHeight / 2;
    return planeTop < gapTop || planeBottom > gapBottom;
  });
}

function drawCloud(x, y, size, color = "rgba(255, 255, 255, 0.76)") {
  context.fillStyle = color;
  context.beginPath();
  context.ellipse(x, y, 29 * size, 14 * size, 0, 0, Math.PI * 2);
  context.ellipse(x - 17 * size, y + 3 * size, 17 * size, 11 * size, 0, 0, Math.PI * 2);
  context.ellipse(x + 15 * size, y + 3 * size, 19 * size, 12 * size, 0, 0, Math.PI * 2);
  context.ellipse(x - 2 * size, y - 8 * size, 18 * size, 14 * size, 0, 0, Math.PI * 2);
  context.fill();
}

function drawBackground() {
  const sceneIndex = worldForStage(currentStage);
  const palette = SCENE_PALETTES[sceneIndex];
  const sky = context.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, palette[0]);
  sky.addColorStop(1, palette[1]);
  context.fillStyle = sky;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  if (sceneIndex === 0) {
    const sunY = 102 + Math.sin(animationTime / 55) * 3;
    context.fillStyle = "rgba(255, 255, 255, 0.2)";
    context.beginPath();
    context.arc(650, sunY, 47, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(255, 235, 158, 0.9)";
    context.beginPath();
    context.arc(650, sunY, 33, 0, Math.PI * 2);
    context.fill();
    clouds.forEach((cloud) => drawCloud(cloud.x, cloud.y, cloud.size));

    context.fillStyle = "#a2dfba";
    context.beginPath();
    context.moveTo(0, 413);
    context.quadraticCurveTo(145, 356, 285, 416);
    context.quadraticCurveTo(440, 353, 580, 414);
    context.quadraticCurveTo(698, 368, WIDTH, 414);
    context.lineTo(WIDTH, FLOOR_Y);
    context.lineTo(0, FLOOR_Y);
    context.fill();
    context.fillStyle = "#72c99b";
    context.beginPath();
    context.moveTo(0, 440);
    context.quadraticCurveTo(180, 393, 345, 442);
    context.quadraticCurveTo(540, 390, WIDTH, 438);
    context.lineTo(WIDTH, FLOOR_Y);
    context.lineTo(0, FLOOR_Y);
    context.fill();
    return;
  }

  if (sceneIndex === 1) {
    clouds.forEach((cloud) => drawCloud(cloud.x, cloud.y, cloud.size, "rgba(255, 250, 223, 0.23)"));
    context.fillStyle = "rgba(255, 246, 194, 0.28)";
    context.beginPath();
    context.arc(630, 112 + Math.sin(animationTime / 60) * 3, 59, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#fff0ad";
    context.beginPath();
    context.arc(630, 112, 37, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#d98755";
    context.beginPath();
    context.moveTo(0, 362);
    context.lineTo(95, 292);
    context.lineTo(156, 292);
    context.lineTo(156, 327);
    context.lineTo(247, 327);
    context.lineTo(326, 265);
    context.lineTo(388, 265);
    context.lineTo(388, 305);
    context.lineTo(503, 305);
    context.lineTo(579, 349);
    context.lineTo(800, 349);
    context.lineTo(800, FLOOR_Y);
    context.lineTo(0, FLOOR_Y);
    context.fill();

    context.fillStyle = "#c96c45";
    context.beginPath();
    context.moveTo(0, 417);
    context.quadraticCurveTo(174, 368, 322, 418);
    context.quadraticCurveTo(515, 382, WIDTH, 416);
    context.lineTo(WIDTH, FLOOR_Y);
    context.lineTo(0, FLOOR_Y);
    context.fill();
    context.fillStyle = "#b75b3f";
    context.fillRect(0, 444, WIDTH, FLOOR_Y - 444);

    for (const x of [80, 530, 715]) {
      context.fillStyle = "#56866f";
      context.fillRect(x, 378, 9, 67);
      context.fillRect(x - 17, 392, 13, 7);
      context.fillRect(x + 8, 405, 13, 7);
      context.fillRect(x - 15, 389, 7, 19);
      context.fillRect(x + 8, 402, 7, 19);
    }
    context.fillStyle = "rgba(255, 226, 164, 0.38)";
    for (let mote = 0; mote < 18; mote += 1) {
      const x = (mote * 79 + animationTime * (0.3 + mote % 3 * 0.12)) % WIDTH;
      const y = 60 + (mote * 53) % 270;
      context.beginPath();
      context.arc(x, y, mote % 4 === 0 ? 2 : 1.2, 0, Math.PI * 2);
      context.fill();
    }
    return;
  }

  for (let index = 0; index < 90; index += 1) {
    const x = (index * 137 + 43) % WIDTH;
    const y = (index * 79 + 29) % 350;
    const twinkle = (Math.sin(animationTime / 8 + index * 1.7) + 1) / 2;
    const radius = index % 7 === 0 ? 1.2 + twinkle * 1.8 : 0.7 + twinkle * 0.65;
    context.fillStyle = index % 5 === 0
      ? `rgba(255, 218, 151, ${0.45 + twinkle * 0.5})`
      : `rgba(255, 255, 255, ${0.38 + twinkle * 0.55})`;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  const planetGlow = context.createRadialGradient(636, 125, 12, 636, 125, 82);
  planetGlow.addColorStop(0, "rgba(255, 190, 220, 0.9)");
  planetGlow.addColorStop(0.38, "rgba(222, 145, 218, 0.56)");
  planetGlow.addColorStop(1, "rgba(222, 145, 218, 0)");
  context.fillStyle = planetGlow;
  context.beginPath();
  context.arc(636, 125, 82, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#f3c9df";
  context.beginPath();
  context.arc(636, 125 + Math.sin(animationTime / 70) * 3, 33, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(180, 144, 205, 0.45)";
  context.beginPath();
  context.ellipse(636, 125, 53, 13, -0.16, 0, Math.PI * 2);
  context.strokeStyle = "rgba(235, 214, 248, 0.86)";
  context.lineWidth = 4;
  context.stroke();

  context.fillStyle = "#474578";
  context.beginPath();
  context.moveTo(0, 399);
  context.lineTo(126, 324);
  context.lineTo(207, 378);
  context.lineTo(315, 292);
  context.lineTo(407, 377);
  context.lineTo(513, 321);
  context.lineTo(638, 385);
  context.lineTo(728, 315);
  context.lineTo(WIDTH, 365);
  context.lineTo(WIDTH, FLOOR_Y);
  context.lineTo(0, FLOOR_Y);
  context.fill();
  context.fillStyle = "#292c64";
  context.beginPath();
  context.moveTo(0, 430);
  context.lineTo(120, 380);
  context.lineTo(230, 425);
  context.lineTo(350, 374);
  context.lineTo(480, 427);
  context.lineTo(625, 379);
  context.lineTo(WIDTH, 421);
  context.lineTo(WIDTH, FLOOR_Y);
  context.lineTo(0, FLOOR_Y);
  context.fill();
}

function drawObstacle(obstacle) {
  const left = obstacle.x;
  const gapHeight = gapHeightForStage(currentStage);
  const gapTop = obstacle.center - gapHeight / 2;
  const gapBottom = obstacle.center + gapHeight / 2;
  const capHeight = 19;
  const bottom = FLOOR_Y;
  const palette = SCENE_PALETTES[worldForStage(currentStage)];
  const gradient = context.createLinearGradient(left, 0, left + GATE_WIDTH, 0);
  gradient.addColorStop(0, palette[2]);
  gradient.addColorStop(0.48, palette[3]);
  gradient.addColorStop(1, palette[2]);

  context.fillStyle = gradient;
  context.fillRect(left + 8, 0, GATE_WIDTH - 16, gapTop);
  context.fillRect(left + 8, gapBottom, GATE_WIDTH - 16, bottom - gapBottom);
  context.fillStyle = palette[3];
  context.fillRect(left, gapTop - capHeight, GATE_WIDTH, capHeight);
  context.fillRect(left, gapBottom, GATE_WIDTH, capHeight);
  context.fillStyle = "rgba(255, 255, 255, 0.3)";
  context.fillRect(left + 4, gapTop - capHeight + 3, GATE_WIDTH - 8, 3);
  context.fillRect(left + 4, gapBottom + 3, GATE_WIDTH - 8, 3);

  context.fillStyle = "rgba(174, 92, 49, 0.19)";
  context.fillRect(left + 8, 0, 7, gapTop - capHeight);
  context.fillRect(left + 8, gapBottom + capHeight, 7, bottom - gapBottom - capHeight);
  context.fillStyle = "rgba(255, 255, 255, 0.34)";
  context.fillRect(left + GATE_WIDTH - 17, 0, 4, gapTop - capHeight);
  context.fillRect(left + GATE_WIDTH - 17, gapBottom + capHeight, 4, bottom - gapBottom - capHeight);

  context.fillStyle = palette[2];
  context.fillRect(left + 13, gapTop - 5, 8, 4);
  context.fillRect(left + 13, gapBottom + capHeight + 1, 8, 4);

  if (!obstacle.starCollected) {
    const starX = left + GATE_WIDTH + 76;
    const pulse = 1 + Math.sin(animationTime / 5) * 0.1;
    context.save();
    context.translate(starX, obstacle.starY);
    context.rotate(Math.PI / 10 + Math.sin(animationTime / 12) * 0.08);
    context.scale(pulse, pulse);
    context.shadowColor = "rgba(255, 234, 142, 0.78)";
    context.shadowBlur = 14;
    context.fillStyle = "#fff0a6";
    context.strokeStyle = "#e7a83e";
    context.lineWidth = 2;
    context.beginPath();
    for (let point = 0; point < 10; point += 1) {
      const radius = point % 2 === 0 ? 11 : 5;
      const angle = -Math.PI / 2 + point * Math.PI / 5;
      context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  }
}

function drawPlane() {
  context.save();
  const idleBob = state === "playing" ? 0 : Math.sin(animationTime / 8) * 4;
  const displayedY = state === "playing" ? planeY : HEIGHT / 2 + idleBob;
  const displayedVelocity = state === "playing" ? planeVelocity : Math.cos(animationTime / 8) * 1.3;
  context.translate(PLANE_X, displayedY);
  context.rotate(Math.max(-0.35, Math.min(0.48, displayedVelocity * 0.055)));

  const enginePulse = 0.72 + Math.sin(animationTime / 2.5) * 0.22;
  context.fillStyle = `rgba(255, 190, 89, ${enginePulse * 0.3})`;
  context.beginPath();
  context.ellipse(-34, 1, 13 + enginePulse * 5, 4, 0, 0, Math.PI * 2);
  context.fill();
  if (state === "playing") {
    for (let index = 0; index < 4; index += 1) {
      const trailPulse = (animationTime + index * 4) % 16;
      context.fillStyle = `rgba(255, ${190 + index * 12}, 116, ${0.36 - index * 0.065})`;
      context.beginPath();
      context.arc(-39 - trailPulse * 1.15, Math.sin(animationTime / 4 + index) * 2, 2.8 - index * 0.35, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.fillStyle = "rgba(52, 94, 116, 0.16)";
  context.beginPath();
  context.ellipse(0, 19, 30, 6, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#f5a34e";
  context.beginPath();
  context.moveTo(-13, 2);
  context.lineTo(-28, 14);
  context.lineTo(-8, 12);
  context.closePath();
  context.fill();

  context.fillStyle = "#ffffff";
  context.beginPath();
  context.moveTo(-28, 0);
  context.quadraticCurveTo(-20, -14, 5, -11);
  context.lineTo(26, -3);
  context.quadraticCurveTo(33, 0, 26, 4);
  context.lineTo(4, 8);
  context.quadraticCurveTo(-18, 11, -28, 2);
  context.closePath();
  context.fill();

  context.fillStyle = "#f5a34e";
  context.beginPath();
  context.moveTo(-6, -5);
  context.lineTo(3, -19);
  context.lineTo(9, -17);
  context.lineTo(8, -4);
  context.closePath();
  context.fill();
  context.beginPath();
  context.moveTo(-4, 5);
  context.lineTo(7, 17);
  context.lineTo(11, 16);
  context.lineTo(8, 4);
  context.closePath();
  context.fill();

  context.fillStyle = "#70c9e5";
  context.beginPath();
  context.ellipse(9, -3, 7, 4, -0.12, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#d7773c";
  context.beginPath();
  context.arc(-29, 1, 3, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawGround() {
  const sceneIndex = worldForStage(currentStage);
  if (sceneIndex === 0) {
    context.fillStyle = "#7bc79b";
    context.fillRect(0, FLOOR_Y, WIDTH, HEIGHT - FLOOR_Y);
    context.fillStyle = "rgba(255, 255, 255, 0.36)";
    const offset = (animationTime * 2) % 54;
    for (let x = 18 - offset; x < WIDTH; x += 54) {
      context.beginPath();
      context.ellipse(x, FLOOR_Y + 19, 16, 3, 0, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = "#d2a66c";
    context.fillRect(0, FLOOR_Y + 31, WIDTH, HEIGHT - FLOOR_Y - 31);
    context.fillStyle = "#bb8d58";
    context.fillRect(0, FLOOR_Y + 31, WIDTH, 5);
    return;
  }

  if (sceneIndex === 1) {
    context.fillStyle = "#ae573e";
    context.fillRect(0, FLOOR_Y, WIDTH, HEIGHT - FLOOR_Y);
    context.fillStyle = "#efb25f";
    context.fillRect(0, FLOOR_Y, WIDTH, 5);
    const offset = (animationTime * 3) % 76;
    for (let x = 22; x < WIDTH; x += 76) {
      context.fillStyle = "rgba(255, 223, 157, 0.32)";
      context.fillRect((x - offset + WIDTH) % WIDTH, FLOOR_Y + 18, 26, 3);
    }
    return;
  }

  context.fillStyle = "#232650";
  context.fillRect(0, FLOOR_Y, WIDTH, HEIGHT - FLOOR_Y);
  context.fillStyle = "#c2a7f2";
  context.fillRect(0, FLOOR_Y, WIDTH, 3);
  context.fillStyle = "rgba(163, 220, 255, 0.52)";
  for (let x = 20; x < WIDTH; x += 65) {
    context.beginPath();
    context.arc(x, FLOOR_Y + 20, 2, 0, Math.PI * 2);
    context.fill();
  }
}

function draw() {
  context.save();
  if (screenShake > 0) {
    context.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
  }
  drawBackground();
  obstacles.forEach(drawObstacle);
  drawGround();
  drawPlane();
  drawParticles();
  context.restore();
}

function gameLoop(timestamp) {
  const delta = Math.min(lastFrame ? (timestamp - lastFrame) / (1000 / 60) : 1, 2);
  lastFrame = timestamp;
  animationTime += delta;
  updateParticles(delta);
  for (const cloud of clouds) {
    cloud.x -= cloud.speed * delta * (state === "playing" ? 1 : 0.2);
    if (cloud.x < -100) {
      cloud.x = WIDTH + 50;
      cloud.y = 35 + Math.random() * 290;
    }
  }
  if (state === "playing") update(delta);
  draw();
  animationFrame = requestAnimationFrame(gameLoop);
}

function handleVisibilityChange() {
  if (document.hidden) {
    stopMusic();
    return;
  }
  lastFrame = 0;
  if (state === "playing") void startMusic();
}

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  flap();
});

playButton.addEventListener("click", () => {
  if (state === "stageclear") {
    currentStage = Math.min(100, currentStage + 1);
    renderCampaign();
    buildStageMap();
    startGame();
  } else if (state === "campaigncomplete") {
    currentStage = 100;
    renderCampaign();
    startGame();
  } else {
    flap();
  }
});

musicToggle.addEventListener("click", () => {
  musicEnabled = !musicEnabled;
  updateMusicControl();
  if (musicEnabled && state === "playing") {
    void startMusic();
  } else {
    stopMusic();
  }
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const action = event.submitter?.value;
  const formData = new FormData(authForm);
  const passwordInput = authForm.elements.namedItem("password");
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  if (!backendAvailable) {
    setAccountMessage("Start the game server to create an account or sign in.", true);
    return;
  }
  if (action !== "login" && action !== "register") return;

  setAccountMessage(action === "register" ? "Creating your pilot account…" : "Signing in…");
  try {
    const result = await apiRequest(`/api/auth/${action}`, {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
    currentUser = result.user;
    updateAccountPanel();
    adoptCloudProgress(result.progress);
    passwordInput.value = "";
    passwordInput.autocomplete = "current-password";
    backendStatus.textContent = "Game server connected";
    setAccountMessage(action === "register" ? "Welcome aboard! Your account is ready." : "Welcome back, pilot!");
    await syncProgress();
  } catch (error) {
    console.error("Account request failed.", error);
    setAccountMessage(error.message || "Couldn't sign in. Please try again.", true);
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
    currentUser = null;
    updateAccountPanel();
    backendStatus.textContent = "Game server connected · sign in to sync";
    setAccountMessage("Signed out. Your local game progress is still available.");
    await refreshLeaderboard();
  } catch (error) {
    console.error("Could not sign out.", error);
    setAccountMessage(error.message || "Couldn't sign out. Please try again.", true);
  }
});

document.querySelector("#refresh-leaderboard").addEventListener("click", () => {
  void refreshLeaderboard();
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Escape" && gameShell.classList.contains("is-fullscreen-fallback")) {
    gameShell.classList.remove("is-fullscreen-fallback");
    updateFullscreenControl();
    return;
  }
  if (event.code !== "Space" || event.repeat) return;
  if (event.target instanceof HTMLElement && event.target.closest("input, button")) return;
  event.preventDefault();
  flap();
});

window.addEventListener("resize", resizeCanvas);
document.addEventListener("visibilitychange", handleVisibilityChange);
loadProgress();
makeClouds();
updateMusicControl();
renderCampaign();
buildStageMap();
resizeCanvas();
updateAccountPanel();
initializeInstallSupport();
void initializeBackend();
animationFrame = requestAnimationFrame(gameLoop);