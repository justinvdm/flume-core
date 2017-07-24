// @flow
const {map, identity} = require('..');

const reject = (e: *) => Promise.reject(e);

const immediate = (v: *) => new Promise(resolve => setImmediate(() => resolve(v)));

const badCodePath = (t: *) => () => t.fail('Unexpected code path reached');

const capture = (arr: any[]) => map(v => arr.push(v));

const callbacks = () => {
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

exports.capture = capture;
exports.reject = reject;
exports.immediate = immediate;
exports.callbacks = callbacks;
exports.badCodePath = badCodePath;
