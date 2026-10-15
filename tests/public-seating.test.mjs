import test from 'node:test';
import assert from 'node:assert/strict';
import { publicSeatingPlan } from '../app/admin/public-seating.ts';

test('public seating shares names and layout without leaking private guest fields or changing the source', () => {
  const plan = { version: 3, items: [{ id: 'table-1', kind: 'table', name: 'Mesa 1', capacity: 2, x: 20, y: 30, movie: 'Up', number: 1 }], guest_source: 'official', official_guests: [{ id: 'private-id', name: 'Persona Uno', dietary: 'Private restriction', group: 'Private group', email: 'private@example.com', source_row: 22 }, { id: 'other-id', name: 'Persona Uno' }], assignments: { 'private-id': 'table-1', 'other-id': 'table-1' }, manual_guests: [], couple_at_main: true, couple_in_roster: true, source: { url: 'private-sheet' }, canvas: { width: 1400, height: 1050 }, room_outline: { points: [{ x: 1, y: 1 }, { x: 90, y: 1 }, { x: 90, y: 90 }] }, updated_at: '2026-10-15T00:00:00Z' };
  const before = structuredClone(plan);
  const result = publicSeatingPlan(plan);
  assert.deepEqual(result.official_guests, [{ id: 'person-1', name: 'Persona Uno' }, { id: 'person-2', name: 'Persona Uno' }]);
  assert.deepEqual(result.assignments, { 'person-1': 'table-1', 'person-2': 'table-1' });
  for (const privateValue of ['Private restriction', 'Private group', 'private@example.com', 'source_row', 'private-sheet', 'private-id']) assert.ok(!JSON.stringify(result).includes(privateValue));
  assert.deepEqual(result.items, plan.items);
  assert.deepEqual(result.room_outline, plan.room_outline);
  assert.deepEqual(plan, before);
  plan.items[0] = {...plan.items[0], shape:'rectangle', width:220, height:100, rotation:45};
  plan.items.push({id:'door-1',kind:'door',name:'Entrada',capacity:0,x:2,y:30,width:100,height:70,rotation:90});
  const transformed = publicSeatingPlan(plan);
  assert.deepEqual(transformed.items, plan.items);
});
