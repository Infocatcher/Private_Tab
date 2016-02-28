Components.utils.import("resource://gre/modules/Services.jsm");
if(Services.appinfo.processType == Services.appinfo.PROCESS_TYPE_CONTENT) {
	Components.utils.import("chrome://privatetab/content/protocol.jsm");
	privateProtocol.init(function() {});
	let global = this;
	addMessageListener("PrivateTab:ProtocolDestroy", function destroy(msg) {
		removeMessageListener("PrivateTab:ProtocolDestroy", destroy);
		privateProtocol.destroy();
		delete global.Services;
		delete global.privateProtocol;
		Components.utils.unload("chrome://privatetab/content/protocol.jsm");
	});
}