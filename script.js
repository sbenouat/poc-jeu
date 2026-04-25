/* PoCer — jeu de quiz mobile-first */
const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];

const screens = {
  setup: $("#screen-setup"),
  game: $("#screen-game"),
  recap: $("#screen-recap"),
};

const els = {
  // setup
  playersForm: $("#playersForm"),
  playersInputs: $("#playersInputs"),
  addPlayerBtn: $("#addPlayerBtn"),
  start5: $("#start5"),
  start10: $("#start10"),
  resumeCard: $("#resumeCard"),
  resumeBtn: $("#resumeBtn"),
  discardBtn: $("#discardBtn"),
  resumeInfo: $("#resumeInfo"),
  // header
  roundNum: $("#roundNum"),
  roundTotal: $("#roundTotal"),
  currentTheme: $("#currentTheme"),
  roundDotsWrap: $("#roundDots"),
  // current player
  currentPlayerName: $("#currentPlayerName"),
  currentAvatar: $("#currentAvatar"),
  turnOrder: $("#turnOrder"),
  // scoreboard
  scoreboard: $("#scoreboard"),
  scoreboardCard: $("#scoreboardCard"),
  // difficulty + QA
  difficultyGrid: $("#difficultyGrid"),
  qaCard: $("#qaCard"),
  questionText: $("#questionText"),
  answerText: $("#answerText"),
  btnCorrect: $("#btnCorrect"),
  btnWrong: $("#btnWrong"),
  deckEmpty: $("#deckEmpty"),
  showAnswerBtn: $("#showAnswerBtn"),
  answerBlock: $("#answerBlock"),
  revealRow: $("#revealRow"),
  judgeRow: $("#judgeRow"),
  ptsSpan: $("#pts"),
  // recap
  finalTable: $("#finalTable"),
  winners: $("#winners"),
  // misc
  endGameBtn: $("#endGameBtn"),
  restartBtn: $("#restartBtn"),
  toastHost: $("#toastHost"),
};

let MAX_ROUNDS = 10;

const MAX_PLAYERS = 10;
const MIN_PLAYERS = 1;

// Distinct, accessible colors for up to 10 players
const PLAYER_COLORS = [
  "#f87171", // red
  "#fb923c", // orange
  "#fbbf24", // amber
  "#a3e635", // lime
  "#34d399", // emerald
  "#22d3ee", // cyan
  "#60a5fa", // blue
  "#a78bfa", // violet
  "#f472b6", // pink
  "#facc15", // yellow
];

// --------- État ----------
const STATE = {
  players: [],
  turnIndex: 0,
  starterIndex: 0,
  round: 1,
  theme: null,
  usedDifficulties: new Set(),
  usedQuestions: {},
  lastThemeId: null,
  questions: null,
  currentQA: null,
  answerRevealed: false,
  usedThemes: new Set(),
  themeIndex: null,
  loadedThemes: {},
};

// --------- Utils ----------
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const initials = (name) => (name || " ").trim().split(/\s+/).slice(0,2).map(n=>n[0]?.toUpperCase()||"").join("");

function saveLocal(){
  localStorage.setItem("pocer_state", JSON.stringify({
    players: STATE.players,
    turnIndex: STATE.turnIndex,
    starterIndex: STATE.starterIndex,
    round: STATE.round,
    themeId: STATE.theme?.id ?? null,
    usedDifficulties: [...STATE.usedDifficulties],
    usedQuestions: STATE.usedQuestions,
    lastThemeId: STATE.lastThemeId,
    usedThemes: [...STATE.usedThemes],
    maxRounds: MAX_ROUNDS,
  }));
}
function loadLocal(){
  try{ const raw = localStorage.getItem("pocer_state"); return raw? JSON.parse(raw): null; }catch{ return null; }
}
function clearSavedGame(){
  localStorage.removeItem("pocer_state");
}
function saveLastNames(names){
  try{ localStorage.setItem("pocer_lastPlayers", JSON.stringify(names)); }catch{}
}
function loadLastNames(){
  try{ const raw = localStorage.getItem("pocer_lastPlayers"); return raw ? JSON.parse(raw) : null; }catch{ return null; }
}
function resetState(){
  STATE.players = [];
  STATE.turnIndex = 0;
  STATE.starterIndex = 0;
  STATE.round = 1;
  STATE.theme = null;
  STATE.usedDifficulties = new Set();
  STATE.usedQuestions = {};
  STATE.lastThemeId = null;
  STATE.currentQA = null;
  STATE.answerRevealed = false;
  STATE.usedThemes = new Set();
}

