// @flow
import type {Result} from './async';

export type BranchFn = <A,B,C>(
  testFn: A => Result<boolean>, 
  trueFn: A => B,
  falseFn: A => C
) => A => B | C;
