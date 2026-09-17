// Local demonstration only. Every batch passes all three stages in order.
export const FLOW_STAGE_SECONDS=1.35;
export function createEnergyFlow(){
  let elapsed=0,delivered=0,chargeSeconds=0;
  return {
    reset(){elapsed=0;delivered=0;chargeSeconds=0;},
    update(dt,connected,charging=connected){
      const before=delivered;
      if(connected)elapsed+=Math.max(0,dt);
      if(connected&&charging)chargeSeconds+=Math.max(0,dt);
      const steps=elapsed/FLOW_STAGE_SECONDS;
      const batch=Math.floor(steps/3),stage=Math.floor(steps)%3;
      delivered=batch;
      return {stage,progress:steps%1,charging:connected,connected,drawingPower:connected&&charging,delivered,
        confirmed:batch+(stage===2?1:0),arrivals:delivered-before,
        batch:batch+1,energy:chargeSeconds*180/3600};
    },
  };
}
