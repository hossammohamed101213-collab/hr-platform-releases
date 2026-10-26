/* لمسات الاستخدام: Enter ينفّذ الإجراء الأساسي + رقم الإصدار على شاشة الدخول */
(function(){
  try{api.info().then(i=>{const el=document.getElementById('lockVer');if(el&&i&&i.version)el.textContent='v'+i.version;}).catch(()=>{});}catch(e){}
  const SKIP=new Set(['pw','pw2','un']); /* لها معالجة خاصة في boot.js */
  document.addEventListener('keydown',e=>{
    if(e.key!=='Enter'||e.ctrlKey||e.shiftKey||e.altKey||e.isComposing||e.defaultPrevented)return;
    const t=e.target;if(!t||t.tagName!=='INPUT')return;
    const ty=(t.type||'text').toLowerCase();if(['checkbox','radio','button','submit','file','range','color'].includes(ty))return;
    if(SKIP.has(t.id)&&document.getElementById('app').classList.contains('hidden'))return;
    if(t.closest&&t.closest('.gsearch,#gresults'))return; /* البحث الذكي له معالجته */
    const ov=document.getElementById('overlay');
    let btn=null;
    if(ov&&ov.classList.contains('open')){btn=ov.querySelector('.modal-foot .btn.primary:not([disabled])');}
    else{const lk=document.getElementById('lock');if(lk&&document.getElementById('app').classList.contains('hidden')&&lk.contains(t)){btn=lk.querySelector('#lockForm .btn.primary:not([disabled])');}}
    if(btn){e.preventDefault();btn.click();}
  },false);
})();
