import test from 'node:test';
import assert from 'node:assert/strict';
import { timeThemeAt, nextClockCheck } from '../src/utils/timeTheme.js';
import { groupDestinations } from '../src/utils/destinations.js';

test('local clock respects every morning/noon/afternoon/night boundary', () => {
  for (const [hour, minute, expected] of [[0,0,'night'],[4,59,'night'],[5,0,'morning'],[10,59,'morning'],[11,0,'noon'],[14,59,'noon'],[15,0,'afternoon'],[18,59,'afternoon'],[19,0,'night'],[23,59,'night']]) {
    assert.equal(timeThemeAt(new Date(2026, 9, 12, hour, minute)), expected, `${hour}:${minute}`);
  }
});
test('next automatic check aligns to the next minute including a theme boundary', () => {
  assert.equal(nextClockCheck(new Date(2026,9,12,10,59,59,999)), 1);
  assert.equal(nextClockCheck(new Date(2026,9,12,10,59,30,500)), 29500);
  assert.equal(nextClockCheck(new Date(2026,9,12,11,0,0,0)), 60000);
});
test('destinations only group real available tour locations, without inventing provinces or prices', () => {
  const tours = [
    { id: 1, slug: 'a', location: ' Lâm Đồng ' }, { id: 2, slug: 'b', location: 'lâm đồng' },
    { id: 3, slug: 'c', location: 'Lâm Đồng · Bình Thuận' }, { id: 4, slug: 'd', location: '' },
    { id: 5, slug: 'e', location: 'Ẩn', isActive: false }, { id: 6, location: 'Thiếu đường dẫn' },
  ];
  const groups = groupDestinations(tours);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].label, 'Lâm Đồng');
  assert.deepEqual(groups[0].tours.map(t => t.id), [1,2]);
  assert.equal(groups[1].label, 'Lâm Đồng · Bình Thuận');
  assert.equal(tours[0].location, ' Lâm Đồng ');
  assert.deepEqual(groupDestinations([]), []);
});
