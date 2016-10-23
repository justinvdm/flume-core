import test from 'ava';
import immediate from 'immediate-promise';
import { input, message, trap, except, batch, create } from '.';


function defer() {
  let resolve;
  let reject;

  const promise = new Promise((resolveFn, rejectFn) => {
    resolve = resolveFn;
    reject = rejectFn;
  });

  return {
    resolve,
    reject,
    promise
  };
}


function capture(arr) {
  return (_, v) => arr.push(v);
}


test('value propagation', t => {
  const src = input();
  const res = [];

  const graph = [src]
    .concat({
      init: () => 2,
      process: (state, v) => [state + v, state + (v * 2)]
    })
    .concat((_, v) => [null, v + 1])
    .concat(capture(res));

  create(graph)
    .dispatch(src, 21)
    .dispatch(src, 23);

  t.deepEqual(res, [45, 70]);
});


test('error propagation', t => {
  const src = input();
  const res = [];

  const graph = [src]
    .concat((_, v) => {
      throw new Error(v);
    })
    .concat(() => {
      t.fail('this node should not process anything');
    })
    .concat(except((_, e) => [null, e.message]))
    .concat(capture(res));

  create(graph)
    .dispatch(src, 'o_O')
    .dispatch(src, ':/');

  t.deepEqual(res, ['o_O', ':/']);
});


test('unhandled errors', t => {
  const src = input();

  const graph = [src]
    .concat((_, v) => {
      throw new Error(v);
    });

  const fn = () => create(graph).dispatch(src, 'o_O');

  t.throws(fn, 'o_O');
});


test('message types', t => {
  const src = input();
  const res = [];

  const graph = [src]
    .concat(trap('foo', (_, v) => [null, v * 2]))
    .concat(trap('bar', (_, v) => [null, v + 1]))
    .concat(capture(res));

  create(graph)
    .dispatch(src, message('foo', 21))
    .dispatch(src, message('bar', 23));

  t.deepEqual(res, [42, 24]);
});


test('multiple inputs', t => {
  const src1 = input();
  const src2 = input();
  const res = [];

  const a = [src1, (_, v) => [null, v + 1]];
  const b = [src2, (_, v) => [null, v * 2]];

  const graph = [[a, b]]
    .concat((_, v) => [null, v])
    .concat(capture(res));

  create(graph)
    .dispatch(src1, 2)
    .dispatch(src2, 3)
    .dispatch(src2, 21)
    .dispatch(src1, 23);

  t.deepEqual(res, [3, 6, 42, 24]);
});


test('multiple inputs of same type', t => {
  const src = input();
  const res = [];

  const a = [src]
    .concat((_, v) => [null, v + 1]);

  const b = [src]
    .concat((_, v) => [null, v * 2]);

  const graph = [[a, b]]
    .concat((_, v) => [null, v])
    .concat(capture(res));

  create(graph)
    .dispatch(src, 2)
    .dispatch(src, 3);

  t.deepEqual(res, [3, 4, 4, 6]);
});


test('parent indices', t => {
  const src1 = input();
  const src2 = input();
  const res = [];

  const graph = [[src1, src2]]
    .concat({
      init: () => 2,
      process: (state, v, i) => [state + v, state + v + i]
    })
    .concat((_, v) => [null, v * 2])
    .concat(capture(res));

  create(graph)
    .dispatch(src1, 2)
    .dispatch(src2, 3)
    .dispatch(src2, 21)
    .dispatch(src1, 23);

  t.deepEqual(res, [8, 16, 58, 102]);
});


test('promise-based process results', async t => {
  const src = input();
  const res = [];
  const d1 = defer();
  const d2 = defer();

  const graph = [src]
    .concat({
      init: () => 2,
      process: (state, d) => d.promise.then(v => [state + v, state + (v * 2)])
    })
    .concat((_, v) => [null, v + 1])
    .concat(capture(res));

  create(graph)
    .dispatch(src, d1)
    .dispatch(src, d2);

  t.deepEqual(res, []);

  d2.resolve(23);
  await immediate();
  t.deepEqual(res, []);

  d1.resolve(21);
  await immediate();
  t.deepEqual(res, [45, 70]);
});


test('promise-based process state results', async t => {
  const src = input();
  const res = [];
  const d1 = defer();
  const d2 = defer();

  const graph = [src]
    .concat({
      init: () => 2,
      process: (state, d) => [d.promise, state]
    })
    .concat((_, v) => [null, v + 1])
    .concat(capture(res));

  create(graph)
    .dispatch(src, d1)
    .dispatch(src, d2);

  t.deepEqual(res, []);

  d2.resolve(23);
  await immediate();
  t.deepEqual(res, []);

  d1.resolve(21);
  await immediate();
  t.deepEqual(res, [3, 22]);
});


