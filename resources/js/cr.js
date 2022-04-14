var WebUIListener;
var cr = cr || function(global) {
  'use strict';
  function exportPath(name) {
    const parts = name.split('.');
    let cur = global;

    for (let part; parts.length && (part = parts.shift());) {
      if (part in cur) {
        cur = cur[part];
      } else {
        cur = cur[part] = {};
      }
    }
    return cur;
  }
  function dispatchPropertyChange(target, propertyName, newValue, oldValue) {
    const e = new Event(propertyName + 'Change');
    e.propertyName = propertyName;
    e.newValue = newValue;
    e.oldValue = oldValue;
    target.dispatchEvent(e);
  }
  function getAttributeName(jsName) {
    return jsName.replace(/([A-Z])/g, '-$1').toLowerCase();
  }
  const PropertyKind = {
    JS: 'js',

    ATTR: 'attr',

    BOOL_ATTR: 'boolAttr'
  };
  function getGetter(name, kind) {
    let attributeName;
    switch (kind) {
      case PropertyKind.JS:
        const privateName = name + '_';
        return function() {
          return this[privateName];
        };
      case PropertyKind.ATTR:
        attributeName = getAttributeName(name);
        return function() {
          return this.getAttribute(attributeName);
        };
      case PropertyKind.BOOL_ATTR:
        attributeName = getAttributeName(name);
        return function() {
          return this.hasAttribute(attributeName);
        };
    }

    throw 'not reached';
  }
  function getSetter(name, kind, opt_setHook) {
    let attributeName;
    switch (kind) {
      case PropertyKind.JS:
        const privateName = name + '_';
        return function(value) {
          const oldValue = this[name];
          if (value !== oldValue) {
            this[privateName] = value;
            if (opt_setHook) {
              opt_setHook.call(this, value, oldValue);
            }
            dispatchPropertyChange(this, name, value, oldValue);
          }
        };

      case PropertyKind.ATTR:
        attributeName = getAttributeName(name);
        return function(value) {
          const oldValue = this[name];
          if (value !== oldValue) {
            if (value === undefined) {
              this.removeAttribute(attributeName);
            } else {
              this.setAttribute(attributeName, value);
            }
            if (opt_setHook) {
              opt_setHook.call(this, value, oldValue);
            }
            dispatchPropertyChange(this, name, value, oldValue);
          }
        };

      case PropertyKind.BOOL_ATTR:
        attributeName = getAttributeName(name);
        return function(value) {
          const oldValue = this[name];
          if (value !== oldValue) {
            if (value) {
              this.setAttribute(attributeName, name);
            } else {
              this.removeAttribute(attributeName);
            }
            if (opt_setHook) {
              opt_setHook.call(this, value, oldValue);
            }
            dispatchPropertyChange(this, name, value, oldValue);
          }
        };
    }
    throw 'not reached';
  }
  function defineProperty(obj, name, opt_kind, opt_setHook) {
    if (typeof obj === 'function') {
      obj = obj.prototype;
    }

    const kind = /** @type {PropertyKind} */ (opt_kind || PropertyKind.JS);
    if (!obj.__lookupGetter__(name)) {
      obj.__defineGetter__(name, getGetter(name, kind));
    }
    if (!obj.__lookupSetter__(name)) {
      obj.__defineSetter__(name, getSetter(name, kind, opt_setHook));
    }
  }
  function getPropertyDescriptor(name, opt_kind, opt_setHook) {
    const kind = /** @type {PropertyKind} */ (opt_kind || PropertyKind.JS);

    const desc = {
      get: getGetter(name, kind),
      set: getSetter(name, kind, opt_setHook),
    };
    return desc;
  }

  let uidCounter = 1;

  function createUid() {
    return uidCounter++;
  }

  function dispatchSimpleEvent(target, type, opt_bubbles, opt_cancelable) {
    const e = new Event(type, {
      bubbles: opt_bubbles,
      cancelable: opt_cancelable === undefined || opt_cancelable
    });
    return target.dispatchEvent(e);
  }

  function define(name, fun) {
    const obj = exportPath(name);
    const exports = fun();
    for (const propertyName in exports) {
      const propertyDescriptor =
          Object.getOwnPropertyDescriptor(exports, propertyName);
      if (propertyDescriptor) {
        Object.defineProperty(obj, propertyName, propertyDescriptor);
      }
    }
  }

  function addSingletonGetter(ctor) {
    ctor.getInstance = function() {
      return ctor.instance_ || (ctor.instance_ = new ctor());
    };
  }

  const chromeSendResolverMap = {};

  function webUIResponse(id, isSuccess, response) {
    const resolver = chromeSendResolverMap[id];
    delete chromeSendResolverMap[id];

    if (isSuccess) {
      resolver.resolve(response);
    } else {
      resolver.reject(response);
    }
  }

  function sendWithPromise(methodName, var_args) {
    const args = Array.prototype.slice.call(arguments, 1);
    const promiseResolver = new PromiseResolver();
    const id = methodName + '_' + createUid();
    chromeSendResolverMap[id] = promiseResolver;
    chrome.send(methodName, [id].concat(args));
    return promiseResolver.promise;
  }

  const webUIListenerMap = {};

  function webUIListenerCallback(event, var_args) {
    const eventListenersMap = webUIListenerMap[event];
    if (!eventListenersMap) {
      return;
    }

    const args = Array.prototype.slice.call(arguments, 1);
    for (const listenerId in eventListenersMap) {
      eventListenersMap[listenerId].apply(null, args);
    }
  }

  function addWebUIListener(eventName, callback) {
    webUIListenerMap[eventName] = webUIListenerMap[eventName] || {};
    const uid = createUid();
    webUIListenerMap[eventName][uid] = callback;
    return {eventName: eventName, uid: uid};
  }

  function removeWebUIListener(listener) {
    const listenerExists = webUIListenerMap[listener.eventName] &&
        webUIListenerMap[listener.eventName][listener.uid];
    if (listenerExists) {
      delete webUIListenerMap[listener.eventName][listener.uid];
      return true;
    }
    return false;
  }

  return {
    addSingletonGetter: addSingletonGetter,
    define: define,
    defineProperty: defineProperty,
    getPropertyDescriptor: getPropertyDescriptor,
    dispatchPropertyChange: dispatchPropertyChange,
    dispatchSimpleEvent: dispatchSimpleEvent,
    PropertyKind: PropertyKind,

    addWebUIListener: addWebUIListener,
    removeWebUIListener: removeWebUIListener,
    sendWithPromise: sendWithPromise,
    webUIListenerCallback: webUIListenerCallback,
    webUIResponse: webUIResponse,

    get isMac() {
      return /Mac/.test(navigator.platform);
    },

    get isWindows() {
      return /Win/.test(navigator.platform);
    },

    get isChromeOS() {
      let returnValue = false;

      return returnValue;
    },

    get isLacros() {
      let returnValue = false;
      return returnValue;
    },

    get isLinux() {
      return /Linux/.test(navigator.userAgent);
    },

    get isAndroid() {
      return /Android/.test(navigator.userAgent);
    },

    get isIOS() {
      return /EdgiOS/.test(navigator.userAgent);
    }
  };
}(this);