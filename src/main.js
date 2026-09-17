import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createCar, materials, texture } from './assets.js';
import { buildWorld } from './world.js';
import {TRACK,loopPoint,nearestOnLoop,travelToBay} from './route.js';
import {createExchangeCard} from './exchange-card.js';
import {createEnergyNetwork} from './energy-network.js';
import {pickDestination,planRoadTrip,roadTripPoint} from './click-navigation.js';
import {PARK_SETTLE_SECONDS,createChargingMotion,sampleChargingMotion} from './charging-motion.js';

const $=id=>document.getElementById(id);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x9dbfce);
scene.fog=new THREE.Fog(0x9dbfce,80,190);
// Reserve the lower part of short windows for the controls.
const overviewTarget=()=>new THREE.Vector3(1,innerHeight<850?-13:-4,5);
const camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.1,1600);
camera.position.set(46,43,60);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.92;
$('app').appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-label','海边新能源充电站三维场景；鼠标拖动旋转，滚轮缩放');
renderer.domElement.tabIndex=0;
const pmrem=new THREE.PMREMGenerator(renderer);
const studio=new RoomEnvironment();
scene.environment=pmrem.fromScene(studio,.04).texture;
studio.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xd8edff,0x68958a,2.1));
const sun=new THREE.DirectionalLight(0xffefd7,3);
sun.position.set(-24,40,22);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-44,right:44,top:38,bottom:-38,near:1,far:120});
sun.shadow.bias=-.0002;sun.shadow.normalBias=.04;scene.add(sun);
const fill=new THREE.DirectionalLight(0x88d8ff,1);
fill.position.set(25,15,-25);scene.add(fill);
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.copy(overviewTarget());
controls.enableDamping=true;controls.dampingFactor=.08;
controls.minDistance=8;controls.maxDistance=105;controls.maxPolarAngle=Math.PI*.475;
const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.24,.5,1.3));
composer.addPass(new OutputPass());
const world=buildWorld(scene);
const exchange=createExchangeCard(scene);
const vehicle=createCar();const car=vehicle.group;scene.add(car);
const START=new THREE.Vector3(-5,.44,5.7);
car.position.copy(START);car.rotation.y=-Math.PI/2;

// Transparent billboard follows the selected charging pile.
const cardTexture=texture(900,470,()=>{});
const ctx=cardTexture.image.getContext('2d');
const card=new THREE.Sprite(new THREE.SpriteMaterial({map:cardTexture,transparent:true,depthWrite:false,depthTest:false,toneMapped:false}));
card.renderOrder=12;
card.scale.set(5.3,2.77,1);scene.add(card);
const dataPipe=createEnergyNetwork(scene,exchange.card,card,(count,total)=>exchange.receiveBatch(count,total));
const markerMaterial=new THREE.MeshBasicMaterial({color:0x51e6bf,transparent:true,opacity:.85,depthWrite:false});
const selectionRing=new THREE.Mesh(new THREE.RingGeometry(.94,1,64),markerMaterial);
selectionRing.rotation.x=-Math.PI/2;selectionRing.scale.set(1.3,2.65,1);selectionRing.visible=false;scene.add(selectionRing);
const destinationMarker=new THREE.Group();scene.add(destinationMarker);destinationMarker.visible=false;
const targetRing=new THREE.Mesh(new THREE.RingGeometry(.46,.55,40),markerMaterial);
targetRing.rotation.x=-Math.PI/2;destinationMarker.add(targetRing);
const targetPin=new THREE.Mesh(new THREE.ConeGeometry(.16,.55,12),markerMaterial);
targetPin.rotation.z=Math.PI;targetPin.position.y=.8;destinationMarker.add(targetPin);
const roadGuide=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({
  color:0x77f3c9,transparent:true,opacity:.8,dashSize:.4,gapSize:.25,depthWrite:false,
}));
roadGuide.visible=false;scene.add(roadGuide);
let lastCardValue=-1,lastCardPhase='';
function drawCard(value,phase){
  if(value===lastCardValue&&phase===lastCardPhase)return;
  lastCardValue=value;lastCardPhase=phase;
  ctx.clearRect(0,0,900,470);
  ctx.fillStyle='rgba(5,35,50,0.79)';
  ctx.beginPath();ctx.roundRect(8,8,884,454,28);ctx.fill();
  ctx.strokeStyle='rgba(124,245,233,.85)';ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle='#b0e1dd';ctx.font='24px "Microsoft YaHei", sans-serif';
  ctx.fillText(`充电桩 EV 0${chosen+1}  /  ENERGY DATA`,42,64);
  ctx.fillStyle='#fff';ctx.font='bold 90px sans-serif';ctx.fillText(`+${value}`,40,195);
  ctx.fillStyle='#63efce';ctx.font='38px sans-serif';ctx.fillText('RWAT',340,190);
  ctx.strokeStyle='#71e5d3';ctx.lineWidth=7;
  // Vector chain icon avoids platform-dependent emoji rendering.
  ctx.save();ctx.translate(756,168);ctx.rotate(-Math.PI/4);
  ctx.beginPath();ctx.roundRect(-46,-24,58,43,18);ctx.stroke();
  ctx.beginPath();ctx.roundRect(-9,-24,58,43,18);ctx.stroke();ctx.restore();
  ctx.fillStyle='#b9dcd9';ctx.font='28px "Microsoft YaHei", sans-serif';
  ctx.fillText(phase==='charged'?'充电完成 · 奖励已记录':phase==='charging'?'绿色充电中 · 能量持续累积':phase==='settling'?'车辆已停稳 · 准备自动插枪':phase==='connecting'?'智能充电枪连接中':phase==='disconnecting'?'充电枪归位中 · 请稍候':'进入车位 · 自动连接',42,267);
  ctx.fillStyle='rgba(177,230,227,.15)';ctx.fillRect(44,316,810,8);
  ctx.fillStyle='#64eac9';ctx.fillRect(44,316,810*((value-100)/900),8);
  ctx.font='24px "Microsoft YaHei", sans-serif';ctx.fillStyle='#89bcbf';
  ctx.fillText('模拟数据 · 非真实上链',42,394);
  ctx.fillText(phase==='charging'?'180 kW  →  预言机 × 3':'等待充电  →  预言机 × 3',493,394);
  cardTexture.needsUpdate=true;
}

