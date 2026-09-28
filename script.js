(()=>{
const scene=document.getElementById('scene');
const startBtn=document.getElementById('startBtn');
const buttonText=document.getElementById('buttonText');
const flash=document.getElementById('flash');
const audioBtn=document.getElementById('audioBtn');
const before=document.getElementById('posterBefore');
const after=document.getElementById('posterAfter');

let started=false,audioCtx=null,master=null,muted=false,bgmActive=false,nextLoopStart=0,loopTimer=null;

Promise.all([
  fetch('before.b64',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('before');return r.text()}),
  fetch('after.b64',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('after');return r.text()})
]).then(([b,a])=>{
  before.src='data:image/webp;base64,'+b.trim();
  after.src='data:image/webp;base64,'+a.trim();
  return Promise.all([before.decode(),after.decode()]);
}).then(()=>{
  startBtn.disabled=false;
  buttonText.textContent='🎁 속보 확인하기';
}).catch(()=>{
  buttonText.textContent='새로고침해 주세요';
});

function ensureAudio(){
  if(!audioCtx){
    const AC=window.AudioContext||window.webkitAudioContext;
    audioCtx=new AC();
    master=audioCtx.createGain();
    master.gain.value=.82;
    master.connect(audioCtx.destination);
  }
  return audioCtx;
}
function noise(ctx,d=.16){
  const b=ctx.createBuffer(1,Math.floor(ctx.sampleRate*d),ctx.sampleRate),a=b.getChannelData(0);
  for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;
  return b;
}
function connect(g){g.connect(master)}
function drum(ctx,t,p=125,d=.11,v=.72){
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.type='sine';o.frequency.setValueAtTime(p,t);o.frequency.exponentialRampToValueAtTime(Math.max(58,p*.58),t+d);
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
  o.connect(g);connect(g);o.start(t);o.stop(t+d+.03);
}
function crash(ctx,t){
  const s=ctx.createBufferSource(),hp=ctx.createBiquadFilter(),g=ctx.createGain();
  s.buffer=noise(ctx,1.25);hp.type='highpass';hp.frequency.value=2800;
  g.gain.setValueAtTime(.50,t);g.gain.exponentialRampToValueAtTime(.001,t+1.08);
  s.connect(hp);hp.connect(g);connect(g);s.start(t);s.stop(t+1.1);
}
function bam(ctx,t){
  drum(ctx,t,98,.40,1.05);
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.type='triangle';o.frequency.setValueAtTime(570,t);o.frequency.exponentialRampToValueAtTime(175,t+.34);
  g.gain.setValueAtTime(.28,t);g.gain.exponentialRampToValueAtTime(.001,t+.42);
  o.connect(g);connect(g);o.start(t);o.stop(t+.44);crash(ctx,t);
}
function freq(n){
  const m=n.match(/^([A-G]#?)(\d)$/),map={C:-9,'C#':-8,D:-7,'D#':-6,E:-5,F:-4,'F#':-3,G:-2,'G#':-1,A:0,'A#':1,B:2};
  return 440*Math.pow(2,(map[m[1]]+(+m[2]-4)*12)/12);
}
function tone(ctx,n,t,d,type='triangle',v=.075){
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(typeof n==='number'?n:freq(n),t);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.018);g.gain.exponentialRampToValueAtTime(.001,t+d);
  o.connect(g);connect(g);o.start(t);o.stop(t+d+.04);
}
function chord(ctx,notes,t,d){
  notes.forEach((n,i)=>tone(ctx,n,t+i*.003,d,'sine',.043));
}
function confetti(){
  const colors=['#ff50a0','#ffd64b','#32c7ff','#87ff6c','#b853ff','#ff9a3d'];
  for(let i=0;i<130;i++){
    const c=document.createElement('i');c.className='confetti';
    c.style.left=Math.random()*100+'vw';c.style.background=colors[Math.floor(Math.random()*colors.length)];
    c.style.setProperty('--dx',(Math.random()-.5)*420+'px');c.style.animationDuration=2.1+Math.random()*1.9+'s';
    scene.appendChild(c);setTimeout(()=>c.remove(),4300);
  }
  for(let i=0;i<22;i++){
    const s=document.createElement('i');s.className='spark';s.textContent=['✨','⭐','🌟'][i%3];
    s.style.left=12+Math.random()*76+'%';s.style.top=35+Math.random()*40+'%';s.style.animationDelay=Math.random()*.18+'s';
    scene.appendChild(s);setTimeout(()=>s.remove(),1600);
  }
}
function scheduleCongrats(ctx,st){
  const beat=60/118,bar=beat*4;
  const prog=[['C4','E4','G4'],['G3','B3','D4'],['A3','C4','E4'],['F3','A3','C4'],['C4','E4','G4'],['G3','B3','D4'],['F3','A3','C4'],['G3','B3','D4']];
  const bass=['C2','G2','A2','F2','C2','G2','F2','G2'];
  const mel=['E5','G5','A5','C6','B5','G5','E5','D5','E5','G5','A5','B5','C6','B5','A5','G5','A5','C6','E6','C6','B5','G5','B5','D6','C6','A5','F5','A5','G5','E5','D5','G5'];
  for(let b=0;b<8;b++){
    const bt=st+b*bar;
    chord(ctx,prog[b],bt,bar*.94);
    tone(ctx,bass[b],bt,beat*1.7,'triangle',.055);
    tone(ctx,bass[b],bt+beat*2,beat*1.6,'triangle',.045);
    drum(ctx,bt,115,.09,.12);drum(ctx,bt+beat*2,120,.08,.09);
  }
  mel.forEach((n,i)=>{
    tone(ctx,n,st+i*beat,beat*.82,'triangle',.07);
    if(i%4===0)tone(ctx,freq(n)*2,st+i*beat,beat*.34,'sine',.022);
  });
  return beat*32;
}
function keepMusicGoing(){
  if(!bgmActive)return;
  const ctx=audioCtx;
  const len=scheduleCongrats(ctx,nextLoopStart);
  nextLoopStart+=len;
  const wait=Math.max(200,(nextLoopStart-ctx.currentTime-.7)*1000);
  loopTimer=setTimeout(keepMusicGoing,wait);
}
function startBgm(ctx,t){
  bgmActive=true;nextLoopStart=t;keepMusicGoing();audioBtn.hidden=false;
}
async function startShow(){
  if(started||startBtn.disabled)return;
  started=true;startBtn.disabled=true;buttonText.textContent='두구두구두구…';
  const ctx=ensureAudio();if(ctx.state==='suspended')await ctx.resume();

  const now=ctx.currentTime+.05,interval=.13,hits=8;
  for(let i=0;i<hits;i++)drum(ctx,now+i*interval,122+i*2,.10,.78);
  const bt=now+hits*interval+.11;bam(ctx,bt);

  const delay=Math.max(0,(bt-ctx.currentTime)*1000);
  setTimeout(()=>{
    scene.classList.add('revealed');flash.classList.add('on');confetti();
    setTimeout(()=>flash.classList.remove('on'),650);
    startBgm(ctx,ctx.currentTime+.18);
  },delay);
}
function toggleMute(){
  if(!master)return;
  muted=!muted;
  master.gain.setTargetAtTime(muted?0:.82,audioCtx.currentTime,.025);
  audioBtn.textContent=muted?'🔇':'🔊';
  audioBtn.setAttribute('aria-label',muted?'음악 켜기':'음악 끄기');
}
startBtn.addEventListener('click',startShow);
audioBtn.addEventListener('click',toggleMute);
})();