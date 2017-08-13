// @flow
import test from 'ava';

import {pipe, create, input, reduce, dispatch} from '..';
import {immediate, capture, callbacks} from './_utils';

test.cb('reduce', t => {
  const src = input();
  const res = [];

  const graph = create(pipe(src, [
    reduce(() => 2, (a, b) => immediate(a + b)),
    capture(res)
  ]));

  const done = callbacks();
  dispatch(graph, src(3), done());
  dispatch(graph, src(5), done());

  done(() => {
    t.deepEqual(res, [5, 10]);
    t.end();
  });
});
