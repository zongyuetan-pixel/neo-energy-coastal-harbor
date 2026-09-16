import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LOOP_LENGTH,loopPoint,nearestOnLoop,travelToBay,bayEntryDistance} from '../src/route.js';
test('road closes with a continuous forward tangent at both bends and the seam',()=>{
  const transitions=[0,40,40+Math.PI*8.6,80+Math.PI*8.6,LOOP_LENGTH];
  for(const s of transitions){
    const a=loopPoint(s-.0001),b=loopPoint(s+.0001);
    assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.00021);
    assert.ok(a.dx*b.dx+a.dz*b.dz>.9999);
  }
});
test('every automatic-tour point is on the visible road and within manual bounds',()=>{
  for(let s=0;s<LOOP_LENGTH;s+=.11){
    const p=loopPoint(s),closest=nearestOnLoop(p.x,p.z);
    assert.ok(closest.distance<1e-8);
    assert.ok(Math.abs(Math.hypot(p.dx,p.dz)-1)<1e-8);
  }
  assert.ok(nearestOnLoop(0,14).distance>7,'garden must not become drivable');
  assert.ok(nearestOnLoop(32,-2.4).distance>6,'marina stays outside the route');
});
test('every bay tour travels around the loop and returns to the correct entry',()=>{
  for(const x of [-6,0,6,12]){
    const from=15,distance=travelToBay(from,x,true),p=loopPoint(from+distance),entry=loopPoint(bayEntryDistance(x));
    assert.ok(distance>LOOP_LENGTH*.65);
    assert.ok(Math.hypot(p.x-entry.x,p.z-entry.z)<1e-8);
    assert.ok(Math.abs(p.x-(x-3.2))<1e-8&&Math.abs(p.z-5.7)<1e-8);
    assert.ok(p.dx>.999);
  }
});
