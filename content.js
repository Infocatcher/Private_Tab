var global = this;
var remoteFrameHandler = {
	privacyContext: docShell.QueryInterface(Components.interfaces.nsILoadContext),
	get isPrivate() {
		return this.privacyContext.usePrivateBrowsing;
	},
	set isPrivate(isPrivate) {
		this.privacyContext.usePrivateBrowsing = isPrivate;
	},
	init: function() {
		addEventListener("unload", this, false);
		addMessageListener("PrivateTab:Action", this);
	},
	destroy: function() {
		removeEventListener("unload", this, false);
		removeMessageListener("PrivateTab:Action", this);
		var g = global;
		delete g.global;
		delete g.remoteFrameHandler;
	},
	handleEvent: function(e) {
		if(e.type == "unload" && e.target == global)
			this.destroy();
	},
	receiveMessage: function(msg) {
		var data = msg.data;
		switch(data.action) {
			case "GetSatet":
				sendAsyncMessage("PrivateTab:PrivateState", { isPrivate: this.isPrivate });
			break;
			case "ToggleState":
				var isPrivate = data.isPrivate;
				if(isPrivate === undefined)
					isPrivate = !this.isPrivate;
				else if(isPrivate == this.isPrivate) // Nothing to do
					break;
				this.isPrivate = isPrivate;
				if(!data.silent)
					sendAsyncMessage("PrivateTab:PrivateChanged", { isPrivate: isPrivate });
			break;
			case "Destroy":
				this.destroy();
		}
	}
};
remoteFrameHandler.init();