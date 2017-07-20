// @flow
import test from 'ava';
import {pipe, create, input, map, transform, dispatch, except} from './flume-core';

const capture = arr => map(v => arr.push(v));

test('value propagation', t => {
  const src = input();
  const res = [];

  const graph = create(pipe(src, [
    transform(() => 2, (state, v) => [state + v, state + (v * 2)]),
    map(v => v + 1),
    capture(res)
  ]));

  dispatch(graph, src, 21);
  dispatch(graph, src, 23);

  t.deepEqual(res, [45, 70]);
});

test('error propagation', t => {
  const src = input();
  const res = [];

  const graph = create(pipe(src, [
    map(v => {
      throw new Error(v);
    }),
    map(() => {
      t.fail('this node should not transform anything');
    }),
    except(map(e => e.message)),
    capture(res)
  ]));

  dispatch(graph, src, 'o_O')
  dispatch(graph, src, ':/');
  t.deepEqual(res, ['o_O', ':/']);
});
