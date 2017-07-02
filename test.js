import test from 'ava';
import immediate from 'immediate-promise';
import {pipe, create, input, transform} from '.';


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
  return (_, v) => {
    arr.push(v);
    return {value: null};
  }
}


test.only('value propagation', t => {
  const src = input();
  const res = [];

  create(pipe([
      src,
      transform(() => 2, (state, v) => [state + v, state + (v * 2)]),
      map(v => v + 1)
    ]))
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
      t.fail('this node should not transform anything');
    })
    .concat(except((_, e) => ({value: e.message})))
    .concat(capture(res));

  create(graph)
    .dispatch(src, 'o_O')
    .dispatch(src, ':/');

  t.deepEqual(res, ['o_O', ':/']);
});


test('except fallback handler', t => {
  const src = input();
  const res = [];

  const graph = [src]
    .concat((_, value) => {
      if (value % 2) throw new Error(value);
      return {value};
    })
    .concat(except((state, e) => ({state: state + +e.message})))
    .concat(capture(res));

  create(graph)
    .dispatch(src, 2)
    .dispatch(src, 5)
    .dispatch(src, 8);

  t.deepEqual(res, [2, 7, 8]);
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
    .concat({
      transform: {
        foo: (_, v) => ({value: v * 2}),
        bar: (_, v) => ({value: v + 1})
      }
    })
    .concat(capture(res));

  create(graph)
    .dispatch(src, message('foo', 21))
    .dispatch(src, message('bar', 23));

  t.deepEqual(res, [42, 24]);
});


test('trap', t => {
  const src = input();
  const res = [];

  const graph = [src]
    .concat(trap({
      foo: (_, v) => ({value: v * 2}),
      bar: (_, v) => ({value: v + 1})
    }))
    .concat(capture(res));

  create(graph)
    .dispatch(src, message('foo', 21))
    .dispatch(src, message('bar', 23));

  t.deepEqual(res, [42, 24]);
});


test('trap fallback handler', t => {
  const src = input();
  const res = [];

  const graph = [src]
    .concat(trap({foo: (state, v) => ({state: state + v})}))
    .concat(capture(res));

  create(graph)
    .dispatch(src, message('bar', 3))
    .dispatch(src, message('foo', 2));

  t.deepEqual(res, [3, 5]);
});


test('fallback transform handler', t => {
  const src = input();
  const res = [];

  const graph = [src]
    .concat({
      transform: {
        foo: (_, v) => ({value: v * 2}),
        bar: (_, v) => ({value: v * 3}),
        '*': (_, v) => ({value: v + 1})
      }
    })
    .concat(capture(res));

  create(graph)
    .dispatch(src, message('foo', 21))
    .dispatch(src, message('bar', 22))
    .dispatch(src, message('baz', 23));

  t.deepEqual(res, [42, 66, 24]);
});


test('multiple inputs', t => {
  const src1 = input();
  const src2 = input();
  const res = [];

  const a = [src1, (_, v) => ({value: v + 1})];
  const b = [src2, (_, v) => ({value: v * 2})];

  const graph = [[a, b]]
    .concat((_, value) => ({value}))
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
    .concat((_, v) => ({value: v + 1}));

  const b = [src]
    .concat((_, v) => ({value: v * 2}));

  const graph = [[a, b]]
    .concat((_, v) => ({value: v}))
    .concat(capture(res));

  create(graph)
    .dispatch(src, 2)
    .dispatch(src, 3);

  t.deepEqual(res, [3, 4, 4, 6]);
});


test('transform using parent defs', t => {
  const src1 = input();
  const src2 = input();
  const res = [];

  const graph = [[src1, src2]]
    .concat({
      init: () => 2,
      transform: (state, value, {parent}) => {
        switch (parent) {
          case src1: return {
            state,
            value: value * 2
          };

          case src2: return {
            state,
            value: value * 3
          };

          default: return {
            state,
            value
          };
        }
      }
    })
    .concat(capture(res));

  create(graph)
    .dispatch(src1, 2)
    .dispatch(src2, 3)
    .dispatch(src2, 4)
    .dispatch(src1, 5);

  t.deepEqual(res, [4, 9, 12, 10]);
});


test('transform using source defs', t => {
  const src1 = input();
  const src2 = input();
  const res = [];

  const graph = [[src1, src2]]
    .concat((_, v) => ({state: v}))
    .concat({
      init: () => 2,
      transform: (state, value, {source}) => {
        switch (source) {
          case src1: return {
            state,
            value: value * 2
          };

          case src2: return {
            state,
            value: value * 3
          };

          default: return {
            state,
            value
          };
        }
      }
    })
    .concat(capture(res));

  create(graph)
    .dispatch(src1, 2)
    .dispatch(src2, 3)
    .dispatch(src2, 4)
    .dispatch(src1, 5);

  t.deepEqual(res, [4, 9, 12, 10]);
});


test('promise-based transform results', async t => {
  const src = input();
  const res = [];
  const d1 = defer();
  const d2 = defer();

  const graph = [src]
    .concat({
      init: () => 2,
      transform: (state, d) => d.promise.then(v => ({
        state: state + v,
        value: state + (v * 2)
      }))
    })
    .concat((_, v) => ({value: v + 1}))
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


test('promise rejection', async t => {
  const src = input();
  const res = [];
  const d1 = defer();
  const d2 = defer();

  const graph = [src]
    .concat((_, d) => d.promise.then(v => Promise.reject(new Error(v))))
    .concat(() => {
      t.fail('this node should not transform anything');
    })
    .concat(except((_, e) => ({value: e.message})))
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
    .concat((_, d) => d.promise.then(() => ({value: null})));

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
    .concat((_, d) => d.promise.then(() => ({value: null})))

  const b = [src]
    .concat(() => ({value: null}))

  const graph = [[a, b]]
    .concat((_, value) => ({value}));

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
    .concat((_, v) => ({values: [v, v * 2]}))
    .concat((_, v) => ({values: [v * 3, v * 4]}))
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


test('invalid transforms', t => {
  const src = input();

  t.throws(
    () => create([src, 23]),
    "Expected function or object matching transform shape but got number");

  t.throws(
    () => create([src, {}]),
    "Expected function or object matching transform shape but got object");

  t.throws(
    () => create([src, null]),
    "Expected function or object matching transform shape but got null");

  t.throws(
    () => create([src, input()]),
    "Expected function or object matching transform shape but got object");
});


test('dispatch access for transforms', t => {
  const src = input();
  const res = [];

  const graph = [src]
    .concat((state, v, {parent, dispatch}) => {
      if (v > 0) dispatch(parent, v - 1);
      return {
        state,
        value: v + 1
      };
    })
    .concat(capture(res));

  create(graph)
    .dispatch(src, 2)
    .dispatch(src, 3);

  t.deepEqual(res, [3, 2, 1, 4, 3, 2, 1]);
});


test('state and value change shorthand', t => {
  const src = input();
  const res = [];

  const graph = [src]
    .concat({
      init: () => 1,
      transform: (state, v) => ({state: state + v})
    })
    .concat(capture(res));

  create(graph)
    .dispatch(src, 21)
    .dispatch(src, 23);

  t.deepEqual(res, [22, 45]);
});
