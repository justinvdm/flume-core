import test from 'ava';
import { input } from '.';


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