test('promise-based process msg results', async t => {
  const src = input();
  const res = [];
  const d1 = defer();
  const d2 = defer();

  const graph = [src]
    .concat((_, d) => [null, d.promise])
    .concat((_, v) => [null, v + 1])
    .concat(capture(res));

  create(graph)
    .dispatch(src, d1)
    .dispatch(src, d2);

  t.deepEqual(res, []);

  d2.resolve(23);
  await immediate();
  t.deepEqual(res, []);

  d1.resolve(21);
  await immediate();
  t.deepEqual(res, [22, 24]);
});


test('promise rejection', async t => {
  const src = input();
  const res = [];
  const d1 = defer();
  const d2 = defer();

  const graph = [src]
    .concat((_, d) => d.promise.then(v => Promise.reject(new Error(v))))
    .concat(() => {
      t.fail('this node should not process anything');
    })
    .concat(except((_, e) => [null, e.message]))
    .concat(capture(res));

  create(graph)
    .dispatch(src, d1)
    .dispatch(src, d2);

  t.deepEqual(res, []);

  d2.resolve(':/');
  await immediate();
  t.deepEqual(res, []);

  d1.resolve('o_O');
  await immediate();

  t.deepEqual(res, ['o_O', ':/']);
});


test('dispatch callback', async t => {
  const src = input();
  const resolved = [];
  const d1 = defer();
  const d2 = defer();

  const graph = [[input(), src]]
    .concat((_, d) => d.promise.then(() => [null, null]));

  create(graph)
    .dispatch(src, d1, () => resolved.push(d1))
    .dispatch(src, d2, () => resolved.push(d2));

  t.deepEqual(resolved, []);

  d2.resolve();
  await immediate();
  t.deepEqual(resolved, []);

  d1.resolve();
  await immediate();
  t.deepEqual(resolved, [d1, d2]);
});


test('dispatch callback for multiple inputs of same type', async t => {
  const src = input();
  const resolved = [];
  const d1 = defer();
  const d2 = defer();

  const a = [src]
    .concat((_, d) => d.promise.then(() => [null, null]))

  const b = [src]
    .concat(() => [null, null])

  const graph = [[a, b]]
    .concat((_, v) => [null, v]);

  create(graph)
    .dispatch(src, d1, () => resolved.push(d1))
    .dispatch(src, d2, () => resolved.push(d2));

  t.deepEqual(resolved, []);

  d2.resolve();
  await immediate();
  t.deepEqual(resolved, []);

  d1.resolve();
  await immediate();
  t.deepEqual(resolved, [d1, d2]);
});


test('batching', t => {
  const src = input();
  const res = [];

  const graph = [src]
    .concat((_, v) => [null, batch([v, v * 2])])
    .concat((_, v) => [null, batch([v * 3, v * 4])])
    .concat(capture(res));

  create(graph)
    .dispatch(src, 2)
    .dispatch(src, 3);

  t.deepEqual(res, [6, 8, 12, 16, 9, 12, 18, 24]);
});


test('empty subgraphs', t => {
  t.deepEqual(create([[[[]]]]).inputs, []);
});


test('graph with inputs only', t => {
  const src = input();
  const graph = create([[[[src]]]]);
  const [{def}] = graph.inputs;

  t.is(graph.inputs.length, 1);
  t.is(src, def);
});


test('invalid inputs', t => {
  t.throws(() => create([[23]]), "Expected input or array but got number");
});


test('invalid processors', t => {
  const src = input();

  t.throws(
    () => create([src, 23]),
    "Expected function or object with 'process' function property but got number");

  t.throws(
    () => create([src, {}]),
    "Expected function or object with 'process' function property but got object");

  t.throws(
    () => create([src, null]),
    "Expected function or object with 'process' function property but got null");

  t.throws(
    () => create([src, input()]),
    "Expected function or object with 'process' function property but got object");
});


test('dispatch access for processors', t => {
  const src = input();
  const res = [];

  const graph = [src]
    .concat((state, v, i, {dispatch}) => {
      if (v > 0) dispatch(src, v - 1);
      return [state, v + 1];
    })
    .concat(capture(res));

  create(graph)
    .dispatch(src, 2)
    .dispatch(src, 3);

  t.deepEqual(res, [3, 2, 1, 4, 3, 2, 1]);
});
