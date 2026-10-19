import test from 'node:test';
import assert from 'node:assert/strict';
import { reassignGuests, removeGuests } from '../app/admin/seating-guests.ts';
import { publicSeatingPlan } from '../app/admin/public-seating.ts';
import { PlanSession } from '../app/admin/plan-session.ts';

const initial = () => ({
  version: 1, guest_source: 'official', couple_at_main: true, couple_in_roster: true,
  items: [{ id: 'a', kind: 'table', capacity: 2 }, { id: 'b', kind: 'table', capacity: 1 }, { id: 'main', kind: 'main', capacity: 2 }, { id: 'dj', kind: 'dj', capacity: 0 }],
  official_guests: [{ id: 'one', name: 'Mismo nombre', dietary: 'Celíaca' }, { id: 'two', name: 'Mismo nombre' }, { id: 'three', name: 'Otra persona' }],
  manual_guests: [], assignments: { one: 'a', two: 'a', three: 'b' }, source: { guest_count: 3, title: 'Original' },
});

test('group transfer is atomic, grows only the destination and preserves all guest data', () => {
  const plan = initial(), before = structuredClone(plan);
  const moved = reassignGuests(plan, ['one', 'two', 'one'], 'b');
  assert.deepEqual(moved.assignments, { one: 'b', two: 'b', three: 'b' });
  assert.equal(moved.items[1].capacity, 3); assert.equal(moved.items[0].capacity, 2);
  assert.deepEqual(moved.official_guests, before.official_guests); assert.deepEqual(plan, before);
  assert.deepEqual(reassignGuests(moved, ['one', 'two'], 'b'), moved);
  assert.equal(reassignGuests(plan, ['one'], 'missing'), plan);
  assert.equal(reassignGuests(plan, ['one'], 'dj'), plan);
  assert.deepEqual(reassignGuests(plan, ['one', 'two'], null).assignments, { three: 'b' });
  const main = reassignGuests({ ...plan, couple_in_roster: false }, ['one', 'two'], 'main');
  assert.equal(main.items[2].capacity, 4);
});

test('deletion removes only the selected IDs from roster, assignment and public projection', () => {
  const plan = initial(), before = structuredClone(plan), removed = removeGuests(plan, ['one']);
  assert.deepEqual(removed.official_guests.map(guest => guest.id), ['two', 'three']);
  assert.deepEqual(removed.assignments, { two: 'a', three: 'b' });
  assert.deepEqual(removed.items, before.items); assert.deepEqual(removed.source, before.source);
  const shared = publicSeatingPlan(removed);
  assert.equal(shared.official_guests.length, 2);
  assert.deepEqual(shared.assignments, { 'person-1': 'a', 'person-2': 'b' });
  assert.ok(!JSON.stringify(shared).includes('excluded_guest_ids'));
  assert.ok(!JSON.stringify(shared).includes('Celíaca')); assert.deepEqual(plan, before);
  const legacy = removeGuests({ ...plan, guest_source: 'rsvps', manual_guests: [{ id: 'manual', name: 'Manual' }] }, ['manual', 'rsvp:0']);
  assert.deepEqual(legacy.manual_guests, []); assert.deepEqual(legacy.excluded_guest_ids, ['manual', 'rsvp:0']);
  assert.deepEqual(removeGuests(legacy, ['rsvp:0']).excluded_guest_ids, legacy.excluded_guest_ids);
});

test('one undo restores a whole saved transfer or deletion, including capacity and dietary info', async () => {
  const plan = initial(), session = new PlanSession(plan, async (_next, version) => version + 1, 100000);
  session.load(plan);
  session.change(current => reassignGuests(current, ['one', 'two'], 'b')); await session.flush();
  session.undo(); assert.deepEqual(session.getSnapshot().plan.assignments, plan.assignments); assert.deepEqual(session.getSnapshot().plan.items, plan.items);
  await session.flush(); session.change(current => removeGuests(current, ['one', 'two'])); await session.flush();
  assert.equal(session.getSnapshot().plan.official_guests.length, 1);
  session.undo(); await session.flush();
  assert.deepEqual(session.getSnapshot().plan.official_guests, plan.official_guests); assert.deepEqual(session.getSnapshot().plan.assignments, plan.assignments);
  session.redo(); assert.equal(session.getSnapshot().plan.official_guests.length, 1); session.pause();
});
