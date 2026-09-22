import test from 'node:test';
import assert from 'node:assert/strict';
import {GestureInterpreter,cameraErrorMessage} from '../src/gestures.js';
const open=()=>[[.5,.8],[.44,.69],[.38,.64],[.34,.6],[.28,.56],[.42,.57],[.42,.39],[.42,.27],[.42,.15],[.5,.55],[.5,.34],[.5,.23],[.5,.1],[.58,.57],[.58,.37],[.58,.26],[.58,.16],[.65,.61],[.67,.46],[.68,.36],[.69,.29]].map(([x,y])=>({x,y,z:0}));
const pinch=()=>{const p=open();p[8]={x:.35,y:.56,z:0};p[4]={x:.34,y:.56,z:0};return p;};
const hold=(g,points,start,duration=200)=>{let r;for(let t=start;t<=start+duration;t+=40)r=g.update(points,t);return r;};

test('pinch charges and open palm emits exactly one burst until the next pinch',()=>{
 const g=new GestureInterpreter();assert.equal(hold(g,open(),1000).burst,false);
 assert.equal(hold(g,pinch(),1240).phase,'pinch');
 const bursts=[];for(let t=1480;t<2800;t+=40)bursts.push(g.update(open(),t).burst);
 assert.equal(bursts.filter(Boolean).length,1);assert.equal(g.bursts,1);
 hold(g,pinch(),2800);for(let t=3040;t<3440;t+=40)g.update(open(),t);assert.equal(g.bursts,2);
});
test('short pinch noise does not charge, and short tracking loss does not reset a valid pinch',()=>{
 const g=new GestureInterpreter();hold(g,open(),1000);g.update(pinch(),1240);g.update(open(),1280);assert.equal(g.charged,false);
 hold(g,pinch(),1400);assert.equal(g.update(null,1640).phase,'pinch');
 assert.equal(g.update(null,1920).phase,'idle');assert.equal(g.charged,false);
 assert.equal(hold(g,open(),2000).burst,false);
});
test('pinch remains stable across hand scales and camera translations',()=>{
 for(const scale of [.45,.8,1.1]){const g=new GestureInterpreter();const hand=pinch().map(p=>({x:p.x*scale+.04,y:p.y*scale+.02,z:0}));assert.equal(hold(g,hand,1000).phase,'pinch');}
});
test('movement mirrors the camera and recovers after a hand leaves',()=>{
 const g=new GestureInterpreter();const left=open().map(p=>({...p,x:p.x-.2}));const right=open().map(p=>({...p,x:p.x+.2}));
 const a=hold(g,left,1000);const b=hold(g,right,1240);assert.ok(a.x>b.x);assert.ok(b.visible);
 assert.equal(g.update(null,1800).visible,false);const c=g.update(left,2000);assert.equal(c.visible,true);assert.equal(c.burst,false);
});
test('releasing a pinch with curled fingers does not scatter; an open palm is required',()=>{
 const g=new GestureInterpreter();hold(g,pinch(),1000);const curled=open();for(const i of [8,12,16,20])curled[i]={...curled[i],y:.72};curled[4]={x:.2,y:.55,z:0};
 assert.equal(hold(g,curled,1240).burst,false);assert.equal(g.charged,true);
 for(let t=1480;t<1800;t+=40)g.update(open(),t);assert.equal(g.bursts,1);
});
test('permission, occupied camera, and model failure have distinct actionable messages',()=>{
 assert.match(cameraErrorMessage({name:'NotAllowedError'}),/權限/);assert.match(cameraErrorMessage({name:'NotReadableError'}),/其他程式/);assert.match(cameraErrorMessage({name:'ModelError'}),/模型/);
});
