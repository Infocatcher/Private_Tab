var EXPORTED_SYMBOLS = ["patcher"];
var patcher = {
	// Do some magic to restore third party wrappers from other extensions
	wrapNS: "patcher::",
	init: function(ns, logger) {
		this.wrapNS = ns;
		if(logger)
			_log = logger;
	},
	destroy: function() {
		_log = function() {};
	},
	wrapFunction: function(obj, meth, key, callBefore, callAfter) {
		var win = Components.utils.getGlobalForObject(obj);
		var name = key;
		key = this.wrapNS + key;
		var orig, wrapped;
		if(!(key in win)) {
			_log("[patcher] Patch " + name);
			orig = obj[meth];
			wrapped = obj[meth] = callAfter
				? function wrapper() {
					var res = win[key].before.apply(this, arguments);
					if(res)
						return typeof res == "object" ? res.value : undefined;
					try {
						var ret = orig.apply(this, arguments);
					}
					catch(e) {
						Components.utils.reportError(e);
					}
					win[key].after.apply(this, [ret].concat(Array.slice(arguments)));
					return ret;
				}
				: function wrapper() {
					var res = win[key].before.apply(this, arguments);
					if(res)
						return typeof res == "object" ? res.value : undefined;
					return orig.apply(this, arguments);
				};
			// Someone may want to do eval() patch...
			var getGlobal = function() {
				if(win instanceof Components.interfaces.nsIDOMWindow)
					return ["window", ""];
				var global = "_global_" + Math.random().toFixed(14).substr(2);
				return [
					global,
					"\n\tvar " + global + " = Components.utils.getGlobalForObject(this);"
				];
			};
			var patch = callAfter
				? function(s) {
					var rnd = Math.random().toFixed(14).substr(2);
					var res = "_res_" + rnd;
					var ret = "_ret_" + rnd;
					var [global, ensureGlobal] = getGlobal();
					return s
						.replace(
							"{",
							"{" + ensureGlobal
							+ "\n\tvar " + res + " = " + global + '["' + key + '"].before.apply(this, arguments);\n'
							+ '\tif(' + res + ') return typeof ' + res + ' == "object" ? ' + res + '.value : undefined;\n'
							+ "\tvar " + ret + " = (function() {\n"
						)
						.replace(
							/\}$/,
							"\t}).apply(this, arguments);\n"
							+ "\t" + global + '["' + key + '"].after'
							+ '.apply(this, [' + ret + "].concat(Array.slice(arguments)));\n"
							+ "\treturn " + ret + ";\n"
							+ "}"
						);
				}
				: function(s) {
					var rnd = Math.random().toFixed(14).substr(2);
					var res = "_res_" + rnd;
					var [global, ensureGlobal] = getGlobal();
					return s.replace(
						"{",
						"{" + ensureGlobal
						+ "\n\tvar " + res + " = " + global + '["' + key + '"].before.apply(this, arguments);\n'
						+ '\tif(' + res + ') return typeof ' + res + ' == "object" ? ' + res + '.value : undefined;\n'
					);
				};
			wrapped.toString = function() {
				return patch(orig.toString());
			};
			wrapped.toSource = function() {
				return patch(orig.toSource());
			};
		}
		else {
			_log("[patcher] Will use previous patch for " + name);
			orig = win[key].orig; // Leave ability to unwrap (and break all third-party wrappers!)
		}
		if(callAfter)
			callAfter.before = callBefore;
		win[key] = {
			before:  callBefore,
			after:   callAfter,
			orig:    orig,
			wrapped: wrapped,
			enabled: true
		};
	},
	unwrapFunction: function(obj, meth, key, forceDestroy) {
		var win = Components.utils.getGlobalForObject(obj);
		var name = key;
		key = this.wrapNS + key;
		if(!(key in win))
			return;
		var wrapper = win[key];
		var wrapped = wrapper.wrapped;
		var canRestore = obj[meth] == wrapped;
		if(canRestore || forceDestroy) {
			_log("[patcher] Restore " + name + (canRestore ? "" : " [force]"));
			delete win[key];
			obj[meth] = wrapper.orig;
		}
		else {
			_log("[patcher] !!! Can't completely restore " + name + ": detected third-party wrapper!");
			if(wrapped) { // First failure, all next iterations will use already existing wrapper
				delete wrapped.toString;
				delete wrapped.toSource;
				wrapper.wrapped = undefined;
			}
			wrapper.before = wrapper.after = function empty() {};
			wrapper.enabled = false;
			if(win instanceof Components.interfaces.nsIDOMWindow) {
				win.addEventListener("unload", function destroyWrapper(e) {
					win.removeEventListener(e.type, destroyWrapper, false);
					delete win[key];
					obj[meth] = wrapper.orig;
				}, false);
			}
		}
	},
	isWrapped: function(obj, key) {
		var win = Components.utils.getGlobalForObject(obj);
		key = this.wrapNS + key;
		return key in win && win[key].enabled;
	}
};
function _log() {}