let chosen=1,phase='idle',reward=100,speed=0,phaseTime=0,autopilot=null,active=null;
let cable=null,gunRotation=null,gunTargetRotation=null,gunMotion=null,gunTime=0,viewTransition=null;
let tour=null,tourPaused=false,tourAfterLeave=false;
let carSelected=false,navigationPlan=null,navigationDistance=0,pendingDestination=null;
const keys=new Set();
const modes={idle:'道路行驶',navigating:'正在前往点击位置',cruising:'环路巡航 · 返回充电站',parking:'自动泊车中',settling:'车辆停稳 · 准备插枪',connecting:'自动插枪',disconnecting:'正在收回充电枪',charging:'正在充电',charged:'充电完成',leaving:'正在驶出'};
const connectedPhases=['settling','connecting','charging','charged'];
const driveKeys=['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright',' '];
function notify(message){
  $('toast').textContent=message;$('toast').classList.add('show');
  clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').classList.remove('show'),3500);
}
function syncUI(){
  $('speed').textContent=String(Math.round(Math.abs(speed)*3.6));
  $('status').textContent=phase==='cruising'&&tourPaused?'巡航已暂停':phase==='connecting'&&gunMotion?sampleChargingMotion(gunMotion,gunTime).label:modes[phase];
  $('reward').textContent=`+${Math.floor(reward)} RWAT`;
  $('bay-label').textContent=`EV ${String(chosen+1).padStart(2,'0')}`;
  $('charge-button').disabled=phase!=='idle';
  $('leave-button').disabled=!connectedPhases.includes(phase);
  $('bay-select').disabled=phase!=='idle';
  $('progress').style.width=`${(reward-100)/9}%`;
  $('loop-button').textContent=phase==='cruising'?(tourPaused?'继续巡航 ▶':'暂停巡航 Ⅱ'):'环路巡航 ↻';
  $('loop-button').disabled=['parking','leaving','navigating','disconnecting'].includes(phase);
  $('select-car').setAttribute('aria-pressed',String(carSelected));
  $('route-progress').textContent=navigationPlan?`前往目标 · 剩余 ${Math.ceil(Math.max(0,navigationPlan.total-navigationDistance))} m`
    :tour?`已行驶 ${Math.floor(tour.traveled)} m · 回站后自动充电`
    :carSelected?'小车已选中 · 点击道路或充电车位':'先点击小车，再点击道路选择目的地';
  document.body.dataset.phase=phase;
  drawCard(Math.floor(reward),phase);
}
function setPhase(next){phase=next;phaseTime=0;syncUI();}
function selectBay(index){
  chosen=index;$('bay-select').value=String(index);
  lastCardValue=-1;
  const station=world.chargers[index];
  card.position.set(Math.max(.7,station.group.position.x),5.7,station.group.position.z);
  reward=100;syncUI();
}
function angleLerp(from,to,t){return from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*t;}
function clearDestination(){
  navigationPlan=null;navigationDistance=0;pendingDestination=null;
  destinationMarker.visible=false;roadGuide.visible=false;
}
function selectCar(){
  if(['parking','leaving','disconnecting'].includes(phase)){notify('请等待车辆停稳或充电枪归位后选择目的地');return;}
  carSelected=true;selectionRing.visible=true;
  if(phase==='navigating'||phase==='cruising'){
    tour=null;tourPaused=false;clearDestination();speed=0;setPhase('idle');
  }
  syncUI();notify('小车已选中，请点击道路上的目的地；点击车位可自动充电');
}
function drawRoadGuide(plan){
  const points=[],steps=Math.max(2,Math.ceil(plan.total/.4));
  for(let i=0;i<=steps;i++){
    const p=roadTripPoint(plan,plan.total*i/steps);points.push(new THREE.Vector3(p.x,.472,p.z));
  }
  roadGuide.geometry.dispose();roadGuide.geometry=new THREE.BufferGeometry().setFromPoints(points);
  roadGuide.computeLineDistances();roadGuide.visible=true;
}
function beginNavigation(destination){
  if(['parking','leaving','disconnecting'].includes(phase)){notify('请等待车辆停稳或充电枪归位，再选择目的地');return;}
  keys.clear();tour=null;tourPaused=false;tourAfterLeave=false;
  clearDestination();
  destinationMarker.position.set(destination.x,.48,destination.z);destinationMarker.visible=true;
  if(connectedPhases.includes(phase)){
    pendingDestination=destination;leave();return;
  }
  if(car.position.z<2.2){
    pendingDestination=destination;
    autopilot={curve:new THREE.LineCurve3(car.position.clone(),new THREE.Vector3(car.position.x,.44,5.7)),t:0,duration:2.4,reverse:true};
    setPhase('leaving');return;
  }
  speed=0;setPhase('idle');
  if(destination.kind==='bay'){
    selectBay(destination.bay);park(destination.bay);return;
  }
  navigationPlan=planRoadTrip(car.position,destination);navigationDistance=0;
  // Same longitudinal location: slide a small distance within the road, not a lap.
  if(navigationPlan.total<.08){
    const separation=Math.hypot(destination.x-car.position.x,destination.z-car.position.z);
    if(separation<.12){clearDestination();notify('小车已在目标位置');return;}
    autopilot={curve:new THREE.LineCurve3(car.position.clone(),new THREE.Vector3(destination.x,.44,destination.z)),t:0,duration:1.2,reverse:false};
    navigationPlan=null;
  }else drawRoadGuide(navigationPlan);
  setPhase('navigating');notify('沿道路前往目标位置；点击其他道路位置可重新规划');
}
function toggleTour(){
  if(phase==='cruising'){
    tourPaused=!tourPaused;speed=0;syncUI();
    notify(tourPaused?'已暂停，点击继续巡航恢复行驶':'继续沿环路行驶');
    return;
  }
  if(connectedPhases.includes(phase)){
    tourAfterLeave=true;leave();return;
  }
  if(phase!=='idle')return;
  // Back out first if a manually driven car is already inside a bay.
  if(car.position.z<2.2){
    tourAfterLeave=true;
    autopilot={curve:new THREE.LineCurve3(car.position.clone(),new THREE.Vector3(car.position.x,.44,5.7)),t:0,duration:2.4,reverse:true};
    setPhase('leaving');return;
  }
  startTour(true);
}
function startTour(fullTour){
  clearDestination();
  const nearest=nearestOnLoop(car.position.x,car.position.z);
  tour={
    start:nearest.along,traveled:0,total:travelToBay(nearest.along,world.chargers[chosen].x,fullTour),
    offset:new THREE.Vector3(car.position.x-nearest.x,0,car.position.z-nearest.z),
  };
  tourPaused=false;speed=0;keys.clear();setPhase('cruising');
  notify('小车开始环路巡航，回站后自动充电；点击车身可重新选择目的地');
}
function park(index=chosen){
  if(phase!=='idle')return;
  chosen=index;$('bay-select').value=String(index);
  // Requests made on the far side of the loop follow the road back to the station.
  if(car.position.z>8.35||car.position.x<-20.3||car.position.x>20.3){startTour(false);return;}
  const station=world.chargers[index],x=station.x;
  const points=[car.position.clone()];
  if(car.position.z<2.7&&Math.abs(x-car.position.x)<1.3){
    // A manually driven car already in its bay simply aligns and rolls forward.
    points.push(new THREE.Vector3(x,.44,(car.position.z-3.3)/2));
  }else{
    if(car.position.z<2.7)points.push(new THREE.Vector3(car.position.x,.44,4.8));
    if(Math.abs(x-car.position.x)>1.3)points.push(new THREE.Vector3(x-Math.sign(x-car.position.x)*1.8,.44,5.3));
    points.push(new THREE.Vector3(x,.44,2.1));
  }
  points.push(new THREE.Vector3(x,.44,-3.3));
  const curve=new THREE.CatmullRomCurve3(points,false,'centripetal');
  autopilot={curve,t:0,duration:Math.max(2.8,curve.getLength()/4.4),reverse:false};
  active=station;reward=100;speed=0;dataPipe.reset();exchange.resetBatches();lastCardValue=-1;
  card.position.set(Math.max(.7,station.group.position.x),5.7,station.group.position.z);
  setPhase('parking');notify(`驶向 EV 0${chosen+1}，停稳后自动插枪`);
}
function connect(){
  speed=0;
  destinationMarker.visible=false;roadGuide.visible=false;
  car.updateWorldMatrix(true,true);
  const dock=car.worldToLocal(active.gun.getWorldPosition(new THREE.Vector3()));
  gunMotion=createChargingMotion(dock.toArray(),vehicle.port.position.toArray());gunTime=0;
  gunRotation=active.gun.getWorldQuaternion(new THREE.Quaternion());
  gunTargetRotation=car.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),vehicle.portSide*Math.PI/2));
  scene.attach(active.gun);active.idleCable.visible=false;
  cable=new THREE.Mesh(new THREE.BufferGeometry(),materials.tire);scene.add(cable);
  updateGun();
  setPhase('connecting');
}
function restoreGun(){
  if(!active)return;
  active.group.add(active.gun);active.gun.position.copy(active.dockPosition);
  active.gun.rotation.set(0,0,-.25);active.idleCable.visible=true;
  if(cable){cable.geometry.dispose();scene.remove(cable);cable=null;}
  gunMotion=null;gunTime=0;
}
function leave(){
  if(!connectedPhases.includes(phase))return;
  keys.clear();speed=0;
  if(gunMotion&&gunTime>0){
    setPhase('disconnecting');notify('先拔枪并收回充电桩，归位后车辆再驶出');return;
  }
  driveOut();
}
function driveOut(){
  restoreGun();
  const points=[car.position.clone(),new THREE.Vector3(car.position.x,.44,2.8),new THREE.Vector3(car.position.x,.44,5.7)];
  autopilot={curve:new THREE.CatmullRomCurve3(points),t:0,duration:3,reverse:true};
  setPhase('leaving');notify('充电枪已归位，车辆驶回道路');
}
function reset(){
  dataPipe.reset();exchange.resetBatches();
  restoreGun();active=null;autopilot=null;tour=null;tourPaused=false;tourAfterLeave=false;speed=0;reward=100;keys.clear();
  clearDestination();carSelected=false;selectionRing.visible=false;
  car.position.copy(START);car.rotation.set(0,-Math.PI/2,0);
  selectBay(1);setPhase('idle');setView('overview');
  clearTimeout(notify.timer);$('toast').textContent='';$('toast').classList.remove('show');
}
function validPosition(x,z){
  if(nearestOnLoop(x,z).distance<=TRACK.width/2-1.2)return true;
  if(x < -20.3||x>20.3)return false;
  if(z>=2.2&&z<=8.35)return true;
  return z>=-4.1&&z<2.2&&world.chargers.some(c=>Math.abs(x-c.x)<1.18);
}
function updateGun(){
  if(!active||!cable||!gunMotion)return false;
  const motion=sampleChargingMotion(gunMotion,gunTime);
  const gun=active.gun;
  gun.position.copy(car.localToWorld(new THREE.Vector3(...motion.position)));
  gun.quaternion.slerpQuaternions(gunRotation,gunTargetRotation,motion.rotationBlend);gun.updateMatrixWorld(true);
  const start=active.group.localToWorld(new THREE.Vector3(.58,.8,.17));
  const finish=gun.localToWorld(new THREE.Vector3(0,-.22,0));
  const trail=motion.trail.map(p=>car.localToWorld(new THREE.Vector3(...p)));
  // The cable settles onto the pavement behind the moving handle, never ahead of it.
  const points=[start,...trail,finish].filter((p,i,all)=>!i||p.distanceToSquared(all[i-1])>.00001);
  const deployed=new THREE.CatmullRomCurve3(points,false,'centripetal');
  const idle=active.idleCable.geometry.parameters.path;
  const cablePoints=[];
  for(let i=0;i<=64;i++){
    const u=i/64;
    const docked=active.group.localToWorld(idle.getPoint(u));
    // Endpoints stay attached even during the initial undocking blend.
    docked.addScaledVector(finish.clone().sub(active.group.localToWorld(idle.getPoint(1))),u*u);
    cablePoints.push(docked.lerp(deployed.getPoint(u),motion.deployment));
  }
  const geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePoints),64,.038,8,false);
  cable.geometry.dispose();cable.geometry=geometry;
  return motion.seated;
}

