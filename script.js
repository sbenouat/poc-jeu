/* PoCer — jeu de quiz mobile-first (vanilla JS) */
const $ = (s, ctx=document) => ctx.querySelector(s);
const $$ = (s, ctx=document) => [...ctx.querySelectorAll(s)];

const screens = {
  setup: $("#screen-setup"),
  game: $("#screen-game"),
  recap: $("#screen-recap"),
};

const els = {
  playersForm: $("#playersForm"),
  loadDemo: $("#loadDemo"),
  scoreboard: $("#scoreboard"),
  finalTable: $("#finalTable"),
  winners: $("#winners"),
  roundNum: $("#roundNum"),
  currentPlayerName: $("#currentPlayerName"),
  currentTheme: $("#currentTheme"),
  difficultyGrid: $("#difficultyGrid"),
  qaCard: $("#qaCard"),
  questionText: $("#questionText"),
  answerText: $("#answerText"),
  btnCorrect: $("#btnCorrect"),
  btnWrong: $("#btnWrong"),
  deckEmpty: $("#deckEmpty"),
  endGameBtn: $("#endGameBtn"),
  restartBtn: $("#restartBtn"),
  shareBtn: $("#shareBtn"),
  installBtn: $("#installBtn"),
  // Nouveaux éléments pour le flux "révéler la réponse"
  showAnswerBtn: $("#showAnswerBtn"),
  answerBlock: $("#answerBlock"),
  revealRow: $("#revealRow"),
  judgeRow: $("#judgeRow"),
};

// ---------- État du jeu ----------
const STATE = {
  players: [],              // [{name, score}]
  turnIndex: 0,             // index du joueur dont c'est le tour
  round: 1,
  theme: null,              // {id, name, ...}
  usedDifficulties: new Set(), // difficultés prises dans la manche
  usedQuestions: {},        // {themeId: { difficulty: [indices] }}
  lastThemeId: null,
  questions: null,          // données chargées
  currentQA: null,          // {q, a, diff}
  answerRevealed: false,    // nouvel état pour contrôler l'affichage de la réponse
};

// ---------- Utilitaires ----------
const randInt = (min, max) => Math.floor(Math.random()*(max-min+1))+min;
const pick = (arr) => arr[randInt(0, arr.length-1)];

function saveLocal(){
  localStorage.setItem("pocer_state", JSON.stringify({
    players: STATE.players,
    turnIndex: STATE.turnIndex,
    round: STATE.round,
    themeId: STATE.theme?.id ?? null,
    usedDifficulties: [...STATE.usedDifficulties],
    usedQuestions: STATE.usedQuestions,
    lastThemeId: STATE.lastThemeId,
  }));
}

function loadLocal(){
  try{
    const raw = localStorage.getItem("pocer_state");
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){ return null; }
}

function resetState(){
  STATE.players = [];
  STATE.turnIndex = 0;
  STATE.round = 1;
  STATE.theme = null;
  STATE.usedDifficulties = new Set();
  STATE.usedQuestions = {};
  STATE.lastThemeId = null;
  STATE.currentQA = null;
  STATE.answerRevealed = false;
}

// ---------- Chargement questions ----------
async function loadQuestions(){
  try{
    const res = await fetch("questions.sample.json", {cache: "no-store"});
    if(!res.ok) throw new Error("HTTP "+res.status);
    STATE.questions = await res.json();
  }catch(e){
    console.error("Impossible de charger les questions", e);
    // Fallback minimal (1 thème démo) pour tests
    STATE.questions = {
      "themes": [
        {
          "id": "demo",
          "name": "Démo",
          "questions": {
            "1": [
              { "q": "Capitale de la France ?", "a": "Paris" },
              { "q": "Symbole chimique de l'eau ?", "a": "H2O" }
            ],
            "2": [
              { "q": "Année de la Révolution française ?", "a": "1789" }
            ],
            "3": [], "4": [], "5": [], "6": [], "7": [], "8": [], "9": [], "10": []
          }
        }
      ]
    };
  }
}

// ---------- Sélecteurs de données ----------
function getThemeById(id){
  return STATE.questions.themes.find(t=>t.id===id) || null;
}

function remainingCount(theme, difficulty){
  const list = theme.questions[String(difficulty)] || [];
  ensureUsedQuestionsPaths(theme.id);
  const used = new Set(STATE.usedQuestions[theme.id][difficulty]);
  return list.length - used.size;
}

