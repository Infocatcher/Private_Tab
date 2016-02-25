Components.utils.import("resource://gre/modules/Services.jsm");
if(Services.appinfo.processType == Services.appinfo.PROCESS_TYPE_CONTENT) {
	Components.utils.import("chrome://privatetab/content/protocol.jsm");
	privateProtocol.init(function() {});
	addMessageListener("PrivateTab:Protocol:Destroy", function destroy(msg) {
		removeMessageListener("PrivateTab:Protocol:Destroy", destroy);
		privateProtocol.destroy();
		privateProtocol = null;
		Components.utils.unload("chrome://privatetab/content/protocol.jsm");
	});
}