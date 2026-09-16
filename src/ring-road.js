import * as THREE from 'three';
import {LOOP_LENGTH,loopPoint} from './route.js';
import {materials as m,mesh,rounded,label} from './assets.js';
import {createTree,createFlowerbed} from './landscape.js';

function ribbon(parent,fromOffset,toOffset,y,material,start=0,length=LOOP_LENGTH,segments=400){
  const positions=[],indices=[];
  for(let i=0;i<=segments;i++){
    const p=loopPoint(start+length*i/segments);
    for(const offset of [fromOffset,toOffset])positions.push(p.x-p.dz*offset,y,p.z+p.dx*offset);
    if(i<segments){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  return mesh(parent,geometry,material);
}
function wall(parent,offset,top,bottom,material){
  const positions=[],indices=[];
  for(let i=0;i<=400;i++){
    const p=loopPoint(LOOP_LENGTH*i/400),x=p.x-p.dz*offset,z=p.z+p.dx*offset;
    positions.push(x,top,z,x,bottom,z);
    if(i<400){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const mat=material.clone();mat.side=THREE.DoubleSide;mesh(parent,geometry,mat);
}
export function buildRingRoad(root){
  const road=new THREE.Group();road.name='Connected coastal loop road';root.add(road);
  const asphalt=new THREE.MeshStandardMaterial({color:0x293e50,roughness:.88});
  const marking=new THREE.MeshBasicMaterial({color:0xd3ece6});
  ribbon(road,-3.7,3.7,.345,m.white);
  ribbon(road,-3.2,3.2,.418,asphalt);
  // Foundations follow the curve closely, leaving the existing marina untouched.
  wall(road,-3.7,.345,-.6,m.white);wall(road,3.7,.345,-.6,m.white);
  // The existing station-facing straight stays open for access to all four bays.
  ribbon(road,-3.02,-2.94,.435,marking,40,LOOP_LENGTH-40,300);
  ribbon(road,2.94,3.02,.435,marking,40,LOOP_LENGTH-40,300);
  for(let s=4;s<LOOP_LENGTH;s+=4.5){
    ribbon(road,2.55,2.61,.436,marking,s,1.45,5);
  }
  // Small directional arrows stay on the asphalt and follow the actual route.
  for(let s=9;s<LOOP_LENGTH;s+=17){
    const p=loopPoint(s),arrow=label(road,'➜',1.45,.72,p.x,.443,p.z,{color:'#cbe4df',font:120});
    arrow.rotation.set(-Math.PI/2,0,-Math.atan2(p.dz,p.dx));
  }
  // Extend the garden only on the landward side of the original station.
  rounded(road,41,.8,8.6,m.white,0,-.2,17.65,.3);
  const soil=new THREE.MeshStandardMaterial({color:0x638575,roughness:1});
  rounded(road,40.2,.05,7.9,soil,0,.235,17.5,.4);
  const gardenPaving=new THREE.MeshStandardMaterial({color:0xb4c9ce,roughness:.85});
  rounded(road,38,.13,1.45,gardenPaving,0,.39,14.15,.2);
  const gardenName=label(road,'COASTAL LOOP   /   环海绿道',10,.7,0,.445,14.15,{color:'#416758',font:50});
  gardenName.rotation.x=-Math.PI/2;
  for(const x of [-17,-10,10,17]){
    const tree=createTree(150+x);tree.position.set(x,.3,17.1);tree.scale.setScalar(1.08);road.add(tree);
    const bed=createFlowerbed(3,1.25,400+x);bed.position.set(x,.285,18.4);road.add(bed);
  }
  for(const x of [-4,3]){
    const bed=createFlowerbed(4.5,2.1,300+x);bed.position.set(x,.285,17.5);road.add(bed);
    rounded(road,2.1,.13,.45,m.wood,x,.85,15.3,.045);
    for(const dx of [-.8,.8])rounded(road,.075,.5,.4,m.dark,x+dx,.56,15.3,.02);
  }
  return road;
}