// --------- Toast ----------
function toast(message, opts = {}){
  const { action, actionLabel, durationMs = 3000, variant } = opts;
  const node = document.createElement("div");
  node.className = "toast" + (variant ? " " + variant : "");
  const text = document.createElement("span");
  text.className = "toast-text";
  text.textContent = message;
  node.appendChild(text);

  let timer;
  const dismiss = () => {
    clearTimeout(timer);
    if (node.parentNode) node.parentNode.removeChild(node);
  };

  if (action) {
    const btn = document.createElement("button");
    btn.className = "toast-action" + (variant === "danger" ? " danger" : "");
    btn.type = "button";
    btn.textContent = actionLabel || "Annuler";
    btn.addEventListener("click", () => {
      action();
      dismiss();
    });
    node.appendChild(btn);
  }

  els.toastHost.appendChild(node);
  timer = setTimeout(dismiss, durationMs);
  return dismiss;
}

// --------- Données (questions) — Lazy Loading ----------
async function loadThemeIndex(){
  try{
    const res = await fetch("questions/index.json", {cache:"no-store"});
    if(!res.ok) throw new Error("HTTP "+res.status);
    STATE.themeIndex = await res.json();
    STATE.questions = { themes: [] };
    STATE.loadedThemes = {};
    return true;
  }catch(e){
    return await loadQuestionsFallback();
  }
}

async function loadQuestionsFallback(){
  try{
    const res = await fetch("questions.sample.json", {cache:"no-store"});
    if(!res.ok) throw new Error("HTTP "+res.status);
    STATE.questions = await res.json();
    STATE.themeIndex = null;
    STATE.loadedThemes = {};
    STATE.questions.themes.forEach(t => STATE.loadedThemes[t.id] = t);
    return true;
  }catch(e){
    STATE.questions = {
      themes:[{
        id:"demo", name:"Démo",
        questions:{ "1":[{q:"Capitale de la France ?",a:"Paris"}], "2":[{q:"Symbole de l'eau ?",a:"H2O"}],
          "3":[], "4":[], "5":[], "6":[], "7":[], "8":[], "9":[], "10":[] }
      }]
    };
    STATE.themeIndex = null;
    STATE.loadedThemes = { demo: STATE.questions.themes[0] };
    return false;
  }
}

async function loadTheme(themeId){
  if(STATE.loadedThemes[themeId]) return STATE.loadedThemes[themeId];
  if(!STATE.themeIndex){
    return STATE.questions.themes.find(t=>t.id===themeId) || null;
  }
  const meta = STATE.themeIndex.themes.find(t=>t.id===themeId);
  if(!meta) return null;
  try{
    const res = await fetch(`questions/${meta.file}`, {cache:"no-store"});
    if(!res.ok) throw new Error("HTTP "+res.status);
    const themeData = await res.json();
    STATE.loadedThemes[themeId] = themeData;
    if(!STATE.questions.themes.find(t=>t.id===themeId)){
      STATE.questions.themes.push(themeData);
    }
    return themeData;
  }catch(e){
    console.error(`Failed to load theme ${themeId}:`, e);
    return null;
  }
}

function getAllThemeIds(){
  if(STATE.themeIndex){
    return STATE.themeIndex.themes.map(t=>t.id);
  }
  return STATE.questions.themes.map(t=>t.id);
}

