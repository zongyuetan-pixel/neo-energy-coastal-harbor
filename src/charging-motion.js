// Coordinates are relative to the parked car; its nose points along -Z.
export const PARK_SETTLE_SECONDS=.95;
export const GUN_TIP=[0,.12,-.285];
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);

export function createChargingMotion(dock,port){
  // The left-facing gun's local -Z axis points inward (+X).
  const seated=[port[0]+GUN_TIP[2]+.025,port[1]-GUN_TIP[1],port[2]];
  const aligned=[seated[0]-.38,seated[1],seated[2]];
  const points=[
    dock,
    [Math.max(2.1,dock[0]+.18),dock[1],dock[2]+.6],
    [2.1,1.05,3.05],
    [-1.9,1.05,3.05],
    [-1.9,seated[1],port[2]],
    aligned,
    seated,
  ];
  const durations=[.8,2.6,1.45,.85,.65,.95];
  const labels=['充电枪出桩','充电枪移向车尾','充电枪绕行车尾','对准充电接口','接口对准确认','正在插入充电枪'];
  const travelDuration=durations.reduce((sum,n)=>sum+n,0);
  return {points,durations,labels,travelDuration,duration:travelDuration+.3};
}

export function sampleChargingMotion(motion,time){
  const t=Math.max(0,Math.min(motion.duration,time));
  let segment=0,elapsed=0;
  while(segment<motion.durations.length-1&&t>=elapsed+motion.durations[segment]){
    elapsed+=motion.durations[segment++];
  }
  const fraction=smooth((t-elapsed)/motion.durations[segment]);
  const position=mix(motion.points[segment],motion.points[segment+1],fraction);
  return {
    position,segment,fraction,
    rotationBlend:smooth((t-.8)/1.4),
    deployment:smooth(t/.8),
    label:t>=motion.travelDuration?'连接确认中':motion.labels[segment],
    seated:t>=motion.duration,
    // Only deployed cable follows the route already traversed by the gun.
    trail:[...motion.points.slice(0,segment+1),position].map(p=>[p[0],.12,p[2]]),
  };
}
