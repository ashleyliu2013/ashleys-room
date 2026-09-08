import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createAshleyCloud } from './cloud.js';

const DAYS=['MON','TUE','WED','THU','FRI'];
const dates={MON:'9/7',TUE:'9/8',WED:'9/9',THU:'9/10',FRI:'9/11'};
const seed={
  MON:{mood:'今天有點累，但有好好吃飯 ♡',schedule:'14:00 工作 · 18:30 晚餐',breakfast:'咖啡',lunch:'牛肉烏龍麵',dinner:'還沒決定',sleep:'今晚目標：早點睡',pet:'今天也有陪毛孩一下 🐾',todo:'回訊息\n早點睡',photo:'',photoTitle:'今天想留下的照片',breakfastPhoto:'',lunchPhoto:'',dinnerPhoto:'',note1:'',note1Photo:'',note2:'',note2Photo:'',note3:'',note3Photo:''},
  TUE:{mood:'今天先慢慢來。',schedule:'10:30 工作 · 下午自由',breakfast:'待更新',lunch:'待更新',dinner:'待更新',sleep:'待更新',pet:'待更新',todo:'今天還是一張白紙',photo:'',photoTitle:'',breakfastPhoto:'',lunchPhoto:'',dinnerPhoto:'',note1:'',note1Photo:'',note2:'',note2Photo:'',note3:'',note3Photo:''},
  WED:{mood:'—',schedule:'本日行程等待更新',breakfast:'—',lunch:'—',dinner:'—',sleep:'—',pet:'—',todo:'新增今日待辦',photo:'',photoTitle:'',breakfastPhoto:'',lunchPhoto:'',dinnerPhoto:'',note1:'',note1Photo:'',note2:'',note2Photo:'',note3:'',note3Photo:''},
  THU:{mood:'—',schedule:'本日行程等待更新',breakfast:'—',lunch:'—',dinner:'—',sleep:'—',pet:'—',todo:'新增今日待辦',photo:'',photoTitle:'',breakfastPhoto:'',lunchPhoto:'',dinnerPhoto:'',note1:'',note1Photo:'',note2:'',note2Photo:'',note3:'',note3Photo:''},
  FRI:{mood:'週五模式：慢慢收尾。',schedule:'本日行程等待更新',breakfast:'—',lunch:'—',dinner:'—',sleep:'—',pet:'—',todo:'把這週好好結束',photo:'',photoTitle:'',breakfastPhoto:'',lunchPhoto:'',dinnerPhoto:'',note1:'',note1Photo:'',note2:'',note2Photo:'',note3:'',note3Photo:''}
};
const storeKey='ashleys-room-v1',msgKey='ashleys-room-messages-v1',pinKey='ashleys-room-admin-pin',traceKey='ashleys-room-trace-v3',visitorKey='ashleys-room-visitor-id-v1';
const $=s=>document.querySelector(s);
const cloud=createAshleyCloud(window.ASHLEY_ROOM_CONFIG||{});
let state=loadState(),day='MON',unlocked=false,dirty=false,cloudSynced=false,photoDraft={photo:'',breakfastPhoto:'',lunchPhoto:'',dinnerPhoto:'',note1Photo:'',note2Photo:'',note3Photo:''};
function cloneSeed(){return JSON.parse(JSON.stringify(seed))}
function loadState(){const base=cloneSeed();try{const saved=JSON.parse(localStorage.getItem(storeKey)||'{}');for(const d of DAYS)base[d]={...base[d],...(saved[d]||{})}}catch{}return base}
function saveState(){localStorage.setItem(storeKey,JSON.stringify(state))}
function getMessages(){try{return JSON.parse(localStorage.getItem(msgKey)||'[]')}catch{return[]}}
function saveMessages(v){localStorage.setItem(msgKey,JSON.stringify(v))}
function visitorId(){let v=localStorage.getItem(visitorKey);if(!v){v=(crypto.randomUUID?.()||('v-'+Date.now()+'-'+Math.random().toString(36).slice(2)));localStorage.setItem(visitorKey,v)}return v}
async function loadCloudState(){
  if(!cloud.enabled){cloudSynced=false;return}
  try{
    const remote=await cloud.loadWeek();
    for(const d of DAYS)if(remote[d])state[d]={...state[d],...remote[d]};
    saveState();cloudSynced=true;updateWorldData?.();
    $('#roomStatus').textContent=`${day} · cloud online`;
  }catch(err){console.warn('Cloud load failed',err);cloudSynced=false;toast('雲端暫時連不上，先使用本機資料')}
}
async function loadMessagesForDay(d){
  if(!cloud.enabled)return getMessages().filter(m=>m.day===d);
  try{return await cloud.loadMessages(d)}catch(err){console.warn('Cloud messages failed',err);return getMessages().filter(m=>m.day===d)}
}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800)}
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function formatLines(s=''){return esc(s||'—').replace(/\n/g,'<br>')}


// v6.3 quiet room audio: synthesized locally, no external audio files required.
let audioCtx=null,soundEnabled=localStorage.getItem('ashleys-room-sound-v1')!=='off',lastZoneForSound=null,lastPetVoice=0;
function ensureAudio(){if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx}
function tone(freq=660,dur=.09,vol=.025,type='sine',delay=0){if(!soundEnabled)return;const a=ensureAudio(),o=a.createOscillator(),g=a.createGain(),t=a.currentTime+delay;o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(a.destination);o.start(t);o.stop(t+dur+.02)}
function playHint(){tone(740,.08,.018,'sine');tone(980,.09,.012,'sine',.055)}
function playOpen(){tone(520,.06,.018,'triangle');tone(780,.10,.012,'sine',.045)}
function playDog(){if(!soundEnabled)return;const a=ensureAudio(),t=a.currentTime;for(const [i,f] of [[0,185],[.12,155]]){const o=a.createOscillator(),g=a.createGain(),filter=a.createBiquadFilter();o.type='sawtooth';o.frequency.setValueAtTime(f,t+i);o.frequency.exponentialRampToValueAtTime(f*.72,t+i+.11);filter.type='lowpass';filter.frequency.value=700;g.gain.setValueAtTime(.0001,t+i);g.gain.exponentialRampToValueAtTime(.035,t+i+.015);g.gain.exponentialRampToValueAtTime(.0001,t+i+.14);o.connect(filter).connect(g).connect(a.destination);o.start(t+i);o.stop(t+i+.16)}}
function playCat(){if(!soundEnabled)return;const a=ensureAudio(),t=a.currentTime,o=a.createOscillator(),g=a.createGain();o.type='triangle';o.frequency.setValueAtTime(620,t);o.frequency.exponentialRampToValueAtTime(930,t+.12);o.frequency.exponentialRampToValueAtTime(540,t+.34);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.025,t+.035);g.gain.exponentialRampToValueAtTime(.0001,t+.38);o.connect(g).connect(a.destination);o.start(t);o.stop(t+.4)}
function updateSoundButton(){const b=$('#soundBtn');if(b){b.textContent=soundEnabled?'🔊':'🔇';b.title=soundEnabled?'房間聲音：開':'房間聲音：關'}}
$('#soundBtn')?.addEventListener('click',()=>{soundEnabled=!soundEnabled;localStorage.setItem('ashleys-room-sound-v1',soundEnabled?'on':'off');if(soundEnabled){ensureAudio();playOpen();toast('房間聲音已開啟')}else toast('房間聲音已關閉');updateSoundButton()});updateSoundButton();
document.addEventListener('pointerdown',()=>{if(soundEnabled)ensureAudio()},{once:true});

