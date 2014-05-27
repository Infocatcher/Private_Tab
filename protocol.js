const P_CID = Components.ID("{e974cf10-11cb-4293-af88-e61c7dfe717c}"),
      P_CONTRACTID = "@mozilla.org/network/protocol;1?name=private",
      P_HANDLER = Components.interfaces.nsIProtocolHandler,
      P_SCHEME = "private",
      P_NAME = "Private Tab protocol handler";

var privateProtocol = {
	get compReg() {
		return Components.manager
			.QueryInterface(Components.interfaces.nsIComponentRegistrar);
	},
	init: function() {
		this.compReg.registerFactory(P_CID, P_NAME, P_CONTRACTID, this);
		_log("[protocol] Initialized");
	},
	destroy: function() {
		this.compReg.unregisterFactory(P_CID, this);
		_log("[protocol] Destroyed");
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
		uri.spec = spec;
		return uri;
	},
	newChannel: function(uri) {
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
		var channel = Services.io.newChannel(redirect, null, null);
		var ensurePrivate = function() {
			this.makeChannelPrivate(channel);
			ensurePrivate = function() {}; // Don't call again in case of success
		}.bind(this);
		var channelWrapper = {
			__proto__: channel,
			asyncOpen: function(aListener, aContext) {
				_log("[protocol] nsIChannel.asyncOpen() => ensurePrivate()");
				ensurePrivate();
				return channel.asyncOpen.apply(this, arguments);
			},
			open: function() {
				_log("[protocol] nsIChannel.open() => ensurePrivate()");
				ensurePrivate();
				return channel.open.apply(this, arguments);
			}
		};
		return channelWrapper;
	},

	makeChannelPrivate: function(channel) {
		try {
			if(channel.notificationCallbacks) {
				channel.notificationCallbacks
					.getInterface(Components.interfaces.nsILoadContext)
					.usePrivateBrowsing = true;
				return;
			}
		}
		catch(e) {
			Components.utils.reportError(e);
		}
		try {
			if(channel.loadGroup && channel.loadGroup.notificationCallbacks) {
				channel.loadGroup.notificationCallbacks
					.getInterface(Components.interfaces.nsILoadContext)
					.usePrivateBrowsing = true;
				return;
			}
		}
		catch(e) {
			Components.utils.reportError(e);
		}
		if(channel instanceof Components.interfaces.nsIPrivateBrowsingChannel) try {
			channel.setPrivate(true);
			return;
		}
		catch(e) {
			Components.utils.reportError(e);
		}
		throw Components.results.NS_ERROR_NO_INTERFACE;
	}
};