function setView(name){
  const presets={
    overview:{p:new THREE.Vector3(46,43,60),t:overviewTarget()},
    car:{p:car.position.clone().add(new THREE.Vector3(7.6,4.5,-8.4)),t:car.position.clone().add(new THREE.Vector3(0,.7,0))},
    charger:{p:new THREE.Vector3(world.chargers[chosen].x+11,10,12),t:new THREE.Vector3(world.chargers[chosen].x+1,.8,-5)},
    harbor:{p:new THREE.Vector3(43,14,15),t:new THREE.Vector3(28,-1,-1)},
    exchange:{p:new THREE.Vector3(card.position.x-3.2,15,innerWidth<640?64:24),t:new THREE.Vector3(card.position.x-3.2,innerHeight<850?5.8:9,-8)},
  };
  viewTransition={from:camera.position.clone(),fromTarget:controls.target.clone(),...presets[name],time:0};
  document.querySelectorAll('[data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===name));
}
controls.addEventListener('start',()=>{viewTransition=null;});
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
$('charge-button').addEventListener('click',()=>park());
$('loop-button').addEventListener('click',toggleTour);
$('select-car').addEventListener('click',selectCar);
$('leave-button').addEventListener('click',leave);
$('reset-button').addEventListener('click',reset);
$('bay-select').addEventListener('change',event=>selectBay(Number(event.target.value)));
// Distinguish a click on the actual vehicle from a camera orbit/drag.
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let pointerDown=null;
const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-.44);
function hitsCar(event){
  const bounds=renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  return raycaster.intersectObject(car,true).length>0;
}
renderer.domElement.addEventListener('pointerdown',event=>{
  if(event.button===0)pointerDown={id:event.pointerId,x:event.clientX,y:event.clientY,hit:hitsCar(event)};
});
renderer.domElement.addEventListener('pointerup',event=>{
  if(pointerDown&&event.pointerId===pointerDown.id&&
    Math.hypot(event.clientX-pointerDown.x,event.clientY-pointerDown.y)<6){
    if(hitsCar(event))selectCar();
    else if(carSelected){
      const point=raycaster.ray.intersectPlane(groundPlane,new THREE.Vector3());
      const destination=point&&pickDestination(point.x,point.z);
      if(destination)beginNavigation(destination);
      else notify('请点击道路或充电车位，车辆无法驶入海面或绿化区');
    }else notify('请先点击小车选中，再点击道路目的地');
  }
  pointerDown=null;
});
renderer.domElement.addEventListener('pointercancel',()=>{pointerDown=null;});
renderer.domElement.addEventListener('pointermove',event=>{
  if(!event.buttons)renderer.domElement.style.cursor=hitsCar(event)?'pointer':carSelected?'crosshair':'grab';
});
addEventListener('keydown',event=>{
  const key=event.key.toLowerCase();
  if(['SELECT','INPUT','TEXTAREA'].includes(event.target.tagName))return;
  if(driveKeys.includes(key))event.preventDefault();
  keys.add(key);if(event.repeat)return;
  if(key==='r')reset();if(key==='p')park();if(key==='c')toggleTour();
  if(['cruising','navigating'].includes(phase)&&['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){
    tour=null;tourPaused=false;autopilot=null;clearDestination();setPhase('idle');notify('已切换为手动驾驶');
  }
  if(key==='escape'){
    keys.clear();carSelected=false;selectionRing.visible=false;
    if(phase==='navigating'){autopilot=null;clearDestination();speed=0;setPhase('idle');}
    if(phase==='cruising'){tourPaused=true;speed=0;}syncUI();
  }
});
addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
addEventListener('blur',()=>keys.clear());
document.addEventListener('visibilitychange',()=>keys.clear());
document.querySelectorAll('[data-key]').forEach(button=>{
  button.addEventListener('pointerdown',event=>{
    event.preventDefault();button.setPointerCapture(event.pointerId);
    if(['cruising','navigating'].includes(phase)){tour=null;tourPaused=false;autopilot=null;clearDestination();setPhase('idle');}
    keys.add(button.dataset.key);
  });
  for(const eventName of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(eventName,()=>keys.delete(button.dataset.key));
});

const clock=new THREE.Clock();
let time=0,uiTime=0;
function animate(){
  const dt=Math.min(clock.getDelta(),.05);time+=dt;phaseTime+=dt;
  exchange.update(dt);
  world.waterUniforms.time.value=time;
  world.turbines.forEach((rotor,i)=>rotor.rotation.z-=dt*(.46+i*.04));
  for(const data of world.boatData){
    data.boat.position.y=-.48+Math.sin(time*.78+data.phase)*.045;
    data.boat.rotation.z=Math.sin(time*.6+data.phase)*.018;
    data.boat.rotation.x=Math.sin(time*.53+data.phase)*.01;
  }
  if(phase==='navigating'&&navigationPlan){
    const remaining=navigationPlan.total-navigationDistance;
    speed=THREE.MathUtils.damp(speed,Math.min(6.5,Math.max(.7,Math.sqrt(remaining*5))),3,dt);
    navigationDistance=Math.min(navigationPlan.total,navigationDistance+speed*dt);
    const p=roadTripPoint(navigationPlan,navigationDistance);
    const old=car.position.clone();car.position.set(p.x,.44,p.z);
    const delta=car.position.clone().sub(old);
    const theta=delta.lengthSq()>.0000001?Math.atan2(-delta.x,-delta.z):car.rotation.y;
    car.rotation.y=angleLerp(car.rotation.y,theta,Math.min(dt*9,1));
    if(navigationDistance>=navigationPlan.total){
      speed=0;clearDestination();setPhase('idle');notify('已到达点击位置，点击道路可继续行驶');
    }
  }else if(phase==='cruising'&&tour){
    if(!tourPaused){
      speed=THREE.MathUtils.damp(speed,7.4,2.4,dt);
      tour.traveled=Math.min(tour.total,tour.traveled+speed*dt);
      const point=loopPoint(tour.start+tour.traveled);
      car.position.set(point.x,.44,point.z).addScaledVector(tour.offset,Math.max(0,1-tour.traveled/6));
      car.rotation.y=angleLerp(car.rotation.y,Math.atan2(-point.dx,-point.dz),Math.min(dt*8,1));
      if(tour.traveled>=tour.total){
        tour=null;speed=0;setPhase('idle');park(chosen);
      }
    }
  }else if(autopilot){
    const route=autopilot;route.t=Math.min(1,route.t+dt/route.duration);
    const u=THREE.MathUtils.smoothstep(route.t,0,1),last=car.position.clone();
    car.position.copy(route.curve.getPointAt(u));
    const tangent=route.curve.getTangentAt(Math.min(u,.999));
    const theta=Math.atan2(-tangent.x,-tangent.z)+(route.reverse?Math.PI:0);
    car.rotation.y=angleLerp(car.rotation.y,theta,Math.min(dt*9,1));
    speed=last.distanceTo(car.position)/Math.max(dt,.0001)*(route.reverse?-1:1);
    if(route.t>=1){
      autopilot=null;speed=0;
      if(phase==='parking'){
        car.rotation.y=0;keys.clear();destinationMarker.visible=false;roadGuide.visible=false;
        setPhase('settling');notify('车辆已停稳，充电桩准备自动插枪');
      }
      else if(phase==='navigating'){clearDestination();setPhase('idle');notify('已到达点击位置');}
      else{
        car.rotation.y=-Math.PI/2;active=null;setPhase('idle');
        if(pendingDestination){const destination=pendingDestination;pendingDestination=null;beginNavigation(destination);}
        else if(tourAfterLeave){tourAfterLeave=false;startTour(true);}
      }
    }
  }else if(phase==='idle'){
    const throttle=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0);
    const steering=(keys.has('a')||keys.has('arrowleft')?1:0)-(keys.has('d')||keys.has('arrowright')?1:0);
    speed=THREE.MathUtils.damp(speed,keys.has(' ')?0:throttle*6.5,throttle?3:5,dt);
    const oldPosition=car.position.clone(),oldAngle=car.rotation.y;
    car.rotation.y+=steering*speed*.32*dt;
    car.position.x-=Math.sin(car.rotation.y)*speed*dt;car.position.z-=Math.cos(car.rotation.y)*speed*dt;
    if(!validPosition(car.position.x,car.position.z)){car.position.copy(oldPosition);car.rotation.y=oldAngle;speed=0;}
    const bay=world.chargers.find(c=>Math.abs(car.position.x-c.x)<1.05&&car.position.z<-2);
    if(bay)park(bay.index);
  }
  if(phase==='settling'&&phaseTime>=PARK_SETTLE_SECONDS)connect();
  else if(phase==='connecting'){
    gunTime=Math.min(gunMotion.duration,gunTime+dt);
    if(updateGun()){setPhase('charging');notify('充电枪已插稳，开始充电并累积 RWAT');}
  }else if(phase==='disconnecting'){
    gunTime=Math.max(0,gunTime-dt*1.4);updateGun();
    if(gunTime===0)driveOut();
  }
  if(phase==='charging'){
    reward=Math.min(1000,100+phaseTime*60);
    if(reward>=1000){setPhase('charged');notify('充电完成 · +1000 RWAT 已记录（演示）');}
  }
  vehicle.wheels.forEach(wheel=>wheel.rotation.x-=speed*dt/vehicle.wheelRadius);
  selectionRing.position.set(car.position.x,.474,car.position.z);
  selectionRing.rotation.set(-Math.PI/2,0,-car.rotation.y);
  targetPin.position.y=.8+Math.sin(time*3.5)*.12;
  if(viewTransition){
    viewTransition.time=Math.min(1,viewTransition.time+dt*1.15);
    const u=THREE.MathUtils.smoothstep(viewTransition.time,0,1);
    camera.position.lerpVectors(viewTransition.from,viewTransition.p,u);
    controls.target.lerpVectors(viewTransition.fromTarget,viewTransition.t,u);
    if(viewTransition.time>=1)viewTransition=null;
  }
  uiTime+=dt;
  if(uiTime>.15){$('speed').textContent=String(Math.round(Math.abs(speed)*3.6));syncUI();uiTime=0;}
  controls.update();
  const network=dataPipe.update(dt,camera,phase==='charging',reward,world.chargers[chosen].group);
  exchange.updateAnchor();
  const networkStatus=$('network-status');
  if(networkStatus){
    const description=phase==='charging'
      ?`${['充电桩正在向预言机 X1、X2、X3 发送数据','三路预言机校验通过，正在提交联盟链','联盟链正在向交易所 K 线图传输数据'][network.stage]}。交易所已接收 ${network.delivered} 批模拟数据。`
      :'数据链路待命：充电桩 → 预言机 X1、X2、X3 → 联盟链 → 交易所 K 线图。';
    if(networkStatus.textContent!==description)networkStatus.textContent=description;
  }
  composer.render();
}
selectBay(1);syncUI();$('loading').classList.add('done');
renderer.setAnimationLoop(animate);
addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);
});
