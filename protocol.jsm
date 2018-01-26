var EXPORTED_SYMBOLS = ["privateProtocol"];

const P_CID = Components.ID("{e974cf10-11cb-4293-af88-e61c7dfe717c}"),
      P_CONTRACTID = "@mozilla.org/network/protocol;1?name=private",
      P_HANDLER = Components.interfaces.nsIProtocolHandler,
      P_SCHEME = "private",
      P_NAME = "Private Tab protocol handler";

Components.utils.import("resource://gre/modules/Services.jsm");
__defineGetter__.call(this, "_log", function() {
	delete this._log;
	Services.scriptloader.loadSubScript("chrome://privatetab/content/log.js");
	return _log;
});
__defineSetter__.call(this, "_log", function(logger) {
	delete this._log;
	this._log = logger;
});

var privateProtocol = {
	get platformVersion() {
		delete this.platformVersion;
		return this.platformVersion = parseFloat(Services.appinfo.platformVersion);
	},
	get compReg() {
		return Components.manager
			.QueryInterface(Components.interfaces.nsIComponentRegistrar);
	},
	init: function(logger) {
		if(logger)
			_log = logger;
		this.compReg.registerFactory(P_CID, P_NAME, P_CONTRACTID, this);
		_log("[protocol] Initialized");
	},
	destroy: function() {
		this.compReg.unregisterFactory(P_CID, this);
		_log("[protocol] Destroyed");
		_log = function() {};
	},

	// nsIFactory
	createInstance: function(outer, iid) {
		if(outer != null)
			throw Components.results.NS_ERROR_NO_AGGREGATION;
		if(iid.equals(P_HANDLER))
			return this;
		throw Components.results.NS_ERROR_NO_INTERFACE;
	},
	lockFactory: function(lock) {
		throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
	},
	// nsISupports
	QueryInterface: function(iid) {
		if(
			iid.equals(Components.interfaces.nsISupports)
			|| iid.equals(Components.interfaces.nsIFactory)
			|| iid.equals(P_HANDLER)
		)
			return this;
		throw Components.results.NS_ERROR_NO_INTERFACE;
	},

	// nsIProtocolHandler
	defaultPort: -1,
	protocolFlags: P_HANDLER.URI_NORELATIVE
		| P_HANDLER.URI_NOAUTH
		| P_HANDLER.URI_FORBIDS_AUTOMATIC_DOCUMENT_REPLACEMENT
		//| P_HANDLER.URI_LOADABLE_BY_ANYONE
		| P_HANDLER.URI_DANGEROUS_TO_LOAD
		| P_HANDLER.URI_NON_PERSISTABLE,
	scheme: P_SCHEME,
	allowPort: function() {
		return false;
	},
	newURI: function(spec, originCharset, baseURI) {
		var uri = Components.classes["@mozilla.org/network/simple-uri;1"]
			.createInstance(Components.interfaces.nsIURI);
		// nsIURI.spec is read-only in Firefox 58+: https://bugzilla.mozilla.org/show_bug.cgi?id=1431204
		if("mutate" in uri)
			return uri.mutate().setSpec(spec).finalize();
		uri.spec = spec;
		return uri;
	},
	newChannel: function(uri) {
		return this.newChannel2(uri, null);
	},
	newChannel2: function(uri, loadInfo) {
		var spec = uri.spec;
		_log("[protocol] newChannel(): spec = " + spec);
		var newSpec = "";
		var schemePrefix = P_SCHEME + ":";
		// Example: private:///#http://example.com/ (legacy) or private:http://example.com/
		if(spec && spec.startsWith(schemePrefix))
			newSpec = spec.substr(schemePrefix.length).replace(/^\/*#?/, "");
		_log("[protocol] newChannel(): newSpec = " + newSpec);

		// We can't use newChannel(newSpec, ...) here - strange things happens
		// Also we can't use nsIPrivateBrowsingChannel.setPrivate(true) for chrome:// URI
		var redirect = "chrome://privatetab/content/protocolRedirect.html#" + newSpec;
		var channel = "newChannelFromURIWithLoadInfo" in Services.io // Firefox 37+
			&& (loadInfo || this.platformVersion >= 44) // Throws in Firefox 37-43 with null nsILoadInfo
			? Services.io.newChannelFromURIWithLoadInfo(
				Services.io.newURI(redirect, null, null),
				loadInfo
			)
			: Services.io.newChannel(redirect, null, null); // Deprecated in Firefox 48+
		var ensurePrivate = function(reason) {
			_log("[protocol] " + reason + " => ensurePrivate()");
			var isPrivate = this.makeChannelPrivate(channel);
			ensurePrivate = function() { return true; }; // Don't call again in case of success
			if(!isPrivate) // Don't load, will use workaround with tab duplication
				channel.cancel(Components.results.NS_BINDING_ABORTED);
			return isPrivate;
		}.bind(this);
		function proxy(method) {
			return function() {
				return ensurePrivate("nsIChannel." + method + "()")
					&& channel[method].apply(this, arguments);
			};
		}
		Services.tm.mainThread.dispatch(function() {
			ensurePrivate("fallback delay");
		}, Components.interfaces.nsIThread.DISPATCH_NORMAL);
		return {
			__proto__: channel,
			asyncOpen:  proxy("asyncOpen"),
			asyncOpen2: proxy("asyncOpen2"),
			open:       proxy("open"),
			open2:      proxy("open2")
		};
	},

	makeChannelPrivate: function(channel) {
		var loadContext = this.getLoadContext(channel);
		if(loadContext) try {
			if(loadContext.usePrivateBrowsing) // Already private
				return true;
			loadContext.usePrivateBrowsing = true;
			return true;
		}
		catch(e) {
			if( // See https://github.com/Infocatcher/Private_Tab/issues/251
				this.platformVersion >= 52
				&& this.fixTabFromLoadContext(loadContext, channel.URI.ref)
			)
				return undefined;
			Components.utils.reportError(e);
		}
		if(channel instanceof Components.interfaces.nsIPrivateBrowsingChannel) try {
			channel.setPrivate(true);
			return true;
		}
		catch(e) {
			Components.utils.reportError(e);
		}
		throw Components.results.NS_ERROR_NO_INTERFACE;
	},
	getLoadContext: function(channel) {
		try {
			if(channel.notificationCallbacks) {
				return channel.notificationCallbacks
					.getInterface(Components.interfaces.nsILoadContext);
			}
		}
		catch(e) {
			Components.utils.reportError(e);
		}
		try {
			if(channel.loadGroup && channel.loadGroup.notificationCallbacks) {
				return channel.loadGroup.notificationCallbacks
					.getInterface(Components.interfaces.nsILoadContext);
			}
		}
		catch(e) {
			Components.utils.reportError(e);
		}
		return null;
	},
	fixTabFromLoadContext: function(loadContext, uri) {
		if(loadContext.useRemoteTabs) {
			_log("[protocol] fixTabFromLoadContext(): in content process");
			var mm = loadContext.associatedWindow
				.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
				.getInterface(Components.interfaces.nsIDocShell)
				.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
				.getInterface(Components.interfaces.nsIContentFrameMessageManager);
			var res = mm.sendSyncMessage("PrivateTab:ProtocolReplaceTab", { URI: uri });
			return res && res[0];
		}
		var browser = loadContext.topFrameElement;
		if(!browser) {
			_log("[protocol] fixTabFromLoadContext(): missing loadContext.topFrameElement");
			return false;
		}
		var window = browser.ownerDocument.defaultView;
		var pt = window.privateTab || null;
		if(!pt) {
			_log("[protocol] fixTabFromLoadContext(): missing window.privateTab");
			return false;
		}
		return pt._fixBrowserFromProtocol(browser, uri);
	}
};