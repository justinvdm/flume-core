// @flow
export type PipeFn =
  & (<A,B,C>(A, B=>C) => C)
  & (<A,B,C>(A, [B=>C]) => C)
  & (<A,B,C,D>(A, [B=>C,C=>D]) => D)
  & (<A,B,C,D,E>(A, [B=>C,C=>D,D=>E]) => E)
  & (<A,B,C,D,E,F>(A, [B=>C,C=>D,D=>E,E=>F]) => F)
  & (<A,B,C,D,E,F,G>(A, [B=>C,C=>D,D=>E,E=>F,F=>G]) => G)
  & (<A,B,C,D,E,F,G,H>(A, [B=>C,C=>D,D=>E,E=>F,F=>G,G=>H]) => H)
  & (<A,B,C,D,E,F,G,H,I>(A, [B=>C,C=>D,D=>E,E=>F,F=>G,G=>H,H=>I]) => I)
  & (<A,B,C,D,E,F,G,H,I,J>(A, [B=>C,C=>D,D=>E,E=>F,F=>G,G=>H,H=>I,I=>J]) => J)
  & (<A,B,C,D,E,F,G,H,I,J,K>(A, [B=>C,C=>D,D=>E,E=>F,F=>G,G=>H,H=>I,I=>J,J=>K]) => K)
  & (<A,B,C,D,E,F,G,H,I,J,K,L>(A, [B=>C,C=>D,D=>E,E=>F,F=>G,G=>H,H=>I,I=>J,J=>K,K=>L]) => L)
  & (<A,B,C,D,E,F,G,H,I,J,K,L,M,N>(A, [B=>C,C=>D,D=>E,E=>F,F=>G,G=>H,H=>I,I=>J,J=>K,K=>L,L=>M,M=>N]) => N)
  & (<A,B,C,D,E,F,G,H,I,J,K,L,M,N,O>(A, [B=>C,C=>D,D=>E,E=>F,F=>G,G=>H,H=>I,I=>J,J=>K,K=>L,L=>M,M=>N,N=>O]) => O)
  & (<A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P>(A, [B=>C,C=>D,D=>E,E=>F,F=>G,G=>H,H=>I,I=>J,J=>K,K=>L,L=>M,M=>N,N=>O,O=>P]) => P)
  & (<A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q>(A, [B=>C,C=>D,D=>E,E=>F,F=>G,G=>H,H=>I,I=>J,J=>K,K=>L,L=>M,M=>N,N=>O,O=>P,P=>Q]) => Q)
  & (<A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R>(A, [B=>C,C=>D,D=>E,E=>F,F=>G,G=>H,H=>I,I=>J,J=>K,K=>L,L=>M,M=>N,N=>O,O=>P,P=>Q,Q=>R]) => R)
  & (<A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S>(A, [B=>C,C=>D,D=>E,E=>F,F=>G,G=>H,H=>I,I=>J,J=>K,K=>L,L=>M,M=>N,N=>O,O=>P,P=>Q,Q=>R,R=>S]) => S);
