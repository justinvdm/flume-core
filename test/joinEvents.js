// @flow
import test from 'ava';

import {pipe, create, input, map, joinEvents, identity, dispatch} from '..';
import {capture} from './_utils';

test('joinEvents', t => {
  const src1 = input();
  const src2 = input();
  const res = [];
  let event = identity;

  const a = pipe(src1, [
    joinEvents(identity, { src2 }),
    map(events => { event = events.src2; })
  ]);

  const b = pipe(src2, capture(res));
  const graph = create([a, b]);

  dispatch(graph, src1, null);

  event(21);
  event(23);
  t.deepEqual(res, [21, 23]);
});