function ensureUsedQuestionsPaths(themeId){
  if(!STATE.usedQuestions[themeId]) STATE.usedQuestions[themeId] = {};
  for(let d=1; d<=10; d++){ if(!STATE.usedQuestions[themeId][d]) STATE.usedQuestions[themeId][d] = []; }
}
function remainingCount(theme, d){
  const list = theme.questions[String(d)] || [];
  ensureUsedQuestionsPaths(theme.id);
  const used = new Set(STATE.usedQuestions[theme.id][d]);
  return list.length - used.size;
}
function drawQuestion(theme, d){
  const list = theme.questions[String(d)] || [];
  ensureUsedQuestionsPaths(theme.id);
  const used = new Set(STATE.usedQuestions[theme.id][d]);
  const cand = list.map((qa,idx)=>({qa,idx})).filter(x=>!used.has(x.idx));
  if(!cand.length) return null;
  const {qa,idx} = cand[randInt(0,cand.length-1)];
  STATE.usedQuestions[theme.id][d] = [...used, idx];
  return {...qa, diff:d, _idx: idx};
}
function hasRemainingQuestions(theme){
  for(let d=1; d<=10; d++){
    const list = theme.questions[String(d)] || [];
    const used = (STATE.usedQuestions[theme.id]?.[d] || []).length;
    if(used < list.length) return true;
  }
  return false;
}
async function pickRandomTheme(){
  const allIds = getAllThemeIds();
  const candidateIds = allIds.filter(id => !STATE.usedThemes.has(id));
  if(!candidateIds.length) return null;

  const pool = candidateIds.length > 1
    ? candidateIds.filter(id => id !== STATE.lastThemeId)
    : candidateIds;

  const pickedId = pool[randInt(0, pool.length - 1)];
  const theme = await loadTheme(pickedId);
  if(!theme) return null;

  if(!hasRemainingQuestions(theme)){
    STATE.usedThemes.add(pickedId);
    return await pickRandomTheme();
  }

  STATE.lastThemeId = pickedId;
  return theme;
}

// --------- Joueurs (setup dynamique) ----------
function currentPlayerInputs(){
  return $$("input[name=player]", els.playersInputs);
}
function updateRemoveButtonsVisibility(){
  const rows = $$(".player-input-row", els.playersInputs);
  rows.forEach((row, i) => {
    const btn = row.querySelector(".btn-remove-player");
    if (!btn) return;
    btn.style.visibility = rows.length > MIN_PLAYERS ? "visible" : "hidden";
  });
  els.addPlayerBtn.disabled = rows.length >= MAX_PLAYERS;
  els.addPlayerBtn.textContent = rows.length >= MAX_PLAYERS
    ? `Maximum ${MAX_PLAYERS} joueurs`
    : "+ Ajouter un joueur";
  rows.forEach((row, i) => {
    const input = row.querySelector("input");
    input.placeholder = `Joueur ${i+1}`;
  });
}
function addPlayerInput(value = ""){
  const rows = $$(".player-input-row", els.playersInputs);
  if (rows.length >= MAX_PLAYERS) return;
  const tpl = $("#playerInputTpl");
  const node = tpl.content.cloneNode(true);
  const row = node.querySelector(".player-input-row");
  const input = row.querySelector("input");
  const removeBtn = row.querySelector(".btn-remove-player");
  input.value = value;
  removeBtn.addEventListener("click", () => {
    row.remove();
    updateRemoveButtonsVisibility();
  });
  els.playersInputs.appendChild(row);
  updateRemoveButtonsVisibility();
}
function renderInitialPlayerInputs(){
  els.playersInputs.innerHTML = "";
  const last = loadLastNames();
  if (last && last.length >= 2) {
    last.slice(0, MAX_PLAYERS).forEach(n => addPlayerInput(n));
  } else {
    addPlayerInput();
    addPlayerInput();
  }
}

