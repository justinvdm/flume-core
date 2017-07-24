// @flow
import {map, identity} from '..';

export const reject = (e: *) => Promise.reject(e);

export const immediate = (v: *) => new Promise(resolve => setImmediate(() => resolve(v)));

export const badCodePath = (t: *) => () => t.fail('Unexpected code path reached');

export const capture = (arr: any[]) => map(v => arr.push(v));

export const callbacks = () => {
  let i = 1;
  let n = 0;
  let resolve = identity;

  const createNext = () => {
    let called = false;

    const next = () => {
      if (called) throw new Error('Callback called multiple times');
      called = true;
      if (++i > n) resolve();
    };

    return next;
  };

  const callbacksFn = (resolveFn: ?Function) => {
    if (resolveFn) {
      resolve = resolveFn;
      return;
    }

    n++;
    return createNext();
  };

  return callbacksFn;
};
