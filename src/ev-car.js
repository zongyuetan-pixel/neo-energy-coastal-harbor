import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {materials as m,mesh,rounded} from './assets.js';

// Licensed, fully modelled sedan. See public/models/CREDITS.txt.
// Bake the imported transforms into metre-sized geometry: +Y up, front -Z.
export async function createCar(){
  const draco=new DRACOLoader().setDecoderPath('/draco/').setWorkerLimit(2);
  const loader=new GLTFLoader().setDRACOLoader(draco);
  let gltf;
  try{gltf=await loader.loadAsync('/models/electric-sedan.glb');}finally{draco.dispose();}
  const source=gltf.scene;source.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(source),center=box.getCenter(new THREE.Vector3());
  const scale=4.72/(box.max.z-box.min.z);
  const normalize=new THREE.Matrix4().makeScale(scale,scale,scale);
  normalize.setPosition(-center.x*scale,-box.min.y*scale,-center.z*scale);
  const car=new THREE.Group();car.name='Detailed unbadged electric sedan';
  const wheels=[],steering=[],wheelCenters=[];
  const frontZ=(-175.68-center.z)*scale,rearZ=(144.72-center.z)*scale;
  for(const z of [frontZ,rearZ])for(const side of [-1,1]){
    const pivot=new THREE.Group();pivot.position.set(side*96*scale,38*scale,z);car.add(pivot);
    if(z===frontZ)steering.push(pivot);
    const wheel=new THREE.Group();pivot.add(wheel);wheels.push(wheel);wheelCenters.push(pivot.position.clone());
  }
  const paint=m.pearl.clone();paint.color.set(0xf0f3f4);paint.metalness=.2;paint.roughness=.23;
  const materialCache=new Map();
  function material(original){
    if(materialCache.has(original.uuid))return materialCache.get(original.uuid);
    let result=original.clone();
    if(original.name==='Paint')result=paint;
    else if(/^glass/.test(original.name)){
      result=new THREE.MeshPhysicalMaterial({color:0x3a505c,metalness:.12,roughness:.16,
        clearcoat:1,transparent:true,opacity:.67,depthWrite:false,side:THREE.DoubleSide,envMapIntensity:.65});
    }else if(original.name==='movsteer_1.0.0'){
      // Remove the textured steering-wheel emblem without changing the wheel geometry.
      result.map=null;result.color.set(0x252a30);result.roughness=.7;
    }
    if(result.emissive)result.emissiveIntensity=.5;
    materialCache.set(original.uuid,result);return result;
  }
  // Bonnet/rear emblems, wheel emblems, old left-side flap and plate lettering.
  const omitted=new Set(['Object_448','Object_258','Object_458','Object_473','Object_255','Charge_Cap_GLOBAL001','Charge_Cap_GLOBAL.001']);
  const reverseLights=new THREE.Group();car.add(reverseLights);reverseLights.visible=false;
  let triangles=0;
  source.traverse(node=>{
    if(!node.isMesh||omitted.has(node.name)||node.parent?.name==='charge_dummy')return;
    const parentName=node.parent?.name||'';
    const geometry=node.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(normalize,node.matrixWorld));
    const mat=material(node.material);
    const add=(geo,parent)=>{
      const part=new THREE.Mesh(geo,mat);part.name=node.name;part.castShadow=true;part.receiveShadow=true;parent.add(part);
      triangles+=(geo.index?geo.index.count:geo.attributes.position.count)/3;return part;
    };
    if(/^wheels[_.]/.test(parentName)){
      // The source stores paired wheels in each mesh. Split the actual triangles
      // so all four detailed tires/rims roll and both front wheels steer.
      const pos=geometry.attributes.position,idx=geometry.index;
      const halves=[[],[]];
      for(let i=0;i<(idx?idx.count:pos.count);i+=3){
        const ids=[0,1,2].map(k=>idx?idx.getX(i+k):i+k);
        halves[ids.reduce((n,id)=>n+pos.getX(id),0)>0?1:0].push(...ids);
      }
      geometry.computeBoundingBox();const rear=geometry.boundingBox.getCenter(new THREE.Vector3()).z>0;
      halves.forEach((indices,side)=>{
        if(!indices.length)return;
        const index=(rear?2:0)+side,part=geometry.clone();part.setIndex(indices);part.translate(...wheelCenters[index].clone().negate().toArray());
        add(part,wheels[index]);
      });
      geometry.dispose();
    }else if(parentName.includes('lightrevese')){
      const lamp=add(geometry,reverseLights);lamp.material=m.led;
    }else add(geometry,car);
  });
  // Plain wheel caps cover any baked brand marks on the imported centre textures.
  for(let i=0;i<4;i++){
    const side=i%2?1:-1;
    const cap=mesh(wheels[i],new THREE.CylinderGeometry(.045,.045,.015,32),m.silver,side*.10,0,0);
    cap.rotation.z=Math.PI/2;
  }
  // Recessed right-rear socket with a hinged painted lid and separate contacts.
  car.updateMatrixWorld(true);
  const probe=new THREE.Raycaster(new THREE.Vector3(2,.91,1.81),new THREE.Vector3(-1,0,0));
  const bodyHit=probe.intersectObjects(car.children,true).find(hit=>hit.object.material===paint);
  const socketX=bodyHit?bodyHit.point.x+.014:.917;
  const port=new THREE.Object3D();port.position.set(socketX,.91,1.81);car.add(port);
  const inlet=new THREE.Group();inlet.position.copy(port.position);car.add(inlet);
  rounded(inlet,.026,.17,.21,m.dark,.002,0,0,.035);
  const rim=mesh(inlet,new THREE.TorusGeometry(.057,.006,10,32),m.silver,.018,0,0);rim.rotation.y=Math.PI/2;
  for(const [y,z] of [[.021,-.023],[.021,.023],[-.02,-.023],[-.02,.023],[.038,0]]){
    const contact=mesh(inlet,new THREE.CylinderGeometry(.006,.006,.012,12),m.silver,.022,y,z);contact.rotation.z=Math.PI/2;
  }
  const chargeDoor=new THREE.Group();chargeDoor.position.set(socketX+.032,1.012,1.81);car.add(chargeDoor);
  rounded(chargeDoor,.025,.195,.235,paint,0,-.09,0,.026);
  const state={group:car,wheels,steering,reverseLights,port,wheelRadius:38*scale,portSide:1,
    setPortOpen(open,dt){chargeDoor.rotation.z=THREE.MathUtils.damp(chargeDoor.rotation.z,open?1.5:0,7,dt);}};
  car.userData.model={source:'local-glb',triangles,parts:car.children.length};
  return state;
}
