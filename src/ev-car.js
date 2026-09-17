import * as THREE from 'three';
import {materials as m,mesh,rounded,tube,rod} from './assets.js';

// Unbadged Model 3 inspired sedan. Metres, +Y up, front = -Z.
// The existing rear-left socket and wheelbase are retained for charging motion.
function surface(parent,rows,columns,sample,material,flip=false){
  const vertices=[],indices=[];
  for(let r=0;r<=rows;r++)for(let c=0;c<=columns;c++)vertices.push(...sample(r/rows,c/columns));
  for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){
    const a=r*(columns+1)+c,b=a+columns+1;
    if(flip)indices.push(a,a+1,b,b,a+1,b+1);
    else indices.push(a,b,a+1,b,b+1,a+1);
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
  const body=m.pearl.clone();body.roughness=.24;body.clearcoat=1;body.clearcoatRoughness=.12;body.side=THREE.DoubleSide;
  const glass=new THREE.MeshPhysicalMaterial({color:0x111e28,metalness:.18,roughness:.18,clearcoat:.65,envMapIntensity:.55,side:THREE.DoubleSide});
  const rubber=new THREE.MeshStandardMaterial({color:0x14191e,roughness:.94});
  const seam=new THREE.MeshStandardMaterial({color:0x637176,roughness:.65});
  const paintProfile=profile([
    [-2.35,.67,.70],[-2.23,.85,.78],[-1.92,.938,.87],[-1.43,.959,.96],
    [-1,.931,.985],[-.25,.92,.99],[.55,.937,1.004],[1.37,.975,1.022],
    [1.87,.949,1.00],[2.20,.868,.928],[2.35,.735,.825],
  ]);
  const samples=Array.from({length:501},(_,i)=>paintProfile(i/500));
  function section(z){
    let low=0,high=samples.length-1;
    while(high-low>1){const mid=(low+high)>>1;if(samples[mid].x<z)low=mid;else high=mid;}
    const a=samples[low],b=samples[high];
    return a.clone().lerp(b,THREE.MathUtils.clamp((z-a.x)/(b.x-a.x),0,1));
  }
  const exponent=.48;
  function sideX(z,y){
    const p=section(z),q=THREE.MathUtils.clamp((y-(p.z+.27)/2)/((p.z-.27)/2),-.995,.995);
    return p.y*Math.pow(Math.max(0,1-Math.abs(q)**(2/exponent)),exponent/2);
  }
  function topY(z,x){
    const p=section(z),q=Math.min(.999,Math.abs(x)/p.y);
    return (p.z+.27)/2+(p.z-.27)/2*Math.pow(1-q**(2/exponent),exponent/2);
  }
  const sideLine=(side,points,radius=.003)=>{
    const path=profile(points.map(([z,y])=>[z,y,0]));
    return tube(car,Array.from({length:101},(_,i)=>{
      const p=path(i/100);return [side*(sideX(p.x,p.y)+.006),p.y,p.x];
    }),radius,seam);
  };
  // Continuous curved shell with actual raised wheel openings on both sides.
  surface(car,160,96,(u,v)=>{
    const p=paintProfile(u),angle=v*Math.PI*2;
    const x=p.y*Math.sign(Math.cos(angle))*Math.abs(Math.cos(angle))**exponent;
    let y=.27+(p.z-.27)*(.5+.5*Math.sign(Math.sin(angle))*Math.abs(Math.sin(angle))**exponent);
    const distance=Math.min(Math.abs(p.x+1.435),Math.abs(p.x-1.435));
    if(distance<.425){
      const arch=.355+Math.sqrt(.425**2-distance**2);
      const outer=THREE.MathUtils.smoothstep(Math.abs(x),.70,.89);
      y=THREE.MathUtils.lerp(y,Math.max(y,arch),outer);
    }
    return [x,y,p.x];
  },body,true);
  // Close both ends with curved painted fascia, rather than exposed shell edges.
  for(const z of [-2.35,2.35]){
    const p=section(z);
    surface(car,14,64,(u,v)=>{
      const a=v*Math.PI*2,r=u**.5;
      return [r*p.y*Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**exponent,
        (p.z+.27)/2+r*(p.z-.27)/2*Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**exponent,
        z+Math.sign(z)*.022*(1-r*r)];
    },body,z<0);
  }
  rounded(car,1.52,.12,3.65,trim,0,.27,0,.05);
  for(const z of [-2.35,2.35])rounded(car,1.27,.17,.027,body,0,z<0?.52:.64,z,.065);
  // Panoramic roof, curved windshield and tapered rear glass, with white pillars.
  const roofProfile=profile([
    [-1.24,.764,.989],[-.93,.729,1.197],[-.46,.658,1.441],
    [.04,.657,1.484],[.55,.688,1.421],[.99,.747,1.225],[1.48,.807,1.021],
  ]);
  surface(car,60,40,(u,v)=>{
    const p=roofProfile(u),lateral=(v-.5)*2,fraction=Math.abs(lateral);
    const belt=.965+(p.x+1.24)/2.72*.047;
    const beltWidth=.815+(p.x+1.24)/2.72*.035;
    if(fraction<=.77)return [lateral/.77*p.y,p.z-.014*(fraction/.77)**2,p.x];
    const side=(fraction-.77)/.23;
    return [Math.sign(lateral)*THREE.MathUtils.lerp(p.y,beltWidth,side),
      THREE.MathUtils.lerp(p.z-.014,belt,side),p.x];
  },glass);
  // Windshield seals, glass roof joints, and two low-profile wiper blades.
  for(const u of [0,.32,.70,1]){
    const p=roofProfile(u);
    tube(car,Array.from({length:19},(_,i)=>{
      const lateral=(i/18-.5)*2;return [p.y*lateral,p.z-.014*lateral*lateral+.002,p.x];
    }),u===0||u===1?.009:.004,trim);
  }
  for(const s of [-1,1]){
    tube(car,[[s*.08,1.010,-1.22],[s*.35,1.033,-1.19],[s*.68,1.044,-1.16]],.009,trim);
  }
  for(const s of [-1,1]){
    // Structural rails trace the glass edge. B-pillar splits the frameless windows.
    const rail=Array.from({length:33},(_,i)=>{
      const p=roofProfile(i/32);return [s*p.y,p.z-.012,p.x];
    });
    tube(car,rail,.027,body);
    tube(car,[[s*.815,.968,-1.24],[s*.825,.984,-.15],[s*.839,1.001,.71],[s*.85,1.014,1.48]],.012,trim);
    rod(car,[s*.839,.994,.17],[s*.665,1.468,.17],.026,trim);
    // Painted rear sail panel widens smoothly from the roof into the shoulder.
    surface(car,24,8,(u,v)=>{
      const p=roofProfile(.72+u*.28),belt=.965+(p.x+1.24)/2.72*.047;
      const width=.815+(p.x+1.24)/2.72*.035;
      const f=v*THREE.MathUtils.smoothstep(u,0,1);
      return [s*THREE.MathUtils.lerp(p.y,width,f)+s*.003,THREE.MathUtils.lerp(p.z-.012,belt,f)+.003,p.x];
    },body,s>0);
    // Door seams, flush handles and sculpted lower sills.
    sideLine(s,[[-1.04,.943],[-1.01,.75],[-.99,.53],[-.83,.385],[-.30,.377],[.20,.389],[.23,.63],[.23,.970]]);
    sideLine(s,[[.23,.970],[.23,.63],[.26,.395],[.65,.398],[.92,.42],[1.00,.66],[1.20,.89],[1.32,.981]]);
    rounded(car,.017,.028,.218,trim,s*(sideX(-.02,.92)+.007),.92,-.02,.01);
    rounded(car,.017,.028,.210,trim,s*(sideX(.94,.944)+.007),.944,.94,.01);
    rounded(car,.033,.065,1.65,body,s*.895,.33,0,.02);
    rounded(car,.069,.027,1.5,trim,s*.909,.279,0,.008);
    // Folded mirrors: white caps, black stalks, separate reflective rear faces.
    rod(car,[s*.805,.99,-.99],[s*1.001,1.029,-1.07],.022,trim);
    const mirror=mesh(car,new THREE.SphereGeometry(1,24,12),body,s*1.063,1.038,-1.079);
    mirror.scale.set(.157,.066,.158);
    rounded(car,.224,.068,.012,glass,s*1.067,1.031,-.926,.025);
    // Wheel-arch lips and dark inner liners leave the wheels visibly separated.
    for(const z of [-1.435,1.435]){
      const archPoints=Array.from({length:37},(_,i)=>{
        const a=i/36*Math.PI,zz=z+Math.cos(a)*.421,yy=.355+Math.sin(a)*.421;
        return [s*(sideX(zz,yy)+.008),yy,zz];
      });
      tube(car,archPoints,.012,body);
      const lining=mesh(car,new THREE.TorusGeometry(.4,.023,8,48,Math.PI),trim,s*.94,.355,z);
      lining.rotation.y=Math.PI/2;
    }
    // Slim, swept-back Highland-style headlights with independent projectors.
    const headlight=Array.from({length:25},(_,i)=>{
      const t=i/24,x=s*(.48+t*.395),z=-2.29+t*.30;
      return [x,topY(z,x)+.011,z];
    });
    tube(car,headlight,.036,trim);
    tube(car,headlight.map(([x,y,z])=>[x,y+.022,z-.009]),.009,m.led);
    for(const t of [.0,.07]){
      const x=s*(.68+t),z=-2.138+t*.75;
      const lens=mesh(car,new THREE.SphereGeometry(.019,16,10),m.led,x,topY(z,x)+.035,z);
      lens.scale.set(1,.52,.7);
    }
    // Crisp C-shaped rear clusters and body-colour shoulder.
    tube(car,[[s*.928,.88,1.97],[s*.836,.865,2.237],[s*.554,.85,2.355]],.022,m.red);
    tube(car,[[s*.836,.856,2.239],[s*.826,.741,2.277],[s*.635,.716,2.34]],.021,m.red);
    rounded(car,.19,.024,.032,m.red,s*.67,.421,2.296,.008);
    // Bonnet creases follow the painted surface instead of a logo or badge.
    const hoodPoints=Array.from({length:24},(_,i)=>{
      const z=-2.12+i/23*.90,x=s*(.48+i/23*.19);
      return [x,topY(z,x)+.003,z];
    });
    tube(car,hoodPoints,.003,seam);
    // Mirror turn repeater and a small side camera lens.
    tube(car,[[s*1.16,1.032,-1.12],[s*1.067,1.025,-1.20]],.006,m.led);
    const camera=mesh(car,new THREE.SphereGeometry(.014,12,8),glass,s*(sideX(-1.10,.88)+.012),.88,-1.10);
    camera.scale.x=.4;
  }
  // Inset intake slats, trunk shut line and rear diffuser vanes.
  for(let i=0;i<7;i++)rounded(car,.12,.023,.018,trim,(i-3)*.17,.426,-2.389,.004);
  const trunk=[];
  for(let i=0;i<=24;i++){
    const x=(i/24-.5)*1.48,z=1.68+.12*(1-(x/.74)**2);
    trunk.push([x,topY(z,x)+.003,z]);
  }
  tube(car,trunk,.003,seam);
  for(const x of [-.51,-.25,0,.25,.51])rounded(car,.018,.063,.17,trim,x,.313,2.22,.008);
  rounded(car,1.12,.069,.024,trim,0,.426,-2.378,.022);
  rounded(car,1.26,.038,.10,trim,0,.316,-2.327,.017);
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
    // Rounded tire shoulders and subtle circumferential tread grooves.
    const tireProfile=[
      [0,-.105],[.245,-.105],[.310,-.102],[.340,-.080],[.353,-.052],
      [.353,.052],[.340,.080],[.310,.102],[.245,.105],[0,.105],
    ].map(([r,a])=>new THREE.Vector2(r,a));
    const tire=mesh(wheel,new THREE.LatheGeometry(tireProfile,64),rubber);tire.rotation.z=Math.PI/2;
    for(const offset of [-.04,0,.04]){
      const groove=mesh(wheel,new THREE.TorusGeometry(.353,.0025,6,64),trim,offset,0,0);groove.rotation.y=Math.PI/2;
    }
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
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5;
      const bolt=mesh(wheel,new THREE.CylinderGeometry(.009,.009,.009,6),m.silver,out+s*.058,Math.cos(a)*.071,Math.sin(a)*.071);
      bolt.rotation.z=Math.PI/2;
    }
  }
  const reverseLights=new THREE.Group();car.add(reverseLights);reverseLights.visible=false;
  for(const s of [-1,1])rounded(reverseLights,.135,.034,.027,m.led,s*.63,.765,2.365,.009);
  // Exact socket transform used by the automatic gun insertion animation.
  rounded(car,.024,.126,.184,trim,-.957,.92,1.75,.022);
  const port=new THREE.Object3D();port.position.set(-.97,.92,1.75);car.add(port);
  return {group:car,wheels,steering,reverseLights,port,wheelRadius:.353,portSide:-1};
}
