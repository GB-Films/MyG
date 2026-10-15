import test from 'node:test';
import assert from 'node:assert/strict';
import { itemGeometry, seatPosition } from '../app/admin/seating-geometry.ts';

test('existing furniture keeps its dimensions and shape without migrating saved plans', () => {
  assert.deepEqual(itemGeometry({kind:'table'}), {shape:'circle',width:104,height:104,rotation:0});
  assert.deepEqual(itemGeometry({kind:'main'}), {shape:'rectangle',width:144,height:104,rotation:0});
  assert.deepEqual(itemGeometry({kind:'dance',width:300,height:200,rotation:45}), {shape:'rectangle',width:300,height:200,rotation:45});
  assert.equal(itemGeometry({kind:'main',shape:'circle',width:150,height:90}).height,150);
});

test('rectangular seats stay on the perimeter without duplicate positions at every supported capacity', () => {
  for(let count=1;count<=24;count++) {
    const positions=Array.from({length:count},(_,i)=>seatPosition(i,count,{shape:'rectangle',width:230,height:90,rotation:0}));
    assert.equal(new Set(positions.map(p=>JSON.stringify(p))).size,count);
    for(const p of positions){const x=parseFloat(p.left),y=parseFloat(p.top);assert.ok(x>=0&&x<=100&&y>=0&&y<=100);assert.ok(x===0||x===100||y===0||y===100);}
  }
});
