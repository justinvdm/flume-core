// @flow
import test from 'ava';

import {pipe, create, input, filter, dispatch} from '..';
import {immediate, capture, callbacks} from './_utils';

test.cb('filter', t => {
  const src = input();
  const res = [];

  const graph = create(pipe(src, [
    filter(v => immediate(v % 2)),
    capture(res)
  ]));

  const done = callbacks();
  dispatch(graph, src(2), done());
  dispatch(graph, src(3), done());

  done(() => {
    t.deepEqual(res, [3]);
    t.end();
  });
});
