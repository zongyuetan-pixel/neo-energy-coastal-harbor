import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// All assets use metres, Y-up, with the car's nose pointing toward -Z.
export const materials = {
  pearl: new THREE.MeshPhysicalMaterial({ color: 0xf5f7f5, roughness: .25, metalness: .28, clearcoat: 1, clearcoatRoughness: .2 }),
  white: new THREE.MeshStandardMaterial({ color: 0xe8f0ed, roughness: .55 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x087bbf, roughness: .3, metalness: .35 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x112e40, roughness: .4, metalness: .3 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x123345, roughness: .12, metalness: .52, clearcoat: 1 }),
  tire: new THREE.MeshStandardMaterial({ color: 0x151b22, roughness: .85 }),
  silver: new THREE.MeshStandardMaterial({ color: 0xaebfc6, roughness: .22, metalness: .8 }),
  teal: new THREE.MeshStandardMaterial({ color: 0x56e2d6, emissive: 0x33ddcb, emissiveIntensity: 1.2, roughness: .4 }),
  led: new THREE.MeshStandardMaterial({ color: 0xe8ffff, emissive: 0x9eedff, emissiveIntensity: 2 }),
  red: new THREE.MeshStandardMaterial({ color: 0xfe555d, emissive: 0xfb2939, emissiveIntensity: 1.5 }),
  wood: new THREE.MeshStandardMaterial({ color: 0xab8870, roughness: .88 }),
};

