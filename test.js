// @flow
import test from 'ava'
import { pipeWith } from 'pipe-with'
import { valueMsg, msgBind } from '.'

test('msgBind', t => {
  const pipe = pipeWith(msgBind)
  const fn = pipe(v => v * 2, v => valueMsg(v + 1), v => v * 3)
  t.is(fn(2), 15)
})
