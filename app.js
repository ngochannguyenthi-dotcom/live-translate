/* ── VietFR Live — app.js ── */

let apiKey = '';
let segments = [];
let interimText = '';
let isListening = false;
let recognition = null;
let wordCount = 0;
let toastTimer = null;
let autoSpeak = true;
const seen = new Set();

/* ── Helpers ── */
function fmt(d) {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function setStatus(cls, lbl) {
  const o = document.getElementById('sorb');
  o.className = 'sorb ' + cls;
  document.getElementById('slbl').textContent = lbl;
}

function toast(msg) {
  clearTimeout(toastTimer);
  document.getElementById('toast-txt').textContent = msg;
  const w = document.getElementById('toast-wrap');
  w.style.display = 'block';
  toastTimer = setTimeout(() => { w.style.display = 'none'; }, 2800);
}

/* ── Text-to-speech ── */
function speak(text) {
  if (!text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR';
  u.rate = 0.93;
  u.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find(x => x.lang.startsWith('fr-FR')) || voices.find(x => x.lang.startsWith('fr'));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}
// Expose globally for inline onclick handlers
window.speak = speak;

/* ── API Key ── */
document.getElementById('save-key').addEventListener('click', () => {
  const v = document.getElementById('api-key').value.trim();
  if (!v.startsWith('gsk_')) {
    toast('Clé invalide — doit commencer par gsk_');
    return;
  }
  apiKey = v;
  document.getElementById('api-key').value = '●'.repeat(24);
  document.getElementById('key-ok').classList.add('show');
  toast('Clé Groq enregistrée — traduction activée !');
});

/* ── Auto-speak toggle ── */
document.getElementById('auto-btn').addEventListener('click', function () {
  autoSpeak = !autoSpeak;
  this.className = autoSpeak ? 'auto-btn' : 'auto-btn off';
  toast(autoSpeak ? 'Lecture automatique activée' : 'Lecture automatique désactivée');
});

/* ── Translation via Groq ── */
async function translateFR(text) {
  if (!apiKey) throw new Error('Clé API manquante');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: 'Tu es un traducteur professionnel vietnamien-français. Traduis le texte vietnamien en français naturel et fluide. Retourne UNIQUEMENT la traduction française, aucune explication, aucun guillemet.',
        },
        {
          role: 'user',
          content: 'Traduis en français :\n\n' + text,
        },
      ],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content.trim();
}

/* ── Render ── */
function renderEmpty(icon, t, d) {
  return `<div class="empty">
    <div class="empty-o"><i class="ti ${icon}"></i></div>
    <div class="empty-t">${t}</div>
    <div class="empty-d">${d}</div>
  </div>`;
}

function render() {
  const vb = document.getElementById('vi-body');
  const fb = document.getElementById('fr-body');

  if (!segments.length && !interimText) {
    vb.innerHTML = renderEmpty('ti-microphone', 'En attente', 'Appuyez sur Écouter et parlez en vietnamien');
    fb.innerHTML = renderEmpty('ti-language', 'Traduction française', 'Apparaîtra ici après chaque phrase');
    return;
  }

  let vi = '', fr = '';
  segments.forEach(s => {
    const ts = `<span class="seg-ts">${fmt(s.time)}</span>`;
    const tDone = `<span class="seg-tag tag-done">✓ final</span>`;
    const tLive = `<span class="seg-tag tag-live">● live</span>`;
    const tBusy = `<span class="seg-tag tag-busy">↻ traduction</span>`;

    vi += `<div class="seg">
      <div class="seg-meta">${ts}${s.interim ? tLive : tDone}</div>
      <div class="seg-card${s.interim ? ' interim' : ''}">${s.viet}</div>
    </div>`;

    const frTxt = s.busy ? 'Traduction en cours…' : s.french;
    const playBtn = (!s.busy && s.french)
      ? `<button class="play-btn" onclick="speak(${JSON.stringify(s.french)})" title="Lire"><i class="ti ti-volume"></i></button>`
      : '';
    fr += `<div class="seg">
      <div class="seg-meta">${ts}${s.busy ? tBusy : tDone}</div>
      <div class="seg-card fr-text${s.busy ? ' busy' : ''}">${frTxt}${playBtn}</div>
    </div>`;
  });

  if (interimText && isListening) {
    vi += `<div class="live-bar">${interimText}</div>`;
  }

  vb.innerHTML = vi;
  fb.innerHTML = fr;
  vb.scrollTop = vb.scrollHeight;
  fb.scrollTop = fb.scrollHeight;

  document.getElementById('k-segs').textContent = segments.filter(s => !s.busy && s.french).length;
  document.getElementById('k-words').textContent = wordCount;
}

