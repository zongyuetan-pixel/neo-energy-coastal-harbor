import {TRACK,LOOP_LENGTH,loopPoint,nearestOnLoop,wrapDistance} from './route.js';

const BAY_X=[-6,0,6,12];
export function pickDestination(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z))return null;
  const bay=BAY_X.findIndex(bx=>Math.abs(x-bx)<=2.22&&z>=-6.5&&z<=.6);
  if(bay>=0)return {kind:'bay',bay,x:BAY_X[bay],z:-3.3};
  const near=nearestOnLoop(x,z);
  if(near.distance>TRACK.width/2)return null;
  // Keep a car-width margin from the curb while retaining the clicked position.
  const shrink=near.distance>1.5?1.5/near.distance:1;
  return {kind:'road',x:near.x+(x-near.x)*shrink,z:near.z+(z-near.z)*shrink,along:near.along};
}
export function planRoadTrip(from,destination,heading){
  const near=nearestOnLoop(from.x,from.z);
  const clockwise=wrapDistance(destination.along-near.along);
  const direction=clockwise<=LOOP_LENGTH/2?1:-1;
  const yaw=heading??Math.atan2(-near.dx,-near.dz);
  const reverse=(-Math.sin(yaw)*near.dx-Math.cos(yaw)*near.dz)*direction<0;
  return {
    start:near.along,total:direction===1?clockwise:LOOP_LENGTH-clockwise,direction,reverse,
    startOffset:{x:from.x-near.x,z:from.z-near.z},
    endOffset:{x:destination.x-loopPoint(destination.along).x,z:destination.z-loopPoint(destination.along).z},
    destination,
  };
}
export function roadTripPoint(plan,distance){
  const d=Math.max(0,Math.min(plan.total,distance)),p=loopPoint(plan.start+d*plan.direction);
  if(plan.total<.001)return {x:plan.destination.x,z:plan.destination.z,dx:p.dx,dz:p.dz};
  const fade=Math.min(6,plan.total*.5);
  const a=Math.max(0,1-d/fade),b=Math.max(0,1-(plan.total-d)/fade);
  return {x:p.x+plan.startOffset.x*a+plan.endOffset.x*b,z:p.z+plan.startOffset.z*a+plan.endOffset.z*b,dx:p.dx*plan.direction,dz:p.dz*plan.direction};
}
