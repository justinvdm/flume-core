// @flow
import type {Nary, Result, RawStep} from './async';

export type SeqFn =
  & (<A,B>([Nary<A,B>])=>(...A)=>Result<B>)
  & (<A,B,C>([Nary<A,B>,RawStep<B,C>])=>(...A)=>Result<C>)
  & (<A,B,C,D>([Nary<A,B>,RawStep<B,C>,RawStep<C,D>])=>(...A)=>Result<D>)
  & (<A,B,C,D,E>([Nary<A,B>,RawStep<B,C>,RawStep<C,D>,RawStep<D,E>])=>(...A)=>Result<E>)
  & (<A,B,C,D,E,F>([Nary<A,B>,RawStep<B,C>,RawStep<C,D>,RawStep<D,E>,RawStep<E,F>])=>(...A)=>Result<F>)
  & (<A,B,C,D,E,F,G>([Nary<A,B>,RawStep<B,C>,RawStep<C,D>,RawStep<D,E>,RawStep<E,F>,RawStep<F,G>])=>(...A)=>Result<G>)
  & (<A,B,C,D,E,F,G,H>([Nary<A,B>,RawStep<B,C>,RawStep<C,D>,RawStep<D,E>,RawStep<E,F>,RawStep<F,G>,RawStep<G,H>])=>(...A)=>Result<H>)
  & (<A,B,C,D,E,F,G,H,I>([Nary<A,B>,RawStep<B,C>,RawStep<C,D>,RawStep<D,E>,RawStep<E,F>,RawStep<F,G>,RawStep<G,H>,RawStep<H,I>])=>(...A)=>Result<I>);