// --------- UI helpers ----------
function showScreen(name){
  Object.values(screens).forEach(s=>s.classList.remove("active"));
  screens[name].classList.add("active");
}
function playerColor(p){
  return PLAYER_COLORS[(p?.colorIdx ?? 0) % PLAYER_COLORS.length];
}
function renderRoundHeader(){
  els.roundNum.textContent = String(STATE.round);
  els.roundTotal.textContent = String(MAX_ROUNDS);
  els.currentTheme.textContent = STATE.theme ? STATE.theme.name : "—";

  if (els.roundDotsWrap.childElementCount !== MAX_ROUNDS){
    els.roundDotsWrap.innerHTML = "";
    for (let i=1; i<=MAX_ROUNDS; i++){
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.dataset.i = String(i);
      els.roundDotsWrap.appendChild(dot);
    }
  }
  [...els.roundDotsWrap.children].forEach((dot,i)=>{
    const idx = i+1;
    dot.classList.toggle("done", idx < STATE.round);
    dot.classList.toggle("active", idx === STATE.round);
  });
}
function renderCurrentPlayer(){
  const p = STATE.players[STATE.turnIndex];
  els.currentPlayerName.textContent = p?.name ?? "—";
  els.currentAvatar.textContent = initials(p?.name);
  els.currentAvatar.style.setProperty("--player-color", playerColor(p));

  els.turnOrder.innerHTML = "";
  computeTurnOrder(true).forEach(({player, isActive}, i) => {
    const chip = document.createElement("div");
    chip.className = "turn-chip" + (isActive ? " active" : "");
    chip.style.setProperty("--player-color", playerColor(player));
    const b = document.createElement("span");
    b.className = "badge"; b.textContent = String(i+1);
    const n = document.createElement("span");
    n.className = "name"; n.textContent = player.name;
    chip.append(b,n);
    els.turnOrder.appendChild(chip);
  });

  if (navigator.vibrate) navigator.vibrate(15);
}
function renderScoreboard(intoEl){
  intoEl.innerHTML = "";
  const tpl = $("#playerRowTpl");
  STATE.players.forEach(p=>{
    const node = tpl.content.cloneNode(true);
    const row = node.querySelector(".score-row");
    row.style.setProperty("--player-color", playerColor(p));
    node.querySelector(".name").textContent = p.name;
    node.querySelector(".score").textContent = String(p.score);
    intoEl.appendChild(node);
  });
}
function renderDifficulties(){
  els.difficultyGrid.innerHTML = "";
  for(let d=1; d<=10; d++){
    const b = document.createElement("button");
    b.className = "diff-btn";
    b.textContent = String(d);
    b.dataset.d = String(d);
    const taken = STATE.usedDifficulties.has(d);
    const remain = STATE.theme ? remainingCount(STATE.theme, d) : 0;
    b.disabled = taken || remain<=0;
    b.addEventListener("click", ()=>onChooseDifficulty(d));
    els.difficultyGrid.appendChild(b);
  }
}
function renderQA(){
  if(STATE.currentQA){
    els.qaCard.classList.remove("hidden");
    els.scoreboardCard.open = false;
    els.questionText.textContent = STATE.currentQA.q;
    els.answerText.textContent = STATE.currentQA.a;
    els.ptsSpan.textContent = String(STATE.currentQA.diff);

    if (STATE.answerRevealed){
      els.answerBlock.classList.remove("hidden");
      els.judgeRow.classList.remove("hidden");
      els.revealRow.classList.add("hidden");
      els.showAnswerBtn?.setAttribute("aria-expanded", "true");
    }else{
      els.answerBlock.classList.add("hidden");
      els.judgeRow.classList.add("hidden");
      els.revealRow.classList.remove("hidden");
      els.showAnswerBtn?.setAttribute("aria-expanded", "false");
    }
  }else{
    els.qaCard.classList.add("hidden");
    els.scoreboardCard.open = true;
  }
}
function renderAll(){
  renderRoundHeader();
  renderCurrentPlayer();
  renderScoreboard(els.scoreboard);
  renderDifficulties();
  renderQA();
}