function ensureUsedQuestionsPaths(themeId){
  if(!STATE.usedQuestions[themeId]) STATE.usedQuestions[themeId] = {};
  for(let d=1; d<=10; d++){
    if(!STATE.usedQuestions[themeId][d]) STATE.usedQuestions[themeId][d] = [];
  }
}

function drawQuestion(theme, difficulty){
  const list = theme.questions[String(difficulty)] || [];
  ensureUsedQuestionsPaths(theme.id);
  const used = new Set(STATE.usedQuestions[theme.id][difficulty]);
  const candidates = list.map((qa, idx)=>({qa, idx})).filter(x=>!used.has(x.idx));
  if(!candidates.length) return null;
  const {qa, idx} = candidates[randInt(0, candidates.length-1)];
  STATE.usedQuestions[theme.id][difficulty] = [...used, idx];
  return { ...qa, diff: difficulty };
}

function hasRemainingQuestions(theme){
  for(let d=1; d<=10; d++){
    const list = theme.questions[String(d)] || [];
    if(list.length > 0){
      const used = (STATE.usedQuestions[theme.id]?.[d] || []).length;
      if(used < list.length) return true;
    }
  }
  return false;
}

function pickRandomTheme(){
  const all = STATE.questions?.themes || [];
  const candidates = all.filter(hasRemainingQuestions);
  if(!candidates.length) return null;
  const pool = candidates.length>1 ? candidates.filter(t=>t.id!==STATE.lastThemeId) : candidates;
  const t = pool[randInt(0, pool.length-1)];
  STATE.lastThemeId = t.id;
  return t;
}

// ---------- UI helpers ----------
function showScreen(name){
  Object.values(screens).forEach(s=>s.classList.remove("active"));
  screens[name].classList.add("active");
}

function renderScoreboard(intoEl){
  intoEl.innerHTML = "";
  const tpl = $("#playerRowTpl");
  STATE.players.forEach(p=>{
    const node = tpl.content.cloneNode(true);
    node.querySelector(".name").textContent = p.name;
    node.querySelector(".score").textContent = String(p.score);
    intoEl.appendChild(node);
  });
}

function renderGame(){
  els.roundNum.textContent = String(STATE.round);
  els.currentTheme.textContent = STATE.theme ? STATE.theme.name : "—";
  els.currentPlayerName.textContent = STATE.players[STATE.turnIndex]?.name ?? "—";
  renderScoreboard(els.scoreboard);

  // Grille difficultés
  els.difficultyGrid.innerHTML = "";
  for(let d=1; d<=10; d++){
    const b = document.createElement("button");
    b.className = "diff-btn";
    b.textContent = String(d);
    b.dataset.d = String(d);
    const alreadyTaken = STATE.usedDifficulties.has(d);
    const remaining = STATE.theme ? remainingCount(STATE.theme, d) : 0;
    if(alreadyTaken || remaining<=0) b.disabled = true;
    b.addEventListener("click", ()=>onChooseDifficulty(d));
    els.difficultyGrid.appendChild(b);
  }

  // Carte Q/R
  if(STATE.currentQA){
    els.qaCard.classList.remove("hidden");
    els.questionText.textContent = STATE.currentQA.q;
    els.answerText.textContent = STATE.currentQA.a;

    if (STATE.answerRevealed) {
      els.answerBlock.classList.remove("hidden");
      els.judgeRow.classList.remove("hidden");
      els.revealRow.classList.add("hidden");
      els.showAnswerBtn?.setAttribute("aria-expanded", "true");
    } else {
      els.answerBlock.classList.add("hidden");
      els.judgeRow.classList.add("hidden");
      els.revealRow.classList.remove("hidden");
      els.showAnswerBtn?.setAttribute("aria-expanded", "false");
    }
  }else{
    els.qaCard.classList.add("hidden");
  }
}

function setThemeForRound(){
  STATE.theme = pickRandomTheme();
  STATE.usedDifficulties = new Set();
  STATE.currentQA = null;
  STATE.answerRevealed = false;
  if(!STATE.theme){
    alert("Plus de questions disponibles. Fin de partie !");
    finishGame();
  }
}

// ---------- Logique du jeu ----------
function nextPlayer(){
  STATE.turnIndex = (STATE.turnIndex + 1) % STATE.players.length;
  if(STATE.turnIndex === 0){
    STATE.round += 1;
    setThemeForRound();
  }
  saveLocal();
  renderGame();
}

