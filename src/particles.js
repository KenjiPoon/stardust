const TAU=Math.PI*2;
const mix=(a,b,t)=>a+(b-a)*t;
const rand=(a,b)=>a+Math.random()*(b-a);

export class Universe {
  constructor(canvas,onQuality){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.onQuality=onQuality;
    this.count=800;this.input={x:.55,y:.46,phase:'idle',visible:false};this.center={x:.55,y:.46};
    this.charge=0;this.burstCount=0;this.time=0;this.last=0;this.fps=60;this.sampleStart=0;this.frames=0;this.slowSince=0;
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.particles=Array.from({length:800},(_,i)=>({angle:rand(0,TAU),radius:Math.pow(Math.random(),.62),height:rand(-1,1),speed:rand(.018,.085),size:rand(.5,1.6),tint:i%7===0?1:0,twinkle:rand(0,TAU),x:0,y:0,vx:0,vy:0,initialized:false,energy:0}));
    this.stars=Array.from({length:200},()=>({x:Math.random(),y:Math.random(),r:rand(.35,1.05),alpha:rand(.12,.65),phase:rand(0,TAU)}));
    this.rings=[];this.sprite=this.makeSprite();this.resize();
    this.resizeHandler=()=>this.resize();window.addEventListener('resize',this.resizeHandler);
    this.draw=this.draw.bind(this);this.raf=requestAnimationFrame(this.draw);
  }
  makeSprite(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(237,250,255,1)');g.addColorStop(.1,'rgba(216,241,255,.95)');g.addColorStop(.25,'rgba(154,209,255,.35)');g.addColorStop(1,'rgba(99,177,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return c;}
  resize(){this.width=innerWidth;this.height=innerHeight;this.dpr=Math.min(devicePixelRatio||1,1.5);this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);for(const p of this.particles)p.initialized=false;}
  setInput(input){this.input={...input};if(input.burst)this.burst();}
  burst(){
    this.burstCount++;const cx=this.center.x*this.width,cy=this.center.y*this.height;
    for(const p of this.particles){const a=Math.atan2(p.y-cy,p.x-cx)+rand(-.2,.2);const v=rand(3,11)*(this.reduced?.5:1);p.vx=Math.cos(a)*v;p.vy=Math.sin(a)*v*.8;p.energy=1;}
    this.rings.push({x:cx,y:cy,life:1,r:Math.min(this.width,this.height)*.05});
  }
  draw(now){
    this.raf=requestAnimationFrame(this.draw);
    if(document.hidden){this.last=0;this.sampleStart=now;this.frames=0;this.slowSince=0;return;}
    const dt=this.last?Math.min((now-this.last)/16.667,3):1;this.last=now;this.time+=dt*(this.reduced?.003:.008);
    this.frames++;if(!this.sampleStart)this.sampleStart=now;
    if(now-this.sampleStart>1000){this.fps=this.frames*1000/(now-this.sampleStart);this.frames=0;this.sampleStart=now;if(this.fps<30){if(!this.slowSince)this.slowSince=now;if(now-this.slowSince>5000 && this.count!==400){this.count=400;this.onQuality?.(400);}}else this.slowSince=0;}
    const ctx=this.ctx,w=this.width,h=this.height;
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.fillStyle='#050b16';ctx.fillRect(0,0,w,h);
    const desired=this.input.visible?this.input:{x:w<600?.5:.55,y:w<600?.48:.46};
    const ease=1-Math.exp(-dt/18);this.center.x=mix(this.center.x,desired.x,ease);this.center.y=mix(this.center.y,desired.y,ease);
    const cx=this.center.x*w,cy=this.center.y*h,base=Math.min(w*.32,h*.37);
    this.charge=mix(this.charge,this.input.phase==='pinch'?1:0,1-Math.exp(-dt/10));
    const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,base*1.6);glow.addColorStop(0,`rgba(47,97,137,${.095+this.charge*.1})`);glow.addColorStop(.45,'rgba(18,42,71,.08)');glow.addColorStop(1,'rgba(5,11,22,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    for(const s of this.stars){ctx.fillStyle=`rgba(181,208,234,${s.alpha*(.8+.2*Math.sin(this.time*.5+s.phase))})`;ctx.beginPath();ctx.arc(s.x*w,s.y*h,s.r,0,TAU);ctx.fill();}
    // Faint orbital arcs establish depth without competing with the particles.
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-.28);ctx.lineWidth=.7;ctx.strokeStyle=`rgba(100,146,180,${.10*(1-this.charge)})`;
    for(const scale of [.93,1.3]){ctx.beginPath();ctx.ellipse(0,0,base*scale,base*scale*.37,0,.2,TAU-.5);ctx.stroke();}ctx.restore();
    ctx.globalCompositeOperation='lighter';
    for(let i=0;i<this.count;i++){
      const p=this.particles[i];const a=p.angle+this.time*p.speed;
      const rad=base*(.1+p.radius*.98),z=Math.sin(a)*rad;
      const depth=1+z/(base*3.4);
      const galaxyX=Math.cos(a)*rad*depth,galaxyY=(Math.sin(a)*rad*.35+p.height*rad*.2)*depth;
      const ga=galaxyX*Math.cos(-.28)-galaxyY*Math.sin(-.28),gb=galaxyX*Math.sin(-.28)+galaxyY*Math.cos(-.28);
      const sphereR=base*.16*Math.sqrt(1-p.height*p.height)*( .8+.2*p.radius);
      const sphereX=Math.cos(a+this.time*.23)*sphereR,sphereY=p.height*base*.16;
      const tx=cx+mix(ga,sphereX,this.charge),ty=cy+mix(gb,sphereY,this.charge);
      if(!p.initialized){p.x=tx;p.y=ty;p.initialized=true;}
      const oldX=p.x,oldY=p.y;
      p.vx*=Math.pow(.966,dt);p.vy*=Math.pow(.966,dt);p.energy*=Math.pow(.98,dt);
      const spring=(.02+this.charge*.045)*(1-p.energy*.95);
      p.x+=((tx-p.x)*spring+p.vx)*dt;p.y+=((ty-p.y)*spring+p.vy)*dt;
      const alpha=(.4+.4*Math.sin(p.twinkle+this.time*.8)**2)*(.55+.45*depth);
      const size=p.size*depth*(1+this.charge*.35);
      ctx.strokeStyle=`rgba(${p.tint?'123,198,255':'185,216,240'},${Math.min(.38,alpha*.3)})`;ctx.lineWidth=Math.max(.4,size*.45);ctx.beginPath();ctx.moveTo(oldX,oldY);ctx.lineTo(p.x-(p.x-oldX)*2,p.y-(p.y-oldY)*2);ctx.stroke();
      ctx.globalAlpha=alpha*(p.tint?.8:1)*(1-this.charge*.68);const glowSize=size*(8+4*this.charge);ctx.drawImage(this.sprite,p.x-glowSize/2,p.y-glowSize/2,glowSize,glowSize);
      ctx.fillStyle=p.tint?'#a2dcff':'#dfeef8';ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.4,size*.55),0,TAU);ctx.fill();
    }
    if(this.charge>.05){ctx.globalAlpha=this.charge*.52;ctx.drawImage(this.sprite,cx-base*.34,cy-base*.34,base*.68,base*.68);ctx.globalAlpha=this.charge*.18;ctx.fillStyle='#bbebff';ctx.fillRect(cx-base*.6,cy-.4,base*1.2,.8);}
    for(const ring of this.rings){ring.life-=dt*.017;ring.r+=dt*5;ctx.globalAlpha=Math.max(0,ring.life)*.22;ctx.strokeStyle='#9bcfff';ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(ring.x,ring.y,ring.r,ring.r*.7,-.28,0,TAU);ctx.stroke();}
    this.rings=this.rings.filter(r=>r.life>0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  }
  dispose(){cancelAnimationFrame(this.raf);window.removeEventListener('resize',this.resizeHandler);}
}
