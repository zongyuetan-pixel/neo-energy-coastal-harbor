import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GUN_TIP,createChargingMotion,sampleChargingMotion,hasPlugContact} from '../src/charging-motion.js';

const port=[-.97,.92,1.75],dock=[2.07,1.66,-3.76];
const motion=createChargingMotion(dock,port);
test('gun clears the car instead of crossing its body',()=>{
  for(let t=0;t<motion.duration;t+=.01){
    const sample=sampleChargingMotion(motion,t);
    const [x,,z]=sample.position;
    // Conservatively expand the body footprint for the gun handle.
    assert.ok(Math.abs(x)>1.2||Math.abs(z)>2.7,`body collision at ${t}`);
    if(sample.segment<5)assert.equal(sample.seated,false);
  }
});
test('right-side connector stays beside the car and inserts directly inward',()=>{
  const rightPort=[.917,.91,1.81],right=createChargingMotion(dock,rightPort);
  for(let t=0;t<right.duration;t+=.01){
    const sample=sampleChargingMotion(right,t),[x,,z]=sample.position;
    assert.ok(x>1.15||z<-2.7,`right-side collision at ${t}`);
    if(sample.segment===right.durations.length-1){
      assert.equal(sample.position[2],rightPort[2]);
      assert.equal(sample.rotationBlend,1);
    }
  }
  const end=sampleChargingMotion(right,right.duration);
  assert.ok(Math.abs(end.position[0]+GUN_TIP[2]-(rightPort[0]-.025))<1e-10);
  assert.equal(end.position[1]+GUN_TIP[1],rightPort[1]);
  assert.equal(hasPlugContact(right,right.duration),true);
  assert.equal(hasPlugContact(right,right.duration-.2),true);
  assert.equal(hasPlugContact(right,right.duration-.7),false);
});
test('final insertion is straight, aligned and fully seated before charging',()=>{
  const start=motion.durations.slice(0,-1).reduce((sum,n)=>sum+n,0);
  let previous=-Infinity;
  for(let t=start;t<=motion.duration;t+=.01){
    const s=sampleChargingMotion(motion,t);
    assert.equal(s.rotationBlend,1);
    assert.equal(s.position[1]+GUN_TIP[1],port[1]);
    assert.equal(s.position[2],port[2]);
    assert.ok(s.position[0]>=previous);previous=s.position[0];
    assert.equal(s.seated,false);
  }
  const end=sampleChargingMotion(motion,motion.duration);
  assert.equal(end.seated,true);
  assert.ok(Math.abs(end.position[0]-GUN_TIP[2]-(port[0]+.025))<1e-10);
});
test('cable deploys behind the gun and partial connection reverses continuously',()=>{
  assert.deepEqual(sampleChargingMotion(motion,0).position,dock);
  assert.equal(sampleChargingMotion(motion,0).deployment,0);
  for(let t=0;t<motion.duration;t+=.04){
    const sample=sampleChargingMotion(motion,t);
    assert.equal(sample.trail.length,sample.segment+2);
    assert.deepEqual(sample.trail.at(-1),[sample.position[0],.12,sample.position[2]]);
    const prior=sampleChargingMotion(motion,Math.max(0,t-.01));
    assert.ok(Math.hypot(...sample.position.map((v,i)=>v-prior.position[i]))<.08);
  }
  assert.deepEqual(sampleChargingMotion(motion,-1).position,dock);
});
