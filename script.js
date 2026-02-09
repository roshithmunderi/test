// Scratch-card surprise implementation
const canvas = document.getElementById('scratch');
const backdrop = document.getElementById('backdrop');
const photo = document.getElementById('photo');
const surpriseTitle = document.getElementById('surpriseTitle');
const surpriseText = document.getElementById('surpriseText');
const codeGate = document.getElementById('codeGate');
const codeInput = document.getElementById('codeInput');
const codeBtn = document.getElementById('codeBtn');
const codeError = document.getElementById('codeError');
const codeHint = document.getElementById('codeHint');
const scratchPercent = document.getElementById('scratchPercent');
const scratchFill = document.getElementById('scratchFill');
const dustRoot = document.getElementById('scratchDust');
const yesBtn = document.getElementById('yesBtn');
const noBtn = document.getElementById('noBtn');
const buddyBubble = document.getElementById('buddyBubble');
const copyLink = document.getElementById('copyLink');
const resetBtn = document.getElementById('resetBtn');
const confettiRoot = document.getElementById('confetti-root');
const sparkleRoot = document.getElementById('sparkle-root');
const heartTrail = document.getElementById('heart-trail');
const card = document.querySelector('.card');

let ctx, w, h;
let isDrawing = false;
let last = {x:0,y:0};
let revealed = false;

const yesPhoneNumber = '+919567466686';
let secretCode = 'appi biju';
let secretHint = 'our little word';
let fullMessage = '';
let typingTimer = null;
let lastTrailTime = 0;
let lastDustTime = 0;
let progressStage = -1;
let requiresCode = false;
const revealTarget = 0.26;
let scratchFallback = 0;
let hasPhotoFromParams = false;

function buildSmsUrl(number, body){
  const encodedBody = encodeURIComponent(body);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const separator = isIOS ? '&' : '?';
  return `sms:${number}${separator}body=${encodedBody}`;
}

function rand(min,max){ return Math.random()*(max-min)+min }

function normalizeCode(value){
  return (value || '').trim().toLowerCase();
}

function setBuddyMood(mode, text){
  document.body.classList.remove('buddy-locked', 'buddy-curious', 'buddy-happy', 'buddy-sad');
  document.body.classList.add(`buddy-${mode}`);
  if(buddyBubble && text) buddyBubble.textContent = text;
}

function updateScratchUI(ratio){
  const progress = Math.max(0, Math.min(100, Math.round((ratio / revealTarget) * 100)));
  if(scratchPercent) scratchPercent.textContent = `${progress}%`;
  if(scratchFill) scratchFill.style.width = `${progress}%`;
  if(document.body.classList.contains('locked') || document.body.classList.contains('revealed')) return;

  const nextStage = progress < 25 ? 0 : progress < 60 ? 1 : progress < 95 ? 2 : 3;
  if(nextStage === progressStage) return;
  progressStage = nextStage;
  if(nextStage === 0) setBuddyMood('curious', 'Scratch a little more...');
  if(nextStage === 1) setBuddyMood('curious', 'Nice, keep going...');
  if(nextStage === 2) setBuddyMood('curious', 'Almost there...');
  if(nextStage === 3) setBuddyMood('happy', 'So close now.');
}

function cacheMessage(){
  if(!surpriseText) return;
  fullMessage = surpriseText.textContent || '';
}

async function applyPhotoFromBase64File(path = 'base64.txt'){
  if(!photo || hasPhotoFromParams) return;
  try{
    const res = await fetch(path, {cache: 'no-store'});
    if(!res.ok) return;
    const raw = (await res.text()).trim();
    if(!raw) return;
    const compact = raw.replace(/\s+/g, '');
    const dataUrl = compact.startsWith('data:image') ? compact : `data:image/jpeg;base64,${compact}`;
    photo.style.backgroundImage = `url("${dataUrl}")`;
  }catch(e){
    // ignore if file cannot be fetched (for example, when opened as file://)
  }
}

function applyPersonalization(){
  try{
    const params = new URLSearchParams(location.search);
    const from = params.get('from') || params.get('sender') || '';
    const to = params.get('to') || params.get('recipient') || '';
    const msg = params.get('msg') || params.get('message') || '';
    const photoUrl = params.get('photo') || '';
    const codeParam = params.get('code') || '';
    const hintParam = params.get('hint') || '';
    const titleEl = document.getElementById('pageTitle');
    const subEl = document.getElementById('pageSubtitle');
    if(titleEl && to) titleEl.textContent = `A surprise for ${to}`;
    if(subEl && from) subEl.textContent = `From ${from} — scratch to reveal`;
    if(surpriseTitle && to) surpriseTitle.textContent = `Dear ${to},`;
    if(surpriseText && msg) surpriseText.textContent = msg;
    if(photo && photoUrl){
      photo.style.backgroundImage = `url(${photoUrl})`;
      hasPhotoFromParams = true;
    }
    if(codeParam) secretCode = codeParam;
    if(hintParam) secretHint = hintParam;
    if(codeHint) codeHint.textContent = `Hint: ${secretHint}`;
  }catch(e){ /* ignore */ }
}

