// @flow
export type Unary<A,B> = A => Result<B>;
export type Nary<A,B> = (...A) => Result<B>;

export type Result<V> =
  | V
  | Promise<V>;

export type Step<A,B> =
  | Unary<A, B>
  | {success?: Unary<A, B>}
  | {failure: Unary<A, B>}
  | {
    success: Unary<A, B>,
    failure?: Unary<A, B>
  };

export type StepResult<V> = {
  value: V,
  isError: boolean
};
