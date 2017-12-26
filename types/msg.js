// @flow
export type MsgType<Type, Value> = {
  __flumeType: 'msg',
  type: Type,
  value: Value
};

export type NilMsg = MsgType<'__nil', null>;
export type ValueMsg<Value> = MsgType<'__value', Value>;

export type MsgList = {
  __flumeType: 'list',
  msgs: MsgType<mixed, mixed>
};
