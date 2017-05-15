var EXPORTED_SYMBOLS = ["PrivateTabContent"];

Components.utils.import("resource://gre/modules/Services.jsm");
this.__defineGetter__("_log", function() {
	delete this._log;
	Services.scriptloader.loadSubScript("chrome://privatetab/content/log.js");
	return _log;
});

function PrivateTabContent(frameGlobal) {
	this.fg = frameGlobal;
	this.init();
}
PrivateTabContent.prototype = {
	instances: { // For global counter
		count: 0
	},
	get privacyContext() {
		return this.fg.docShell
			.QueryInterface(Components.interfaces.nsILoadContext);
	},
	get isPrivate() {
		return this.privacyContext.usePrivateBrowsing;
	},
	set isPrivate(isPrivate) {
		this.privacyContext.usePrivateBrowsing = isPrivate;
	},
	init: function() {
		++this.instances.count;
		this.fg.addEventListener("unload", this, false);
		this.fg.addMessageListener("PrivateTab:Action", this);
		this.fg.addMessageListener("SessionStore:restoreHistory", this);
	},
	destroy: function(force) {
		_log && _dbgv && _log(
			"[frame script] destroy(" + (force || "") + "), instances: " + this.instances.count
			+ ", current: " + this.fg.content.location.href.substr(0, 255)
		);
		this.fg.removeEventListener("unload", this, false);
		this.fg.removeMessageListener("PrivateTab:Action", this);
		this.fg.removeMessageListener("SessionStore:restoreHistory", this);
		this.fg = null;
		if(--this.instances.count == 0 && force) {
			_log("[frame script] unload content.jsm");
			Components.utils.unload("chrome://privatetab/content/content.jsm");
		}
	},
	handleEvent: function(e) {
		if(e.type == "unload" && e.target == this.fg)
			this.destroy();
	},
	receiveMessage: function(msg) {
		switch(msg.name) {
			case "PrivateTab:Action":           this.handleActionMessage(msg.data);    break;
			case "SessionStore:restoreHistory": this.handleSessionRestoring(msg.data);
		}
	},

	handleActionMessage: function(data) {
		switch(data.action) {
			case "GetState":
				this.fg.sendAsyncMessage("PrivateTab:PrivateState", { isPrivate: this.isPrivate });
			break;
			case "ToggleState":
				this.togglePrivate(data.isPrivate, data.silent || false);
			break;
			case "WaitLoading":
				this.waitLoading();
			break;
			case "GetImageDocumentDataURL":
				this.getImageDocumentDataURL();
			break;
			case "Destroy":
				this.destroy(true);
		}
	},
	handleSessionRestoring: function(data) {
		var tabData = data.tabData;
		var isPrivate = tabData && tabData.attributes && "privateTab-isPrivate" in tabData.attributes || false;
		if(isPrivate == this.isPrivate)
			_log("[frame script] handleSessionRestoring(): private state is already " + isPrivate);
		else {
			_log("[frame script] handleSessionRestoring(): private state -> " + isPrivate);
			this.isPrivate = isPrivate;
		}
	},

	togglePrivate: function(isPrivate, silent) {
		var needChange = true;
		if(isPrivate === undefined)
			isPrivate = !this.isPrivate;
		else if(isPrivate == this.isPrivate) // Nothing to do
			needChange = false;
		if(needChange)
			this.isPrivate = isPrivate;
		!silent && this.fg.sendAsyncMessage("PrivateTab:PrivateChanged", {
			isPrivate: isPrivate,
			reallyChanged: needChange
		});
	},
	waitLoading: function() {
		var fg = this.fg;
		function feedback() {
			fg.sendAsyncMessage("PrivateTab:ContentLoaded", {
				principal: fg.content.document.nodePrincipal
			});
		}
		var webProgress = fg.docShell.QueryInterface(Components.interfaces.nsIWebProgress);
		if(!webProgress.isLoadingDocument) {
			feedback();
			return;
		}
		fg.addEventListener("load", function onLoad(e) {
			if(e.target == fg.content.document) {
				fg.removeEventListener("load", onLoad, true);
				feedback();
			}
		}, true);
	},
	getImageDocumentDataURL: function() {
		var data = "";
		var doc = this.fg.content.document;
		var isImageDoc = doc instanceof Components.interfaces.nsIImageDocument;
		if(isImageDoc) {
			var req = doc.imageRequest;
			var image = req && req.image;
			try {
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
				_log("[frame script] getImageDocumentDataURL() => data:");
			}
			else {
				_log("[frame script] getImageDocumentDataURL(): image missing or too large");
			}
		}
		this.fg.sendAsyncMessage("PrivateTab:ImageDocumentDataURL", {
			isImageDocument: isImageDoc,
			dataURL: data
		});
	}
};