// --------- Tour & manches ----------
async function setThemeForRound(){
  STATE.theme = await pickRandomTheme();
  STATE.usedDifficulties = new Set();
  STATE.currentQA = null;
  STATE.answerRevealed = false;

  if(!STATE.theme){
    toast("Plus de thèmes disponibles. Fin de partie.", { variant: "danger", durationMs: 2500 });
    finishGame();
    return;
  }
  STATE.usedThemes.add(STATE.theme.id);
  saveLocal();
}
function computeTurnOrder(withActiveFlag = false){
  const order = [];
  for(let i=0;i<STATE.players.length;i++){
    const idx = (STATE.starterIndex + i) % STATE.players.length;
    const player = STATE.players[idx];
    if(withActiveFlag){
      order.push({ player, isActive: idx === STATE.turnIndex });
    }else{
      order.push(player);
    }
  }
  return order;
}
async function nextPlayer(){
  STATE.currentQA = null;
  STATE.answerRevealed = false;

  STATE.turnIndex = (STATE.turnIndex + 1) % STATE.players.length;

  if(STATE.turnIndex === STATE.starterIndex){
    STATE.round += 1;
    if(STATE.round > MAX_ROUNDS){
      finishGame();
      return;
    }
    STATE.starterIndex = (STATE.starterIndex + 1) % STATE.players.length;
    STATE.turnIndex = STATE.starterIndex;
    await setThemeForRound();
  }
  saveLocal();
  renderAll();
}

// --------- Actions ----------
function onChooseDifficulty(d){
  if(!STATE.theme) return;
  if(STATE.usedDifficulties.has(d)) return;
  const qa = drawQuestion(STATE.theme, d);
  if(!qa){
    els.deckEmpty.classList.remove("hidden");
    setTimeout(()=>els.deckEmpty.classList.add("hidden"), 1800);
    return;
  }
  STATE.currentQA = qa;
  STATE.usedDifficulties.add(d);
  STATE.answerRevealed = false;
  if (navigator.vibrate) navigator.vibrate(8);
  saveLocal();
  renderAll();
}
function onShowAnswer(){
  STATE.answerRevealed = true;
  if (navigator.vibrate) navigator.vibrate([8,20,8]);
  renderAll();
}

function snapshotForUndo(){
  const themeId = STATE.theme?.id ?? null;
  const usedAtTheme = themeId ? (STATE.usedQuestions[themeId] || {}) : {};
  return {
    players: STATE.players.map(p => ({...p})),
    turnIndex: STATE.turnIndex,
    starterIndex: STATE.starterIndex,
    round: STATE.round,
    themeId,
    usedDifficulties: [...STATE.usedDifficulties],
    usedQuestionsAtTheme: Object.fromEntries(Object.entries(usedAtTheme).map(([k, v]) => [k, [...v]])),
    currentQA: STATE.currentQA ? {...STATE.currentQA} : null,
    answerRevealed: STATE.answerRevealed,
    lastThemeId: STATE.lastThemeId,
    usedThemes: [...STATE.usedThemes],
  };
}
async function restoreFromSnapshot(snap){
  STATE.players = snap.players;
  STATE.turnIndex = snap.turnIndex;
  STATE.starterIndex = snap.starterIndex;
  STATE.round = snap.round;
  STATE.usedDifficulties = new Set(snap.usedDifficulties);
  STATE.currentQA = snap.currentQA;
  STATE.answerRevealed = snap.answerRevealed;
  STATE.lastThemeId = snap.lastThemeId;
  STATE.usedThemes = new Set(snap.usedThemes);
  if (snap.themeId) {
    STATE.theme = await loadTheme(snap.themeId);
    STATE.usedQuestions[snap.themeId] = snap.usedQuestionsAtTheme;
  }
  showScreen("game");
  saveLocal();
  renderAll();
}

async function onAnswer(isCorrect){
  if(!STATE.currentQA) return;
  const snap = snapshotForUndo();
  const player = STATE.players[STATE.turnIndex];
  const playerName = player.name;
  const pts = STATE.currentQA.diff;
  if(isCorrect){
    player.score += pts;
  }
  if (navigator.vibrate) navigator.vibrate(isCorrect ? [10, 30, 10] : 25);
  saveLocal();
  await nextPlayer();
  toast(
    isCorrect ? `+${pts} pt${pts>1?"s":""} pour ${playerName}` : `0 pt pour ${playerName}`,
    { action: () => restoreFromSnapshot(snap), actionLabel: "Annuler", durationMs: 3000 }
  );
}

