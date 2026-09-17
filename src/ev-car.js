import * as THREE from 'three';
import {materials as m,mesh,rounded,tube,rod} from './assets.js';

// Unbadged Model 3 inspired sedan. Metres, +Y up, front = -Z.
// The existing rear-left socket and wheelbase are retained for charging motion.
function surface(parent,rows,columns,sample,material){
  const vertices=[],indices=[];
  for(let r=0;r<=rows;r++)for(let c=0;c<=columns;c++)vertices.push(...sample(r/rows,c/columns));
  for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){
    const a=r*(columns+1)+c,b=a+columns+1;
    indices.push(a,b,a+1,b,b+1,a+1);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  return mesh(parent,geometry,material);
}
function profile(points){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal');
  return t=>curve.getPoint(t);
}
export function createCar(){
  const car=new THREE.Group();car.name='Unbadged electric sport sedan · sculpted body';
  const trim=new THREE.MeshStandardMaterial({color:0x131b23,metalness:.55,roughness:.27});
  const body=m.pearl.clone();body.roughness=.21;body.clearcoat=1;body.side=THREE.DoubleSide;
  const glass=new THREE.MeshPhysicalMaterial({color:0x101e2b,metalness:.35,roughness:.12,clearcoat:1,side:THREE.DoubleSide});
  const paintProfile=profile([
    [-2.35,.66,.68],[-2.23,.85,.77],[-1.92,.941,.855],[-1.43,.947,.925],
    [-1,.92,.953],[-.25,.918,.977],[.55,.928,.986],[1.37,.966,1.00],
    [1.87,.947,.99],[2.20,.852,.927],[2.35,.72,.818],
  ]);
  // Continuous curved shell with actual raised wheel openings on both sides.
  surface(car,100,64,(u,v)=>{
    const p=paintProfile(u),angle=v*Math.PI*2;
    const x=p.y*Math.sign(Math.cos(angle))*Math.abs(Math.cos(angle))**.66;
    let y=.27+(p.z-.27)*(.5+.5*Math.sign(Math.sin(angle))*Math.abs(Math.sin(angle))**.74);
    const distance=Math.min(Math.abs(p.x+1.435),Math.abs(p.x-1.435));
    if(distance<.425){
      const arch=.355+Math.sqrt(.425**2-distance**2);
      const outer=THREE.MathUtils.smoothstep(Math.abs(x),.70,.89);
      y=THREE.MathUtils.lerp(y,Math.max(y,arch),outer);
    }
    return [x,y,p.x];
  },body);
  rounded(car,1.52,.12,3.65,trim,0,.27,0,.05);
  for(const z of [-2.35,2.35])rounded(car,1.27,.17,.027,body,0,z<0?.52:.64,z,.065);
  // Panoramic roof, curved windshield and tapered rear glass, with white pillars.
  const roofProfile=profile([
    [-1.25,.764,.96],[-.95,.74,1.15],[-.50,.671,1.419],
    [-.03,.66,1.462],[.49,.687,1.422],[.95,.747,1.232],[1.48,.807,1.014],
  ]);
  surface(car,60,40,(u,v)=>{
    const p=roofProfile(u),lateral=(v-.5)*2,fraction=Math.abs(lateral);
    const belt=.95+(p.x+1.25)/2.73*.05;
    const beltWidth=.793+(p.x+1.25)/2.73*.045;
    if(fraction<=.77)return [lateral/.77*p.y,p.z-.014*(fraction/.77)**2,p.x];
    const side=(fraction-.77)/.23;
    return [Math.sign(lateral)*THREE.MathUtils.lerp(p.y,beltWidth,side),
      THREE.MathUtils.lerp(p.z-.014,belt,side**.82),p.x];
  },glass);
  for(const s of [-1,1]){
    // Structural rails trace the glass edge. B-pillar splits the frameless windows.
    const rail=Array.from({length:33},(_,i)=>{
      const p=roofProfile(i/32);return [s*p.y,p.z-.012,p.x];
    });
    tube(car,rail,.023,body);
    tube(car,[[s*.792,.963,-1.24],[s*.845,.989,-.15],[s*.867,1.005,.71],[s*.832,1.014,1.48]],.017,trim);
    rod(car,[s*.849,.989,.17],[s*.671,1.445,.17],.031,trim);
    // Door seams, flush handles and sculpted lower sills.
    tube(car,[[s*.915,.942,-1.04],[s*.926,.58,-1.02],[s*.876,.375,-.83],[s*.876,.375,.22],[s*.937,.63,.23],[s*.932,.963,.23]],.0045,trim);
    tube(car,[[s*.932,.963,.23],[s*.937,.63,.23],[s*.881,.385,.43],[s*.89,.405,.99],[s*.957,.90,1.24]],.0045,trim);
    rounded(car,.025,.03,.235,trim,s*.932,.899,-.04,.012);
    rounded(car,.025,.03,.224,trim,s*.948,.923,1.04,.012);
    rounded(car,.033,.065,1.65,body,s*.895,.33,0,.02);
    rounded(car,.069,.027,1.5,trim,s*.909,.279,0,.008);
    // Folded mirrors: white caps, black stalks, separate reflective rear faces.
    rod(car,[s*.805,.99,-.99],[s*1.001,1.029,-1.07],.022,trim);
    const mirror=mesh(car,new THREE.SphereGeometry(1,24,12),body,s*1.063,1.038,-1.079);
    mirror.scale.set(.157,.066,.158);
    rounded(car,.224,.068,.012,glass,s*1.067,1.031,-.926,.025);
    // Wheel-arch lips and dark inner liners leave the wheels visibly separated.
    for(const z of [-1.435,1.435]){
      const lip=mesh(car,new THREE.TorusGeometry(.418,.015,8,48,Math.PI),body,s*.963,.355,z);
      lip.rotation.y=Math.PI/2;
      const lining=mesh(car,new THREE.TorusGeometry(.4,.023,8,48,Math.PI),trim,s*.94,.355,z);
      lining.rotation.y=Math.PI/2;
    }
    // Slim, swept-back Highland-style headlights with independent projectors.
    tube(car,[[s*.49,.732,-2.291],[s*.73,.777,-2.185],[s*.883,.819,-1.99]],.043,trim);
    tube(car,[[s*.488,.753,-2.306],[s*.728,.797,-2.199],[s*.887,.835,-1.987]],.013,m.led);
    for(const t of [.0,.07]){
      const lens=mesh(car,new THREE.SphereGeometry(.026,12,8),m.led,s*(.68+t),.757+t*.15,-2.218+t*.45);
      lens.scale.set(1,.52,.7);
    }
    // Crisp C-shaped rear clusters and body-colour shoulder.
    tube(car,[[s*.928,.88,1.97],[s*.836,.865,2.237],[s*.554,.85,2.355]],.022,m.red);
    tube(car,[[s*.836,.856,2.239],[s*.826,.741,2.277],[s*.635,.716,2.34]],.021,m.red);
    rounded(car,.19,.024,.032,m.red,s*.67,.421,2.296,.008);
    // Bonnet creases follow the painted surface instead of a logo or badge.
    tube(car,[[s*.49,.79,-2.16],[s*.59,.878,-1.79],[s*.67,.935,-1.40]],.004,body);
  }
  rounded(car,1.29,.069,.024,trim,0,.426,-2.333,.022);
  rounded(car,1.57,.038,.12,trim,0,.316,-2.205,.017);
  rounded(car,.46,.105,.024,trim,0,.579,-2.379,.012);
  rounded(car,.46,.113,.024,trim,0,.624,2.379,.012);
  rounded(car,1.37,.105,.105,trim,0,.349,2.239,.03);
  tube(car,[[-.69,.967,2.02],[0,.982,2.13],[.69,.967,2.02]],.019,body);
  for(const x of [-.71,-.35,.35,.71]){
    mesh(car,new THREE.SphereGeometry(.015,10,8),trim,x,.57,-2.32+Math.abs(x)*.026);
    mesh(car,new THREE.SphereGeometry(.015,10,8),trim,x,.53,2.33-Math.abs(x)*.024);
  }
  const wheels=[],steering=[];
  for(const x of [-.952,.952])for(const z of [-1.435,1.435]){
    const suspension=new THREE.Group();suspension.position.set(x,.355,z);car.add(suspension);
    if(z<0)steering.push(suspension);
    const wheel=new THREE.Group();suspension.add(wheel);wheels.push(wheel);
    const s=Math.sign(x),out=s*.095;
    const tire=mesh(wheel,new THREE.CylinderGeometry(.353,.353,.205,48),m.tire);tire.rotation.z=Math.PI/2;
    const sidewall=mesh(wheel,new THREE.TorusGeometry(.285,.048,12,48),m.tire,out,0,0);sidewall.rotation.y=Math.PI/2;
    const rim=mesh(wheel,new THREE.CylinderGeometry(.25,.25,.025,48),trim,out+s*.013,0,0);rim.rotation.z=Math.PI/2;
    const disc=mesh(wheel,new THREE.CylinderGeometry(.197,.197,.018,40),m.silver,out,0,0);disc.rotation.z=Math.PI/2;
    const edge=mesh(wheel,new THREE.TorusGeometry(.241,.009,8,48),m.silver,out+s*.029,0,0);edge.rotation.y=Math.PI/2;
    // Ten swept aero spokes, ventilated brake disc and fixed caliper.
    for(let i=0;i<10;i++){
      const a=i*Math.PI/5;
      const spoke=rounded(wheel,.031,.184,.044,i%2?trim:m.silver,out+s*.028,Math.cos(a)*.135,Math.sin(a)*.135,.012);
      spoke.rotation.x=a+.26;
      for(const r of [.152,.177]){
        const vent=mesh(wheel,new THREE.CylinderGeometry(.007,.007,.021,6),trim,out+s*.012,Math.cos(a+.3)*r,Math.sin(a+.3)*r);
        vent.rotation.z=Math.PI/2;
      }
    }
    rounded(suspension,.049,.14,.064,m.blue,out-s*.016,.06,.142,.012);
    const cap=mesh(wheel,new THREE.CylinderGeometry(.052,.052,.033,24),trim,out+s*.04,0,0);cap.rotation.z=Math.PI/2;
  }
  const reverseLights=new THREE.Group();car.add(reverseLights);reverseLights.visible=false;
  for(const s of [-1,1])rounded(reverseLights,.135,.034,.027,m.led,s*.63,.765,2.365,.009);
  // Exact socket transform used by the automatic gun insertion animation.
  rounded(car,.024,.126,.184,trim,-.957,.92,1.75,.022);
  const port=new THREE.Object3D();port.position.set(-.97,.92,1.75);car.add(port);
  return {group:car,wheels,steering,reverseLights,port,wheelRadius:.353,portSide:-1};
}