applyPersonalization();
applyPhotoFromBase64File();
cacheMessage();
requiresCode = normalizeCode(secretCode).length > 0;
if(requiresCode){
  if(codeHint && !codeHint.textContent) codeHint.textContent = `Hint: ${secretHint}`;
  document.body.classList.add('locked');
  setBuddyMood('locked', 'Type the code and unlock this.');
}else{
  document.body.classList.remove('locked');
  document.body.classList.add('gate-unlocked');
  setBuddyMood('curious', 'Scratch the silver layer.');
}

function unlockGate(){
  requiresCode = normalizeCode(secretCode).length > 0;
  document.body.classList.remove('locked');
  document.body.classList.add('gate-unlocked');
  if(codeError) codeError.textContent = '';
  if(codeInput) codeInput.blur();
  setBuddyMood('curious', 'Great. Now scratch the silver layer.');
}

function tryUnlock(){
  if(!requiresCode){
    unlockGate();
    return;
  }
  if(!codeInput) return;
  const guess = normalizeCode(codeInput.value);
  if(!guess){
    if(codeError) codeError.textContent = 'Type the code to unlock.';
    if(codeGate) codeGate.querySelector('.code-card')?.classList.remove('shake');
    return;
  }
  if(guess === normalizeCode(secretCode)){
    unlockGate();
  }else{
    if(codeError) codeError.textContent = 'Not quite. Try again.';
    const cardEl = codeGate ? codeGate.querySelector('.code-card') : null;
    if(cardEl){
      cardEl.classList.remove('shake');
      void cardEl.offsetWidth;
      cardEl.classList.add('shake');
    }
  }
}

if(codeBtn) codeBtn.addEventListener('click', tryUnlock);
if(codeInput) codeInput.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter') tryUnlock();
});

