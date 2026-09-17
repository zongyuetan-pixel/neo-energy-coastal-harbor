import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createEnergyFlow,FLOW_STAGE_SECONDS as seconds} from '../src/energy-flow.js';
test('charging data reaches the exchange only after oracle verification and chain confirmation',()=>{
  const flow=createEnergyFlow();
  assert.equal(flow.update(seconds*.5,true).stage,0);
  const verified=flow.update(seconds,true);
  assert.equal(verified.stage,1);assert.equal(verified.delivered,0);assert.equal(verified.confirmed,0);
  const chained=flow.update(seconds,true);
  assert.equal(chained.stage,2);assert.equal(chained.confirmed,1);assert.equal(chained.delivered,0);
  const arrived=flow.update(seconds,true);
  assert.equal(arrived.delivered,1);assert.equal(arrived.arrivals,1);assert.equal(arrived.stage,0);
});
test('no data travels during parking, connection, idle or after charging stops',()=>{
  const flow=createEnergyFlow();
  assert.equal(flow.update(100,false).energy,0);
  const active=flow.update(1,true),stopped=flow.update(100,false);
  assert.equal(stopped.progress,active.progress);assert.equal(stopped.energy,active.energy);
  assert.equal(stopped.arrivals,0);
  flow.reset();assert.equal(flow.update(0,false).delivered,0);assert.equal(flow.update(0,false).energy,0);
});
test('completed charging keeps sending batches until the plug is removed, without inventing energy',()=>{
  const flow=createEnergyFlow();
  const charging=flow.update(15,true,true);
  const full=flow.update(seconds*6,true,false);
  assert.equal(full.delivered,charging.delivered+2);
  assert.equal(full.energy,charging.energy);
  assert.equal(full.connected,true);
  assert.equal(full.drawingPower,false);
  const unplugged=flow.update(60,false,false);
  assert.equal(unplugged.delivered,full.delivered);
  assert.equal(unplugged.energy,full.energy);
  assert.equal(unplugged.arrivals,0);
  assert.equal(unplugged.connected,false);
});
