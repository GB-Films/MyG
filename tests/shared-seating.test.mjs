import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { buildSeatingEdit } = createRequire(import.meta.url)('../functions/seating-edit.cjs');
const fixture = () => ({version:8,items:[{id:'t1',kind:'table',number:1,name:'Mesa 1',movie:'Up',capacity:10,x:20,y:30,width:150},{id:'dj',kind:'dj',x:40,y:10}],assignments:{a:'t1'},official_guests:[{id:'a',name:'Ana',dietary:'Privado',email:'private@example.com'}],room_outline:{points:[{x:5,y:5},{x:95,y:5},{x:95,y:95},{x:5,y:95}]}});
test('shared edits atomically update positions and numbers and preserve all other data',()=>{
 const privatePlan=fixture(),publicPlan={...fixture(),official_guests:[{id:'a',name:'Ana'}]},before=structuredClone(privatePlan);
 const result=buildSeatingEdit(privatePlan,publicPlan,{version:8,changes:[{id:'t1',patch:{x:56,y:62,number:21}}]});
 assert.equal(result.version,9);assert.deepEqual(privatePlan,before);
 for(const key of ['assignments','official_guests','room_outline'])assert.deepEqual(result.privatePlan[key],before[key]);
 assert.deepEqual(result.privatePlan.items[0],{...before.items[0],x:56,y:62,number:21});
 assert.equal(result.publicPlan.items[0].number,21);assert.ok(!JSON.stringify(result.publicPlan).includes('private@example.com'));
});
test('public edits reject deleting tables, changing names, guests, capacity or other furniture',()=>{
 const p=fixture();
 for(const patch of [{name:'New'},{movie:'New'},{capacity:1},{width:500},{rotation:90},{kind:'main'},{x:NaN},{x:101},{number:0},{number:1.5},{number:1000},{}])assert.throws(()=>buildSeatingEdit(p,p,{version:8,changes:[{id:'t1',patch}]}),e=>e.code==='invalid-argument');
 for(const id of ['missing','dj'])assert.throws(()=>buildSeatingEdit(p,p,{version:8,changes:[{id,patch:{x:50}}]}));
 assert.throws(()=>buildSeatingEdit(p,p,{version:8,changes:[],assignments:{}}));
 assert.throws(()=>buildSeatingEdit(p,p,{version:8,changes:[{id:'t1',patch:{x:1}},{id:'t1',patch:{x:2}}]}));
});
test('stale versions cannot overwrite a later plan',()=>{
 assert.throws(()=>buildSeatingEdit(fixture(),fixture(),{version:7,changes:[{id:'t1',patch:{x:50}}]}),e=>e.code==='aborted');
});
