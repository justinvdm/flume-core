import test from 'ava';
import immediate from 'immediate-promise';
import { transform, input, message, trap, except } from '.';


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


test('value propagation', t => {
  const src = input();
  const res = [];

  src
    .pipe({
      init: () => 2,
      transform: (state, v) => [state + v, state + (v * 2)]
    })
    .pipe({
      transform: (_, v) => [null, v + 1]
    })
    .pipe({
      transform: (_, v) => {
        res.push(v);
        return [null, null];
      }
    })
    .create()
    .dispatch(src, 21)
    .dispatch(src, 23);

  t.deepEqual(res, [45, 70]);
});


test('error propagation', t => {
  const src = input();
  const res = [];

  src
    .pipe({
      transform: (_, v) => {
        throw new Error(v);
      }
    })
    .pipe({
      transform: () => {
        t.fail('this node should not process anything');
      }
    })
    .pipe(except({
      transform: (_, e) => [null, e.message]
    }))
    .pipe({
      transform: (_, v) => {
        res.push(v);
        return [null, null];
      }
    })
    .create()
    .dispatch(src, 'o_O')
    .dispatch(src, ':/');

  t.deepEqual(res, ['o_O', ':/']);
});


test('unhandled errors', t => {
  const src = input();

  const fn = () => src
    .pipe({
      transform: (_, v) => {
        throw new Error(v);
      }
    })
    .create()
    .dispatch(src, 'o_O')

  t.throws(fn, 'o_O');
});


test('message types', t => {
  const src = input();
  const res = [];

  src
    .pipe(trap('foo', {
      transform: (_, v) => [null, v * 2]
    }))
    .pipe(trap('bar', {
      transform: (_, v) => [null, v + 1]
    }))
    .pipe({
      transform: (_, v) => {
        res.push(v);
        return [null, null];
      }
    })
    .create()
    .dispatch(src, message('foo', 21))
    .dispatch(src, message('bar', 23));

  t.deepEqual(res, [42, 24]);
});


test('multiple inputs', t => {
  const src1 = input();
  const src2 = input();
  const res = [];

  const a = src1
    .pipe({
      transform: (_, v) => [null, v + 1]
    })

  const b = src2
    .pipe({
      transform: (_, v) => [null, v * 2]
    })

  transform({
      parents: [a, b],
      transform: (_, v) => [null, v]
    })
    .pipe({
      transform: (_, v) => {
        res.push(v);
        return [null, null];
      }
    })
    .create()
    .dispatch(src1, 2)
    .dispatch(src2, 3)
    .dispatch(src2, 21)
    .dispatch(src1, 23);

  t.deepEqual(res, [3, 6, 42, 24]);
});


test('multiple inputs of same type', t => {
  const src = input();
  const res = [];

  const a = src
    .pipe({
      transform: (_, v) => [null, v + 1]
    })

  const b = src
    .pipe({
      transform: (_, v) => [null, v * 2]
    })

  transform({
      parents: [a, b],
      transform: (_, v) => [null, v]
    })
    .pipe({
      transform: (_, v) => {
        res.push(v);
        return [null, null];
      }
    })
    .create()
    .dispatch(src, 2)
    .dispatch(src, 3);

  t.deepEqual(res, [3, 4, 4, 6]);
});


test('parent indices', t => {
  const src1 = input();
  const src2 = input();
  const res = [];

  transform({
      init: () => 2,
      parents: [src1, src2],
      transform: (state, v, i) => [state + v, state + v + i]
    })
    .pipe({
      transform: (_, v) => [null, v * 2]
    })
    .pipe({
      transform: (_, v) => {
        res.push(v);
        return [null, null];
      }
    })
    .create()
    .dispatch(src1, 2)
    .dispatch(src2, 3)
    .dispatch(src2, 21)
    .dispatch(src1, 23);

  t.deepEqual(res, [8, 16, 58, 102]);
});


test('promise-based transform results', async t => {
  const src = input();
  const res = [];
  const d1 = defer();
  const d2 = defer();

  src
    .pipe({
      init: () => 2,
      transform: (state, d) => d.promise.then(v => [state + v, state + (v * 2)])
    })
    .pipe({
      transform: (_, v) => [null, v + 1]
    })
    .pipe({
      transform: (_, v) => {
        res.push(v);
        return [null, null];
      }
    })
    .create()
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


test('promise-based transform state results', async t => {
  const src = input();
  const res = [];
  const d1 = defer();
  const d2 = defer();

  src
    .pipe({
      init: () => 2,
      transform: (state, d) => [d.promise, state]
    })
    .pipe({
      transform: (_, v) => [null, v + 1]
    })
    .pipe({
      transform: (_, v) => {
        res.push(v);
        return [null, null];
      }
    })
    .create()
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


test('promise-based transform msg results', async t => {
  const src = input();
  const res = [];
  const d1 = defer();
  const d2 = defer();

  src
    .pipe({
      transform: (_, d) => [null, d.promise]
    })
    .pipe({
      transform: (_, v) => [null, v + 1]
    })
    .pipe({
      transform: (_, v) => {
        res.push(v);
        return [null, null];
      }
    })
    .create()
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

  src
    .pipe({
      transform: (_, d) => d.promise.then(v => Promise.reject(new Error(v)))
    })
    .pipe({
      transform: () => {
        t.fail('this node should not process anything');
      }
    })
    .pipe(except({
      transform: (_, e) => [null, e.message]
    }))
    .pipe({
      transform: (_, v) => {
        res.push(v);
        return [null, null];
      }
    })
    .create()
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

  src
    .pipe({
      transform: (_, d) => d.promise.then(() => [null, null])
    })
    .create()
    .dispatch(src, d1, () => { resolved.push(d1); })
    .dispatch(src, d2, () => { resolved.push(d2); });

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

  const a = src
    .pipe({
      transform: (_, d) => d.promise.then(() => [null, null])
    });

  const b = src
    .pipe({
      transform: () => [null, null]
    });

  transform({
      parents: [a, b],
      transform: (_, v) => [null, v]
    })
    .create()
    .dispatch(src, d1, () => { resolved.push(d1); })
    .dispatch(src, d2, () => { resolved.push(d2); });

  t.deepEqual(resolved, []);

  d2.resolve();
  await immediate();
  t.deepEqual(resolved, []);

  d1.resolve();
  await immediate();
  t.deepEqual(resolved, [d1, d2]);
});


test('ignoring of non-array results', t => {
  const error = console.error;
  const src = input();
  const res = [];
  const errors = [];

  const graph = src
    .pipe({
      transform: (_, v) => v
    })
    .pipe({
      transform: (_, v) => {
        res.push(v);
        return [null, null];
      }
    })
    .create();

  console.error = e => errors.push(e);

  try {
    graph
      .dispatch(src, [null, 2])
      .dispatch(src, 3)
      .dispatch(src, [null, 23])
  } finally {
    console.error = error;
  }

  t.deepEqual(res, [2, 23]);

  t.deepEqual(errors, [
    'flume expected array for process result, received number, ignoring: 3'
  ]);
});
