;(function (root, factory) {
  if (typeof root.define === 'function' && root.define.amd) {
    root.define(function () {
      return factory({})
    })
  } else if (typeof exports === 'object') {
    factory(exports)
  } else {
    factory((root.flume = root.flume || {}))
  }
})(this || 0, function (exports) {
  'use strict'

  function isOfKind (v, kind) {
    return (v || 0).__flumeKind === kind
  }

  function castValue (v) {
    return !isOfKind(v, 'msg') ? valueMsg(v) : v
  }

  function msg (type, value) {
    return {
      __flumeKind: 'msg',
      type: type,
      value: value
    }
  }

  function errorMsg (v) {
    return msg('error', v)
  }

  function valueMsg (v) {
    return msg('value', v)
  }

  function msgBind (fn) {
    return function msgBindFn (a) {
      return fn(castValue(a).value)
    }
  }

  function trap (type, fn) {
    return function trapFn (a) {
      return isOfKind(a, type) ? fn(a) : a
    }
  }

  exports.errorMsg = errorMsg
  exports.valueMsg = valueMsg
  exports.msgBind = msgBind
  exports.trap = trap
})