function setupCanvas(){
  if(!canvas) return;
  ctx = canvas.getContext('2d');
  resizeCanvas();
  scratchFallback = 0;
  // fill overlay with metallic silver
  ctx.fillStyle = '#bfbfbf';
  ctx.fillRect(0,0,w,h);
  // add some sheen pattern
  const g = ctx.createLinearGradient(0,0,w,h);
  g.addColorStop(0,'rgba(255,255,255,0.08)');
  g.addColorStop(0.5,'rgba(0,0,0,0.06)');
  g.addColorStop(1,'rgba(255,255,255,0.05)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,w,h);
  // add fine grain texture
  for(let i=0;i<1200;i++){
    const x = Math.random()*w;
    const y = Math.random()*h;
    const a = Math.random()*0.08;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(x,y,1,1);
  }
  ctx.globalCompositeOperation = 'destination-out';
  updateScratchUI(0);
}

function resizeCanvas(){
  if(!canvas) return;
  const rect = canvas.getBoundingClientRect();
  w = Math.max(300, rect.width);
  h = Math.max(200, rect.height);
  canvas.width = w; canvas.height = h;
}

function pointFromEvent(e){
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  return {x: (touch.clientX - rect.left) * (canvas.width/rect.width), y: (touch.clientY - rect.top) * (canvas.height/rect.height)};
}

function drawLine(x,y,velocity=0){
  const radius = Math.max(18, Math.min(34, 18 + velocity*28));
  ctx.beginPath();
  ctx.arc(x,y,radius,0,Math.PI*2);
  ctx.fill();
}

function handleStart(e){
  e.preventDefault();
  isDrawing = true;
  last = pointFromEvent(e);
  drawLine(last.x,last.y,0.4);
  checkRevealProgress();
}

function handleMove(e){
  if(!isDrawing) return;
  e.preventDefault();
  const p = pointFromEvent(e);
  const dist = Math.hypot(p.x-last.x,p.y-last.y);
  const velocity = Math.min(1, dist / 40);
  const radius = Math.max(18, Math.min(34, 18 + velocity*28));
  const areaHint = (dist || 1) * radius;
  // Fallback estimate so percentage still moves even if pixel sampling fails/under-reports.
  scratchFallback = Math.min(1, scratchFallback + (areaHint / Math.max(1, (w*h)*7)));
  const steps = Math.ceil(dist/6);
  for(let i=0;i<steps;i++){
    const t = i/steps;
    const x = last.x + (p.x-last.x)*t;
    const y = last.y + (p.y-last.y)*t;
    drawLine(x,y,velocity);
    spawnDust(x,y);
  }
  last = p;
  checkRevealProgress();
}

function handleEnd(e){
  isDrawing = false;
}

function checkRevealProgress(){
  let ratio = scratchFallback;
  try{
    // sample pixels to estimate how much is cleared
    const img = ctx.getImageData(0,0,w,h);
    let cleared = 0;
    let sampled = 0;
    for(let i=3;i<img.data.length;i+=64){ // sparse alpha sampling for performance
      sampled++;
      if(img.data[i] < 16) cleared++;
    }
    if(sampled > 0){
      ratio = Math.max(ratio, cleared / sampled);
    }
  }catch(e){
    // Keep fallback ratio if pixel reads are blocked.
  }
  updateScratchUI(ratio);
  if(ratio > revealTarget && !revealed){
    revealed = true;
    onFullyRevealed();
  }
}

function markRevealed(){
  document.body.classList.add('revealed');
  if(ctx) ctx.clearRect(0,0,w,h);
}

function startTypewriter(){
  if(!surpriseText || !fullMessage) return;
  clearTimeout(typingTimer);
  surpriseText.textContent = '';
  surpriseText.classList.add('typing');
  let i = 0;
  const startDelay = 180;
  const tick = ()=>{
    surpriseText.textContent = fullMessage.slice(0, i);
    i += 1;
    if(i <= fullMessage.length){
      typingTimer = setTimeout(tick, 18 + Math.random()*22);
    }else{
      surpriseText.classList.remove('typing');
    }
  };
  typingTimer = setTimeout(tick, startDelay);
}

function resetTypewriter(){
  if(!surpriseText) return;
  clearTimeout(typingTimer);
  surpriseText.classList.remove('typing');
  surpriseText.textContent = fullMessage;
}

function onFullyRevealed(){
  markRevealed();
  updateScratchUI(revealTarget);
  setBuddyMood('happy', 'You unlocked it.');
  runConfetti({burst:true});
  playChime();
  startTypewriter();
}

function lockGate(){
  requiresCode = normalizeCode(secretCode).length > 0;
  if(!requiresCode){
    document.body.classList.remove('locked');
    document.body.classList.add('gate-unlocked');
    if(codeInput) codeInput.value = '';
    if(codeError) codeError.textContent = '';
    setBuddyMood('curious', 'Scratch the silver layer.');
    return;
  }
  document.body.classList.add('locked');
  document.body.classList.remove('gate-unlocked');
  if(codeInput) codeInput.value = '';
  if(codeError) codeError.textContent = '';
  setBuddyMood('locked', 'Type the code and unlock this.');
}

function resetScratch(){
  revealed = false;
  progressStage = -1;
  document.body.classList.remove('revealed', 'sad');
  resetTypewriter();
  clearConfetti();
  lockGate();
  setupCanvas();
  runSparkles();
}

window.addEventListener('resize', ()=>{ resizeCanvas(); setupCanvas(); });

// attach input handlers
if(canvas){
  canvas.addEventListener('touchstart', handleStart, {passive:false});
  canvas.addEventListener('touchmove', handleMove, {passive:false});
  canvas.addEventListener('touchend', handleEnd);
  canvas.addEventListener('mousedown', handleStart);
  window.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseup', handleEnd);
}

if(resetBtn) resetBtn.addEventListener('click', resetScratch);
if(yesBtn) yesBtn.addEventListener('click', ()=>{
  setBuddyMood('happy', 'Yay. Sending "Yes".');
  runConfetti({burst:false});
  window.location.href = buildSmsUrl(yesPhoneNumber, 'Yes');
});
if(noBtn) noBtn.addEventListener('click', ()=>{
  document.body.classList.add('sad');
  setBuddyMood('sad', 'I will wait for you.');
});

if(copyLink) copyLink.addEventListener('click', async ()=>{
  try{
    const url = location.href;
    if(navigator.clipboard) await navigator.clipboard.writeText(url);
    else{
      const ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    copyLink.textContent = 'Link copied!';
    setBuddyMood('happy', 'Link copied.');
    setTimeout(()=> copyLink.textContent = 'Copy share link', 2000);
  }catch(e){ /* ignore */ }
});

// Heart trail
function spawnHeart(x,y){
  if(!heartTrail) return;
  const el = document.createElement('div');
  el.className = 'trail-heart';
  el.textContent = Math.random() > 0.5 ? '❤' : '❥';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.fontSize = `${rand(12,18)}px`;
  el.style.color = `hsl(${rand(330,355)} 80% 70%)`;
  heartTrail.appendChild(el);
  setTimeout(()=> el.remove(), 1200);
}

if(card){
  card.addEventListener('pointermove', (e)=>{
    const now = Date.now();
    if(now - lastTrailTime < 60) return;
    lastTrailTime = now;
    spawnHeart(e.clientX, e.clientY);
  });
}

// Reset sparkles
function runSparkles(){
  if(!sparkleRoot) return;
  const origin = resetBtn ? resetBtn.getBoundingClientRect() : {left:window.innerWidth/2, top:window.innerHeight/2, width:0, height:0};
  const cx = origin.left + origin.width/2;
  const cy = origin.top + origin.height/2;
  const count = 16;
  for(let i=0;i<count;i++){
    const s = document.createElement('div');
    s.className = 'sparkle';
    s.style.left = `${cx + rand(-28,28)}px`;
    s.style.top = `${cy + rand(-16,16)}px`;
    s.style.animationDelay = `${rand(0,120)}ms`;
    s.style.width = `${rand(4,7)}px`;
    s.style.height = s.style.width;
    sparkleRoot.appendChild(s);
    setTimeout(()=> s.remove(), 900);
  }
}

// Scratch dust particles
function spawnDust(x,y){
  if(!dustRoot) return;
  const now = Date.now();
  if(now - lastDustTime < 35) return;
  lastDustTime = now;
  const rect = canvas.getBoundingClientRect();
  const px = (x / canvas.width) * rect.width;
  const py = (y / canvas.height) * rect.height;
  const d = document.createElement('div');
  d.className = 'dust';
  d.style.left = `${px}px`;
  d.style.top = `${py}px`;
  d.style.width = `${rand(4,8)}px`;
  d.style.height = d.style.width;
  d.style.animationDelay = `${rand(0,80)}ms`;
  dustRoot.appendChild(d);
  setTimeout(()=> d.remove(), 700);
}

// Confetti (lightweight)
let confettiPieces = [];
let confettiRaf = null;

function makePiece(){
  const el = document.createElement('div');
  el.className = 'confetti-piece';
  el.style.left = rand(5,95)+'%';
  el.style.top = rand(-8,-2)+'%';
  const hue = rand(320,360);
  el.style.background = `linear-gradient(180deg,hsl(${hue} 85% 65%), hsl(${hue+10} 90% 55%))`;
  el.style.width = Math.round(rand(6,14))+'px';
  el.style.height = Math.round(rand(10,22))+'px';
  confettiRoot.appendChild(el);
  const x = (parseFloat(el.style.left)/100) * window.innerWidth;
  confettiPieces.push({el,x,y:-20,vx:rand(-0.6,0.6),vy:rand(1.6,3.8),rot:rand(0,360),rotSpeed:rand(-8,8),life:0});
}

function stepConfetti(){
  for(let i=confettiPieces.length-1;i>=0;i--){
    const p = confettiPieces[i];
    p.x += p.vx*2;
    p.y += p.vy;
    p.vy += 0.06;
    p.rot += p.rotSpeed;
    p.life += 1;
    p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)`;
    if(p.y > window.innerHeight + 40 || p.life > 240){ p.el.remove(); confettiPieces.splice(i,1); }
  }
  if(confettiPieces.length === 0){ cancelAnimationFrame(confettiRaf); confettiRaf = null; }
  else confettiRaf = requestAnimationFrame(stepConfetti);
}

function runConfetti(opts={}){
  clearConfetti();
  const count = opts.burst ? 60 : 28;
  for(let i=0;i<count;i++){ setTimeout(makePiece, i*12); }
  if(!confettiRaf) confettiRaf = requestAnimationFrame(stepConfetti);
}

function clearConfetti(){
  confettiPieces.forEach(p=>p.el.remove()); confettiPieces = [];
  if(confettiRaf){ cancelAnimationFrame(confettiRaf); confettiRaf = null; }
}

function playChime(){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 480;
    g.gain.value = 0.001;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.32);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    setTimeout(()=>{ o.stop(); ctx.close(); }, 1400);
  }catch(e){ /* ignore */ }
}

// initialize
setupCanvas();
requestAnimationFrame(()=> document.body.classList.add('loaded'));