export function mesh(parent, geometry, material, x=0, y=0, z=0) {
  const result = new THREE.Mesh(geometry, material);
  result.position.set(x,y,z);
  result.castShadow = result.receiveShadow = true;
  parent.add(result);
  return result;
}
export function rounded(parent, w,h,d, material, x=0,y=0,z=0, radius=.08) {
  return mesh(parent,new RoundedBoxGeometry(w,h,d,3,Math.min(radius,w/2,h/2,d/2)),material,x,y,z);
}
export function tube(parent, points, radius, material, closed=false) {
  const curve = new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed);
  return mesh(parent,new THREE.TubeGeometry(curve,Math.max(16,points.length*8),radius,8,closed),material);
}
export function rod(parent, a,b,radius,material) {
  const start=new THREE.Vector3(...a), end=new THREE.Vector3(...b);
  const result=mesh(parent,new THREE.CylinderGeometry(radius,radius,start.distanceTo(end),10),material);
  result.position.copy(start).add(end).multiplyScalar(.5);
  result.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());
  return result;
}
export function face(parent, points, material) {
  const vertices=[];
  for(let i=1;i<points.length-1;i++) vertices.push(...points[0],...points[i],...points[i+1]);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.computeVertexNormals();
  return mesh(parent,geometry,material);
}
export function texture(width,height,draw) {
  const canvas=document.createElement('canvas');
  canvas.width=width; canvas.height=height;
  draw(canvas.getContext('2d'),width,height);
  const result=new THREE.CanvasTexture(canvas);
  result.colorSpace=THREE.SRGBColorSpace;
  return result;
}
export function label(parent, text,w,h,x,y,z,{color='#c6eee9', background=null,font=48}={}) {
  const map=texture(768,Math.max(64,Math.round(768*h/w)),(ctx,tw,th)=>{
    if(background){ctx.fillStyle=background;ctx.fillRect(0,0,tw,th);}
    ctx.fillStyle=color;ctx.font=`600 ${font}px "Microsoft YaHei", sans-serif`;
    const size=Math.min(th*.69,font*tw*.87/Math.max(ctx.measureText(text).width,1));
    ctx.font=`600 ${size}px "Microsoft YaHei", sans-serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,tw/2,th/2);
  });
  return mesh(parent,new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,side:THREE.DoubleSide}),x,y,z);
}

// A smooth body loft gives the EV a continuous curved silhouette.
function loft(parent, sections, material, exponent=.62) {
  const pos=[],indices=[],segments=40;
  for(const [z,width,bottom,top] of sections){
    for(let i=0;i<=segments;i++){
      const a=i/segments*Math.PI*2, c=Math.cos(a), s=Math.sin(a);
      pos.push(width*Math.sign(c)*Math.pow(Math.abs(c),exponent),
        (bottom+top)/2+(top-bottom)/2*Math.sign(s)*Math.pow(Math.abs(s),exponent),z);
    }
  }
  for(let j=0;j<sections.length-1;j++) for(let i=0;i<segments;i++){
    const a=j*(segments+1)+i,b=a+segments+1;
    indices.push(a,a+1,b,b,a+1,b+1);
  }
  // Close the bow and stern so the assets are viewable from any angle.
  for(const row of [0,sections.length-1]){
    const [z,,bottom,top]=sections[row], center=pos.length/3;
    pos.push(0,(bottom+top)/2,z);
    for(let i=0;i<segments;i++){
      const a=row*(segments+1)+i;
      if(row===0)indices.push(center,a+1,a);else indices.push(center,a,a+1);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  return mesh(parent,geometry,material);
}

export function createCar() {
  const car=new THREE.Group(); car.name='Unbadged Model 3 inspired white sedan';
  const m=materials;
  // Long, low sedan proportions, smooth closed nose and a sweeping glass roof.
  // Bodywork is deliberately unbadged: no Tesla emblem or other brand lettering.
  loft(car,[
    [-2.36,.62,.36,.64],[-2.29,.82,.3,.76],[-2.06,.93,.29,.86],
    [-1.54,.944,.28,.93],[-1.03,.915,.27,.955],[-.5,.905,.27,.99],
    [.3,.916,.27,1.015],[1.04,.935,.28,1.015],[1.56,.955,.29,1.025],
    [2.02,.903,.32,1.015],[2.29,.815,.36,.92],[2.35,.68,.4,.83],
  ],m.pearl,.69);
  rounded(car,1.65,.1,3.55,m.dark,0,.29,0,.04);
  loft(car,[
    [-1.31,.765,.926,.95],[-1.12,.771,.934,1.075],[-.72,.722,.96,1.325],
    [-.36,.665,.98,1.433],[.02,.661,.99,1.447],[.46,.68,.99,1.426],
    [.83,.732,.993,1.314],[1.19,.785,1.0,1.135],[1.63,.811,1.0,1.022],
  ],m.glass,.86);
  const trim=new THREE.MeshStandardMaterial({color:0x10151a,metalness:.5,roughness:.32});
  rounded(car,1.52,.075,.14,trim,0,.337,-2.205,.025);
  rounded(car,1.21,.069,.029,trim,0,.454,-2.338,.02);
  rounded(car,.49,.105,.022,m.dark,0,.555,-2.353,.015);
  for(const s of [-1,1]){
    // Thin white A/C pillars, black window surround and panoramic glass roof.
    tube(car,[[s*.79,.975,-1.24],[s*.737,1.24,-.85],[s*.65,1.43,-.36],[s*.669,1.434,.39],[s*.756,1.225,1.02],[s*.837,1.025,1.55]],.027,m.pearl);
    tube(car,[[s*.787,.967,-1.24],[s*.725,1.232,-.85],[s*.637,1.416,-.36],[s*.657,1.415,.39],[s*.744,1.21,1.02],[s*.825,1.02,1.5]],.014,trim);
    rod(car,[s*.867,1.008,.2],[s*.679,1.409,.2],.027,trim);
    tube(car,[[s*.827,.972,-1.13],[s*.885,1.012,.3],[s*.881,1.02,1.4]],.013,trim);
    // Door shut lines and flush dark handles.
    tube(car,[[s*.92,.978,-1.09],[s*.934,.58,-1.08],[s*.866,.397,-.86],[s*.869,.397,.2],[s*.929,.55,.24],[s*.927,1.01,.24]],.0055,trim);
    tube(car,[[s*.927,1.01,.24],[s*.929,.55,.24],[s*.866,.397,.4],[s*.87,.43,1.16],[s*.949,.95,1.36]],.0055,trim);
    rounded(car,.018,.036,.25,trim,s*.926,.935,-.04,.012);
    rounded(car,.018,.036,.24,trim,s*.944,.95,1.05,.012);
    rod(car,[s*.8,1.002,-1.04],[s*1.016,1.027,-1.08],.024,trim);
    rounded(car,.245,.105,.3,m.pearl,s*1.055,1.041,-1.073,.045);
    rounded(car,.214,.064,.018,m.glass,s*1.063,1.043,-.916,.012);
    // Subtle body-colour arch lips and slim swept-back headlights.
    tube(car,[[s*.927,.48,-1.88],[s*.973,.755,-1.68],[s*.986,.874,-1.43],[s*.974,.74,-1.08],[s*.926,.48,-.96]],.021,m.pearl);
    tube(car,[[s*.935,.47,.93],[s*.985,.767,1.12],[s*.999,.876,1.43],[s*.977,.735,1.76],[s*.907,.47,1.88]],.021,m.pearl);
    tube(car,[[s*.474,.76,-2.285],[s*.727,.784,-2.18],[s*.89,.826,-1.966]],.048,trim);
    tube(car,[[s*.486,.774,-2.293],[s*.736,.801,-2.191],[s*.896,.84,-1.969]],.018,m.led);
    tube(car,[[s*.899,.812,-1.963],[s*.83,.751,-2.125],[s*.658,.713,-2.233]],.012,m.led);
    rounded(car,.045,.076,1.51,trim,s*.888,.34,0,.018);
    // Separate rear lamps; no emblem or lettering between them.
    tube(car,[[s*.926,.889,1.98],[s*.82,.881,2.279],[s*.552,.884,2.337]],.028,m.red);
    tube(car,[[s*.885,.863,2.18],[s*.82,.735,2.304],[s*.653,.721,2.337]],.024,m.red);
  }
  rounded(car,1.34,.09,.13,trim,0,.395,2.219,.022);
  rounded(car,.49,.125,.027,m.dark,0,.626,2.354,.015);
  tube(car,[[-.56,.955,-1.89],[-.64,.966,-1.55],[-.7,.968,-1.29]],.0035,trim);
  tube(car,[[.56,.955,-1.89],[.64,.966,-1.55],[.7,.968,-1.29]],.0035,trim);
  // Charging inlet is on the rear-left quarter.
  rounded(car,.02,.12,.18,trim,-.949,.92,1.75,.024);
  const port=new THREE.Object3D();port.position.set(-.97,.92,1.75);car.add(port);
  const wheels=[];
  for(const x of [-.934,.934]) for(const z of [-1.435,1.435]){
    const wheel=new THREE.Group(); wheel.position.set(x,.355,z);car.add(wheel);wheels.push(wheel);
    const tire=mesh(wheel,new THREE.TorusGeometry(.274,.079,14,40),m.tire);
    tire.rotation.y=Math.PI/2;
    const rim=mesh(wheel,new THREE.CylinderGeometry(.244,.244,.15,40),trim);
    rim.rotation.z=Math.PI/2;
    const outward=Math.sign(x)*.09;
    const aero=mesh(wheel,new THREE.CylinderGeometry(.214,.214,.025,40),trim,outward,0,0);
    aero.rotation.z=Math.PI/2;
    const rimEdge=mesh(wheel,new THREE.TorusGeometry(.231,.009,8,40),m.silver,outward,0,0);
    rimEdge.rotation.y=Math.PI/2;
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5;
      const spoke=rounded(wheel,.029,.19,.078,m.silver,outward+Math.sign(x)*.024,Math.cos(a)*.105,Math.sin(a)*.105,.01);
      spoke.rotation.x=a+.22;
    }
    const cap=mesh(wheel,new THREE.CylinderGeometry(.063,.063,.19,24),trim);
    cap.rotation.z=Math.PI/2;
  }
  return {group:car,wheels,port,wheelRadius:.353,portSide:-1};
}

function createGun(parent) {
  const gun=new THREE.Group();parent.add(gun);
  rounded(gun,.14,.3,.17,materials.dark,0,-.06,0,.04);
  rounded(gun,.18,.13,.26,materials.dark,0,.12,-.04,.045);
  rounded(gun,.185,.052,.17,materials.teal,0,.12,-.1,.012);
  const pin=mesh(gun,new THREE.CylinderGeometry(.057,.065,.13,12),materials.silver,0,.12,-.22);
  pin.rotation.x=Math.PI/2;
  return gun;
}

export function createCharger(number) {
  const group=new THREE.Group();group.name=`DC charger ${number}`;
  const m=materials;
  rounded(group,1.55,.15,1.04,m.silver,0,.075,0,.06);
  rounded(group,1.16,2.9,.72,m.white,0,1.59,0,.14);
  rounded(group,1.21,.18,.78,m.blue,0,3.0,0,.06);
  rounded(group,.82,1.52,.055,m.blue,0,.96,.374,.035);
  rounded(group,.92,1.05,.095,m.dark,0,2.11,.395,.06);
  const map=texture(384,448,(ctx,w,h)=>{
    ctx.fillStyle='#071f2c';ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#66eacb';ctx.font='bold 25px sans-serif';ctx.fillText('DC  /  FAST CHARGE',25,43);
    ctx.fillStyle='#efffff';ctx.font='bold 75px sans-serif';ctx.fillText('180',30,140);
    ctx.font='24px sans-serif';ctx.fillText('kW',210,139);
    ctx.strokeStyle='#51debf';ctx.lineWidth=10;ctx.strokeRect(32,183,280,93);
    ctx.fillStyle='#51debf';for(let i=0;i<4;i++)ctx.fillRect(48+i*65,200,48,59);
    ctx.fillStyle='#a4c0cb';ctx.font='26px sans-serif';ctx.fillText('CCS · READY',32,331);
    ctx.fillStyle='#fff';ctx.font='bold 24px sans-serif';ctx.fillText(`NEO / ${String(number).padStart(2,'0')}`,32,390);
  });
  mesh(group,new THREE.PlaneGeometry(.72,.85),new THREE.MeshBasicMaterial({map}),0,2.11,.449);
  rounded(group,.044,2.48,.026,m.teal,-.487,1.58,.372,.012);
  rounded(group,.044,2.48,.026,m.teal,.487,1.58,.372,.012);
  label(group,'ϟ',.38,.46,0,1.0,.411,{color:'#e7ffff',font:118});
  label(group,`NEO ${String(number).padStart(2,'0')}`,.75,.2,0,.42,.411,{color:'#cdf7ff',font:52});
  for(let i=0;i<7;i++) rounded(group,.34,.018,.025,m.dark,0,.63+i*.043,-.371,.005);
  rounded(group,.03,.4,.26,m.dark,.588,1.78,.08,.01);
  const dockPosition=new THREE.Vector3(.72,1.65,.39);
  const gun=createGun(group);gun.position.copy(dockPosition);gun.rotation.z=-.25;
  const idleCable=tube(group,[[.58,.8,.17],[.8,.29,.32],[1.04,.23,.44],[1.14,.5,.48],[.85,1.17,.42],[.72,1.48,.39]],.038,m.tire);
  return {group,gun,idleCable,dockPosition};
}

export function createBoat(sailboat=false) {
  const group=new THREE.Group();group.name=sailboat?'Moored sailing yacht':'Moored electric launch';
  const m=materials;
  // Closed pointed hull, shaped keel, raised gunwales and inset teak deck.
  loft(group,[
    [-3.05,.025,-.08,.36],[-2.62,.55,-.35,.43],[-1.75,.99,-.61,.48],
    [-.5,1.08,-.66,.49],[1.15,1.02,-.54,.45],[2.3,.9,-.34,.37],[2.43,.85,-.25,.32],
  ],m.pearl,.8);
  loft(group,[
    [-2.7,.035,.35,.4],[-1.9,.64,.36,.43],[-.4,.91,.36,.43],
    [1.5,.81,.34,.4],[2.13,.69,.33,.37],
  ],m.wood,.8);
  for(const side of [-1,1]){
    tube(group,[[0,.34,-3.05],[side*.55,.41,-2.6],[side*.99,.47,-1.75],[side*1.06,.49,-.5],[side*1.01,.45,1.1],[side*.85,.34,2.4]],.037,m.white);
    tube(group,[[side*.52,.0,-2.4],[side*.95,.01,-1.4],[side*1.045,.0,.1],[side*.95,.0,1.7]],.042,m.blue);
    for(let z=-1.9;z<2.1;z+=.65)rod(group,[side*.88,.48,z],[side*.88,.92,z],.016,m.silver);
    tube(group,[[side*.66,.95,-2.25],[side*.88,.93,-1.4],[side*.9,.92,.4],[side*.84,.83,2.05]],.02,m.silver);
    // Hanging rubber fenders beside the dock.
    for(const z of [-.9,1]){
      rod(group,[side*1.03,.75,z],[side*1.09,.3,z],.016,m.dark);
      mesh(group,new THREE.CapsuleGeometry(.1,.29,4,10),m.dark,side*1.09,.15,z);
    }
  }
  for(let x=-.55;x<.6;x+=.14)rod(group,[x,.444,-1.6],[x,.444,1.9],.006,m.dark);
  if(sailboat){
    rounded(group,1.17,.36,1.35,m.white,0,.6,.63,.1);
    rounded(group,1.19,.14,.84,m.glass,0,.7,.58,.03);
    rod(group,[0,.45,-.35],[0,6.05,-.35],.039,m.silver);
    rod(group,[0,1.04,-.35],[0,1.04,2.1],.03,m.silver);
    const sailMaterial=new THREE.MeshStandardMaterial({color:0xf5f8ed,roughness:.85,side:THREE.DoubleSide});
    face(group,[[0,5.89,-.35],[.18,1.2,-.26],[.15,1.2,2.02]],sailMaterial);
    face(group,[[0,5.34,-.43],[.06,1.0,-2.63],[.06,1.0,-.54]],sailMaterial);
    tube(group,[[.012,5.98,-.35],[.012,.62,-2.75]],.009,m.silver);
    tube(group,[[.01,5.98,-.35],[.01,.62,2.22]],.009,m.silver);
    const stripe=face(group,[[.19,1.37,-.2],[.17,1.37,1.89],[.17,1.66,1.75],[.19,1.66,-.2]],m.blue);
    stripe.material=m.blue.clone();stripe.material.side=THREE.DoubleSide;
  }else{
    rounded(group,1.48,.53,1.57,m.white,0,.67,.35,.13);
    rounded(group,1.35,.51,1.2,m.glass,0,1.04,.27,.13);
    rounded(group,1.51,.13,1.43,m.white,0,1.33,.33,.06);
    rounded(group,.9,.21,.44,m.white,0,.61,1.57,.07);
    rounded(group,.82,.16,.85,m.white,0,.54,-1.49,.07);
    rod(group,[0,1.34,.72],[0,1.83,.72],.022,m.silver);
    mesh(group,new THREE.SphereGeometry(.057,12,8),m.teal,0,1.84,.72);
    rounded(group,.35,.59,.26,m.dark,0,.02,2.47,.06);
  }
  // Life ring, cleats and navigation lamps.
  const ring=mesh(group,new THREE.TorusGeometry(.19,.052,8,24),new THREE.MeshStandardMaterial({color:0xef875b}),.98,.56,.45);
  ring.rotation.y=Math.PI/2;
  for(const side of [-1,1]){
    rod(group,[side*.62,.48,1.95],[side*.62,.61,1.95],.035,m.silver);
    rod(group,[side*.48,.6,1.95],[side*.76,.6,1.95],.022,m.silver);
    mesh(group,new THREE.SphereGeometry(.055,12,8),side<0?m.red:m.teal,side*.84,.55,-1.48);
  }
  return group;
}

export function createTurbine() {
  const group=new THREE.Group(),m=materials;group.name='Aerodynamic smart wind turbine';
  const shell=new THREE.MeshStandardMaterial({color:0xeaf0ef,metalness:.24,roughness:.39});
  const status=new THREE.MeshStandardMaterial({color:0x8ee5dc,emissive:0x35cdbf,emissiveIntensity:.6,roughness:.3});
  // Bolted concrete plinth, steel flange and a gently tapered sectional tower.
  rounded(group,1.4,.19,1.4,m.white,0,.095,0,.12);
  mesh(group,new THREE.CylinderGeometry(.45,.49,.13,40),m.silver,0,.225,0);
  mesh(group,new THREE.CylinderGeometry(.17,.29,6.96,40),shell,0,3.75,0);
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    mesh(group,new THREE.CylinderGeometry(.025,.025,.046,6),m.dark,Math.sin(a)*.393,.308,Math.cos(a)*.393);
  }
  for(const y of [2.62,4.95,7.18]){
    const radius=.29-(y-.27)/6.96*.12;
    mesh(group,new THREE.CylinderGeometry(radius+.006,radius+.006,.024,40),m.silver,0,y,0);
  }
  rounded(group,.26,.55,.035,m.dark,0,.66,.28,.09);
  rounded(group,.226,.49,.038,shell,0,.668,.302,.07);
  rod(group,[.066,.64,.328],[.066,.75,.328],.009,m.dark);
  rounded(group,.55,.08,.33,m.silver,0,.23,.49,.025);
  label(group,'NEO / WIND',.34,.08,0,1.31,.28,{color:'#4d7280',font:34});
  // Fine status band and inset service indicator, not a luminous toy tower.
  mesh(group,new THREE.CylinderGeometry(.278,.279,.043,40),status,0,1.04,0);
  rounded(group,.026,.38,.012,status,-.09,.7,.326,.006);
  const nacelle=new THREE.Group();nacelle.position.y=7.28;group.add(nacelle);
  rounded(nacelle,.64,.55,1.26,shell,0,.08,-.21,.2);
  rounded(nacelle,.5,.13,.89,m.white,0,.364,-.26,.05);
  for(const s of [-1,1]){
    rounded(nacelle,.013,.2,.48,m.dark,s*.322,.084,-.42,.018);
    for(let j=0;j<6;j++)rounded(nacelle,.017,.014,.4,m.silver,s*.332,.014+j*.028,-.42,.004);
    rounded(nacelle,.013,.017,.44,status,s*.33,.275,-.3,.004);
  }
  // Maintenance hatch, top guard rail, anemometer and aviation beacon.
  rounded(nacelle,.31,.03,.32,m.silver,0,.449,-.40,.015);
  for(const x of [-.25,.25]){
    for(const z of [-.65,.09])rod(nacelle,[x,.36,z],[x,.60,z],.012,m.silver);
    rod(nacelle,[x,.6,-.65],[x,.6,.09],.012,m.silver);
  }
  rod(nacelle,[0,.40,-.61],[0,.91,-.61],.016,m.silver);
  for(let i=0;i<3;i++){
    const a=i*Math.PI*2/3,tip=[Math.cos(a)*.115,.85,-.61+Math.sin(a)*.115];
    rod(nacelle,[0,.85,-.61],tip,.009,m.dark);
    mesh(nacelle,new THREE.SphereGeometry(.035,10,8),m.dark,...tip);
  }
  mesh(nacelle,new THREE.CylinderGeometry(.047,.047,.055,12),m.red,0,.455,.13);
  const bearing=mesh(nacelle,new THREE.CylinderGeometry(.23,.23,.2,32),m.dark,0,.03,.46);bearing.rotation.x=Math.PI/2;
  const rotor=new THREE.Group();rotor.position.set(0,7.31,.70);group.add(rotor);
  const hub=mesh(rotor,new THREE.SphereGeometry(.26,32,20),shell);hub.scale.set(1,1,1.36);
  const halo=mesh(rotor,new THREE.TorusGeometry(.208,.012,8,40),status,0,0,.185);
  halo.rotation.z=.1;
  // Spanwise airfoil sections with changing chord, camber, twist and swept tips.
  const sections=[
    [.18,.15,.075,0,26],[.39,.27,.065,-.04,22],[.70,.45,.054,-.08,17],
    [1.10,.42,.044,-.05,12],[1.7,.31,.032,.01,8],[2.3,.21,.024,.075,4],
    [2.78,.125,.015,.13,1],[3.10,.036,.005,.20,-2],[3.17,.004,.001,.21,-3],
  ];
  const coordinates=[],indices=[],ring=32;
  for(const [span,chord,thickness,sweep,degrees] of sections){
    const twist=THREE.MathUtils.degToRad(degrees);
    for(let j=0;j<=ring;j++){
      const angle=j/ring*Math.PI*2,u=(1-Math.cos(angle))*.5;
      const x=(u-.3)*chord;
      const z=Math.sin(angle)*thickness*(1-.45*u)+Math.sin(u*Math.PI)*.025;
      coordinates.push(sweep+x*Math.cos(twist)-z*Math.sin(twist),span,x*Math.sin(twist)+z*Math.cos(twist));
    }
  }
  for(let i=0;i<sections.length-1;i++)for(let j=0;j<ring;j++){
    const a=i*(ring+1)+j,b=a+ring+1;indices.push(a,b,a+1,b,b+1,a+1);
  }
  const bladeGeometry=new THREE.BufferGeometry();
  bladeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(coordinates,3));
  bladeGeometry.setIndex(indices);bladeGeometry.computeVertexNormals();
  const bladeMaterial=shell.clone();bladeMaterial.side=THREE.DoubleSide;
  for(let i=0;i<3;i++){
    const pivot=new THREE.Group();pivot.rotation.z=i*Math.PI*2/3;rotor.add(pivot);
    mesh(pivot,bladeGeometry,bladeMaterial);
    mesh(pivot,new THREE.CylinderGeometry(.092,.102,.21,24),m.silver,0,.29,0);
    // Short cyan inspection marks and a dark lightning-receptor tip.
    tube(pivot,[[.147,2.7,.019],[.177,2.87,.012],[.195,3.01,.006]],.012,status);
    mesh(pivot,new THREE.SphereGeometry(.019,10,8),m.silver,.208,3.11,0);
  }
  return {group,rotor};
}
