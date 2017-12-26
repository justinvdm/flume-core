// @flow
import test from 'ava';

import {pipe, create, input, map, transform, msg, list, trap, dispatch, except} from '..';
import {immediate, reject, callbacks, capture, badCodePath} from './_utils';

test('foo', () => {
  const src = input();

  const graph = create(pipe(src, [
    map((v: number) => v + 1),
    map((v: string) => v + 'bar')
  ]));

  dispatch(graph, src('rar'));
});

test('value propagation', t => {
  const src = input();
  const res = [];

  const graph = create(pipe(src, [
    transform(() => 2, (state, v) => [state + v, state + (v * 2)]),
    map(v => v + 1),
    capture(res)
  ]));

  dispatch(graph, src(21));
  dispatch(graph, src(23));

  t.deepEqual(res, [45, 70]);
});

test('error propagation', t => {
  const src = input();
  const res = [];

  const graph = create(pipe(src, [
    map(v => { throw v; }),
    map(badCodePath(t)),
    except(map(e => +e + 1)),
    map(v => { throw v; }),
    except(map(e => { throw e; })),
    except(map(e => e * 2)),
    capture(res)
  ]));

  dispatch(graph, src(21));
  dispatch(graph, src(23));
  t.deepEqual(res, [44, 48]);
});

test('arbitrary msg propagation', t => {
  const src = input();
  const res = [];

  const graph = create(pipe(src, [
    trap('foo', map(v => v + 1)),
    trap('bar', map(v => v * 2)),
    capture(res)
  ]));

  dispatch(graph, src(msg('foo', 21)));
  dispatch(graph, src(msg('bar', 23)));
  t.deepEqual(res, [22, 46]);
});

test('batch propagation', t => {
  const src = input();
  const res = [];

  const graph = create(pipe(src, [
    map(v => list([v + 1, v * 2])),
    capture(res)
  ]));

  dispatch(graph, src(21));
  dispatch(graph, src(23));

  t.deepEqual(res, [22, 42, 24, 46]);
});

test.cb('async value propagation', t => {
  const src = input();
  const res = [];

  const graph = create(pipe(src, [
    // $FlowFixMe
    transform(() => 2, (state, v) => immediate([state + v, state + (v * 2)])),
    map(v => immediate(v + 1)),
    map(immediate),
    capture(res)
  ]));

  const done = callbacks();
  dispatch(graph, src(21), done());
  dispatch(graph, src(23), done());

  done(() => {
    t.deepEqual(res, [45, 70]);
    t.end();
  });
});

test.cb('async error propagation', t => {
  const src = input();
  const res = [];

  const graph = create(pipe(src, [
    map(reject),
    map(badCodePath(t)),
    except(map(e => +e + 1)),
    map(immediate),
    map(reject),
    except(map(reject)),
    except(map(e => e * 2)),
    capture(res)
  ]));

  const done = callbacks();
  dispatch(graph, src(21), done())
  dispatch(graph, src(23), done());

  done(() => {
    t.deepEqual(res, [44, 48]);
    t.end();
  });
});

test('multiple inputs', t => {
  const src1 = input();
  const src2 = input();
  const res = [];

  const a = pipe(src1, map(v => v + 1));
  const b = pipe(src2, map(v => v * 2));
  const graph = create(pipe([a, b], capture(res)));

  dispatch(graph, src1(21));
  dispatch(graph, src2(23));

  t.deepEqual(res, [22, 46]);
});

test('multiple inputs of same def', t => {
  const src = input();
  const res = [];

  const a = pipe(src, map(v => v + 1));
  const b = pipe(src, map(v => v * 2));
  const graph = create(pipe([a, b], capture(res)));

  dispatch(graph, src(21));
  dispatch(graph, src(23));

  t.deepEqual(res, [22, 42, 24, 46]);
});
