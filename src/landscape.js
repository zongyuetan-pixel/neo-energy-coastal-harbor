import * as THREE from 'three';
import {mesh,rod,texture} from './assets.js';

function random(seed){
  return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}
const barkMap=texture(128,256,ctx=>{
  ctx.fillStyle='#71604c';ctx.fillRect(0,0,128,256);
  const rand=random(901);
  for(let i=0;i<180;i++){
    const x=rand()*128,y=rand()*256;
    ctx.strokeStyle=i%2?'#8c7961':'#52473b';ctx.lineWidth=rand()*2+.5;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+rand()*3-1.5,y+10+rand()*70);ctx.stroke();
  }
});
barkMap.wrapS=barkMap.wrapT=THREE.RepeatWrapping;
const bark=new THREE.MeshStandardMaterial({map:barkMap,roughness:1});
const green=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.88,side:THREE.DoubleSide});
const leafMaterial=new THREE.MeshStandardMaterial({color:0x78976c,roughness:.95,side:THREE.DoubleSide});
// Curved, pointed leaves with a raised midrib, rather than opaque canopy balls.
const leafGeometry=new THREE.BufferGeometry();
leafGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
  0,0,0, -.07,.025,.09, 0,.04,.13, .07,.025,.09,
  -.065,.025,.19,0,.052,.21,.065,.025,.19,0,.025,.32,
],3));
leafGeometry.setIndex([0,1,2,0,2,3,1,4,5,1,5,2,2,5,6,2,6,3,4,7,5,5,7,6]);
leafGeometry.computeVertexNormals();
const dummy=new THREE.Object3D(),color=new THREE.Color();
function branch(parent,a,b,base,tip){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
  const result=mesh(parent,new THREE.CylinderGeometry(tip,base,start.distanceTo(end),8),bark);
  result.position.copy(start).add(end).multiplyScalar(.5);
  result.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());
}
export function createTree(seed=1){
  const rand=random(seed),group=new THREE.Group();group.name='Branched coastal broadleaf tree';
  branch(group,[0,0,0],[.07,1.25,.03],.14,.09);
  branch(group,[.07,1.25,.03],[-.05,2.42,.04],.09,.035);
  const tips=[];
  for(let i=0;i<9;i++){
    const angle=i*2.4+rand()*.4,y=1.12+i*.13;
    const spread=.48+rand()*.45;
    const end=[Math.cos(angle)*spread,y+.6+rand()*.32,Math.sin(angle)*spread];
    branch(group,[.04,y,0],end,.044,.015);
    for(let j=0;j<3;j++){
      const a=angle+(j-1)*.7;
      const tip=[end[0]+Math.cos(a)*(.28+rand()*.16),end[1]+.2+rand()*.38,end[2]+Math.sin(a)*(.28+rand()*.16)];
      branch(group,end,tip,.015,.005);tips.push(tip);
    }
  }
  tips.push([0,2.85,0],[.15,2.66,.23]);
  const count=tips.length*42;
  const leaves=new THREE.InstancedMesh(leafGeometry,leafMaterial,count);group.add(leaves);
  leaves.castShadow=leaves.receiveShadow=true;
  let k=0;
  for(const tip of tips)for(let j=0;j<42;j++){
    const a=rand()*Math.PI*2,r=Math.sqrt(rand())*.4;
    dummy.position.set(tip[0]+Math.cos(a)*r,tip[1]+(rand()-.35)*.46,tip[2]+Math.sin(a)*r);
    dummy.rotation.set(rand()*1.9-.8,rand()*Math.PI*2,rand()*1.2-.6);
    dummy.scale.setScalar(.76+rand()*.76);dummy.updateMatrix();leaves.setMatrixAt(k,dummy.matrix);
    color.setHSL(.26+rand()*.105,.27+rand()*.24,.2+rand()*.13);leaves.setColorAt(k++,color);
  }
  return group;
}

export function createFlowerbed(width,depth,seed=2){
  const rand=random(seed),group=new THREE.Group();group.name='Grasses, leaves and coastal flowers';
  const count=Math.round(width*depth*105);
  const blades=new THREE.BufferGeometry();
  blades.setAttribute('position',new THREE.Float32BufferAttribute([
    -.018,0,0,.018,0,0,-.013,.17,.02,.013,.17,.02,0,.35,.07,
  ],3));
  blades.setIndex([0,1,2,1,3,2,2,3,4]);blades.computeVertexNormals();
  const grass=new THREE.InstancedMesh(blades,leafMaterial,count);group.add(grass);grass.castShadow=true;
  for(let i=0;i<count;i++){
    dummy.position.set((rand()-.5)*width,0,(rand()-.5)*depth);
    dummy.rotation.set(0,rand()*Math.PI*2,(rand()-.5)*.4);
    dummy.scale.set(1,.5+rand()*.85,1);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);
    color.setHSL(.22+rand()*.13,.35,.22+rand()*.14);grass.setColorAt(i,color);
  }
  const flowers=Math.round(width*depth*9),petals=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,4),green,flowers*6);
  group.add(petals);
  const stems=new THREE.InstancedMesh(new THREE.CylinderGeometry(.008,.011,1,5),green,flowers);group.add(stems);
  const colors=[0xeee5d1,0xdba4b2,0xd5c0eb,0xf0d29a];
  for(let i=0;i<flowers;i++){
    const x=(rand()-.5)*width,z=(rand()-.5)*depth,h=.2+rand()*.25;
    dummy.position.set(x,h/2,z);dummy.rotation.set(0,0,0);dummy.scale.set(1,h,1);dummy.updateMatrix();
    stems.setMatrixAt(i,dummy.matrix);stems.setColorAt(i,color.set(0x3e7148));
    const petalColor=colors[i%colors.length];
    for(let j=0;j<6;j++){
      const a=j*Math.PI/3;
      dummy.position.set(x+Math.cos(a)*.033,h,z+Math.sin(a)*.033);
      dummy.rotation.set(.2,a,0);dummy.scale.set(.024,.012,.043);dummy.updateMatrix();
      petals.setMatrixAt(i*6+j,dummy.matrix);petals.setColorAt(i*6+j,color.set(petalColor));
    }
  }
  return group;
}
