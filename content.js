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
				var needChange = true;
				if(isPrivate === undefined)
					isPrivate = !this.isPrivate;
				else if(isPrivate == this.isPrivate) // Nothing to do
					needChange = false;
				if(needChange)
					this.isPrivate = isPrivate;
				!data.silent && sendAsyncMessage("PrivateTab:PrivateChanged", {
					isPrivate: isPrivate,
					reallyChanged: needChange
				});
			break;
			case "WaitLoading":
				var webProgress = docShell.QueryInterface(Components.interfaces.nsIWebProgress);
				if(!webProgress.isLoadingDocument)
					sendAsyncMessage("PrivateTab:ContentLoaded", { principal: content.document.nodePrincipal });
				else {
					addEventListener("load", function onLoad(e) {
						if(e.target == content.document) {
							removeEventListener("load", onLoad, true);
							sendAsyncMessage("PrivateTab:ContentLoaded", { principal: content.document.nodePrincipal });
						}
					}, true);
				}
			break;
			case "GetImageDocumentDataURL":
				var data = "";
				var isImageDoc = false;
				var doc = content.document;
				if(doc instanceof Components.interfaces.nsIImageDocument) {
					isImageDoc = true;
					var req = doc.imageRequest;
					var image = req && req.image;
					try {
						var {Services} = Components.utils.import("resource://gre/modules/Services.jsm", {});
						var maxSize = Services.prefs.getIntPref("browser.chrome.image_icons.max_size");
					}
					catch(e) {
						Components.utils.reportError(e);
						maxSize = 1024;
					}
					if(image && image.width <= maxSize && image.height <= maxSize) {
						var img = doc.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "img")[0];
						var canvas = doc.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
						canvas.width = image.width;
						canvas.height = image.height;
						var ctx = canvas.getContext("2d");
						ctx.drawImage(img, 0, 0);
						data = canvas.toDataURL();
					}
				}
				sendAsyncMessage("PrivateTab:ImageDocumentDataURL", {
					isImageDocument: isImageDoc,
					dataURL: data
				});
			break;
			case "Destroy":
				this.destroy();
		}
	}
};
remoteFrameHandler.init();