import * as THREE from 'three';

// Local visual simulation only: no exchange, wallet or market-data connection.
export function createExchangeCard(scene){
  const canvas=document.createElement('canvas');
  canvas.width=900;canvas.height=1380;
  const ctx=canvas.getContext('2d');
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const card=new THREE.Sprite(new THREE.SpriteMaterial({
    map,transparent:true,depthWrite:false,toneMapped:false,
  }));
  card.name='中港世纪web3-专属RWAT交易所（CEX）';
  card.position.set(-6.8,7.9,-9.8);card.scale.set(5.8,8.9,1);
  scene.add(card);
  const lightMaterial=new THREE.MeshBasicMaterial({color:0x64eacb,transparent:true,opacity:.48,depthWrite:false});
  const base=new THREE.Mesh(new THREE.RingGeometry(.48,.53,48),lightMaterial);
  base.rotation.x=-Math.PI/2;base.position.set(-6.8,.565,-9.8);scene.add(base);
  const beam=new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-6.8,.59,-9.8),new THREE.Vector3(-6.8,3.31,-9.8)]),
    new THREE.LineDashedMaterial({color:0x8fead9,transparent:true,opacity:.45,dashSize:.11,gapSize:.17}),
  );
  beam.computeLineDistances();scene.add(beam);

  const candles=[];
  let seed=8192;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  let price=1.24;
  for(let i=0;i<34;i++){
    const open=price;
    price=Math.max(.5,open+(random()-.45)*.045);
    candles.push({open,close:price,high:Math.max(open,price)+random()*.019,low:Math.min(open,price)-random()*.019,volume:.2+random()*.8});
  }
  const reference=candles[0].open;
  let elapsed=0,candleAge=0,paintAge=0,sequence=0;
  const green='#6ef0bf',red='#ff839c',muted='#92b6c5',ink='#edfaff';
  function text(value,x,y,size,color=ink,weight=400){
    ctx.fillStyle=color;ctx.font=`${weight} ${size}px "Microsoft YaHei", sans-serif`;ctx.textAlign='left';ctx.fillText(value,x,y);
  }
  function round(x,y,w,h,r,fill,stroke){
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
  }
  function draw(){
    ctx.clearRect(0,0,900,1380);
    const glass=ctx.createLinearGradient(0,0,900,1380);
    glass.addColorStop(0,'rgba(14,49,69,.88)');
    glass.addColorStop(.5,'rgba(6,30,49,.80)');
    glass.addColorStop(1,'rgba(12,50,64,.89)');
    round(12,12,876,1356,48,glass,'rgba(162,245,237,.72)');
    round(23,23,854,1334,40,null,'rgba(202,245,255,.13)');
    // Phone/app frame with quiet status information.
    round(340,36,220,8,4,'rgba(194,231,235,.42)');
    text('ZHONGGANG CENTURY',52,94,19,muted,500);
    ctx.fillStyle=green;ctx.beginPath();ctx.arc(740,85,6+Math.sin(elapsed*3)*1.4,0,Math.PI*2);ctx.fill();
    text('DEMO',760,92,19,green,600);
    text('中港世纪web3-',52,159,47,ink,700);
    text('专属RWAT交易所（CEX）',52,217,40,ink,600);
    ctx.fillStyle='rgba(136,209,220,.19)';ctx.fillRect(52,248,796,1);
    round(52,276,56,56,16,'rgba(90,231,195,.13)','rgba(100,238,205,.42)');
    text('R',67,316,33,green,700);
    text('RWAT / USDT',126,312,33,ink,600);
    text('绿色能量资产',126,344,20,muted);
    text('CEX',765,311,24,green,600);
    const latest=candles.at(-1),previous=candles.at(-2).close,up=latest.close>=previous;
    const change=(latest.close/reference-1)*100;
    text(latest.close.toFixed(4),52,427,79,up?green:red,600);
    round(507,375,250,52,13,change>=0?'rgba(97,238,180,.11)':'rgba(255,122,146,.12)');
    text(`${change>=0?'+':''}${change.toFixed(2)}%`,534,411,31,change>=0?green:red,600);
    text('模拟价格 · USDT',54,463,21,muted);
    text('K线',52,525,27,ink,600);
    text('分时',145,525,24,muted);
    text('成交量',232,525,24,muted);
    round(687,490,159,48,12,'rgba(103,226,212,.09)','rgba(138,222,217,.24)');
    text('动态演示',709,522,24,green,500);
    ctx.fillStyle=green;ctx.fillRect(52,543,52,3);
    const bounds={x:53,y:584,w:678,h:340};
    const low=Math.min(...candles.map(c=>c.low))-.018,high=Math.max(...candles.map(c=>c.high))+.018;
    const y=p=>bounds.y+bounds.h-(p-low)/(high-low)*bounds.h;
    const step=bounds.w/candles.length;
    for(let i=0;i<=4;i++){
      const py=bounds.y+i*bounds.h/4;
      ctx.strokeStyle='rgba(159,204,219,.14)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(bounds.x,py);ctx.lineTo(bounds.x+bounds.w,py);ctx.stroke();
      text((high-(high-low)*i/4).toFixed(3),754,py+6,18,muted);
    }
    for(let i=0;i<6;i++){
      const x=bounds.x+i*bounds.w/5;
      ctx.strokeStyle='rgba(159,204,219,.08)';ctx.beginPath();ctx.moveTo(x,bounds.y);ctx.lineTo(x,1052);ctx.stroke();
    }
    // Candlestick wicks, changing bodies and corresponding volume bars.
    candles.forEach((c,i)=>{
      const x=bounds.x+step*(i+.5),color=c.close>=c.open?green:red;
      ctx.strokeStyle=color;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(x,y(c.high));ctx.lineTo(x,y(c.low));ctx.stroke();
      ctx.fillStyle=color;ctx.fillRect(x-step*.28,Math.min(y(c.open),y(c.close)),step*.56,Math.max(3,Math.abs(y(c.open)-y(c.close))));
      ctx.globalAlpha=.3;ctx.fillRect(x-step*.3,1050-c.volume*69,step*.6,c.volume*69);ctx.globalAlpha=1;
    });
    // A five-candle moving average provides a second moving chart signal.
    ctx.strokeStyle='#e6cb87';ctx.lineWidth=2;ctx.beginPath();
    for(let i=4;i<candles.length;i++){
      const average=candles.slice(i-4,i+1).reduce((sum,c)=>sum+c.close,0)/5;
      const x=bounds.x+step*(i+.5);if(i===4)ctx.moveTo(x,y(average));else ctx.lineTo(x,y(average));
    }
    ctx.stroke();
    const liveY=y(latest.close),liveX=bounds.x+step*(candles.length-.5);
    ctx.setLineDash([6,6]);ctx.strokeStyle=up?green:red;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(bounds.x,liveY);ctx.lineTo(739,liveY);ctx.stroke();ctx.setLineDash([]);
    round(741,liveY-17,108,33,7,up?'#377f70':'#85475b');
    text(latest.close.toFixed(4),749,liveY+6,19,ink,600);
    ctx.fillStyle=up?green:red;ctx.globalAlpha=.15+.15*(1+Math.sin(elapsed*5));
    ctx.beginPath();ctx.arc(liveX,liveY,8+Math.sin(elapsed*5)*2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    text('MA 5',53,963,18,'#e6cb87');
    text('VOL',53,1001,17,muted);
    ['-30','-20','-10','NOW'].forEach((s,i)=>text(s,53+i*212,1081,18,muted));
    ctx.fillStyle='rgba(136,209,220,.19)';ctx.fillRect(52,1110,796,1);
    text('开盘',53,1151,20,muted);text(latest.open.toFixed(4),53,1187,27,ink,600);
    text('最高',324,1151,20,muted);text(latest.high.toFixed(4),324,1187,27,green,600);
    text('最低',594,1151,20,muted);text(latest.low.toFixed(4),594,1187,27,red,600);
    round(52,1234,796,76,18,'rgba(101,218,202,.07)','rgba(152,224,218,.18)');
    text('模拟行情 · 非实时交易数据',76,1267,22,muted);
    text('ENERGY TO VALUE',76,1295,16,'#6f9daa',500);
    text(`更新 ${String(sequence).padStart(4,'0')}`,685,1280,18,green);
    map.needsUpdate=true;
  }
  function update(dt){
    elapsed+=dt;candleAge+=dt;paintAge+=dt;
    const current=candles.at(-1);
    // Oscillations create visible upward and downward intrabar movement.
    current.close=Math.max(.1,current.open+.012*Math.sin(elapsed*2.6)+.008*Math.sin(elapsed*6.3)+.007*Math.sin(elapsed*.48));
    current.high=Math.max(current.high,current.close);
    current.low=Math.min(current.low,current.close);
    current.volume=Math.min(1,.24+candleAge*.12+Math.abs(current.close-current.open)*10);
    if(candleAge>=3.2){
      const open=current.close;candles.push({open,close:open,high:open,low:open,volume:.2});
      candles.shift();candleAge=0;
    }
    base.material.opacity=.32+Math.sin(elapsed*1.8)*.12;
    // Limit canvas/GPU uploads to 10 Hz independently of scene frame rate.
    if(paintAge>=.1){paintAge=0;sequence++;draw();}
  }
  draw();
  return {card,update};
}
