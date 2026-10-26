/* ==================== 5.6.1: «بسبس» — قطة صامتة تتمشى على شاشة البرنامج ====================
   بدون أي صوت. تظهر بعد 20 دقيقة بلا نشاط (لوحة مفاتيح/نقر) وبدون نافذة مفتوحة، تتمشى وتقعد وتتمطّع وتبص للموظف،
   ولو حد داس عليها تجري بعيد وتختفي وترجع بعد 20 دقيقة خمول جديدة. لو المستخدم رجع يشتغل تمشي بهدوء.
   إيقاف لكل جهاز: localStorage.mascotOff — إيقاف عام للشركة: settings.mascotEnabled=false */
(function(){
  const IDLE_MS=20*60000;
  let shown=false, gen=0, idleT=0, state='hidden', stop=false, x=0, y=0, dir=1, el=null, bub=null;
  function catSVG(){const f='#E8923A',d='#C4701F',l='#F7C59F';return `<svg viewBox="0 0 160 110">
<g class="body">
 <g class="tail" style="transform-origin:22px 70px"><path d="M24 72 q-22 -6 -18 -34 q2 -10 10 -8" fill="none" stroke="${f}" stroke-width="9" stroke-linecap="round"/><path d="M16 32 q4 -6 2 -10" fill="none" stroke="${d}" stroke-width="9" stroke-linecap="round"/></g>
 <g class="legB1 leg" style="transform-origin:46px 80px"><rect x="40" y="76" width="12" height="26" rx="6" fill="${d}"/></g>
 <g class="legF1 leg" style="transform-origin:102px 80px"><rect x="96" y="76" width="12" height="26" rx="6" fill="${d}"/></g>
 <ellipse cx="74" cy="68" rx="46" ry="26" fill="${f}"/><ellipse cx="74" cy="78" rx="30" ry="12" fill="${l}" opacity=".8"/>
 <path d="M44 50 q10 -8 14 4 M60 46 q10 -8 14 4 M78 46 q10 -8 14 4" fill="none" stroke="${d}" stroke-width="4" stroke-linecap="round"/>
 <g class="legB2 leg" style="transform-origin:58px 80px"><rect x="52" y="78" width="12" height="26" rx="6" fill="${f}"/></g>
 <g class="legF2 leg" style="transform-origin:90px 80px"><rect x="84" y="78" width="12" height="26" rx="6" fill="${f}"/></g>
 <g class="head" style="transform-origin:124px 52px">
  <path d="M104 30 l-4 -22 l20 12z" fill="${f}"/><path d="M144 30 l4 -22 l-20 12z" fill="${f}"/><path d="M106 28 l-2 -12 l12 8z" fill="#F4A6B0"/><path d="M142 28 l2 -12 l-12 8z" fill="#F4A6B0"/>
  <circle cx="124" cy="46" r="24" fill="${f}"/><ellipse cx="124" cy="58" rx="12" ry="8" fill="${l}"/>
  <g class="eye" style="transform-origin:114px 42px"><ellipse cx="114" cy="42" rx="5" ry="6" fill="#2B5F2B"/><ellipse cx="114" cy="42" rx="1.6" ry="5" fill="#111"/><circle cx="112.5" cy="40" r="1.4" fill="#fff"/></g>
  <g class="eye" style="transform-origin:134px 42px"><ellipse cx="134" cy="42" rx="5" ry="6" fill="#2B5F2B"/><ellipse cx="134" cy="42" rx="1.6" ry="5" fill="#111"/><circle cx="132.5" cy="40" r="1.4" fill="#fff"/></g>
  <path class="shut" d="M109 42 q5 3 10 0 M129 42 q5 3 10 0" fill="none" stroke="#7A4A1A" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M121 52 l3 3 l3 -3z" fill="#E88"/><path d="M124 55 v3 M120 59 q4 2 8 0" fill="none" stroke="#7A4A1A" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M106 52 h-16 M107 56 h-15 M142 52 h16 M141 56 h15" stroke="#7A4A1A" stroke-width="1.5" stroke-linecap="round"/>
 </g>
</g></svg>`;}
  const CSS=`#mascot{position:fixed;left:0;top:0;width:150px;height:104px;z-index:9000;cursor:pointer;filter:drop-shadow(0 8px 8px rgba(0,0,0,.35));will-change:transform;opacity:0;pointer-events:none;transition:opacity .35s}#mascot.show{opacity:1;pointer-events:auto}#mascot svg{width:100%;height:100%;overflow:visible}
#mascotBub{position:fixed;z-index:9001;background:#fff;color:#0E1F26;border-radius:14px;padding:5px 11px;font-weight:700;font-size:.95rem;box-shadow:0 10px 30px rgba(6,20,38,.25);opacity:0;transition:opacity .2s;white-space:nowrap;pointer-events:none;font-family:Cairo,Tajawal,sans-serif}
#mascot .leg{transition:transform .2s}#mascot .shut{display:none}
#mascot .tail{animation:cTail 1.6s ease-in-out infinite alternate}
#mascot.walk .legF1,#mascot.walk .legB2{animation:cLeg .5s ease-in-out infinite}#mascot.walk .legF2,#mascot.walk .legB1{animation:cLeg .5s ease-in-out infinite;animation-delay:-.25s}#mascot.walk .body{animation:cBob .25s ease-in-out infinite alternate}
#mascot.run .legF1,#mascot.run .legB2{animation:cLeg .2s linear infinite}#mascot.run .legF2,#mascot.run .legB1{animation:cLeg .2s linear infinite;animation-delay:-.1s}#mascot.run .body{animation:cBob .1s ease-in-out infinite alternate}#mascot.run .tail{animation:cTail .3s ease-in-out infinite alternate}
#mascot.sit .legF1,#mascot.sit .legF2{transform:rotate(-20deg)}#mascot.sit .legB1,#mascot.sit .legB2{transform:rotate(60deg) translateY(-6px)}#mascot.sit .head{animation:cLook 2.4s ease-in-out infinite alternate}
#mascot.sleep .shut{display:block}#mascot.sleep .eye{display:none}#mascot.sleep .body{animation:cBreath 1.6s ease-in-out infinite alternate;transform-origin:74px 80px}#mascot.sleep .tail{animation:none}
#mascot.stretch .body{animation:cStretch 1.2s ease-in-out 1;transform-origin:120px 80px}
@keyframes cLeg{0%{transform:rotate(-26deg)}50%{transform:rotate(26deg)}100%{transform:rotate(-26deg)}}@keyframes cBob{from{transform:translateY(0)}to{transform:translateY(-3px)}}
@keyframes cTail{from{transform:rotate(-14deg)}to{transform:rotate(18deg)}}@keyframes cLook{from{transform:rotate(-8deg)}to{transform:rotate(8deg) translateY(-2px)}}
@keyframes cBreath{from{transform:scale(1,1)}to{transform:scale(1.02,.96)}}@keyframes cStretch{0%{transform:scale(1,1)}50%{transform:scale(1.18,.86)}100%{transform:scale(1,1)}}
@media (prefers-reduced-motion:reduce){#mascot *{animation:none!important}}`;
  function ensure(){if(el)return;const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);el=document.createElement('div');el.id='mascot';el.className='walk';el.innerHTML=catSVG();el.title='بسبس';document.body.appendChild(el);bub=document.createElement('div');bub.id='mascotBub';document.body.appendChild(bub);el.addEventListener('click',e=>{e.stopPropagation();runAway();});}
  const companyOn=()=>{try{return !(S&&S.settings&&S.settings.mascotEnabled===false);}catch(e){return true;}};
  const deviceOn=()=>{try{return localStorage.getItem('mascotOff')!=='1';}catch(e){return true;}};
  const enabled=()=>companyOn()&&deviceOn();
  const appVisible=()=>{const a=document.getElementById('app');return a&&!a.classList.contains('hidden');};
  const modalOpen=()=>{const o=document.getElementById('overlay');return o&&o.classList.contains('open');};
  const W=()=>window.innerWidth,H=()=>window.innerHeight,mw=()=>150,mh=()=>104;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  function mode(m){el.className=(shown?'show ':'')+m;}
  function setPos(){el.style.transform=`translate(${x}px,${y}px) scaleX(${dir})`;}
  function say(t){bub.textContent=t;bub.style.left=Math.max(6,Math.min(W()-120,x+40))+'px';bub.style.top=Math.max(6,y-26)+'px';bub.style.opacity=1;setTimeout(()=>bub.style.opacity=0,1800);}
  function walkTo(tx,ms,cls,g){dir=tx>x?1:-1;mode(cls);const sx=x,t0=performance.now();return new Promise(res=>{function f(now){if(g!==undefined&&g!==gen){res();return}const k=Math.min(1,(now-t0)/ms);x=sx+(tx-sx)*k;setPos();if(k<1)requestAnimationFrame(f);else res();}requestAnimationFrame(f);});}
  async function appear(){if(state!=='hidden'||!enabled()||!appVisible()||modalOpen())return;ensure();const g=++gen;state='roam';stop=false;y=H()-mh()-6;x=-mw()-10;dir=1;setPos();shown=true;el.classList.add('show');
    const alive=()=>g===gen&&state==='roam';
    try{while(alive()){
      const tx=16+Math.random()*(W()-mw()-32);await walkTo(tx,Math.max(900,Math.abs(tx-x)*9),'walk',g);if(!alive())break;
      const a=Math.random();
      if(a<.35){mode('sit');say(['مياو','😺','لسه شغّال؟'][Math.floor(Math.random()*3)]);await sleep(3500);}
      else if(a<.55){mode('stretch');await sleep(1300);}
      else if(a<.7){mode('sleep');await sleep(6000);}
      else{mode('sit');await sleep(1500);}
      if(!alive())break;
      if(Math.random()<.3){/* تطلع تبص للشاشة من فوق شوية */const oy=y;y=Math.max(70,H()*.4);setPos();mode('sit');await sleep(1600);if(alive()){y=oy;setPos();}}
    }}catch(e){}
    if(g===gen&&state==='roam')await leaveQuiet();}
  async function leaveQuiet(){if(state!=='roam')return;gen++;state='leaving';const ex=x>W()/2?W()+40:-mw()-40;await walkTo(ex,1600,'walk');hide();}
  async function runAway(){if(state!=='roam')return;gen++;state='leaving';say('!');const ex=x>W()/2?W()+80:-mw()-80;await walkTo(ex,650,'run');hide();}
  function hide(){gen++;shown=false;el.classList.remove('show');mode('walk');state='hidden';stop=false;idleT=0;}
  /* النشاط: مفاتيح ونقرات وعجلة الماوس فقط (حركة الماوس لا تُحتسب حتى يقدر يدوس عليها) */
  function active(){idleT=0;if(state==='roam')leaveQuiet();}
  document.addEventListener('keydown',active,true);
  document.addEventListener('mousedown',e=>{if(el&&el.contains(e.target))return;active();},true);
  document.addEventListener('wheel',active,{passive:true,capture:true});
  setInterval(()=>{if(!enabled()||!appVisible()||modalOpen()){idleT=0;return}idleT+=1000;if(idleT>=IDLE_MS&&state==='hidden')appear();},1000);
  window.addEventListener('resize',()=>{if(state==='roam'){y=H()-mh()-6;setPos();}});
  window.MASCOT={
    toggleDevice(){try{localStorage.setItem('mascotOff',deviceOn()?'1':'0');}catch(e){}if(!deviceOn()&&state==='roam')leaveQuiet();toast(deviceOn()?'بسبس شغّالة على هذا الجهاز 😺':'تم إيقاف بسبس على هذا الجهاز','ok');try{render();}catch(e){}},
    deviceOn,companyOn,_dbg(){return {state,shown,cls:el?el.className:''};},
    async toggleCompany(){if(!isAdminUI())return;await DB.setSetting('mascotEnabled',!companyOn());if(!companyOn()&&state==='roam')leaveQuiet();toast(companyOn()?'تم تشغيل بسبس لكل الشركة':'تم إيقاف بسبس لكل الشركة','ok');render();},
    demo(){if(!enabled()){toast('بسبس متوقفة — شغّلها أولاً','err');return}closeModal();idleT=IDLE_MS;setTimeout(()=>{if(state==='hidden')appear();},300);},
    settingsHTML(){return `<h3 style="margin-top:18px">😺 بسبس (قطة الشاشة)</h3><p class="muted mini">قطة صامتة تتمشى على الشاشة بعد 20 دقيقة بدون نشاط للتسلية. لو ضغطت عليها تجري بعيد وترجع بعد 20 دقيقة خمول. بدون أي صوت.</p><div class="toolbar" style="gap:8px;flex-wrap:wrap"><button class="btn ${deviceOn()?'':'primary'}" onclick="MASCOT.toggleDevice()">${deviceOn()?'⏸️ إيقافها على هذا الجهاز':'▶️ تشغيلها على هذا الجهاز'}</button><button class="btn" onclick="MASCOT.demo()">👀 شوفها دلوقتي</button>${isAdminUI()?`<button class="btn ${companyOn()?'danger':'ok'}" onclick="MASCOT.toggleCompany()">${companyOn()?'🚫 إيقافها لكل الشركة':'✅ تشغيلها لكل الشركة'}</button>`:''}</div>${companyOn()?'':'<p class="muted mini">متوقفة لكل الشركة من المدير.</p>'}`;}
  };
})();
