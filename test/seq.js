// @flow
import test from 'ava';

import {seq} from '..';
import {immediate, reject} from './_utils';

test.cb('sync value propagation', t => {
  seq([
    v => v + 1,
    v => v * 2,
    v => {
      t.is(v, 44);
      t.end();
    }
  ])(21);
});

test.cb('sync error propagation', t => {
  seq([
    v => { throw v; },
    [, e => +e + 1],
    v => { throw v; },
    [, e => { throw e; }],
    [, e => e * 2],
    v => {
      t.is(v, 44);
      t.end();
    }
  ])(21);
});

test.cb('async value propagation', t => {
  seq([
    v => v + 1,
    immediate,
    v => v * 2,
    immediate,
    v => {
      t.is(v, 44);
      t.end();
    }
  ])(21);
});

test.cb('async error propagation', t => {
  seq([
    reject,
    [, e => +e + 1],
    immediate,
    reject,
    [, reject],
    [, e => e * 2],
    v => {
      t.is(v, 44);
      t.end();
    }
  ])(21);
});
