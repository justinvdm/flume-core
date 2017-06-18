// @flow
import test from 'ava';
import {pipe, create, input, map, transform, dispatch} from './flume-core';


test('value propagation', t => {
  const src = input();
  const res = [];

  const graph = create(pipe(src, [
    transform(() => 2, (state, v) => [state + v, state + (v * 2)]),
    map(v => v + 1),
    map(v => res.push(v))
  ]));

  dispatch(graph, src, 21);
  dispatch(graph, src, 23);

  t.deepEqual(res, [45, 70]);
});