/* ── Add final segment ── */
function addFinal(text) {
  if (!text || seen.has(text)) return;
  seen.add(text);
  const id = Date.now() + Math.random();
  segments.push({ id, viet: text, french: '', time: new Date(), interim: false, busy: true });
  interimText = '';
  setStatus('busy', 'Traduction…');
  render();
  updateBtns();

  translateFR(text)
    .then(fr => {
      const s = segments.find(x => x.id === id);
      if (s) { s.french = fr; s.busy = false; wordCount += fr.split(/\s+/).length; }
      setStatus('on', 'En écoute…');
      render();
      if (autoSpeak) speak(fr);
    })
    .catch(err => {
      const s = segments.find(x => x.id === id);
      if (s) { s.french = '[Erreur: ' + err.message + ']'; s.busy = false; }
      setStatus('on', 'En écoute…');
      render();
      if (!apiKey) toast('Entrez votre clé Groq d\'abord');
    });
}

/* ── Speech Recognition ── */
function initRecog() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    document.getElementById('app').innerHTML = `
      <div class="empty" style="min-height:100vh">
        <div class="empty-o" style="width:80px;height:80px;font-size:32px"><i class="ti ti-microphone-off"></i></div>
        <div class="empty-t">Navigateur non compatible</div>
        <div class="empty-d">Veuillez utiliser Chrome ou Edge pour la reconnaissance vocale</div>
      </div>`;
    return;
  }
  recognition = new SR();
  recognition.lang = 'vi-VN';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = e => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) addFinal(e.results[i][0].transcript.trim());
      else interim += e.results[i][0].transcript;
    }
    interimText = interim;
    render();
  };

  recognition.onerror = e => {
    if (e.error === 'not-allowed') {
      setStatus('err', 'Micro refusé');
      stopL();
      toast('Accès au microphone refusé — vérifiez les permissions du navigateur');
    }
  };

  // Auto-restart when recognition ends (handles pauses)
  recognition.onend = () => {
    if (isListening) try { recognition.start(); } catch (e) {}
  };
}

function startL() {
  if (!apiKey) { toast('Entrez d\'abord votre clé Groq'); return; }
  try { recognition.start(); } catch (e) {}
  isListening = true;
  setStatus('on', 'En écoute…');
  document.getElementById('btn-start').style.display = 'none';
  document.getElementById('btn-stop').style.display = '';
  document.getElementById('btn-stop').innerHTML =
    `<i class="ti ti-player-stop"></i> Arrêter <div class="wave">${'<div class="wb"></div>'.repeat(5)}</div>`;
}

function stopL() {
  if (recognition) recognition.stop();
  isListening = false;
  interimText = '';
  setStatus('', 'Idle');
  document.getElementById('btn-stop').style.display = 'none';
  document.getElementById('btn-start').style.display = '';
  window.speechSynthesis.cancel();
  render();
}

function updateBtns() {
  const has = segments.length > 0;
  ['btn-clear', 'btn-read-all', 'btn-copy', 'btn-export'].forEach(id => {
    document.getElementById(id).disabled = !has;
  });
}

/* ── Button listeners ── */
document.getElementById('btn-start').addEventListener('click', startL);
document.getElementById('btn-stop').addEventListener('click', stopL);

document.getElementById('btn-clear').addEventListener('click', () => {
  segments = []; interimText = ''; seen.clear(); wordCount = 0;
  document.getElementById('k-segs').textContent = 0;
  document.getElementById('k-words').textContent = 0;
  window.speechSynthesis.cancel();
  render(); updateBtns();
});

document.getElementById('btn-read-all').addEventListener('click', () => {
  const all = segments.filter(s => s.french && !s.busy).map(s => s.french).join('. ');
  if (all) { speak(all); toast('Lecture de la conversation…'); }
  else toast('Aucune traduction disponible');
});

document.getElementById('btn-copy').addEventListener('click', () => {
  const t = segments.filter(s => s.french && !s.busy).map(s => s.french).join(' ');
  navigator.clipboard.writeText(t).then(() => toast('Traduction française copiée'));
});

document.getElementById('btn-export').addEventListener('click', () => {
  const lines = segments
    .filter(s => s.french && !s.busy)
    .map(s => `[${fmt(s.time)}]\nVI: ${s.viet}\nFR: ${s.french}`)
    .join('\n\n');
  const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'viet-fr-' + Date.now() + '.txt'; a.click();
  URL.revokeObjectURL(url);
  toast('Fichier exporté');
});

document.getElementById('cpy-vi').addEventListener('click', () => {
  const t = segments.map(s => s.viet).filter(Boolean).join('\n');
  navigator.clipboard.writeText(t).then(() => toast('Texte vietnamien copié'));
});

document.getElementById('cpy-fr').addEventListener('click', () => {
  const t = segments.filter(s => s.french && !s.busy).map(s => s.french).join('\n');
  navigator.clipboard.writeText(t).then(() => toast('Traduction française copiée'));
});

document.getElementById('tts-last').addEventListener('click', () => {
  const last = segments.filter(s => s.french && !s.busy).slice(-1)[0];
  if (last) speak(last.french);
  else toast('Aucune traduction disponible');
});

/* ── Init ── */
window.speechSynthesis.getVoices();
window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
initRecog();
render();
