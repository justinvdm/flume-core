// @flow
/* eslint-disable no-unused-vars */

import { pipeWith } from 'pipe-with'
import { valueMsg, msgBind, type Msg } from '.'

const test = (description, fn) => {}

test('msgBind', () => {
  const pipe = pipeWith(msgBind)
  pipe(v => v * 2, v => valueMsg(v + 1), v => v * 3)

  pipe(
    (v: number): number => v * 2,
    (v: number): Msg<number> => valueMsg(v + 1),
    (v: number): number => v * 3
  )

  pipe(
    (v: number): number => v * 2,
    // $ExpectError
    (v: string): Msg<string> => valueMsg(v.toString()),
    (v: number): number => v * 3
  )
})
