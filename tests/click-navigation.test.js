import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pickDestination,planRoadTrip,roadTripPoint} from '../src/click-navigation.js';
import {LOOP_LENGTH,loopPoint,nearestOnLoop} from '../src/route.js';
test('reject sea, garden, building and marina clicks; accept road and parking spaces',()=>{
  for(const p of [[0,17],[40,0],[-16,-5],[28,-6],[NaN,0]])assert.equal(pickDestination(...p),null);
  for(const x of [-6,0,6,12])assert.equal(pickDestination(x,-3).kind,'bay');
  assert.equal(pickDestination(-5,5.7).kind,'road');
});
test('destinations around the loop use the road rather than cutting through its middle',()=>{
  for(const start of [1,35,59,88,123])for(const end of [4,42,69,97,130]){
    const p=loopPoint(start),target=loopPoint(end),dest=pickDestination(target.x,target.z);
    const plan=planRoadTrip(p,dest);
    for(let s=0;s<=plan.total;s+=.35){
      const sample=roadTripPoint(plan,s);
      assert.ok(nearestOnLoop(sample.x,sample.z).distance<1e-7);
    }
    const arrival=roadTripPoint(plan,plan.total);
    assert.ok(Math.hypot(arrival.x-dest.x,arrival.z-dest.z)<1e-8);
  }
});
test('roadside target is reached while leaving clearance from the curb',()=>{
  const destination=pickDestination(3,8.65);
  assert.equal(destination.kind,'road');
  assert.ok(nearestOnLoop(destination.x,destination.z).distance<=1.50001);
  const plan=planRoadTrip({x:-5,z:5.7},destination);
  const end=roadTripPoint(plan,plan.total);
  assert.ok(Math.hypot(end.x-destination.x,end.z-destination.z)<1e-8);
});
test('clicking behind an east-facing car reverses a short distance instead of taking a full lap',()=>{
  const plan=planRoadTrip({x:-5,z:5.7},pickDestination(-12,5.7),-Math.PI/2);
  assert.equal(plan.reverse,true);assert.equal(plan.direction,-1);assert.equal(plan.total,7);
  const start=roadTripPoint(plan,0),end=roadTripPoint(plan,plan.total);
  assert.equal(start.x,-5);assert.equal(end.x,-12);
  assert.equal(end.z,5.7);
  // Travel points west; the reverse vehicle still faces east.
  assert.equal(end.dx,-1);
});
test('the same destination is forward when the car is already facing west',()=>{
  const plan=planRoadTrip({x:-5,z:5.7},pickDestination(-12,5.7),Math.PI/2);
  assert.equal(plan.reverse,false);assert.equal(plan.direction,-1);
  const ahead=planRoadTrip({x:-5,z:5.7},pickDestination(2,5.7),-Math.PI/2);
  assert.equal(ahead.reverse,false);assert.equal(ahead.total,7);
});
test('reverse paths stay on the loop across bends and the wraparound seam',()=>{
  for(const distance of [2,43,65,95,LOOP_LENGTH-2]){
    const p=loopPoint(distance),target=loopPoint(distance-9);
    const plan=planRoadTrip(p,pickDestination(target.x,target.z),Math.atan2(-p.dx,-p.dz));
    assert.equal(plan.reverse,true);assert.ok(Math.abs(plan.total-9)<1e-7);
    for(let s=0;s<=plan.total;s+=.2){
      const at=roadTripPoint(plan,s);
      assert.ok(nearestOnLoop(at.x,at.z).distance<1e-7);
    }
  }
});