// --------- Game flow ----------
async function startGame(players, rounds){
  resetState();
  MAX_ROUNDS = rounds;
  STATE.players = players.map((n, i) => ({ name: n, score: 0, colorIdx: i }));
  STATE.starterIndex = 0;
  STATE.turnIndex = STATE.starterIndex;
  saveLastNames(players);
  await loadThemeIndex();
  await setThemeForRound();
  saveLocal();
  showScreen("game");
  renderAll();
}
function finishGame(){
  if (!STATE.players.length) {
    showScreen("setup");
    return;
  }
  const best = Math.max(...STATE.players.map(p=>p.score));
  const winners = STATE.players.filter(p=>p.score===best);
  els.winners.textContent = winners.length>1
    ? `Égalité ! Gagnants : ${winners.map(w=>w.name).join(", ")} (${best} pts)`
    : `Vainqueur : ${winners[0].name} (${best} pts)`;
  renderScoreboard(els.finalTable);
  showScreen("recap");
  clearSavedGame();
}

function confirmEndGame(){
  toast("Terminer la partie ?", {
    variant: "danger",
    actionLabel: "Confirmer",
    action: finishGame,
    durationMs: 4000,
  });
}

// --------- Events ----------
function collectNames(){
  const names = currentPlayerInputs().map(i => i.value.trim()).filter(Boolean);
  if (names.length < MIN_PLAYERS) {
    toast(`Au moins ${MIN_PLAYERS} joueur requis.`, { variant: "danger" });
    return null;
  }
  if (names.length > MAX_PLAYERS) {
    toast(`Maximum ${MAX_PLAYERS} joueurs.`, { variant: "danger" });
    return null;
  }
  return names;
}

els.addPlayerBtn.addEventListener("click", () => addPlayerInput());
els.start10.addEventListener("click", () => {
  const names = collectNames(); if(!names) return;
  startGame(names, 10);
});
els.start5.addEventListener("click", () => {
  const names = collectNames(); if(!names) return;
  startGame(names, 5);
});
$("#showAnswerBtn").addEventListener("click", onShowAnswer);
els.btnCorrect.addEventListener("click", () => onAnswer(true));
els.btnWrong.addEventListener("click", () => onAnswer(false));
els.endGameBtn.addEventListener("click", confirmEndGame);
els.restartBtn.addEventListener("click", () => {
  clearSavedGame();
  location.reload();
});

// --------- Resume flow ----------
function describeSave(saved){
  const n = (saved.players || []).length;
  const round = saved.round || 1;
  const total = saved.maxRounds || 10;
  return `${n} joueur${n>1?"s":""} — manche ${Math.min(round, total)}/${total}`;
}
async function resumeFromSave(saved){
  MAX_ROUNDS = saved.maxRounds || 10;
  STATE.players = (saved.players || []).map((p, i) => ({
    name: p.name,
    score: p.score ?? 0,
    colorIdx: p.colorIdx ?? i,
  }));
  STATE.turnIndex = saved.turnIndex ?? 0;
  STATE.starterIndex = saved.starterIndex ?? 0;
  STATE.round = saved.round || 1;
  STATE.usedQuestions = saved.usedQuestions || {};
  STATE.usedDifficulties = new Set(saved.usedDifficulties || []);
  STATE.lastThemeId = saved.lastThemeId || null;
  STATE.usedThemes = new Set(saved.usedThemes || []);
  if(saved.themeId){
    STATE.theme = await loadTheme(saved.themeId);
  }
  if(!STATE.theme){
    STATE.theme = await pickRandomTheme();
  }
  if(STATE.theme && !STATE.usedThemes.has(STATE.theme.id)) STATE.usedThemes.add(STATE.theme.id);
  showScreen("game");
  renderAll();
}

window.addEventListener("load", async () => {
  renderInitialPlayerInputs();
  await loadThemeIndex();
  const saved = loadLocal();
  if (saved && saved.players?.length) {
    els.resumeInfo.textContent = describeSave(saved);
    els.resumeCard.classList.remove("hidden");
    els.resumeBtn.addEventListener("click", () => resumeFromSave(saved));
    els.discardBtn.addEventListener("click", () => {
      clearSavedGame();
      els.resumeCard.classList.add("hidden");
    });
  }
  showScreen("setup");
});
