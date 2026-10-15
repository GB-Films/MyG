import test from 'node:test';
import assert from 'node:assert/strict';
import { itemGeometry, seatPosition, resizeFromCorner } from '../app/admin/seating-geometry.ts';

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

test('corner resizing anchors the opposite corner, even after rotation', () => {
  for(const rotation of [0,30,90,270]) for(const corner of [[-1,-1],[1,-1],[1,1],[-1,1]]) {
    const item={kind:'table',shape:'rectangle',width:180,height:100,rotation,x:50,y:50};
    const opposite = i => {const a=rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a),x=-corner[0]*i.width/2,y=-corner[1]*i.height/2;return [i.x*14+c*x-s*y,i.y*10.5+s*x+c*y];};
    const before=opposite(item);
    const patch=resizeFromCorner(item,corner,65,40,1400,1050);
    const after=opposite({...item,...patch});
    assert.ok(Math.abs(after[0]-before[0])<1e-8&&Math.abs(after[1]-before[1])<1e-8);
    assert.ok(patch.width>=60&&patch.width<=500&&patch.height>=40&&patch.height<=500);
  }
  const round={kind:'table',x:50,y:50,width:104};
  const resized=resizeFromCorner(round,[1,1],40,80,1400,1050);
  assert.equal(resized.width,resized.height);
  assert.equal(resized.width,164);
});
