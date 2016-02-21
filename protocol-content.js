(function(global) {
	try {
		// Trick to ignore non-remote tabs
		var window = content.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
			.getInterface(Components.interfaces.nsIWebNavigation)
			.QueryInterface(Components.interfaces.nsIDocShellTreeItem)
			.rootTreeItem
			.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
			.getInterface(Components.interfaces.nsIDOMWindow);
		if(window instanceof Components.interfaces.nsIDOMChromeWindow)
			return;
	}
	catch(e) {
	}

	var g = Components.utils.import("chrome://privatetab/content/protocol.jsm", {});
	g.privateProtocol.init(function() {});

	addEventListener("unload", destroy, false);
	addMessageListener("PrivateTab:Protocol:Destroy", destroyProtocol);

	function destroy(e) {
		if(e && e.target != global)
			return;
		removeEventListener("unload", destroy, false);
		removeMessageListener("PrivateTab:Protocol:Destroy", destroyProtocol);
	}
	function destroyProtocol(msg) {
		destroy();
		if(g.privateProtocol) { // Not yet unloaded
			g.privateProtocol.destroy();
			Components.utils.unload("chrome://privatetab/content/protocol.jsm");
		}
	}
})(this);