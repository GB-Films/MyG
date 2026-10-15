import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionBounds,tablesInBox,moveTableGroup} from '../app/admin/seating-geometry.ts';

const items=[{id:'a',kind:'table',x:20,y:30},{id:'b',kind:'table',x:45,y:40,width:140},{id:'c',kind:'main',x:70,y:75,width:200,height:100,rotation:45},{id:'dj',kind:'dj',x:25,y:30}];
test('selection intersects existing tables only and respects rotated rectangles',()=>{
 assert.deepEqual(tablesInBox(items,{left:100,top:200,right:700,bottom:500},1400,1050),['a','b']);
 assert.deepEqual(tablesInBox(items,{left:0,top:0,right:1400,bottom:1050},1400,1050),['a','b','c']);
 const rotated=selectionBounds(items[2],1400,1050);assert.ok(rotated.right-rotated.left>200);
 assert.deepEqual(tablesInBox(items,{left:rotated.right-2,top:rotated.top,right:rotated.right+2,bottom:rotated.bottom},1400,1050),['c']);
});
test('group movement preserves relative positions, original data and table sizes at every boundary',()=>{
 const original=structuredClone(items.slice(0,3));
 for(const[dx,dy]of [[90,70],[-3000,0],[3000,0],[0,-3000],[0,3000]]){
  const moved=moveTableGroup(original,dx,dy,1400,1050);
  for(let i=0;i<moved.length;i++){
   const bounds=selectionBounds(moved[i],1400,1050);assert.ok(bounds.left>=-1e-8&&bounds.top>=-1e-8&&bounds.right<=1400+1e-8&&bounds.bottom<=1050+1e-8);
   assert.ok(Math.abs((moved[i].x-moved[0].x)-(original[i].x-original[0].x))<1e-8);
   assert.ok(Math.abs((moved[i].y-moved[0].y)-(original[i].y-original[0].y))<1e-8);
   assert.deepEqual({...moved[i],x:original[i].x,y:original[i].y},original[i]);
  }
 }
 assert.deepEqual(original,items.slice(0,3));
});
