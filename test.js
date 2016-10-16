import test from 'ava';
import immediate from 'immediate-promise';
import { input } from '.';


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

  const graph = src
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
    .create();

  graph
    .dispatch(src, 21)
    .dispatch(src, 23);

  t.deepEqual(res, [45, 70]);
});


test('promise-based transform results', async t => {
  const src = input();
  const res = [];
  const d1 = defer();
  const d2 = defer();

  const graph = src
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
    .create();

  graph
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

  const graph = src
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
    .create();

  graph
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

  const graph = src
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
    .create();

  graph
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


test('dispatch callback', async t => {
  const src = input();
  const resolved = [];
  const d1 = defer();
  const d2 = defer();

  const graph = src
    .pipe({ transform: (_, d) => d.promise.then(() => [null, null]) })
    .create();

  graph
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
