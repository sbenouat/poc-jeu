/* PoCer — jeu de quiz mobile-first (UX clarifiée) */
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
  loadDemo: $("#loadDemo"),
  // header
  roundNum: $("#roundNum"),
  currentTheme: $("#currentTheme"),
  roundDots: $$(".round-progress .dot"),
  // current player
  currentPlayerName: $("#currentPlayerName"),
  currentAvatar: $("#currentAvatar"),
  turnOrder: $("#turnOrder"),
  turnOrderSub: $("#turnOrderSub"),
  // scoreboard
  scoreboard: $("#scoreboard"),
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
  shareBtn: $("#shareBtn"),
};

const MAX_ROUNDS = 10;

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
  }));
}
function loadLocal(){
  try{ const raw = localStorage.getItem("pocer_state"); return raw? JSON.parse(raw): null; }catch{ return null; }
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

// --------- Data (questions) ----------
async function loadQuestions(){
  try{
    const res = await fetch("questions.sample.json", {cache:"no-store"});
    if(!res.ok) throw new Error("HTTP "+res.status);
    STATE.questions = await res.json();
  }catch(e){
    STATE.questions = {
      themes:[{
        id:"demo", name:"Démo",
        questions:{ "1":[{q:"Capitale de la France ?",a:"Paris"}], "2":[{q:"Symbole de l’eau ?",a:"H2O"}],
          "3":[], "4":[], "5":[], "6":[], "7":[], "8":[], "9":[], "10":[] }
      }]
    };
  }
}

function getThemeById(id){
  return STATE.questions.themes.find(t=>t.id===id) || null;
}
function ensureUsedQuestionsPaths(themeId){
  if(!STATE.usedQuestions[themeId]) STATE.usedQuestions[themeId] = {};
  for(let d=1; d<=10; d++){
    if(!STATE.usedQuestions[themeId][d]) STATE.usedQuestions[themeId][d] = [];
  }
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
  return {...qa, diff:d};
}
function hasRemainingQuestions(theme){
  for(let d=1; d<=10; d++){
    const list = theme.questions[String(d)] || [];
    const used = (STATE.usedQuestions[theme.id]?.[d] || []).length;
    if(used < list.length) return true;
  }
  return false;
}
function pickRandomTheme(){
  const all = STATE.questions?.themes || [];
  const candidates = all.filter(t => hasRemainingQuestions(t) && !STATE.usedThemes.has(t.id));
  if(!candidates.length) return null;
  const pool = candidates.length>1 ? candidates.filter(t=>t.id!==STATE.lastThemeId) : candidates;
  const t = pool[randInt(0,pool.length-1)];
  STATE.lastThemeId = t.id;
  return t;
}

// --------- UI helpers ----------
function showScreen(name){
  Object.values(screens).forEach(s=>s.classList.remove("active"));
  screens[name].classList.add("active");
}
function renderRoundHeader(){
  els.roundNum.textContent = String(STATE.round);
  els.currentTheme.textContent = STATE.theme ? STATE.theme.name : "—";
  // progression dots
  els.roundDots.forEach((dot,i)=>{
    const idx = i+1;
    dot.classList.toggle("done", idx < STATE.round);
    dot.classList.toggle("active", idx === STATE.round);
  });
}
function renderCurrentPlayer(){
  const p = STATE.players[STATE.turnIndex];
  els.currentPlayerName.textContent = p?.name ?? "—";
  els.currentAvatar.textContent = initials(p?.name);
  els.turnOrderSub.textContent = `Ordre : ${computeTurnOrderNames().join(" → ")}`;

  // turn chips
  els.turnOrder.innerHTML = "";
  computeTurnOrderNames(true).forEach(({name,isActive},i)=>{
    const chip = document.createElement("div");
    chip.className = "turn-chip"+(isActive?" active":"");
    const b = document.createElement("span");
    b.className = "badge"; b.textContent = String(i+1);
    const n = document.createElement("span");
    n.className = "name"; n.textContent = name;
    chip.append(b,n);
    els.turnOrder.appendChild(chip);
  });

  // petite vibration pour donner le tour
  if (navigator.vibrate) navigator.vibrate(15);
  // annonce ARIA
  try{
    const live = $(".round-chip");
    if(live){ live.setAttribute("aria-label", `Manche ${STATE.round} — à ${p?.name} de jouer`); }
  }catch{}
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
function setThemeForRound(){
  STATE.theme = pickRandomTheme();
  STATE.usedDifficulties = new Set();
  STATE.currentQA = null;
  STATE.answerRevealed = false;

  if(!STATE.theme){
    alert("Plus de thèmes disponibles (ou plus de questions). Fin de partie !");
    finishGame();
    return;
  }
  STATE.usedThemes.add(STATE.theme.id);
  saveLocal();
}
function computeTurnOrderNames(withActiveFlag=false){
  const names = [];
  for(let i=0;i<STATE.players.length;i++){
    const idx = (STATE.starterIndex + i) % STATE.players.length;
    const name = STATE.players[idx].name;
    if(withActiveFlag){
      names.push({name, isActive: idx===STATE.turnIndex});
    }else{
      names.push(name + (idx===STATE.turnIndex ? " (★)" : ""));
    }
  }
  return names;
}
function nextPlayer(){
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
    setThemeForRound();
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
function onAnswer(isCorrect){
  if(!STATE.currentQA) return;
  if(isCorrect){
    const player = STATE.players[STATE.turnIndex];
    player.score += STATE.currentQA.diff;
  }
  saveLocal();
  nextPlayer();
}

// --------- Game flow ----------
async function startGame(players){
  resetState();
  STATE.players = players.map(n=>({name:n, score:0}));
  STATE.starterIndex = 0;
  STATE.turnIndex = STATE.starterIndex;
  await loadQuestions();
  setThemeForRound();
  saveLocal();
  showScreen("game");
  renderAll();
}
function finishGame(){
  const best = Math.max(...STATE.players.map(p=>p.score));
  const winners = STATE.players.filter(p=>p.score===best);
  els.winners.textContent = winners.length>1
    ? `Égalité ! Gagnants : ${winners.map(w=>w.name).join(", ")} (${best} pts)`
    : `Vainqueur : ${winners[0].name} (${best} pts)`;
  renderScoreboard(els.finalTable);
  showScreen("recap");
}
function shareScores(){
  const lines = [
    "PoCer — Résultats",
    ...STATE.players.map(p=>`${p.name}: ${p.score} pts`),
    `(Manches jouées: ${Math.min(STATE.round-1, MAX_ROUNDS)}/${MAX_ROUNDS})`
  ];
  const text = lines.join("\n");
  if(navigator.share){ navigator.share({text}).catch(()=>{}); }
  else { navigator.clipboard.writeText(text).then(()=>alert("Scores copiés !")); }
}

// --------- Events ----------
els.playersForm.addEventListener("submit",(e)=>{
  e.preventDefault();
  const names = $$("input[name=player]", els.playersForm).map(i=>i.value.trim()).filter(Boolean);
  if(names.length<1 || names.length>5){ alert("Entre 1 à 5 joueurs."); return; }
  startGame(names);
});
els.loadDemo.addEventListener("click", ()=>{
  $$("input[name=player]", els.playersForm).forEach((i,idx)=>{
    i.value = idx<3 ? ["Lina","Max","Sam"][idx] : "";
  });
});
els.showAnswerBtn.addEventListener("click", onShowAnswer);
els.btnCorrect.addEventListener("click", ()=>onAnswer(true));
els.btnWrong.addEventListener("click", ()=>onAnswer(false));
els.endGameBtn.addEventListener("click", finishGame);
els.restartBtn.addEventListener("click", ()=>{
  localStorage.removeItem("pocer_state");
  location.reload();
});
els.shareBtn.addEventListener("click", shareScores);

window.addEventListener("load", async ()=>{
  await loadQuestions();
  const saved = loadLocal();
  if(saved && confirm("Reprendre la partie sauvegardée ?")){
    STATE.players = saved.players || [];
    STATE.turnIndex = saved.turnIndex ?? 0;
    STATE.starterIndex = saved.starterIndex ?? 0;
    STATE.round = saved.round || 1;
    STATE.usedQuestions = saved.usedQuestions || {};
    STATE.usedDifficulties = new Set(saved.usedDifficulties || []);
    STATE.lastThemeId = saved.lastThemeId || null;
    STATE.usedThemes = new Set(saved.usedThemes || []);
    STATE.theme = saved.themeId ? getThemeById(saved.themeId) || pickRandomTheme() : pickRandomTheme();
    if(STATE.theme && !STATE.usedThemes.has(STATE.theme.id)) STATE.usedThemes.add(STATE.theme.id);
    showScreen("game");
    renderAll();
  }else{
    showScreen("setup");
  }
});
