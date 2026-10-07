// GET /l/<token> — the private listen page. Valid tokens only, and only
// until release; after that every link goes to the public page.

import {
  TOKEN_RE,
  html,
  isReleased,
  page,
  redirectToPublic,
  releaseAt,
} from "../_lib/shared.js";

export async function onRequestGet({ params, env }) {
  const token = String(params.token || "");
  if (isReleased(env)) return redirectToPublic(env);
  if (!TOKEN_RE.test(token) || !(await env.NTB_LIST.get(`tok:${token}`))) {
    return redirectToPublic(env);
  }

  const audio = `/api/audio/${token}`;
  const inner = `
<p class="kicker">SIMON AUGUSTE · NOT TO B.A.D RECORDS</p>
<img class="cover" src="/wednesday/cover.jpg" alt="WEDNESDAY — cover art" draggable="false">
<p class="hud">// EARLY ACCESS — SPACE CADETS ONLY</p>
<h1>WEDNESDAY</h1>
<div class="panel">
  <audio id="a" src="${audio}" preload="metadata" playsinline controlslist="nodownload noplaybackrate" oncontextmenu="return false"></audio>
  <div style="display:flex;align-items:center;gap:14px">
    <button id="p" class="btn" style="width:52px;height:52px;padding:0;font-size:1rem;letter-spacing:0" aria-label="Play">▶</button>
    <div style="flex:1">
      <input id="s" type="range" min="0" max="1000" value="0" aria-label="Seek" style="width:100%;accent-color:#b41c25">
      <div style="display:flex;justify-content:space-between;font-size:.7rem;color:#95999f;font-variant-numeric:tabular-nums"><span id="t">0:00</span><span id="d">--:--</span></div>
    </div>
  </div>
</div>
<p id="inapp" class="note" hidden>Playback stops if you leave this app. For the best listen, open this page in Safari or Chrome (••• → Open in browser).</p>
<p class="note">Stream only. This link is yours alone and stops working at release — <span id="left"></span>.</p>
<script>
(function(){
var a=document.getElementById('a'),p=document.getElementById('p'),s=document.getElementById('s'),t=document.getElementById('t'),d=document.getElementById('d'),seeking=false;
function f(x){x=Math.max(0,Math.floor(x||0));return Math.floor(x/60)+':'+String(x%60).padStart(2,'0')}
p.onclick=function(){if(a.paused){a.play().catch(function(){})}else{a.pause()}};
a.onplay=function(){p.textContent='❚❚';p.setAttribute('aria-label','Pause')};
a.onpause=a.onended=function(){p.textContent='▶';p.setAttribute('aria-label','Play')};
function dur(){if(a.duration&&isFinite(a.duration))d.textContent=f(a.duration)}
a.onloadedmetadata=a.ondurationchange=dur;dur();
a.ontimeupdate=function(){dur();t.textContent=f(a.currentTime);if(!seeking&&a.duration)s.value=Math.round(a.currentTime/a.duration*1000)};
s.oninput=function(){seeking=true;if(a.duration)t.textContent=f(s.value/1000*a.duration)};
s.onchange=function(){if(a.duration)a.currentTime=s.value/1000*a.duration;seeking=false};
if(/Instagram|FBAN|FBAV|BytedanceWebview|musical_ly|TikTok|Snapchat|Twitter/i.test(navigator.userAgent))document.getElementById('inapp').hidden=false;
var R=${releaseAt(env)},el=document.getElementById('left');
function tick(){var ms=R-Date.now();if(ms<=0){location.reload();return}var h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000);el.textContent=(h>0?h+'h ':'')+m+'m left'}
tick();setInterval(tick,30000);
})();
</script>`;
  return html(page("WEDNESDAY — Early Access", inner));
}
