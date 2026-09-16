// Shared geometry for the visible road, collision checks and autopilot.
// Distances are metres along a clockwise stadium loop, starting at its NW end.
export const TRACK={left:-20,right:20,top:5.7,radius:8.6,width:6.4};
const straight=TRACK.right-TRACK.left,arc=Math.PI*TRACK.radius;
export const LOOP_LENGTH=straight*2+arc*2;
export const wrapDistance=s=>((s%LOOP_LENGTH)+LOOP_LENGTH)%LOOP_LENGTH;
export function loopPoint(distance){
  let s=wrapDistance(distance);
  if(s<straight)return {x:TRACK.left+s,z:TRACK.top,dx:1,dz:0};
  s-=straight;
  if(s<arc){
    const a=-Math.PI/2+s/TRACK.radius;
    return {x:TRACK.right+TRACK.radius*Math.cos(a),z:TRACK.top+TRACK.radius+TRACK.radius*Math.sin(a),dx:-Math.sin(a),dz:Math.cos(a)};
  }
  s-=arc;
  if(s<straight)return {x:TRACK.right-s,z:TRACK.top+TRACK.radius*2,dx:-1,dz:0};
  s-=straight;
  const a=Math.PI/2+s/TRACK.radius;
  return {x:TRACK.left+TRACK.radius*Math.cos(a),z:TRACK.top+TRACK.radius+TRACK.radius*Math.sin(a),dx:-Math.sin(a),dz:Math.cos(a)};
}
export function nearestOnLoop(x,z){
  const clampedX=Math.max(TRACK.left,Math.min(TRACK.right,x));
  const candidates=[clampedX-TRACK.left,straight+arc+TRACK.right-clampedX];
  const cz=TRACK.top+TRACK.radius;
  const rightAngle=Math.max(-Math.PI/2,Math.min(Math.PI/2,Math.atan2(z-cz,x-TRACK.right)));
  let leftAngle=Math.atan2(z-cz,x-TRACK.left);
  if(leftAngle<0)leftAngle+=Math.PI*2;
  leftAngle=Math.max(Math.PI/2,Math.min(Math.PI*1.5,leftAngle));
  candidates.push(straight+(rightAngle+Math.PI/2)*TRACK.radius,straight*2+arc+(leftAngle-Math.PI/2)*TRACK.radius);
  let best={distance:Infinity,along:0};
  for(const along of candidates){
    const point=loopPoint(along),distance=Math.hypot(x-point.x,z-point.z);
    if(distance<best.distance)best={distance,along:wrapDistance(along),...point};
  }
  return best;
}
export function bayEntryDistance(x){return x-3.2-TRACK.left;}
export function travelToBay(from,x,fullTour=false){
  let travel=wrapDistance(bayEntryDistance(x)-from);
  // When already near the station, take the complete loop before charging.
  if(fullTour&&travel<LOOP_LENGTH*.65)travel+=LOOP_LENGTH;
  return travel;
}