// week tabs
const tabs=$('.week-tabs');
DAYS.forEach(d=>{const b=document.createElement('button');b.type='button';b.innerHTML=`${d}<small>${dates[d]}</small>`;b.dataset.day=d;if(d===day)b.classList.add('active');b.addEventListener('click',()=>setDay(d));tabs.appendChild(b)});
function setDay(d){if(!DAYS.includes(d))return;day=d;tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.day===d));$('#drawerDay').textContent=d;$('#roomStatus').textContent=`${d} · room online`;updateWorldData();if(unlocked)populateForm();toast(`${d} 房間已更新`)}
function updateClock(){const n=new Date();$('#timeText').textContent=`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;$('#modeText').textContent=n.getHours()>=18||n.getHours()<6?'NIGHT':'DAY'}
updateClock();setInterval(updateClock,30000);

// renderer
const canvas=$('#scene');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xbec5ca);scene.fog=new THREE.Fog(0xbec5ca,18,34);
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),0.035).texture;pmrem.dispose();
const camera=new THREE.PerspectiveCamera(64,1,.05,50);camera.position.set(0,1.66,3.45);
const controls=new PointerLockControls(camera,document.body);scene.add(camera);

function canvasTexture(draw,w=512,h=512,repeat=[1,1]){
  const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');draw(ctx,w,h);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t
}
const woodTex=canvasTexture((ctx,w,h)=>{
  ctx.fillStyle='#6c4b31';ctx.fillRect(0,0,w,h);
  for(let y=0;y<h;y+=64){ctx.fillStyle=y%128===0?'rgba(40,18,8,.13)':'rgba(255,230,190,.055)';ctx.fillRect(0,y,w,3)}
  for(let i=0;i<150;i++){const y=Math.random()*h;ctx.strokeStyle=`rgba(45,22,10,${.03+Math.random()*.08})`;ctx.lineWidth=.7+Math.random()*1.5;ctx.beginPath();ctx.moveTo(0,y);for(let x=0;x<=w;x+=48)ctx.lineTo(x,y+Math.sin((x+i)*.025)*3);ctx.stroke()}
},512,512,[4,3]);
const plasterTex=canvasTexture((ctx,w,h)=>{
  ctx.fillStyle='#cdbf9f';ctx.fillRect(0,0,w,h);
  for(let i=0;i<6500;i++){const g=155+Math.random()*70;ctx.fillStyle=`rgba(${g},${g-8},${g-20},${Math.random()*.035})`;ctx.fillRect(Math.random()*w,Math.random()*h,1.5,1.5)}
},512,512,[3,2]);
const fabricTex=canvasTexture((ctx,w,h)=>{
  ctx.fillStyle='#4b5841';ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(235,222,180,.065)';ctx.lineWidth=1;
  for(let i=0;i<w;i+=8){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,h);ctx.stroke()}
  for(let i=0;i<h;i+=8){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(w,i);ctx.stroke()}
},256,256,[5,5]);
const rugTex=canvasTexture((ctx,w,h)=>{
  ctx.fillStyle='#2f493e';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#b58a4a';ctx.lineWidth=14;ctx.strokeRect(22,22,w-44,h-44);
  ctx.strokeStyle='rgba(223,193,125,.55)';ctx.lineWidth=5;for(let i=0;i<6;i++){const m=56+i*42;ctx.strokeRect(m,m,w-2*m,h-2*m)}
  ctx.fillStyle='rgba(231,203,142,.75)';for(let y=110;y<h-110;y+=72)for(let x=110;x<w-110;x+=72){ctx.beginPath();ctx.moveTo(x,y-13);ctx.lineTo(x+13,y);ctx.lineTo(x,y+13);ctx.lineTo(x-13,y);ctx.closePath();ctx.fill()}
},512,512,[1,1]);
const mapTex=canvasTexture((ctx,w,h)=>{
  ctx.fillStyle='#9b7a49';ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(67,44,23,.52)';ctx.lineWidth=5;
  for(let i=0;i<14;i++){ctx.beginPath();let x=Math.random()*w,y=Math.random()*h;ctx.moveTo(x,y);for(let k=0;k<8;k++){x+=Math.random()*90-45;y+=Math.random()*70-35;ctx.quadraticCurveTo(x+20*Math.sin(k),y-20*Math.cos(k),x,y)}ctx.stroke()}
  ctx.strokeStyle='rgba(255,236,185,.3)';ctx.lineWidth=2;ctx.strokeRect(16,16,w-32,h-32)
},512,384,[1,1]);
const mats={
  wall:new THREE.MeshStandardMaterial({color:0xc9b998,roughness:.97,map:plasterTex}),
  warm:new THREE.MeshStandardMaterial({color:0xa98f68,roughness:.92}),
  oak:new THREE.MeshStandardMaterial({color:0x745034,roughness:.8,map:woodTex}),
  oakDark:new THREE.MeshStandardMaterial({color:0x3f2b1e,roughness:.82,map:woodTex}),
  stone:new THREE.MeshStandardMaterial({color:0x777568,roughness:.66}),
  stoneDark:new THREE.MeshStandardMaterial({color:0x5e5b57,roughness:.42}),
  fabric:new THREE.MeshStandardMaterial({color:0x4b5841,roughness:1,map:fabricTex}),
  fabricDark:new THREE.MeshStandardMaterial({color:0x484744,roughness:.96}),
  black:new THREE.MeshStandardMaterial({color:0x242321,roughness:.4,metalness:.25}),
  metal:new THREE.MeshStandardMaterial({color:0x73706a,roughness:.27,metalness:.62}),
  white:new THREE.MeshStandardMaterial({color:0xc8b88e,roughness:.8}),
  sage:new THREE.MeshStandardMaterial({color:0x526443,roughness:.9,map:fabricTex}),
  teal:new THREE.MeshStandardMaterial({color:0x315b56,roughness:.72}),
  rust:new THREE.MeshStandardMaterial({color:0x9a5c3f,roughness:.82}),
  mustard:new THREE.MeshStandardMaterial({color:0xb58b35,roughness:.8}),
  navy:new THREE.MeshStandardMaterial({color:0x263f46,roughness:.8}),
  blueGray:new THREE.MeshStandardMaterial({color:0x6d7880,roughness:.9}),
  plant:new THREE.MeshStandardMaterial({color:0x37543a,roughness:.95}),
  terracotta:new THREE.MeshStandardMaterial({color:0x967565,roughness:.82}),
  skin:new THREE.MeshStandardMaterial({color:0xc9977f,roughness:.72}),
  hair:new THREE.MeshStandardMaterial({color:0x1b1818,roughness:.88}),
  cloth:new THREE.MeshStandardMaterial({color:0x2a2929,roughness:.82}),
  glass:new THREE.MeshPhysicalMaterial({color:0xd3d9dc,transparent:true,opacity:.24,roughness:.08,transmission:.48,thickness:.06,ior:1.45})
};
const interactives=[]; const colliders=[]; const animated=[];
function addMesh(geo,mat,pos,rot=[0,0,0],zone=null,name='',collide=false){const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;m.name=name;if(zone){m.userData.zone=zone;interactives.push(m)}if(collide)colliders.push(m);scene.add(m);return m}
function box(size,pos,mat,zone=null,name='',rot=[0,0,0],collide=false){return addMesh(new THREE.BoxGeometry(...size),mat,pos,rot,zone,name,collide)}
function cyl(r,h,pos,mat,zone=null,name='',segments=32){return addMesh(new THREE.CylinderGeometry(r,r,h,segments),mat,pos,[0,0,0],zone,name)}
function sphere(r,pos,mat,zone=null,name=''){return addMesh(new THREE.SphereGeometry(r,28,22),mat,pos,[0,0,0],zone,name)}function cushion(size,pos,mat,zone=null,rot=[0,0,0],name='cushion'){
  const g=new THREE.SphereGeometry(.5,22,16);const m=addMesh(g,mat,pos,rot,zone,name);m.scale.set(size[0],size[1],size[2]);return m
}
function book(x,y,z,w=.34,d=.23,h=.045,color=0x6f5237){
  const m=new THREE.MeshStandardMaterial({color,roughness:.9});box([w,h,d],[x,y,z],m);box([w*.88,h*.16,d*1.01],[x,y+h*.58,z],new THREE.MeshStandardMaterial({color:0xd9c69d,roughness:.95}))
}
function mug(x,y,z,color=0x9a6c42){
  const mat=new THREE.MeshStandardMaterial({color,roughness:.78});cyl(.07,.12,[x,y,z],mat);addMesh(new THREE.TorusGeometry(.055,.012,8,18),mat,[x+.07,y,z],[Math.PI/2,0,0])
}
function crate(x,y,z,s=.5){box([s,.08,s],[x,y,z],mats.oakDark);box([.06,.45,s],[x-s*.46,y+.22,z],mats.oakDark);box([.06,.45,s],[x+s*.46,y+.22,z],mats.oakDark);box([s,.45,.06],[x,y+.22,z-s*.46],mats.oakDark);box([s,.45,.06],[x,y+.22,z+s*.46],mats.oakDark)}


// Architecture: higher 3.25m ceiling, real-person scale, no dollhouse walls.
box([11.6,.12,8.8],[0,-.06,0],mats.oak,null,'floor',[],true);
box([11.6,.16,8.8],[0,3.24,0],mats.wall,null,'ceiling');
box([11.6,3.25,.18],[0,1.62,-4.4],mats.wall,null,'back wall',[],true);
box([.18,3.25,8.8],[-5.8,1.62,0],mats.warm,null,'left wall',[],true);
box([.18,3.25,8.8],[5.8,1.62,0],mats.wall,null,'right wall',[],true);
box([11.6,3.25,.18],[0,1.62,4.4],mats.wall,null,'front wall',[],true);
// Adventure-home timber structure: warmer, handcrafted, game-like without turning into a theme park.
for(const z of [-4.22,-1.45,1.35,4.18]) box([11.3,.13,.16],[0,3.02,z],mats.oakDark);
for(const x of [-5.55,-2.55,.35,3.25,5.55]) box([.14,3.0,.14],[x,1.5,-4.18],mats.oakDark);

// entrance opening impression
box([1.8,2.5,.22],[0,1.25,4.28],mats.oakDark,null,'entrance surround');
box([1.45,2.28,.08],[0,1.14,4.15],mats.black,null,'door');

// full-height window wall zone
box([5.3,2.68,.05],[2.55,1.58,-4.27],mats.glass,'secret','window');
for(const x of [.05,1.75,3.4,5.1])box([.05,2.7,.07],[x,1.58,-4.23],mats.black);
// skyline
for(let i=0;i<46;i++){const w=.15+Math.random()*.34,h=.4+Math.random()*2.4;const mat=new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(.59+Math.random()*.04,.12,.2+Math.random()*.08),roughness:.85,emissive:0x121a22,emissiveIntensity:.12});const b=addMesh(new THREE.BoxGeometry(w,h,.18),mat,[.2+Math.random()*4.9,-.15+h/2,-5-Math.random()*2]);if(Math.random()>.45){const wm=new THREE.MeshBasicMaterial({color:Math.random()>.55?0xf0ca98:0xaec8d5,transparent:true,opacity:.45});addMesh(new THREE.PlaneGeometry(w*.42,Math.min(h*.42,.6)),wm,[b.position.x,b.position.y,-4.88])}}

// Bedroom
box([3.25,.45,2.05],[-3.65,.25,-2.55],mats.oak,null,'bed base',[],true);
box([3.15,.32,1.95],[-3.65,.66,-2.55],mats.warm,'sleep','mattress');
box([3.2,1.22,.18],[-3.65,1.15,-3.46],mats.fabric,'sleep','headboard');
box([1.02,.22,.58],[-4.45,.91,-2.82],mats.sage,'sleep','pillow');box([1.02,.22,.58],[-3.2,.91,-2.82],mats.mustard,'sleep','pillow');
box([1.3,.08,.6],[-4.95,.62,-2.62],mats.oak,'sleep','bedside');

// Living room: softer shapes, layered textiles and lived-in adventure clutter
box([2.82,.26,.92],[-.8,.40,.88],mats.fabric,'mood','sofa seat',[],true);
box([2.78,.68,.22],[-.8,.80,1.23],mats.fabric,'mood','sofa back');
for(const x of [-1.72,.12])cushion([.28,.33,.34],[x,.67,.83],mats.sage,'mood',[0,0,.1*x],'sofa arm');
cushion([.54,.22,.31],[-1.23,.76,.94],mats.mustard,'mood',[0,0,.08],'throw pillow');
cushion([.47,.20,.30],[-.45,.73,.95],mats.rust,'mood',[0,0,-.1],'throw pillow');
box([1.72,.13,.82],[-.28,.47,-.08],mats.oakDark,null,'coffee table');
box([1.54,.08,.70],[-.28,.55,-.08],mats.oak,null,'coffee top');
box([3.05,.045,2.08],[-.38,.025,.02],new THREE.MeshStandardMaterial({map:rugTex,color:0xffffff,roughness:1}),null,'woven adventure rug');
book(-.45,.61,-.05,.42,.26,.05,0x6b5339);book(-.39,.67,-.03,.34,.22,.04,0x485946);mug(.16,.66,-.18,0x927047);
crate(-2.28,.19,.15,.52);
// Workspace: a real desk with shelf, lamp, books and travel-study details
box([2.72,.11,.78],[3.52,.87,-2.72],mats.oak,'schedule','desk',[],true);
for(const x of [2.48,4.56])box([.12,.79,.12],[x,.42,-2.72],mats.metal);
box([1.28,.76,.07],[3.55,1.51,-3.04],mats.black,'schedule','monitor');
box([1.18,.66,.02],[3.55,1.51,-2.995],new THREE.MeshStandardMaterial({color:0x4c665f,roughness:.32,emissive:0x21372f,emissiveIntensity:.28}),'schedule','screen');
box([.68,.035,.24],[3.53,.96,-2.48],mats.teal,'schedule','keyboard');
book(2.72,1.0,-2.43,.42,.25,.05,0x66493a);book(2.72,1.06,-2.43,.34,.23,.04,0x3f5547);mug(4.18,1.03,-2.5,0x8d6b43);
box([3.05,.08,.32],[3.54,2.40,-3.94],mats.oakDark);
for(let i=0;i<5;i++)book(2.55+i*.26,2.53,-3.91,.20,.19,.05,[0x6c4a34,0x455543,0x84633a,0x33434b,0x784d3d][i]);
const deskLampBase=cyl(.11,.04,[4.38,1.02,-2.62],mats.black);box([.035,.62,.035],[4.38,1.32,-2.62],mats.black);addMesh(new THREE.ConeGeometry(.16,.22,18),mats.mustard,[4.38,1.65,-2.62],[0,0,Math.PI]);
const deskLight=new THREE.PointLight(0xffc876,5.2,2.2,2);deskLight.position.set(4.28,1.55,-2.5);scene.add(deskLight);
// Dining / kitchen: warmer timber, green runner, ceramic tableware and small domestic clutter
cyl(.98,.13,[3.45,.77,1.45],mats.oak,'meal','dining table');cyl(.17,.7,[3.45,.39,1.45],mats.oakDark);
box([1.45,.022,.52],[3.45,.85,1.45],new THREE.MeshStandardMaterial({color:0x42543b,roughness:1}),'meal','table runner');
for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const x=3.45+Math.cos(a)*1.35,z=1.45+Math.sin(a)*1.35;box([.62,.13,.62],[x,.48,z],mats.oak);box([.62,.74,.12],[x+Math.cos(a)*.24,.84,z+Math.sin(a)*.24],mats.oakDark)}
mug(3.18,.91,1.28,0xc5aa75);mug(3.74,.91,1.55,0x82674c);
// v6.3 lived-in dining spread: ceramic plates, soup bowl, bread, fruit and greens.
const ceramic=new THREE.MeshStandardMaterial({color:0xe3d8c3,roughness:.72});
const soupMat=new THREE.MeshStandardMaterial({color:0xb9683f,roughness:.82});
const greenFood=new THREE.MeshStandardMaterial({color:0x66834f,roughness:.9});
const breadMat=new THREE.MeshStandardMaterial({color:0xc89252,roughness:.92});
const fruitMat=new THREE.MeshStandardMaterial({color:0xb85f45,roughness:.85});
for(const [x,z] of [[3.18,1.62],[3.70,1.30]]){cyl(.18,.025,[x,.91,z],ceramic,'meal','plate');sphere(.075,[x-.035,.95,z],greenFood,'meal','greens');sphere(.065,[x+.055,.95,z+.025],breadMat,'meal','food')}
cyl(.15,.10,[3.46,.93,1.45],ceramic,'meal','soup bowl');cyl(.125,.012,[3.46,.99,1.45],soupMat,'meal','soup');
for(const [x,z] of [[3.02,1.42],[3.84,1.52],[3.55,1.72]])sphere(.055,[x,.94,z],fruitMat,'meal','fruit');
box([.012,.012,.34],[3.03,.94,1.75],mats.metal,'meal','cutlery',[0,.12,0]);box([.012,.012,.34],[3.87,.94,1.14],mats.metal,'meal','cutlery',[0,-.15,0]);
box([4.7,.92,.62],[3.25,.46,3.63],mats.oakDark,null,'kitchen base',[],true);box([4.75,.08,.7],[3.25,.96,3.63],mats.stone,null,'counter');
for(const x of [1.55,2.35,3.15,3.95])box([.7,.62,.06],[x,.48,3.29],mats.oak);
box([1.1,2.0,.62],[5.0,1.45,3.63],mats.navy,null,'fridge',[],true);
for(let i=0;i<3;i++)cyl(.08,.22,[1.8+i*.28,1.12,3.46],[mats.mustard,mats.teal,mats.rust][i]);
cyl(.15,.18,[4.05,1.11,3.5],mats.black);addMesh(new THREE.TorusGeometry(.12,.018,8,20),mats.black,[4.18,1.11,3.5],[Math.PI/2,0,0]);
// Message / photo / sticky-note walls
box([1.6,1.55,.05],[4.62,1.98,-4.1],mats.glass,'message','message glass');
const notePhotoMeshes=[];
for(let i=0;i<3;i++){
  const nm=new THREE.MeshStandardMaterial({color:[0xd2b66f,0xa8b48a,0xc98a69][i],roughness:.92});
  box([.72,.46,.035],[2.15+i*.78,2.18-(i%2)*.18,-4.02],nm,'todo','sticky note');
  const pm=new THREE.MeshBasicMaterial({color:0x5e5547,toneMapped:false});
  const plane=addMesh(new THREE.PlaneGeometry(.42,.25),pm,[2.15+i*.78,2.18-(i%2)*.18,-3.995]);notePhotoMeshes.push(plane);
}
box([1.95,1.4,.06],[-4.45,1.75,-4.08],mats.oakDark,'photo','photo wall');for(let i=0;i<6;i++){const x=-5.03+(i%3)*.58,y=2.08-Math.floor(i/3)*.58;box([.46,.53,.028],[x,y,-4.01],i%2?mats.mustard:mats.oak,'photo','photo frame')}

// Pet corner: a border collie + a blue British Shorthair, both readable as pet records.
cyl(.82,.12,[-2.65,.09,2.95],mats.sage,'pet','pet bed');
function addBorderCollie(x,z){
  const g=new THREE.Group();
  const black=new THREE.MeshStandardMaterial({color:0x202222,roughness:.96});
  const whiteFur=new THREE.MeshStandardMaterial({color:0xe7e0d6,roughness:1});
  const body=new THREE.Mesh(new THREE.SphereGeometry(.30,22,16),black);body.scale.set(1.45,.78,.82);body.position.set(0,.40,0);g.add(body);
  const chest=new THREE.Mesh(new THREE.SphereGeometry(.21,18,14),whiteFur);chest.scale.set(.72,1.0,.75);chest.position.set(.24,.43,.02);g.add(chest);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.23,22,16),black);head.position.set(.38,.62,0);g.add(head);
  const muzzle=new THREE.Mesh(new THREE.SphereGeometry(.12,18,12),whiteFur);muzzle.scale.z=.72;muzzle.position.set(.55,.58,0);g.add(muzzle);
  for(const sz of [-1,1]){const ear=new THREE.Mesh(new THREE.ConeGeometry(.09,.23,4),black);ear.position.set(.37,.84,.12*sz);ear.rotation.z=-.15;g.add(ear)}
  const tail=new THREE.Mesh(new THREE.CapsuleGeometry(.045,.38,4,8),black);tail.position.set(-.43,.48,0);tail.rotation.z=1.05;g.add(tail);
  g.position.set(x,0,z);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.userData.zone='pet';interactives.push(o)}});scene.add(g);animated.push({type:'dogTail',obj:tail,base:1.05});return g;
}
function addBlueBritishShorthair(x,z){
  const g=new THREE.Group();const fur=new THREE.MeshStandardMaterial({color:0x667078,roughness:1});
  const body=new THREE.Mesh(new THREE.SphereGeometry(.28,22,16),fur);body.scale.set(1.05,.82,1.18);body.position.set(0,.34,0);g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.24,22,16),fur);head.position.set(.10,.60,0);g.add(head);
  for(const sz of [-1,1]){const ear=new THREE.Mesh(new THREE.ConeGeometry(.075,.16,4),fur);ear.position.set(.10,.79,.12*sz);g.add(ear)}
  const tail=new THREE.Mesh(new THREE.CapsuleGeometry(.045,.34,4,8),fur);tail.position.set(-.31,.40,-.04);tail.rotation.z=.95;g.add(tail);
  g.position.set(x,0,z);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.userData.zone='pet';interactives.push(o)}});scene.add(g);animated.push({type:'catIdle',obj:g,tail});return g;
}
addBorderCollie(-2.85,2.92);addBlueBritishShorthair(-1.95,3.05);

// TV wall: warm dark console with a Netflix 鼠惑 screen.
box([2.65,.42,.42],[-.62,.36,-3.78],mats.oakDark,null,'tv console',[],true);
const tvFrame=box([2.55,1.48,.09],[-.62,1.62,-4.02],mats.black,null,'television');
function makeMouseFallback(){const c=document.createElement('canvas');c.width=1024;c.height=576;const ctx=c.getContext('2d');const g=ctx.createLinearGradient(0,0,1024,576);g.addColorStop(0,'#061b18');g.addColorStop(.62,'#0b0d0e');g.addColorStop(1,'#020202');ctx.fillStyle=g;ctx.fillRect(0,0,1024,576);ctx.fillStyle='#e50914';ctx.font='700 50px Arial';ctx.fillText('NETFLIX',52,82);ctx.fillStyle='#eee';ctx.font='700 90px sans-serif';ctx.fillText('鼠惑',60,465);ctx.fillStyle='rgba(173,220,190,.3)';ctx.beginPath();ctx.arc(725,280,180,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(0,0,0,.72)';ctx.beginPath();ctx.arc(760,280,130,0,Math.PI*2);ctx.fill();return new THREE.CanvasTexture(c)}
const tvMat=new THREE.MeshBasicMaterial({map:makeMouseFallback(),toneMapped:false});
const tvScreen=addMesh(new THREE.PlaneGeometry(2.35,1.28),tvMat,[-.62,1.62,-3.965]);
const netflixPromo='https://occ-0-3012-993.1.nflxso.net/dnm/api/v6/6AYY37jfdO6hpXcMjf9Yu5cnmO0/AAAABfXaPvhhKOiO7DQv0I2FfOys3gZGRVTdy4u0x683JjbKijUe0aVcfUjesVgBexBAezc28rxdzLt-JBH20XlaiIheAEjrYgmcurZJ.jpg?r=cf7';
new THREE.TextureLoader().load(netflixPromo,tex=>{tex.colorSpace=THREE.SRGBColorSpace;tvMat.map?.dispose();tvMat.map=tex;tvMat.needsUpdate=true},undefined,()=>{});
const tvGlow=new THREE.PointLight(0x6f9b93,4.5,3.6,2);tvGlow.position.set(-.6,1.5,-2.9);scene.add(tvGlow);

// Adventure-fantasy wall accents: aged shield, travel sword, golden crest and small relics.
const brass=new THREE.MeshStandardMaterial({color:0xb69750,metalness:.5,roughness:.45});
const deepBlue=new THREE.MeshStandardMaterial({color:0x334b58,metalness:.16,roughness:.65});
// shield
const shield=addMesh(new THREE.CylinderGeometry(.46,.38,.07,6),deepBlue,[-3.25,2.35,-4.01],[Math.PI/2,0,0]);
addMesh(new THREE.TorusGeometry(.34,.035,10,32),brass,[-3.25,2.35,-3.965],[0,0,0]);
// travel sword
box([.07,1.0,.06],[-2.45,2.25,-4.0],mats.metal);box([.42,.06,.07],[-2.45,1.82,-3.99],brass);
// simple three-part golden crest, an original geometric adventure motif
for(const [x,y] of [[-1.55,2.47],[-1.73,2.17],[-1.37,2.17]]){const tri=addMesh(new THREE.ConeGeometry(.20,.06,3),brass,[x,y,-3.97],[Math.PI/2,0,0]);tri.rotation.z=Math.PI}
// shelf relics
box([1.65,.08,.28],[1.65,2.47,-3.94],mats.oakDark);
cyl(.11,.28,[1.24,2.65,-3.92],brass);sphere(.13,[1.65,2.63,-3.92],mats.teal);box([.22,.22,.12],[2.06,2.61,-3.92],mats.rust);
// Framed parchment map + timber display ledges, inspired by fantasy-adventure homes without copying game assets.
const mapMat=new THREE.MeshStandardMaterial({map:mapTex,color:0xffffff,roughness:.95});
box([1.42,1.05,.035],[5.66,1.95,-1.65],mapMat,null,'adventure map',[0,-Math.PI/2,0]);
box([1.55,.06,.16],[5.58,1.37,-1.65],mats.oakDark);
for(const y of [1.35,1.72,2.08])box([.06,.06,.84],[-5.64,y,1.75],mats.oakDark);
for(let i=0;i<7;i++){const px=-5.53,py=1.39+(i%3)*.36,pz=1.47+Math.floor(i/3)*.3;sphere(.055,[px,py,pz],[mats.mustard,mats.rust,mats.teal,brass][i%4])}
for(const x of [-4.8,-3.6,-2.3,.7,1.7,4.7]){
  for(let j=0;j<5;j++){const leaf=box([.06,.38,.14],[x+.05*Math.sin(j),2.78-j*.27,-4.02+(j%2)*.04],mats.plant);leaf.rotation.z=.3*Math.sin(j);animated.push({type:'leafSway',obj:leaf,base:leaf.rotation.z,offset:j+x})}
}
// warm hanging lanterns
function addLantern(x,y,z){const g=new THREE.Group();const frame=new THREE.Mesh(new THREE.CylinderGeometry(.13,.16,.28,6),brass);g.add(frame);const core=new THREE.Mesh(new THREE.CylinderGeometry(.08,.09,.20,12),new THREE.MeshBasicMaterial({color:0xffd58b}));g.add(core);g.position.set(x,y,z);scene.add(g);const l=new THREE.PointLight(0xffc36d,5.5,2.6,2);l.position.set(x,y,z);scene.add(l);return g}
addLantern(-4.78,2.42,-2.82);addLantern(3.72,2.58,1.38);addLantern(.15,2.54,-.65);
// plants
function addPlant(x,z,s=.8){cyl(.3*s,.42*s,[x,.21*s,z],mats.terracotta);for(let i=0;i<8;i++){const leaf=box([.07*s,.58*s,.18*s],[x+(Math.random()-.5)*.28*s,.72*s+Math.random()*.15*s,z+(Math.random()-.5)*.28*s],mats.plant);leaf.rotation.z=(Math.random()-.5)*.9;leaf.rotation.y=Math.random()*Math.PI}}
addPlant(.55,-3.5,.9);addPlant(5.15,2.8,.74);addPlant(-5.1,2.7,.7);

// Bedroom textile layering and warm bedside clutter
box([3.04,.075,1.25],[-3.65,.86,-2.38],new THREE.MeshStandardMaterial({color:0x42533e,roughness:1,map:fabricTex}),'sleep','blanket');
box([1.7,.025,.52],[-3.67,.91,-2.10],new THREE.MeshStandardMaterial({color:0x8a6c3e,roughness:1}),'sleep','bed runner');
cushion([.46,.18,.28],[-3.65,1.01,-2.85],mats.rust,'sleep',[0,0,.05],'accent pillow');
mug(-4.95,.74,-2.62,0x8d6b43);book(-4.72,.70,-2.62,.34,.24,.045,0x4f5a45);
for(const x of [-5.05,-2.25])box([.045,2.15,.045],[x,1.5,-3.3],mats.oakDark);
box([2.82,.055,.055],[-3.65,2.57,-3.3],mats.oakDark);
// Ashley avatar, lives in world, subtle idle animation
const avatar=new THREE.Group();const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.29,.72,6,14),mats.cloth);torso.position.y=1.2;avatar.add(torso);const head=new THREE.Mesh(new THREE.SphereGeometry(.27,28,22),mats.skin);head.scale.y=1.08;head.position.y=1.92;avatar.add(head);const hairCap=new THREE.Mesh(new THREE.SphereGeometry(.32,28,22,0,Math.PI*2,0,Math.PI*.72),mats.hair);hairCap.scale.y=1.18;hairCap.position.set(0,1.98,-.02);avatar.add(hairCap);for(const sx of [-1,1]){const hs=new THREE.Mesh(new THREE.CapsuleGeometry(.065,.78,5,10),mats.hair);hs.position.set(.21*sx,1.55,.02);hs.rotation.z=.07*sx;avatar.add(hs)}for(const sx of [-1,1]){const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.58,5,10),mats.fabricDark);leg.position.set(.14*sx,.55,.12);leg.rotation.x=-.72;avatar.add(leg)}avatar.traverse(o=>{if(o.isMesh)o.castShadow=true});scene.add(avatar);animated.push({type:'avatar',obj:avatar});
function positionAvatar(){const hr=new Date().getHours();if(hr>=23||hr<7){avatar.position.set(-3.55,.2,-2.35);avatar.rotation.y=Math.PI/2;avatar.scale.set(.9,.9,.9)}else if(hr>=9&&hr<18){avatar.position.set(3.3,0,-2.0);avatar.rotation.y=Math.PI;avatar.scale.set(1,1,1)}else{avatar.position.set(-.85,0,.4);avatar.rotation.y=.35;avatar.scale.set(1,1,1)}}positionAvatar();

// Ambient animation package: candle, fan, AC louvers, curtain sway.
const candleBase=cyl(.11,.18,[-.75,.67,-.08],new THREE.MeshStandardMaterial({color:0xe9dfd3,roughness:.7}));
const flameMat=new THREE.MeshBasicMaterial({color:0xffc36a,transparent:true,opacity:.9});const flame=addMesh(new THREE.SphereGeometry(.035,14,10),flameMat,[-.75,.8,-.08]);flame.scale.set(.7,1.8,.7);const candleLight=new THREE.PointLight(0xffb76a,1.4,2.1,2);candleLight.position.set(-.75,.88,-.08);scene.add(candleLight);animated.push({type:'flame',obj:flame,light:candleLight});
const fan=new THREE.Group();const fanHub=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.18,20),mats.black);fanHub.rotation.x=Math.PI/2;fan.add(fanHub);for(let i=0;i<3;i++){const blade=new THREE.Mesh(new THREE.BoxGeometry(.58,.05,.12),mats.black);blade.position.x=.29;blade.rotation.z=i*Math.PI*2/3;fan.add(blade)}fan.position.set(1.0,2.95,.5);fan.rotation.x=Math.PI/2;scene.add(fan);animated.push({type:'fan',obj:fan});
const ac=box([1.8,.38,.35],[-4.65,2.75,.8],mats.blueGray,null,'air conditioner');for(let i=0;i<4;i++){const l=box([.32,.02,.22],[-5.15+i*.34,2.55,.72],mats.black);animated.push({type:'louver',obj:l,offset:i*.25})}
const curtainMat=new THREE.MeshStandardMaterial({color:0xd8d1c7,roughness:1,side:THREE.DoubleSide});for(let i=0;i<8;i++){const c=box([.18,2.55,.05],[.15+i*.58,1.58,-4.15],curtainMat);c.castShadow=false;animated.push({type:'curtain',obj:c,offset:i*.55,baseX:c.position.x})}

// lights
scene.add(new THREE.HemisphereLight(0xd7c7a4,0x5f5846,1.18));const sun=new THREE.DirectionalLight(0xffddb2,2.15);sun.position.set(-3,7,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-7;sun.shadow.camera.right=7;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-7;scene.add(sun);const warm1=new THREE.PointLight(0xffb864,21,5.8,2);warm1.position.set(-4.9,2.1,-2.4);scene.add(warm1);const warm2=new THREE.PointLight(0xffc982,18,5.3,2);warm2.position.set(3.35,2.65,2.75);scene.add(warm2);

// Slow dust motes for a warm, lived-in room. Very subtle and bounded.
{
  const count=110,geo=new THREE.BufferGeometry(),arr=new Float32Array(count*3);
  for(let i=0;i<count;i++){arr[i*3]=(Math.random()-.5)*10.4;arr[i*3+1]=.35+Math.random()*2.55;arr[i*3+2]=(Math.random()-.5)*7.4}
  geo.setAttribute('position',new THREE.BufferAttribute(arr,3));
  const pts=new THREE.Points(geo,new THREE.PointsMaterial({color:0xffddb0,size:.018,transparent:true,opacity:.27,depthWrite:false}));
  scene.add(pts);animated.push({type:'dust',obj:pts})
}
// interact target positions for proximity based reading
const zones={
  sleep:{pos:new THREE.Vector3(-2.35,1.25,-1.75),range:2.05,label:'查看睡眠紀錄'},
  schedule:{pos:new THREE.Vector3(2.15,1.25,-2.25),range:2.0,label:'查看今天行程'},
  meal:{pos:new THREE.Vector3(1.78,1.15,1.45),range:2.1,label:'看看今天吃什麼'},
  photo:{pos:new THREE.Vector3(-3.35,1.5,-3.25),range:2.05,label:'查看照片牆'},
  message:{pos:new THREE.Vector3(4.35,1.55,-3.45),range:1.75,label:'讀取留言板'},
  todo:{pos:new THREE.Vector3(2.85,1.45,-3.45),range:1.8,label:'查看便利貼'},
  pet:{pos:new THREE.Vector3(-2.25,.8,2.55),range:2.05,label:'看看寵物紀錄'},
  mood:{pos:new THREE.Vector3(-.8,1,.85),range:1.95,label:'查看 Ashley 今天的狀態'},
  secret:{pos:new THREE.Vector3(.9,1.6,-3.58),range:1.8,label:'窗邊似乎有什麼'}
};

// first person movement + basic collision boundaries
const stage=$('#stageWrap'),enterBtn=$('#enterBtn');let live=false;const keys=new Set();const player={radius:.32,speed:2.25,run:3.7};
const bounds={minX:-5.25,maxX:5.25,minZ:-3.85,maxZ:3.85};
const blockerBoxes=[
  {minX:-5.18,maxX:-2.05,minZ:-3.58,maxZ:-1.36}, // bed
  {minX:-2.28,maxX:.68,minZ:.22,maxZ:1.38}, // sofa
  {minX:2.45,maxX:4.82,minZ:-3.12,maxZ:-2.28}, // desk, pulled inward to leave a real back-wall aisle
  {minX:2.55,maxX:4.35,minZ:.45,maxZ:2.38}, // dining table/chairs, tighter collider
  {minX:1.10,maxX:5.38,minZ:3.22,maxZ:3.92} // kitchen
];
function canMove(x,z){if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)return false;for(const b of blockerBoxes){if(x>b.minX-player.radius&&x<b.maxX+player.radius&&z>b.minZ-player.radius&&z<b.maxZ+player.radius)return false}return true}
function enterRoom(){
  // Always spawn inside the walkable area. v3.1 started at z=4.8, outside maxZ=3.85,
  // which made every collision check reject WASD movement.
  if(!canMove(camera.position.x,camera.position.z)) camera.position.set(0,1.66,3.45);
  live=true;stage.classList.add('live');enterBtn.classList.add('is-live');if(!isMobile())controls.lock()
}
enterBtn.addEventListener('click',enterRoom);controls.addEventListener('lock',()=>{live=true;stage.classList.add('live');enterBtn.classList.add('is-live')});controls.addEventListener('unlock',()=>{keys.clear();if(!isMobile())stage.classList.remove('live')});canvas.addEventListener('click',()=>{if(live&&!controls.isLocked&&!isMobile()&&!$('#detailPanel').classList.contains('open')&&!$('#editDrawer').classList.contains('open'))controls.lock()});
window.addEventListener('keydown',e=>{
  const activeTag=document.activeElement?.tagName;
  const typing=['INPUT','TEXTAREA'].includes(activeTag);
  const k=e.key.toLowerCase();
  const detail=$('#detailPanel');
  const detailOpen=detail?.classList.contains('open');

  // Reading should never feel like a modal trap: ESC closes it, while WASD closes it
  // and immediately resumes first-person movement. Inputs are protected so typing a
  // message containing w/a/s/d does not accidentally dismiss the panel.
  if(detailOpen&&k==='escape'){
    e.preventDefault();
    closeDetailPanel();
    return;
  }
  if(detailOpen&&!typing&&['w','a','s','d'].includes(k)){
    e.preventDefault();
    closeDetailPanel(false);
    keys.add(k);
    return;
  }
  if(typing)return;
  if(['w','a','s','d','shift'].includes(k))keys.add(k);
  if(k==='e')interactCurrent();
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>keys.clear());
document.addEventListener('visibilitychange',()=>{if(document.hidden)keys.clear()});
const _forward=new THREE.Vector3(),_right=new THREE.Vector3(),_wish=new THREE.Vector3();
function movePlayer(dt){if(!live||(!isMobile()&&!controls.isLocked))return;const speed=keys.has('shift')?player.run:player.speed;let side=0,forward=0;if(keys.has('w'))forward+=1;if(keys.has('s'))forward-=1;if(keys.has('a'))side-=1;if(keys.has('d'))side+=1;side+=mobileVec.x;forward-=mobileVec.y;if(!side&&!forward)return;
  camera.getWorldDirection(_forward);_forward.y=0;if(_forward.lengthSq()<.001)_forward.set(0,0,-1);_forward.normalize();_right.crossVectors(_forward,camera.up).normalize();_wish.set(0,0,0).addScaledVector(_forward,forward).addScaledVector(_right,side);if(_wish.lengthSq()>1)_wish.normalize();_wish.multiplyScalar(speed*dt);
  const p=camera.position;const tryX=p.x+_wish.x;if(canMove(tryX,p.z))p.x=tryX;const tryZ=p.z+_wish.z;if(canMove(p.x,tryZ))p.z=tryZ;p.y=1.66;
}

// mobile controls + look
function isMobile(){return matchMedia('(max-width:760px)').matches||('ontouchstart'in window)}
let mobileVec={x:0,y:0},stickPointer=null;const stick=$('#mobileStick'),knob=stick.querySelector('.stick-knob');
stick.addEventListener('pointerdown',e=>{stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);updateStick(e)});stick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)updateStick(e)});stick.addEventListener('pointerup',resetStick);stick.addEventListener('pointercancel',resetStick);
function updateStick(e){const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy;const max=34,l=Math.hypot(dx,dy);if(l>max){dx=dx/l*max;dy=dy/l*max}mobileVec={x:dx/max,y:dy/max};knob.style.transform=`translate(${dx}px,${dy}px)`}
function resetStick(e){if(e&&e.pointerId!==stickPointer)return;stickPointer=null;mobileVec={x:0,y:0};knob.style.transform='translate(0,0)'}
let lookPointer=null,lastLook=null;canvas.addEventListener('pointerdown',e=>{if(!isMobile())return;lookPointer=e.pointerId;lastLook={x:e.clientX,y:e.clientY}});canvas.addEventListener('pointermove',e=>{if(!isMobile()||e.pointerId!==lookPointer||!lastLook)return;const dx=e.clientX-lastLook.x,dy=e.clientY-lastLook.y;lastLook={x:e.clientX,y:e.clientY};camera.rotation.order='YXZ';camera.rotation.y-=dx*.004;camera.rotation.x=THREE.MathUtils.clamp(camera.rotation.x-dy*.004,-1.2,1.2)});canvas.addEventListener('pointerup',e=>{if(e.pointerId===lookPointer){lookPointer=null;lastLook=null}});

// nearest interactable
let currentZone=null;function updateProximity(){const p=camera.position;let best=null,bestScore=999;for(const [z,o] of Object.entries(zones)){const dx=p.x-o.pos.x,dz=p.z-o.pos.z,d=Math.hypot(dx,dz),score=d/(o.range||1.9);if(d<=(o.range||1.9)&&score<bestScore){bestScore=score;best=z}}const previous=currentZone;currentZone=best;const desktop=$('#interactBtn'),mobile=$('#mobileInteract');if(currentZone){desktop.disabled=false;desktop.classList.add('ready');desktop.querySelector('span').textContent=zones[currentZone].label;mobile.disabled=false;mobile.classList.add('ready');mobile.textContent=currentZone==='pet'?'摸摸看':'點開看看';if(previous!==currentZone){playHint();if(currentZone==='pet'&&performance.now()-lastPetVoice>9000){lastPetVoice=performance.now();const dogD=Math.hypot(p.x+2.85,p.z-2.92),catD=Math.hypot(p.x+1.95,p.z-3.05);setTimeout(()=>dogD<=catD?playDog():playCat(),180)}}}else{desktop.disabled=true;desktop.classList.remove('ready');desktop.querySelector('span').textContent='靠近物件';mobile.disabled=true;mobile.classList.remove('ready');mobile.textContent='查看'}lastZoneForSound=currentZone}
$('#interactBtn').addEventListener('click',interactCurrent);$('#mobileInteract').addEventListener('click',interactCurrent);function interactCurrent(){if(currentZone){playOpen();if(currentZone==='pet'&&performance.now()-lastPetVoice>4500){lastPetVoice=performance.now();Math.random()<.55?playDog():playCat()}openZone(currentZone)}}

// quick map
const jumpPoints={entrance:[0,1.66,3.5,Math.PI],living:[-.2,1.66,2.5,Math.PI],dining:[1.75,1.66,1.45,-Math.PI/2],work:[2.1,1.66,-1.45,-Math.PI],bedroom:[-2.0,1.66,-1.2,-Math.PI],message:[2.5,1.66,-2.9,-Math.PI/2]};
$('#mapBtn').addEventListener('click',()=>$('#mapPanel').classList.toggle('open'));$('#mapClose').addEventListener('click',()=>$('#mapPanel').classList.remove('open'));document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>{const [x,y,z,r]=jumpPoints[b.dataset.jump];camera.position.set(x,y,z);camera.rotation.set(0,r,0);$('#mapPanel').classList.remove('open');toast(`已前往${b.textContent}`)}));

// data panels
const panel=$('#detailPanel');
function closeDetailPanel(clearMovement=true){
  if(!panel.classList.contains('open'))return;
  panel.classList.remove('open');
  if(clearMovement)keys.clear();
  if(live&&!isMobile()&&!controls.isLocked){
    try{controls.lock()}catch(err){console.warn('Pointer lock resume failed',err)}
  }
}
$('#detailClose').addEventListener('click',()=>closeDetailPanel());
function mealCard(label,name,img){return `<div class="meal-card">${img?`<img src="${img}" alt="${esc(label)}照片">`:''}<div><small>${label}</small><b>${esc(name||'—')}</b></div></div>`}
async function openZone(zone){
  keys.clear();
  if(!isMobile()&&controls.isLocked)controls.unlock();
  const d=state[day];
  $('#detailKicker').textContent=`${day} · ${dates[day]}`;
  const titles={schedule:'今天的行程',meal:'今天吃什麼',photo:'照片牆',pet:'寵物角落',todo:'待辦清單',mood:'Ashley 今天的狀態',message:'留言板',sleep:'睡眠紀錄',secret:'窗邊'};
  $('#detailTitle').textContent=titles[zone]||'今天';
  let html='';
  if(zone==='schedule')html=`<p>${formatLines(d.schedule)}</p>`;
  else if(zone==='meal')html=`<div class="meal-cards">${mealCard('早餐',d.breakfast,d.breakfastPhoto)}${mealCard('午餐',d.lunch,d.lunchPhoto)}${mealCard('晚餐',d.dinner,d.dinnerPhoto)}</div>`;
  else if(zone==='photo')html=d.photo?`<p>${esc(d.photoTitle||'今天留下的照片')}</p><img class="photo-large" src="${d.photo}" alt="今日照片">`:`<p>今天還沒有留下照片。</p>`;
  else if(zone==='pet')html=`<p>${formatLines(d.pet)}</p>`;
  else if(zone==='todo')html=`<div class="note-cards">${[1,2,3].map(i=>{const text=d['note'+i]||'';const img=d['note'+i+'Photo']||'';return text||img?`<article class="note-card">${img?`<img src="${img}" alt="便利貼照片 ${i}">`:''}<b>NOTE ${i}</b><p>${formatLines(text||'只有一張照片')}</p></article>`:''}).join('')||`<p>${formatLines(d.todo||'今天還沒有便利貼。')}</p>`}</div>`;
  else if(zone==='mood')html=`<p>${formatLines(d.mood)}</p>`;
  else if(zone==='sleep')html=`<p>${formatLines(d.sleep)}</p>`;
  else if(zone==='message'){
    const msgs=await loadMessagesForDay(day);
    html=`<div>${msgs.length?msgs.slice(-6).map(m=>`<p><b>${esc(m.from||'Visitor')}</b><br>${esc(m.text)}</p>`).join(''):'<p>今天的留言牆很安靜。</p>'}</div><form id="messageForm"><input id="messageInput" maxlength="120" placeholder="留一句話給 Ashley" style="width:100%;padding:10px;border:1px solid #d5cfc7;border-radius:10px"><button class="trace-btn" style="margin-top:8px" type="submit">留下訊息</button></form>`;
  } else if(zone==='secret'){
    const traced=localStorage.getItem(traceKey)==='1';
    html=`<p>「不是每件事都需要報備，但我還是想留一扇窗給你。」</p><button id="traceBtn" class="trace-btn" ${traced?'disabled':''}>${traced?'♡ 我來過':'留下「我來過」'}</button>`;
  }
  $('#detailContent').innerHTML=html;
  panel.classList.add('open');
  if(zone==='message'){
    const f=$('#messageForm');
    f?.addEventListener('submit',async e=>{
      e.preventDefault();
      const inp=$('#messageInput'),text=inp.value.trim();if(!text)return;
      inp.disabled=true;
      try{
        if(cloud.enabled) await cloud.addMessage(day,'Visitor',text);
        else {const msgs=getMessages();msgs.push({day,from:'Visitor',text,time:Date.now()});saveMessages(msgs)}
        inp.value='';toast(cloud.enabled?'留言已同步到房間':'留言已留在這台裝置');await openZone('message');
      }catch(err){console.error(err);toast('留言送出失敗');inp.disabled=false}
    });
  }
  if(zone==='secret')$('#traceBtn')?.addEventListener('click',async()=>{
    try{if(cloud.enabled)await cloud.addVisit(day,visitorId())}catch(err){console.warn('Visit sync failed',err)}
    localStorage.setItem(traceKey,'1');$('#traceBtn').textContent='♡ 我來過';$('#traceBtn').disabled=true;toast(cloud.enabled?'痕跡已留在雲端':'留下了一點痕跡')
  });
}

// world data hooks: small cues instead of labels
let mealGlow=null;const noteTexCache=[];function updateWorldData(){const d=state[day];if(!mealGlow){mealGlow=new THREE.PointLight(0xffc88b,0,1.8,2);mealGlow.position.set(3.45,1.1,1.45);scene.add(mealGlow)}const hasMeal=[d.breakfast,d.lunch,d.dinner].some(v=>v&&v!=='—'&&!String(v).includes('待更新'));mealGlow.intensity=hasMeal?1.2:0;
  notePhotoMeshes?.forEach((mesh,i)=>{const src=d['note'+(i+1)+'Photo']; if(noteTexCache[i]){noteTexCache[i].dispose();noteTexCache[i]=null} if(src){new THREE.TextureLoader().load(src,tex=>{tex.colorSpace=THREE.SRGBColorSpace;noteTexCache[i]=tex;mesh.material.map=tex;mesh.material.color.set(0xffffff);mesh.material.needsUpdate=true})}else{mesh.material.map=null;mesh.material.color.set(0x5e5547);mesh.material.needsUpdate=true}});
  positionAvatar()}
updateWorldData();

// edit mode
loadCloudState();
const drawer=$('#editDrawer'),auth=$('#authBox'),form=$('#editForm'),syncAllBtn=$('#syncAllBtn');
$('#editEntry').addEventListener('click',()=>{drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');if(controls.isLocked)controls.unlock();if(unlocked)populateForm()});
$('#drawerClose').addEventListener('click',()=>drawer.classList.remove('open'));

async function initializeAuth(){
  if(cloud.enabled){
    $('#authHelp').textContent='Owner Login · Supabase Cloud';
    $('#cloudAuthFields').classList.remove('is-hidden');
    $('#localPinFields').classList.add('is-hidden');
    $('#pinBtn').textContent='OWNER LOGIN';
    syncAllBtn.classList.remove('is-hidden');
    try{unlocked=!!(await cloud.getSession())}catch(err){console.warn('Session check failed',err)}
  }else{
    $('#authHelp').textContent='Local Demo Mode · 4 位數 PIN';
    $('#cloudAuthFields').classList.add('is-hidden');
    $('#localPinFields').classList.remove('is-hidden');
    $('#pinBtn').textContent='UNLOCK';
    syncAllBtn.classList.add('is-hidden');
  }
  updateAuthUI();
}
function updateAuthUI(){auth.classList.toggle('is-hidden',unlocked);form.classList.toggle('is-hidden',!unlocked);if(unlocked)populateForm()}
initializeAuth();

$('#pinBtn').addEventListener('click',async()=>{
  $('#pinMsg').textContent='';
  if(cloud.enabled){
    const email=$('#ownerEmail').value.trim(),password=$('#ownerPassword').value;
    if(!email||!password){$('#pinMsg').textContent='請輸入 Owner email 與密碼';return}
    $('#pinBtn').disabled=true;$('#pinBtn').textContent='LOGIN…';
    try{await cloud.signIn(email,password);unlocked=true;toast('Owner Control Mode 已解鎖');updateAuthUI()}
    catch(err){console.error(err);$('#pinMsg').textContent='登入失敗，請確認帳號密碼'}
    finally{$('#pinBtn').disabled=false;$('#pinBtn').textContent='OWNER LOGIN'}
    return;
  }
  const v=$('#pinInput').value.trim();
  if(!/^\d{4}$/.test(v)){ $('#pinMsg').textContent='請輸入 4 位數 PIN';return }
  const stored=localStorage.getItem(pinKey);
  if(!stored){localStorage.setItem(pinKey,v);unlocked=true;toast('PIN 已設定')}
  else if(stored===v){unlocked=true;toast('Control Mode 已解鎖')}
  else{$('#pinMsg').textContent='PIN 不正確';return}
  updateAuthUI();
});

$('#lockBtn').addEventListener('click',async()=>{if(cloud.enabled)await cloud.signOut();unlocked=false;updateAuthUI();toast('Control Mode 已鎖定')});
function setDirty(v){dirty=v;form.classList.toggle('dirty',v);$('#saveStateText').textContent=v?'有尚未儲存的變更':(cloud.enabled?'已同步到雲端':'已儲存在本機')}
function populateForm(){const d=state[day];photoDraft={photo:d.photo||'',breakfastPhoto:d.breakfastPhoto||'',lunchPhoto:d.lunchPhoto||'',dinnerPhoto:d.dinnerPhoto||'',note1Photo:d.note1Photo||'',note2Photo:d.note2Photo||'',note3Photo:d.note3Photo||''};for(const [k,v] of Object.entries(d)){const el=form.elements.namedItem(k);if(el&&!el.type?.includes('file'))el.value=v||''}for(const k of Object.keys(photoDraft)){const pv=document.querySelector(`[data-preview="${k}"]`);if(pv)pv.style.backgroundImage=photoDraft[k]?`url("${photoDraft[k]}")`:''}setDirty(false)}
form.addEventListener('input',e=>{if(e.target.type!=='file')setDirty(true)});
document.querySelectorAll('[data-photo]').forEach(input=>input.addEventListener('change',async()=>{const file=input.files?.[0];if(!file)return;const key=input.dataset.photo;try{photoDraft[key]=await compressImage(file);const pv=document.querySelector(`[data-preview="${key}"]`);if(pv)pv.style.backgroundImage=`url("${photoDraft[key]}")`;setDirty(true);toast('照片已載入，記得儲存')}catch{toast('照片讀取失敗')}}));
function compressImage(file){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const max=1100,s=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/jpeg',.78))};img.onerror=reject;img.src=url})}

form.addEventListener('submit',async e=>{
  e.preventDefault();
  const fd=new FormData(form),next={...state[day]};
  for(const k of ['mood','schedule','breakfast','lunch','dinner','photoTitle','sleep','pet','todo','note1','note2','note3'])next[k]=String(fd.get(k)||'').trim();
  Object.assign(next,photoDraft);
  const saveBtn=form.querySelector('.save-btn');saveBtn.disabled=true;saveBtn.textContent=cloud.enabled?'同步中…':'儲存中…';
  try{
    const saved=cloud.enabled?await cloud.saveDay(day,next):next;
    state[day]=saved;saveState();setDirty(false);updateWorldData();populateForm();
    toast(cloud.enabled?`${day} 已同步到所有裝置`:`${day} 已儲存到本機`);
  }catch(err){console.error(err);toast(cloud.enabled?'雲端儲存失敗，請確認 Owner 權限':'儲存失敗，照片可能太大')}
  finally{saveBtn.disabled=false;saveBtn.textContent='儲存今天'}
});

syncAllBtn.addEventListener('click',async()=>{
  if(!cloud.enabled||!unlocked)return;
  syncAllBtn.disabled=true;syncAllBtn.textContent='同步 MON–FRI 中…';
  try{
    for(const d of DAYS){state[d]=await cloud.saveDay(d,state[d]);saveState()}
    cloudSynced=true;setDirty(false);toast('本機週間資料已全部搬到雲端');
  }catch(err){console.error(err);toast('同步失敗，請確認 Supabase 設定與 Owner 權限')}
  finally{syncAllBtn.disabled=false;syncAllBtn.textContent='把這台電腦的 MON–FRI 同步到雲端'}
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});

// resize + animation
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}window.addEventListener('resize',resize);resize();
let last=performance.now();function loop(now){const dt=Math.min((now-last)/1000,.04);last=now;movePlayer(dt);updateProximity();const t=now/1000;for(const a of animated){if(a.type==='fan')a.obj.rotation.z-=dt*2.6;else if(a.type==='flame'){a.obj.scale.y=1.5+Math.sin(t*8)*.25+Math.sin(t*13)*.12;a.obj.position.x=-.75+Math.sin(t*7)*.004;a.light.intensity=1.2+Math.sin(t*11)*.18}else if(a.type==='louver')a.obj.rotation.x=-.15+Math.sin(t*.8+a.offset)*.18;else if(a.type==='curtain')a.obj.position.x=a.baseX+Math.sin(t*.55+a.offset)*.018;else if(a.type==='avatar')a.obj.position.y=Math.sin(t*1.15)*.006;else if(a.type==='dogTail')a.obj.rotation.z=a.base+Math.sin(t*5.2)*.28;else if(a.type==='catIdle'){a.obj.position.y=Math.sin(t*1.7)*.007;a.tail.rotation.z=.95+Math.sin(t*1.3)*.08}else if(a.type==='leafSway'){a.obj.rotation.z=a.base+Math.sin(t*.8+a.offset)*.055}else if(a.type==='dust'){a.obj.rotation.y=t*.003;a.obj.position.y=Math.sin(t*.18)*.03}}renderer.render(scene,camera);requestAnimationFrame(loop)}requestAnimationFrame(loop);window.__ashleyRoomBooted=true;setTimeout(()=>$('#loading').classList.add('hide'),650);
