import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_OUTLINE, withRoomDefaults, nearestWall, snapDoor, applyRoomOutline } from '../app/admin/room-geometry.ts';

const fixture = () => ({ version: 7, items: [{ id: '1', kind: 'table', x: 30, y: 40, width: 104 }, { id: '2', kind: 'main', x: 60, y: 80 }], assignments: { ana: '1', juan: '2' }, official_guests: [{ id: 'ana' }, { id: 'juan' }], manual_guests: [], couple_at_main: true });
test('default outline is non-destructive and existing outlines are preserved', () => {
  const original = fixture(), copy = structuredClone(original);
  const next = withRoomDefaults(original);
  assert.deepEqual(original, copy);
  assert.deepEqual(next.room_outline, DEFAULT_OUTLINE);
  assert.deepEqual(next.items, original.items);
  const custom = { points: [{x:2,y:2},{x:80,y:3},{x:75,y:90}] };
  assert.deepEqual(withRoomDefaults({...original,room_outline:custom}).room_outline, custom);
});
test('doors snap to each wall, align with it and stay clear of corners', () => {
  for (const point of [{x:50,y:8},{x:92,y:50},{x:50,y:92},{x:8,y:50},{x:2,y:2}]) {
    const door = snapDoor({id:'door',kind:'door',width:100,...point}, DEFAULT_OUTLINE, 1400, 1050);
    assert.ok(nearestWall(door,DEFAULT_OUTLINE,1400,1050).distance<1e-8);
    assert.ok([0,90,180,270].includes(door.rotation));
    assert.equal(door.height,200);
    assert.ok(door.x>=5 && door.x<=95 && door.y>=5 && door.y<=95);
  }
  const diagonal = {points:[{x:10,y:10},{x:90,y:20},{x:80,y:90}]};
  const door=snapDoor({kind:'door',x:45,y:15,width:100},diagonal,1400,1050);
  assert.ok(nearestWall(door,diagonal,1400,1050).distance<1e-8);
  assert.ok(door.rotation>0 && door.rotation<90);
});
test('growing all four sides preserves guests, assignments, furniture sizes and pixel distances', () => {
  const original=withRoomDefaults(fixture());
  const next=applyRoomOutline(original,{points:[{x:-30,y:-20},{x:130,y:-20},{x:130,y:120},{x:-30,y:120}]});
  assert.ok(next.canvas.width>1400 && next.canvas.height>1050);
  assert.deepEqual(next.assignments,original.assignments);
  assert.deepEqual(next.official_guests,original.official_guests);
  assert.equal(next.items[0].width,104);
  const dx=(next.items[1].x-next.items[0].x)*next.canvas.width/100;
  const dy=(next.items[1].y-next.items[0].y)*next.canvas.height/100;
  assert.ok(Math.abs(dx-420)<1e-8 && Math.abs(dy-420)<1e-8);
  assert.ok(next.room_outline.points.every(p=>p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100));
});
test('doors follow their wall when an existing outline is enlarged', () => {
  const original=withRoomDefaults(fixture());
  original.items.push(snapDoor({id:'door',kind:'door',x:50,y:5,width:100},DEFAULT_OUTLINE,1400,1050));
  const next=applyRoomOutline(original,{points:[{x:-10,y:-20},{x:120,y:-20},{x:120,y:100},{x:-10,y:100}]});
  assert.equal(nearestWall(next.items[2],next.room_outline,next.canvas.width,next.canvas.height).index,0);
  assert.ok(nearestWall(next.items[2],next.room_outline,next.canvas.width,next.canvas.height).distance<1e-8);
});
