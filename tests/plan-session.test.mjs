import test from 'node:test';
import assert from 'node:assert/strict';
import { PlanSession, PlanConflictError } from '../app/admin/plan-session.ts';
const initial=()=>({version:4,items:[{id:'t1',kind:'table',name:'Mesa 1',x:10,y:20,capacity:2}],assignments:{g1:'t1'},official_guests:[{id:'g1',name:'Invitado'}],manual_guests:[],couple_at_main:true});

test('autosave serializes writes and retains newer edits made during an in-flight save', async()=>{
 let release;const calls=[];
 const session=new PlanSession(initial(),(p,v)=>{calls.push({p,v});return new Promise(resolve=>{release=resolve;});},100000);
 session.load(initial());session.change(p=>({...p,items:p.items.map(i=>({...i,x:30}))}));
 const first=session.flush();session.change(p=>({...p,items:p.items.map(i=>({...i,x:40}))}));
 await session.flush();assert.equal(calls.length,1);release(5);await first;
 assert.equal(session.getSnapshot().plan.items[0].x,40);assert.equal(session.getSnapshot().dirty,true);
 const second=session.flush();assert.equal(calls[1].v,5);release(6);await second;
 assert.equal(session.getSnapshot().dirty,false);assert.deepEqual(session.getSnapshot().plan.assignments,{g1:'t1'});session.pause();
});

test('one gesture is one undo, including after saving; deletion restores assignments',async()=>{
 const session=new PlanSession(initial(),async(_p,v)=>v+1,100000);session.load(initial());
 session.beginGesture();for(let x=20;x<50;x++)session.change(p=>({...p,items:p.items.map(i=>({...i,x}))}));
 await session.flush();assert.equal(session.getSnapshot().plan.version,4);session.endGesture();await session.flush();
 session.undo();assert.equal(session.getSnapshot().plan.items[0].x,10);await session.flush();assert.equal(session.getSnapshot().plan.version,6);
 session.redo();assert.equal(session.getSnapshot().plan.items[0].x,49);
 session.change(p=>({...p,items:[],assignments:{}}));await session.flush();session.undo();await session.flush();
 assert.equal(session.getSnapshot().plan.items.length,1);assert.deepEqual(session.getSnapshot().plan.assignments,{g1:'t1'});session.pause();
});

test('version conflicts stop writes rather than overwrite another session; transient failures remain dirty',async()=>{
 let calls=0;const session=new PlanSession(initial(),async()=>{calls++;throw new PlanConflictError();},100000);session.load(initial());
 session.change(p=>({...p,couple_at_main:false}));await session.flush();await session.flush();assert.equal(calls,1);assert.equal(session.getSnapshot().dirty,true);assert.match(session.getSnapshot().error,/otra sesión/);session.pause();
 const transient=new PlanSession(initial(),async()=>{throw Error('offline');},100000);transient.load(initial());transient.change(p=>({...p,couple_at_main:false}));await transient.flush();assert.equal(transient.getSnapshot().dirty,true);assert.match(transient.getSnapshot().error,/reintentamos/);transient.pause();
});
