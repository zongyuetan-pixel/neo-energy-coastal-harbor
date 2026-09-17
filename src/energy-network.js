import * as THREE from 'three';
import {createEnergyFlow} from './energy-flow.js';

// A shared camera-facing plane keeps the diagram readable while orbiting.
export function createEnergyNetwork(scene,appCard,onArrival=()=>{}){
  const group=new THREE.Group();group.name='充电桩 → 预言机 → 联盟链 → 交易所';scene.add(group);
  const flow=createEnergyFlow(),right=new THREE.Vector3(),up=new THREE.Vector3();
  const anchor=new THREE.Vector3(),dummy=new THREE.Object3D();
  const mint='#79f5d0',blue='#8ddcff',muted='#96bac8';
  let paintAge=1,lastKey='',state=flow.update(0,false),elapsed=0;
  // The physical uplink sits directly on the selected charger's roof.
  const uplink=new THREE.Group();uplink.name='充电桩顶部 · 数据上行光球';scene.add(uplink);
  const orb=new THREE.Mesh(new THREE.SphereGeometry(.14,32,24),
    new THREE.MeshStandardMaterial({color:0xb9fff2,emissive:0x50ffdb,emissiveIntensity:2.4,roughness:.18}));
  orb.position.y=.24;uplink.add(orb);
  const socket=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,.055,32),
    new THREE.MeshStandardMaterial({color:0x8babaf,metalness:.8,roughness:.26}));
  socket.position.y=.0275;uplink.add(socket);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.24,.012,8,48),
    new THREE.MeshBasicMaterial({color:0x71ffe0,transparent:true,opacity:.7}));
  ring.rotation.x=Math.PI/2;ring.position.y=.1;uplink.add(ring);
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;
  const glowContext=glowCanvas.getContext('2d'),gradient=glowContext.createRadialGradient(64,64,0,64,64,64);
  gradient.addColorStop(0,'rgba(177,255,235,.8)');gradient.addColorStop(.24,'rgba(76,255,211,.35)');gradient.addColorStop(1,'rgba(76,255,211,0)');
  glowContext.fillStyle=gradient;glowContext.fillRect(0,0,128,128);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  glow.position.y=.24;glow.scale.setScalar(.95);uplink.add(glow);
  function panel(name,w,h,width,height){
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,depthWrite:false,depthTest:false,toneMapped:false}));
    sprite.renderOrder=12;
    sprite.name=name;sprite.scale.set(width,height,1);group.add(sprite);
    return {sprite,ctx:canvas.getContext('2d'),map,w,h};
  }
  const oracles=[1,2,3].map(i=>panel(`预言机X${i}`,640,350,3.8,2.08));
  const chain=panel('联盟链',1600,280,12.4,2.17);
  function text(ctx,value,x,y,size,color='#edfaff',weight=400){
    ctx.fillStyle=color;ctx.font=`${weight} ${size}px "Microsoft YaHei", sans-serif`;ctx.fillText(value,x,y);
  }
  function frame(p,active){
    const {ctx,w,h}=p;ctx.clearRect(0,0,w,h);
    const glass=ctx.createLinearGradient(0,0,w,h);
    glass.addColorStop(0,'rgba(14,49,69,.88)');glass.addColorStop(1,'rgba(6,30,49,.78)');
    ctx.beginPath();ctx.roundRect(8,8,w-16,h-16,30);ctx.fillStyle=glass;ctx.fill();
    ctx.strokeStyle=active?mint:'rgba(141,220,255,.60)';ctx.lineWidth=active?4:2;ctx.stroke();
    ctx.beginPath();ctx.roundRect(18,18,w-36,h-36,22);
    ctx.strokeStyle='rgba(160,240,255,.12)';ctx.lineWidth=1;ctx.stroke();
  }
  function chip(ctx,x,y,color,index){
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=color;ctx.lineWidth=3;
    ctx.beginPath();ctx.roundRect(-24,-24,48,48,8);ctx.stroke();
    for(let i=-1;i<=1;i++)for(const sign of [-1,1]){
      ctx.beginPath();ctx.moveTo(i*15,sign*25);ctx.lineTo(i*15,sign*37);ctx.stroke();
      ctx.beginPath();ctx.moveTo(sign*25,i*15);ctx.lineTo(sign*37,i*15);ctx.stroke();
    }
    if(index===0){
      ctx.beginPath();ctx.moveTo(5,-16);ctx.lineTo(-10,3);ctx.lineTo(1,3);ctx.lineTo(-5,17);ctx.lineTo(12,-3);ctx.lineTo(1,-3);ctx.stroke();
    }else if(index===1){
      ctx.beginPath();ctx.moveTo(0,-16);ctx.lineTo(15,-9);ctx.lineTo(12,9);ctx.lineTo(0,18);ctx.lineTo(-12,9);ctx.lineTo(-15,-9);ctx.closePath();ctx.stroke();
    }else{
      ctx.beginPath();ctx.moveTo(-12,5);ctx.lineTo(-3,13);ctx.lineTo(14,-11);ctx.stroke();
    }
    ctx.restore();
  }
  function draw(){
    const active=state.charging,fields=['充电电量校验','设备状态校验','RWAT奖励校验'];
    oracles.forEach((p,i)=>{
      frame(p,active&&state.stage<2);chip(p.ctx,74,78,active?mint:blue,i);
      text(p.ctx,`预言机 X${i+1}`,133,80,39,'#edfaff',600);
      text(p.ctx,`ORACLE / 0${i+1}`,134,112,17,blue);
      p.ctx.fillStyle='rgba(141,220,255,.16)';p.ctx.fillRect(38,145,564,1);
      text(p.ctx,fields[i],38,188,26,muted);
      const value=i===0?`${state.energy.toFixed(3)} kWh`:i===1?(active?'充电中 · 180 kW':'设备待命'):`+${Math.floor(state.reward||100)} RWAT`;
      text(p.ctx,value,38,239,36,mint,600);
      text(p.ctx,!active?'等待充电数据':state.stage===0?'接收充电桩数据…':state.stage===1?'校验通过 · 提交联盟链':'本批数据已确认',38,300,24,active?mint:muted);
      p.map.needsUpdate=true;
    });
    frame(chain,active&&state.stage===2);
    const c=chain.ctx;c.strokeStyle=mint;c.lineWidth=3;
    for(const [x,y] of [[76,110],[126,80],[126,140]]){
      c.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;c.lineTo(x+18*Math.cos(a),y+18*Math.sin(a));}c.closePath();c.stroke();
    }
    for(const y of [80,140]){c.beginPath();c.moveTo(94,110);c.lineTo(108,y);c.stroke();}
    text(c,'联盟链',185,106,53,'#edfaff',600);text(c,'CONSORTIUM CHAIN',187,144,21,blue);
    text(c,'预言机共识',555,80,25,muted);text(c,state.confirmed?'3 / 3 已验证':'等待验证',555,125,34,mint,600);
    text(c,'模拟区块高度',902,80,25,muted);text(c,`#${208600+state.confirmed}`,902,125,34,'#edfaff',600);
    text(c,'交易所已接收',1254,80,25,muted);text(c,`${state.delivered} 批`,1254,125,34,mint,600);
    c.fillStyle='rgba(141,220,255,.16)';c.fillRect(45,173,1510,1);
    text(c,active?(state.stage===2?'数据已入块  →  正在同步交易所 K 线图':'接收三路预言机校验结果'):'充电后自动启动数据链路',48,230,30,active?mint:muted);
    text(c,'本地模拟 · 非真实上链',1222,230,23,muted);chain.map.needsUpdate=true;
  }
  const shellMat=new THREE.MeshBasicMaterial({color:0x66ddeb,transparent:true,opacity:.17,depthWrite:false,depthTest:false});
  const coreMat=new THREE.MeshBasicMaterial({color:0x65daca,transparent:true,opacity:.48,depthWrite:false,depthTest:false,toneMapped:false});
  const pulseMat=new THREE.MeshBasicMaterial({color:0xb0ffe5,transparent:true,depthWrite:false,depthTest:false,toneMapped:false});
  const links=Array.from({length:7},(_,i)=>{
    const shell=new THREE.Mesh(new THREE.BufferGeometry(),shellMat),core=new THREE.Mesh(new THREE.BufferGeometry(),coreMat);
    const packets=new THREE.InstancedMesh(new THREE.SphereGeometry(.072,8,6),pulseMat,7);packets.frustumCulled=false;
    const arrow=new THREE.Mesh(new THREE.ConeGeometry(.13,.32,8),pulseMat);
    shell.renderOrder=9;core.renderOrder=10;packets.renderOrder=11;arrow.renderOrder=11;
    group.add(shell,core,packets,arrow);
    return {shell,core,packets,arrow,stage:i<3?0:i<6?1:2,curve:null,signature:[]};
  });
  const point=(x,y)=>anchor.clone().addScaledVector(right,x).addScaledVector(up,y);
  function update(dt,camera,charging,reward=100,station=null){
    state={...flow.update(dt,charging),reward};
    if(state.arrivals)onArrival(state.arrivals,state.delivered);
    right.set(1,0,0).applyQuaternion(camera.quaternion);up.set(0,1,0).applyQuaternion(camera.quaternion);
    if(!station)return state;
    station.updateWorldMatrix(true,false);
    anchor.copy(station.localToWorld(new THREE.Vector3(0,5.26,0)));
    uplink.position.copy(station.localToWorld(new THREE.Vector3(0,3.09,0)));
    elapsed+=dt;
    const pulse=charging?.5+.5*Math.sin(elapsed*5):.15;
    orb.material.emissiveIntensity=1.8+pulse*2;
    glow.material.opacity=.45+pulse*.35;
    ring.scale.setScalar(1+pulse*.15);
    const source=uplink.position.clone().add(new THREE.Vector3(0,.24,0));
    oracles.forEach((p,i)=>p.sprite.position.copy(point((i-1)*4.4,4.5)));
    chain.sprite.position.copy(point(0,8.5));appCard.position.copy(point(-10.15,4.05));
    const endpoints=[
      ...oracles.map(p=>[source.clone(),p.sprite.position.clone().addScaledVector(up,-1.04)]),
      ...oracles.map((p,i)=>[p.sprite.position.clone().addScaledVector(up,1.04),point((i-1)*3.3,7.415)]),
      [point(-6.2,8.5),appCard.position.clone().addScaledVector(right,2.9)],
    ];
    links.forEach((link,i)=>{
      const [start,end]=endpoints[i],signature=[...start.toArray(),...end.toArray()];
      if(!link.curve||signature.some((n,k)=>Math.abs(n-link.signature[k])>.002)){
        link.signature=signature;
        const bend=i===6?right.clone().multiplyScalar(-1.8):up.clone().multiplyScalar(start.distanceTo(end)*.48);
        link.curve=new THREE.CubicBezierCurve3(start,start.clone().add(bend),end.clone().sub(bend),end);
        for(const [mesh,radius] of [[link.shell,.095],[link.core,.025]]){
          mesh.geometry.dispose();mesh.geometry=new THREE.TubeGeometry(link.curve,32,radius,6,false);
        }
        link.arrow.position.copy(link.curve.getPoint(.87));
        link.arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),link.curve.getTangent(.87));
      }
      link.packets.visible=charging&&state.stage===link.stage;
      link.arrow.scale.setScalar(charging&&state.stage===link.stage?1.2:.75);
      if(link.packets.visible){
        for(let tail=0;tail<7;tail++){
          dummy.position.copy(link.curve.getPoint(Math.max(0,state.progress-tail*.018)));
          dummy.scale.setScalar(1-tail*.11);dummy.updateMatrix();link.packets.setMatrixAt(tail,dummy.matrix);
        }
        link.packets.instanceMatrix.needsUpdate=true;
      }
    });
    paintAge+=dt;const key=`${charging}/${state.stage}/${state.delivered}`;
    if(paintAge>.15||key!==lastKey){paintAge=0;lastKey=key;draw();}
    return state;
  }
  draw();
  return {update,reset(){flow.reset();state=flow.update(0,false);lastKey='';draw();}};
}
