import * as THREE from 'three';
import { materials as m, mesh, rounded, tube, rod, label, texture, createCharger, createBoat, createTurbine } from './assets.js';
import {createTree,createFlowerbed} from './landscape.js';
import {buildRingRoad} from './ring-road.js';

const surface=new THREE.MeshStandardMaterial({color:0x293e50,roughness:.88});
const paving=new THREE.MeshStandardMaterial({color:0xb4c9ce,roughness:.85});
const whitePaint=new THREE.MeshBasicMaterial({color:0xd5eeec});
const baySurface=new THREE.MeshStandardMaterial({color:0x204c5a,roughness:.8});
const grass=new THREE.MeshStandardMaterial({color:0x428772,roughness:1});
const foliage=new THREE.MeshStandardMaterial({color:0x569984,roughness:1});
const vec=(...a)=>new THREE.Vector3(...a);

export function buildWorld(scene) {
  const root=new THREE.Group();root.name='Coastal charging campus';scene.add(root);
  // Sea surrounds the elevated campus rather than occupying a strip on its roof.
  const waterUniforms={time:{value:0}};
  const waterMaterial=new THREE.ShaderMaterial({
    uniforms:waterUniforms,
    vertexShader:`
      uniform float time;
      varying vec3 world;
      void main(){
        vec3 p=position;
        p.z+=.09*sin(p.x*.33+time*.55)*cos(p.y*.4-time*.35);
        vec4 wp=modelMatrix*vec4(p,1.);
        world=wp.xyz;
        gl_Position=projectionMatrix*viewMatrix*wp;
      }`,
    fragmentShader:`
      uniform float time;
      varying vec3 world;
      void main(){
        float a=sin(world.x*.62+world.z*.9+time*.65);
        float b=sin(world.x*.31-world.z*.7-time*.4);
        float c=sin(world.x*2.3+world.z*2.0+time*.9);
        float pattern=a*.35+b*.4+c*.1;
        vec3 color=mix(vec3(.02,.17,.29),vec3(.04,.36,.48),.55+pattern*.23);
        float ribbon=pow(max(0.,sin(world.z*2.8+world.x*.41+a*1.4+b*.6+time*.45)),28.);
        float breakup=pow(max(0.,sin(world.x*.75+world.z*.23+sin(world.x*.13)*3.)),3.);
        color+=vec3(.13,.24,.27)*ribbon*breakup*.45;
        float distanceToCamera=length(world-cameraPosition);
        color=mix(color,vec3(.20,.37,.46),smoothstep(65.,170.,distanceToCamera));
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const water=mesh(scene,new THREE.PlaneGeometry(1800,1800,140,140),waterMaterial,0,-.64,0);
  water.rotation.x=-Math.PI/2;water.castShadow=water.receiveShadow=false;
  rounded(root,46,.8,27,m.white,0,-.2,0,.45);
  rounded(root,45.3,.18,26.3,paving,0,.26,0,.3);
  rounded(root,44,.055,8.5,surface,0,.385,5,.35);
  rounded(root,25,.055,8.8,surface,3,.385,-3.2,.25);
  // A real open entrance to every bay; no continuous curb crosses the entry.
  buildRingRoad(root);
  // Pedestrian apron, ocean promenade and planted traffic islands.
  rounded(root,44,.13,2.6,paving,0,.43,11.1,.22);
  rounded(root,44,.16,3.4,paving,0,.44,-10.5,.22);
  const chargers=[];
  for(let i=0;i<4;i++){
    const x=-6+i*6,z=-3.15;
    rounded(root,4.65,.021,7.55,baySurface,x,.428,z,.08);
    for(const side of [-1,1]) rounded(root,.092,.022,7.45,whitePaint,x+side*2.28,.451,z,.014);
    rounded(root,4.65,.022,.092,whitePaint,x,.451,z-3.72,.014);
    // Wheel stops and luminous head-of-bay strip.
    for(const offset of [-1.1,1.1]) {
      rounded(root,1.25,.16,.27,m.dark,x+offset,.52,-6.49,.045);
      rounded(root,.73,.013,.21,m.white,x+offset,.609,-6.49,.01);
    }
    rounded(root,4.5,.023,.065,m.teal,x,.449,-6.99,.018);
    const symbol=label(root,'ϟ',1.12,1.4,x,.456,-3.75,{color:'#b3ffec',font:142});
    symbol.rotation.x=-Math.PI/2;
    const number=label(root,`EV  0${i+1}`,2,.65,x,.456,-.67,{color:'#d7f3ec',font:59});
    number.rotation.x=-Math.PI/2;
    const unit=createCharger(i+1);
    unit.group.position.set(x+1.35,.45,-7.45);root.add(unit.group);
    // A short, protected charger plinth sits behind the wheel stops.
    rounded(root,2.2,.16,1.55,paving,x+1.35,.45,-7.45,.12);
    for(const dx of [-.85,.85]){
      mesh(root,new THREE.CylinderGeometry(.055,.055,.67,12),m.silver,x+1.35+dx,.89,-6.88);
      mesh(root,new THREE.CylinderGeometry(.058,.058,.075,12),m.teal,x+1.35+dx,1.1,-6.88);
    }
    chargers.push({...unit,x,z,index:i});
  }
  // Green islands are outside the traversable lane.
  for(const x of [-16,-6,5,16]){
    rounded(root,5.4,.22,1.1,m.white,x,.51,10,.35);
    rounded(root,5.13,.04,.88,grass,x,.64,10,.28);
    const plants=createFlowerbed(5,.8,x+80);plants.position.set(x,.66,10);root.add(plants);
  }
  for(const x of [-21,-9,9,21]){
    mesh(root,new THREE.CylinderGeometry(.052,.075,3.1,12),m.silver,x,2,11.2);
    rounded(root,.5,.09,.24,m.white,x,3.58,11.2,.04);
    rounded(root,.39,.02,.18,m.led,x,3.52,11.2,.008);
  }
  // Fine promenade railing with evenly spaced uprights and two horizontal rails.
  for(let x=-22;x<=22;x+=2.2)rod(root,[x,.4,-12.7],[x,1.23,-12.7],.029,m.white);
  for(const y of [.85,1.24])rod(root,[-22,y,-12.7],[22,y,-12.7],.031,m.white);
  for(let z=-12;z<3;z+=2)rod(root,[22.7,.4,z],[22.7,1.1,z],.03,m.white);
  // East railing leaves an opening to the marina at Z=-8.
  for(const y of [.79,1.12]) {
    rod(root,[22.7,y,-12.5],[22.7,y,-9.2],.027,m.white);
    rod(root,[22.7,y,-6.7],[22.7,y,2.7],.027,m.white);
  }
  buildLounge(root);
  const turbines=[];
  for(const [x,z,scale] of [[-18,-10.4,1.05],[-1,-10.8,.95],[17.8,-10.4,1.08]]){
    const turbine=createTurbine();turbine.group.scale.setScalar(scale);
    turbine.group.position.set(x,.55,z);root.add(turbine.group);turbines.push(turbine.rotor);
  }
  // Shortened outer finger leaves an open passage from the inner berth to sea.
  const pierStart=-9,pierEnd=-2;
  rounded(root,7.2,.22,2.1,m.wood,25.7,.24,-8,.08);
  rounded(root,2.0,.22,pierEnd-pierStart,m.wood,28.4,.24,(pierStart+pierEnd)/2,.08);
  for(let z=pierStart+.3;z<pierEnd;z+=.25)rounded(root,1.96,.014,.025,m.dark,28.4,.358,z,.005);
  for(let x=23;x<29;x+=.26)rounded(root,.025,.014,2.05,m.dark,x,.358,-8,.005);
  for(const z of [-8.3,-5,-2.4]) for(const x of [27.6,29.2]){
    mesh(root,new THREE.CylinderGeometry(.1,.14,1.7,10),m.wood,x,-.15,z);
    mesh(root,new THREE.CylinderGeometry(.15,.15,.12,16),m.white,x,.72,z);
    mesh(root,new THREE.CylinderGeometry(.11,.11,.09,16),m.teal,x,.64,z);
  }
  const boatData=[];
  for(const [x,z,sailing] of [[32,-2.4,false],[25.0,-3.2,true]]){
    const boat=createBoat(sailing);boat.position.set(x,-.48,z);scene.add(boat);
    const side=x>28?1:-1;
    const ropes=[];
    // Keep the bow mooring on the retained pier; no rope spans the new exit.
    for(const dz of [-1.8]){
      const shore=[28.4+side*.92,.53,z+dz];
      const boatPoint=[-side*.86,.58,dz];
      const end=vec(...boatPoint).add(boat.position);
      const rope=tube(scene,[shore,[(shore[0]+end.x)/2,.0,(shore[2]+end.z)/2],end.toArray()],.022,m.wood);
      ropes.push({rope,shore,boatPoint});
    }
    boatData.push({boat,x,z,phase:sailing?1.9:0,ropes});
  }
  const dockSign=label(root,'NEO MARINA',1.65,.4,28.4,.383,-6.5,{color:'#eaf6ed',font:55});
  dockSign.rotation.x=-Math.PI/2;
  return {root,waterUniforms,chargers,turbines,boatData};
}

function buildLounge(root) {
  rounded(root,10.5,.24,8.8,m.white,-16.2,.48,-4.7,.22);
  rounded(root,10,3.8,7.5,m.white,-16.2,2.49,-5.1,.22);
  rounded(root,10.4,.23,7.9,m.white,-16.2,4.47,-5.1,.16);
  rounded(root,9.8,.045,.055,m.teal,-16.2,4.23,-1.12,.015);
  // Dark transparent-looking glass stays legible instead of blooming white.
  for(let i=0;i<5;i++){
    rounded(root,1.67,2.6,.07,m.glass,-19.88+i*1.84,2.12,-1.319,.025);
    rounded(root,.045,2.7,.075,m.silver,-20.75+i*1.84,2.12,-1.275,.015);
    const warm=new THREE.MeshStandardMaterial({color:0xffd3a0,emissive:0xffb475,emissiveIntensity:.35});
    rounded(root,1.5,.07,.06,warm,-19.88+i*1.84,3.31,-1.267,.02);
  }
  const sign=label(root,'NEO ENERGY  /  能源驿站',8,.64,-16.2,3.94,-1.285,{color:'#245668',font:49});
  sign.name='Lounge sign';
  // Roof photovoltaic cells with a readable grid and brushed metal frame.
  for(let row=0;row<2;row++)for(let col=0;col<3;col++){
    const solar=new THREE.Group();solar.position.set(-19.3+col*3.05,4.75,-3.3-row*2.7);solar.rotation.x=-.13;root.add(solar);
    rounded(solar,2.55,.08,1.98,m.silver,0,0,0,.035);
    const cell=new THREE.MeshStandardMaterial({color:0x163e62,metalness:.5,roughness:.3});
    rounded(solar,2.42,.02,1.85,cell,0,.052,0,.015);
    for(let k=-2;k<=2;k++)rounded(solar,.012,.014,1.83,m.silver,k*.47,.066,0,.003);
    for(let k=-1;k<=1;k++)rounded(solar,2.4,.014,.012,m.silver,0,.066,k*.56,.003);
  }
  for(const [x,z] of [[-21,-.2],[-11,-.2],[-21.1,-9.6],[20,-6]]){
    rounded(root,1.1,.52,1.1,m.white,x,.63,z,.15);
    const tree=createTree(Math.round((x+40)*13+z*3));
    tree.position.set(x,.89,z);tree.scale.setScalar(.88);root.add(tree);
    const flowers=createFlowerbed(.9,.9,Math.round(x+50));
    flowers.position.set(x,.91,z);root.add(flowers);
  }
}
