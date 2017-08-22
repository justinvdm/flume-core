// @flow
export type Unary<A, B> = A => Result<B>;
export type Nary<A, B> = (...A) => Result<B>;

export type Result<V> =
  | Promise<V>
  | V;

export type RawStep<A, B> =
  | Unary<A, B>
  | {|
    success?: Unary<A, B>,
    failure?: Unary<A, B>
  |};

export type Step<A,B> = {
  success: Unary<A, B>,
  failure: Unary<A, B>
};

export type StepResult<V> = {
  value: Result<V>,
  isError: boolean
};