function onChooseDifficulty(d){
  if(!STATE.theme) return;
  if(STATE.usedDifficulties.has(d)) return;
  const qa = drawQuestion(STATE.theme, d);
  if(!qa){
    els.deckEmpty.classList.remove("hidden");
    setTimeout(()=>els.deckEmpty.classList.add("hidden"), 2000);
    renderGame();
    return;
  }
  STATE.currentQA = qa;
  STATE.usedDifficulties.add(d);
  STATE.answerRevealed = false;
  saveLocal();
  renderGame();
}

function onShowAnswer(){
  STATE.answerRevealed = true;
  renderGame();
  els.showAnswerBtn?.setAttribute("aria-expanded", "true");
}

function onAnswer(isCorrect){
  if(!STATE.currentQA) return;
  if(isCorrect){
    const player = STATE.players[STATE.turnIndex];
    player.score += STATE.currentQA.diff;
  }
  STATE.currentQA = null;
  STATE.answerRevealed = false;
  saveLocal();
  nextPlayer();
}

// ---------- Setup & démarrage ----------
async function startGame(players){
  resetState();
  STATE.players = players.map(n=>({name:n, score:0}));
  await loadQuestions();
  setThemeForRound();
  saveLocal();
  showScreen("game");
  renderGame();
}

function finishGame(){
  const best = Math.max(...STATE.players.map(p=>p.score));
  const winners = STATE.players.filter(p=>p.score===best);
  els.winners.textContent = winners.length>1
    ? `Égalité ! Gagnants: ${winners.map(w=>w.name).join(", ")} (${best} pts)`
    : `Vainqueur : ${winners[0].name} (${best} pts)`;
  renderScoreboard(els.finalTable);
  showScreen("recap");
}

function shareScores(){
  const lines = [
    "PoCer — Résultats",
    ...STATE.players.map(p=>`${p.name}: ${p.score} pts`),
    `(Manche ${STATE.round-1})`
  ];
  const text = lines.join("\n");
  if(navigator.share){
    navigator.share({text}).catch(()=>{});
  }else{
    navigator.clipboard.writeText(text).then(()=>{
      alert("Scores copiés !");
    });
  }
}

function handleInstallPrompt(){
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    els.installBtn.hidden = false;
    els.installBtn.onclick = async () => {
      els.installBtn.hidden = true;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    };
  });
}

// ---------- Événements ----------
els.playersForm.addEventListener("submit", (e)=>{
  e.preventDefault();
  const inputs = $$("input[name=player]", els.playersForm);
  const names = inputs.map(i=>i.value.trim()).filter(Boolean);
  if(names.length<1 || names.length>5){
    alert("Entre 1 à 5 joueurs.");
    return;
  }
  startGame(names);
});

els.loadDemo.addEventListener("click", ()=>{
  $$("input[name=player]", els.playersForm).forEach((i,idx)=>{
    i.value = idx<3 ? ["Lina","Max","Sam"][idx] : "";
  });
});

els.showAnswerBtn?.addEventListener("click", onShowAnswer);
els.btnCorrect.addEventListener("click", ()=>onAnswer(true));
els.btnWrong.addEventListener("click", ()=>onAnswer(false));
els.endGameBtn.addEventListener("click", finishGame);
els.restartBtn.addEventListener("click", ()=>{
  localStorage.removeItem("pocer_state");
  location.reload();
});
els.shareBtn.addEventListener("click", shareScores);

window.addEventListener("load", async ()=>{
  if('serviceWorker' in navigator){
    try{ await navigator.serviceWorker.register("./sw.js"); }catch(e){}
  }
  handleInstallPrompt();
  await loadQuestions();
  const saved = loadLocal();
  if(saved && confirm("Reprendre la partie sauvegardée ?")){
    STATE.players = saved.players || [];
    STATE.turnIndex = saved.turnIndex || 0;
    STATE.round = saved.round || 1;
    STATE.usedQuestions = saved.usedQuestions || {};
    STATE.usedDifficulties = new Set(saved.usedDifficulties || []);
    STATE.lastThemeId = saved.lastThemeId || null;
    STATE.theme = saved.themeId ? getThemeById(saved.themeId) || pickRandomTheme() : pickRandomTheme();
    showScreen("game");
    renderGame();
  }else{
    showScreen("setup");
  }
});
