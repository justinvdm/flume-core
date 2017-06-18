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
})
