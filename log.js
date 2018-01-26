const LOG_PREFIX = "[Private Tab] ";

if(!("Services" in this))
	Components.utils.import("resource://gre/modules/Services.jsm");
__defineGetter__.call(this, "_dbg", function() {
	return _boolPref("debug");
});
__defineSetter__.call(this, "_dbg", function(v) {
	delete this._dbg;
	return this._dbg = v;
});
__defineGetter__.call(this, "_dbgv", function() {
	return _boolPref("debug.verbose");
});
__defineSetter__.call(this, "_dbgv", function(v) {
	delete this._dbgv;
	return this._dbgv = v;
});
function _boolPref(pref) {
	pref = "extensions.privateTab." + pref;
	if(Services.prefs.getPrefType(pref) == Services.prefs.PREF_BOOL)
		return Services.prefs.getBoolPref(pref);
	return true; // Not yet initialized
}

function ts() {
	var d = new Date();
	var ms = d.getMilliseconds();
	return d.toTimeString().replace(/^.*\d+:(\d+:\d+).*$/, "$1") + ":" + "000".substr(("" + ms).length) + ms + " ";
}
function _log(s) {
	if(!_dbg)
		return;
	var msg = LOG_PREFIX + ts() + s;
	Services.console.logStringMessage(msg);
	dump(msg + "\n");
}
function _tab(tab) {
	return tab && _str(tab.label);
}
function _str(s) {
	return s && s.substr(0, 255);
}
function _p(isPrivate) {
	return isPrivate ? "private" : "not private";
}