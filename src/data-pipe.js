import * as THREE from 'three';

export function createDataPipe(scene,appCard,chargeCard){
  const group=new THREE.Group();group.name='Charging rewards to CEX data channel';scene.add(group);
  const shell=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({
    color:0x39b4c6,transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide,
  }));
  const core=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({
    color:0x0799b4,transparent:true,opacity:.85,depthWrite:false,toneMapped:false,
  }));
  group.add(shell,core);
  const pulseMaterial=new THREE.MeshBasicMaterial({color:0x9bffdf,toneMapped:false});
  const packets=new THREE.InstancedMesh(new THREE.SphereGeometry(.078,12,8),pulseMaterial,28);group.add(packets);
  packets.frustumCulled=false;
  const socketMaterial=new THREE.MeshBasicMaterial({color:0x93ffe0,toneMapped:false});
  const sockets=[0,1].map(()=>{
    const socket=new THREE.Mesh(new THREE.TorusGeometry(.17,.028,8,32),socketMaterial);group.add(socket);return socket;
  });
  let curve=null,lastStart=new THREE.Vector3(1e6,0,0),lastEnd=lastStart.clone(),flow=0;
  const right=new THREE.Vector3(),up=new THREE.Vector3(),start=new THREE.Vector3(),end=new THREE.Vector3();
  const dummy=new THREE.Object3D();
  function update(dt,camera,charging){
    right.set(1,0,0).applyQuaternion(camera.quaternion);
    up.set(0,1,0).applyQuaternion(camera.quaternion);
    // These attachment points stay on the edges of the camera-facing cards.
    start.copy(chargeCard.position).addScaledVector(right,-chargeCard.scale.x*.49);
    end.copy(appCard.position).addScaledVector(right,appCard.scale.x*.49).addScaledVector(up,-1.7);
    if(!curve||start.distanceToSquared(lastStart)+end.distanceToSquared(lastEnd)>.0002){
      const reach=Math.min(1.3,start.distanceTo(end)*.25);
      curve=new THREE.CubicBezierCurve3(start.clone(),start.clone().addScaledVector(right,-reach).addScaledVector(up,-.55),
        end.clone().addScaledVector(right,reach).addScaledVector(up,-.55),end.clone());
      for(const [object,radius] of [[shell,.14],[core,.04]]){
        object.geometry.dispose();object.geometry=new THREE.TubeGeometry(curve,48,radius,10,false);
      }
      lastStart.copy(start);lastEnd.copy(end);
    }
    // Four packets, each with a short fading tail, travel toward the app card.
    flow+=dt*(charging?.30:.12);
    for(let packet=0;packet<4;packet++)for(let tail=0;tail<7;tail++){
      const t=((flow+packet/4-tail*.008)%1+1)%1;
      dummy.position.copy(curve.getPointAt(t));
      dummy.scale.setScalar(1-tail*.11);dummy.updateMatrix();
      packets.setMatrixAt(packet*7+tail,dummy.matrix);
    }
    packets.instanceMatrix.needsUpdate=true;
    sockets[0].position.copy(start);sockets[1].position.copy(end);
    sockets.forEach(socket=>{
      socket.quaternion.copy(camera.quaternion);
      socket.scale.setScalar(1+Math.sin(flow*17)*.12);
    });
  }
  return {update};
}
