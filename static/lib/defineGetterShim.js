/*
 @fileOverview Shim for missing __defineGetter__ and __defineSetter__

 Emulate legacy getter/setter API using ES5 APIs.
 Since __defineGetter__ and __defineSetter__ are not supported any longer as of IE 9+

 This is taken directly from Allen Wirfs-Brock's blog at:
 http://blogs.msdn.com/b/ie/archive/2010/09/07/transitioning-existing-code-to-the-es5-getter-setter-apis.aspx

 */

try {
    if (!Object.prototype.__defineGetter__ &&
        Object.defineProperty({}, "x", { get: function () {
            return true
        } }).x) {
        Object.defineProperty(Object.prototype, "__defineGetter__",
            { enumerable: false, configurable: true,
                value: function (name, func) {
                    Object.defineProperty(this, name,
                        { get: func, enumerable: true, configurable: true });
                }
            });
        Object.defineProperty(Object.prototype, "__defineSetter__",
            { enumerable: false, configurable: true,
                value: function (name, func) {
                    Object.defineProperty(this, name,
                        { set: func, enumerable: true, configurable: true });
                }
            });
    }
} catch (defPropException) {
    /*Do nothing if an exception occurs*/
}
