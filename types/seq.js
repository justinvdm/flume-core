// @flow
import type { Nary, Result, Step } from './async';

export type SeqFn =
  & (<A,B>([Nary<A,B>]) => (...A) => Result<B>)
  & (<A,B,C>([Nary<A,B>,Step<B,C>]) => (...A) => Result<C>)
  & (<A,B,C,D>([Nary<A,B>,Step<B,C>,Step<C,D>]) => (...A) => Result<D>)
  & (<A,B,C,D,E>([Nary<A,B>,Step<B,C>,Step<C,D>,Step<D,E>]) => (...A) => Result<E>)
  & (<A,B,C,D,E,F>([Nary<A,B>,Step<B,C>,Step<C,D>,Step<D,E>,Step<E,F>]) => (...A) => Result<F>)
  & (<A,B,C,D,E,F,G>([Nary<A,B>,Step<B,C>,Step<C,D>,Step<D,E>,Step<E,F>,Step<F,G>]) => (...A) => Result<G>)
  & (<A,B,C,D,E,F,G,H>([Nary<A,B>,Step<B,C>,Step<C,D>,Step<D,E>,Step<E,F>,Step<F,G>,Step<G,H>]) => (...A) => Result<H>)
  & (<A,B,C,D,E,F,G,H,I>([Nary<A,B>,Step<B,C>,Step<C,D>,Step<D,E>,Step<E,F>,Step<F,G>,Step<G,H>,Step<H,I>]) => (...A) => Result<I>)
  & (<A,B,C,D,E,F,G,H,I,J>([Nary<A,B>,Step<B,C>,Step<C,D>,Step<D,E>,Step<E,F>,Step<F,G>,Step<G,H>,Step<H,I>,Step<I,J>]) => (...A) => Result<J>)
  & (<A,B,C,D,E,F,G,H,I,J,K>([Nary<A,B>,Step<B,C>,Step<C,D>,Step<D,E>,Step<E,F>,Step<F,G>,Step<G,H>,Step<H,I>,Step<I,J>,Step<J,K>]) => (...A) => Result<K>)
  & (<A,B,C,D,E,F,G,H,I,J,K,L>([Nary<A,B>,Step<B,C>,Step<C,D>,Step<D,E>,Step<E,F>,Step<F,G>,Step<G,H>,Step<H,I>,Step<I,J>,Step<J,K>,Step<K,L>]) => (...A) => Result<L>)
  & (<A,B,C,D,E,F,G,H,I,J,K,L,M>([Nary<A,B>,Step<B,C>,Step<C,D>,Step<D,E>,Step<E,F>,Step<F,G>,Step<G,H>,Step<H,I>,Step<I,J>,Step<J,K>,Step<K,L>,Step<L,M>]) => (...A) => Result<M>)
  & (<A,B,C,D,E,F,G,H,I,J,K,L,M,N>([Nary<A,B>,Step<B,C>,Step<C,D>,Step<D,E>,Step<E,F>,Step<F,G>,Step<G,H>,Step<H,I>,Step<I,J>,Step<J,K>,Step<K,L>,Step<L,M>,Step<M,N>]) => (...A) => Result<N>)
  & (<A,B,C,D,E,F,G,H,I,J,K,L,M,N,O>([Nary<A,B>,Step<B,C>,Step<C,D>,Step<D,E>,Step<E,F>,Step<F,G>,Step<G,H>,Step<H,I>,Step<I,J>,Step<J,K>,Step<K,L>,Step<L,M>,Step<M,N>,Step<N,O>]) => (...A) => Result<O>)
  & (<A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P>([Nary<A,B>,Step<B,C>,Step<C,D>,Step<D,E>,Step<E,F>,Step<F,G>,Step<G,H>,Step<H,I>,Step<I,J>,Step<J,K>,Step<K,L>,Step<L,M>,Step<M,N>,Step<N,O>,Step<O,P>]) => (...A) => Result<P>)
  & (<A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q>([Nary<A,B>,Step<B,C>,Step<C,D>,Step<D,E>,Step<E,F>,Step<F,G>,Step<G,H>,Step<H,I>,Step<I,J>,Step<J,K>,Step<K,L>,Step<L,M>,Step<M,N>,Step<N,O>,Step<O,P>,Step<P,Q>]) => (...A) => Result<Q>)
  & (<A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R>([Nary<A,B>,Step<B,C>,Step<C,D>,Step<D,E>,Step<E,F>,Step<F,G>,Step<G,H>,Step<H,I>,Step<I,J>,Step<J,K>,Step<K,L>,Step<L,M>,Step<M,N>,Step<N,O>,Step<O,P>,Step<P,Q>,Step<Q,R>]) => (...A) => Result<R>)
  & (<A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S>([Nary<A,B>,Step<B,C>,Step<C,D>,Step<D,E>,Step<E,F>,Step<F,G>,Step<G,H>,Step<H,I>,Step<I,J>,Step<J,K>,Step<K,L>,Step<L,M>,Step<M,N>,Step<N,O>,Step<O,P>,Step<P,Q>,Step<Q,R>,Step<R,S>]) => (...A) => Result<S>);
