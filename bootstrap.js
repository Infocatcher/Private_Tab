const WINDOW_LOADED = -1;
const WINDOW_CLOSED = -2;

const XULNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
this.__defineGetter__("patcher", function() {
	delete this.patcher;
	Components.utils.import("chrome://privatetab/content/patcher.jsm");
	patcher.init("privateTabMod::", _log);
	return patcher;
});

function install(params, reason) {
	try {
		Services.strings.flushBundles(); // https://bugzilla.mozilla.org/show_bug.cgi?id=719376
	}
	catch(e) {
		Components.utils.reportError(e);
	}
}
function uninstall(params, reason) {
}
function startup(params, reason) {
	privateTab.init(reason);
}
function shutdown(params, reason) {
	privateTab.destroy(reason);
}

var privateTab = {
	initialized: false,
	init: function(reason) {
		if(this.initialized)
			return;
		this.initialized = true;

		Services.scriptloader.loadSubScript("chrome://privatetab/content/log.js");
		prefs.init();
		_dbg = prefs.get("debug", false);
		_dbgv = prefs.get("debug.verbose", false);

		if(prefs.get("enablePrivateProtocol"))
			this.initPrivateProtocol(reason);

		this.patchPrivateBrowsingUtils(true);
		this.appButtonDontChange = !prefs.get("fixAppButtonWidth");

		for(var window of this.windows)
			this.initWindow(window, reason);
		if(reason == APP_STARTUP) {
			// https://bugzilla.mozilla.org/show_bug.cgi?id=1336227
			// browser.startup.blankWindow = true, Firefox 60+
			var blankWindow = Services.wm.getMostRecentWindow("navigator:blank");
			blankWindow && this.observe(blankWindow, "domwindowopened");
		}
		Services.ww.registerNotification(this);
		if(this.canFilterSession)
			Services.obs.addObserver(this, "sessionstore-state-write", false);
		else if(
			window
			&& reason != APP_STARTUP
			&& prefs.get("rememberClosedPrivateTabs")
		) { // We may already have closed private tabs
			window.setTimeout(function() {
				this.dontSaveClosedPrivateTabs(true);
			}.bind(this), 50);
		}
	},
	destroy: function(reason) {
		if(!this.initialized)
			return;
		this.initialized = false;

		this.destroyPrivateProtocol(reason);

		if(reason == ADDON_DISABLE || reason == ADDON_UNINSTALL)
			this.askToClosePrivateTabs();

		for(var window of this.windows)
			this.destroyWindow(window, reason);
		Services.ww.unregisterNotification(this);

		if(reason != APP_SHUTDOWN) {
			// nsISessionStore may save data after our shutdown
			if(this.canFilterSession)
				Services.obs.removeObserver(this, "sessionstore-state-write");
			else
				this.dontSaveClosedPrivateTabs(false);

			this.addPbExitObserver(false);
			this.unloadStyles();
			this.restoreAppButtonWidth();
			this.patchPrivateBrowsingUtils(false);

			if(reason != ADDON_DISABLE)
				this.saveEmptyTabLabels();
		}

		prefs.destroy();
		this._dndPrivateNode = null;
		patcher.destroy();
		Components.utils.unload("chrome://privatetab/content/patcher.jsm");
	},

	observe: function(subject, topic, data) {
		if(topic == "domwindowopened") {
			if(!subject.opener) {
				var aw = Services.ww.activeWindow;
				if(aw && this.isTargetWindow(aw))
					subject.__privateTabOpener = aw;
			}
			subject.addEventListener("load", this, false);
		}
		else if(topic == "domwindowclosed")
			this.destroyWindow(subject, WINDOW_CLOSED);
		else if(topic == "sessionstore-state-write")
			this.filterSession(subject);
		else if(topic == "browser-delayed-startup-finished") {
			_log(topic + " => setupJumpLists()");
			this.setupJumpListsLazy(false);
			subject.setTimeout(function() {
				this.setupJumpLists(true, true);
			}.bind(this), 0);
		}
		else if(topic == "last-pb-context-exited") {
			_log(topic);
			var timer = Components.classes["@mozilla.org/timer;1"]
				.createInstance(Components.interfaces.nsITimer);
			timer.init(function() {
				if(this.hasPrivate) {
					_log("Looks like wrong " + topic + " (found opened private tab/window), ignore");
					return;
				}
				if(this.cleanupClosedPrivateTabs) {
					_log(topic + " => forgetAllClosedTabs()");
					this.forgetAllClosedTabs();
				}
				this.clearSearchBars();
			}.bind(this), 0, timer.TYPE_ONE_SHOT);
		}
	},
	receiveMessage: function(msg) {
		if(msg.name == "PrivateTab:ProtocolURILoaded")
			this.handleProtocolBrowser(msg.target, msg.data.URI);
		else if(msg.name == "PrivateTab:ProtocolReplaceTab")
			return this.fixBrowserFromProtocol(msg.target, msg.data.URI);
		return undefined;
	},

	handleEvent: function(e) {
		switch(e.type) {
			case "load":                      this.loadHandler(e);           break;
			case "TabOpen":                   this.tabOpenHandler(e);        break;
			case "SSTabRestoring":            this.tabRestoringHandler(e);   break;
			case "TabSelect":                 this.tabSelectHandler(e);      break;
			case "TabClose":                  this.tabCloseHandler(e);       break;
			case "SSTabClosing":              this.tabClosingHandler(e);     break;
			case "dragstart":                 this.dragStartHandler(e);      break;
			case "dragend":                   this.dragEndHandler(e);        break;
			case "drop":                      this.dropHandler(e);           break;
			case "popupshowing":              this.popupShowingHandler(e);   break;
			case "ViewShowing":               this.viewShowingHandler(e);    break;
			case "command":                   this.commandHandler(e);        break;
			case "click":                     this.clickHandler(e);          break;
			case "keydown":
			case "keypress":                  this.keypressHandler(e);       break;
			case "PrivateTab:PrivateChanged": this.privateChangedHandler(e); break;
			case "TabRemotenessChange":       this.fixTabRemoteness(e);      break;
			case "SSWindowStateBusy":         this.setWindowBusy(e, true);   break;
			case "SSWindowStateReady":        this.setWindowBusy(e, false);  break;
			case "close":
			case "beforeunload":
			case "SSWindowClosing":           this.windowClosingHandler(e);  break;
			case "aftercustomization":        this.updateToolbars(e);        break;
			case "mouseover":
			case "mouseout":                  this.filterMouseEvent(e);
		}
	},
	loadHandler: function(e) {
		var window = e.currentTarget;
		window.removeEventListener("load", this, false);
		this.initWindow(window, WINDOW_LOADED);
	},
	windowClosingHandler: function(e) {
		var window = e.currentTarget;
		_log("windowClosingHandler() [" + e.type + "]");
		if(e.type == "close" || e.type == "beforeunload") {
			if(e.defaultPrevented) {
				_log(e.type + ": Someone already prevent window closing");
				return;
			}
			if(
				(this.isPrivateWindow(window) || this.hasPrivateTab(window))
				&& this.isLastPrivate(window)
			) {
				_log("Closing window with last private tab(s)");
				if(this.forbidCloseLastPrivate()) {
					_log("Prevent closing window with last private tab(s)");
					e.preventDefault();
					return;
				}
				else {
					var pt = window.privateTab;
					pt._checkLastPrivate = false;
					window.setTimeout(function() { // OK, seems like window stay open
						pt._checkLastPrivate = true;
					}, 50);
				}
			}
			if(!this.isSeaMonkey)
				return; // This is Firefox, will wait for "SSWindowClosing"
		}
		if( //~ todo: this looks like SeaMonkey bug... and may be fixed later
			(this.isSeaMonkey || !this.isPrivateWindow(window))
			&& (
				!prefs.get("rememberClosedPrivateTabs")
				|| prefs.get("rememberClosedPrivateTabs.cleanup") > 0
			)
		) {
			// Note: we don't have public API to tweak closed windows data,
			// so we remove all private tabs from closing window
			_log(e.type + " => closePrivateTabs()");
			this.closePrivateTabs(window);
		}
		if(this.cleanupClosedPrivateTabs)
			this.forgetClosedTabs(window);
		this.destroyWindowClosingHandler(window);
	},
	destroyWindowClosingHandler: function(window) {
		window.removeEventListener("TabClose", this, true);
		window.removeEventListener("TabClose", this, false);
		window.removeEventListener("SSTabClosing", this, false);
		window.removeEventListener("SSWindowClosing", this, true);
		window.removeEventListener("close", this, false);
		window.removeEventListener("beforeunload", this, false);
	},

	get frameScriptUID() { // See https://bugzilla.mozilla.org/show_bug.cgi?id=1051238
		delete this.frameScriptUID;
		return this.frameScriptUID = "?" + Date.now();
	},
	initPrivateProtocol: function(reason) {
		if("privateProtocol" in this)
			return;
		Components.utils.import("chrome://privatetab/content/protocol.jsm", this);
		this.privateProtocol.init(_log);
		if("ppmm" in Services) {
			Services.ppmm.loadProcessScript("chrome://privatetab/content/protocol-process.js" + this.frameScriptUID, true);
			Services.mm.addMessageListener("PrivateTab:ProtocolURILoaded", this);
			Services.mm.addMessageListener("PrivateTab:ProtocolReplaceTab", this);
		}

		if(prefs.get("showItemInTaskBarJumpList")) {
			if(reason == APP_STARTUP)
				this.setupJumpListsLazy(true);
			else
				this.setupJumpLists(true);
		}
	},
	destroyPrivateProtocol: function(reason) {
		if(!("privateProtocol" in this))
			return;
		this.privateProtocol.destroy();
		Components.utils.unload("chrome://privatetab/content/protocol.jsm");
		delete this.privateProtocol;
		if("ppmm" in Services) {
			Services.ppmm.broadcastAsyncMessage("PrivateTab:ProtocolDestroy", {});
			Services.ppmm.removeDelayedProcessScript("chrome://privatetab/content/protocol-process.js" + this.frameScriptUID);
			Services.mm.removeMessageListener("PrivateTab:ProtocolURILoaded", this);
			Services.mm.removeMessageListener("PrivateTab:ProtocolReplaceTab", this);
		}

		if(prefs.get("showItemInTaskBarJumpList")) {
			this.setupJumpListsLazy(false);
			this.setupJumpLists(false);
		}
	},

	get hasJumpLists() {
		delete this.hasJumpLists;
		return this.hasJumpLists = "@mozilla.org/windows-taskbar;1" in Components.classes
			&& Components.classes["@mozilla.org/windows-taskbar;1"]
				.getService(Components.interfaces.nsIWinTaskbar)
				.available;
	},
	_jumpListsInitialized: false,
	setupJumpLists: function(init, lazy) {
		if(
			!this.hasJumpLists
			|| init == this._jumpListsInitialized
		)
			return;
		this._jumpListsInitialized = init;

		var global = Components.utils.import("resource:///modules/WindowsJumpLists.jsm", {});
		if(!("tasksCfg" in global)) {
			_log('setupJumpLists() failed: "tasksCfg" not found in WindowsJumpLists.jsm');
			return;
		}
		var tasksCfg = global.tasksCfg;
		function getEntryIndex(check) {
			for(var i = 0, l = tasksCfg.length; i < l; ++i) {
				var entry = tasksCfg[i];
				if(check(entry))
					return i;
			}
			return -1;
		}
		if(init) {
			var sm = this.isSeaMonkey ? "SM" : "";
			var getNewTabURL = function() {
				if("nsIAboutNewTabService" in Components.interfaces) try { // Firefox 44+
					// See https://bugzilla.mozilla.org/show_bug.cgi?id=1204983#c89
					var aboutNewTabService = Components.classes["@mozilla.org/browser/aboutnewtab-service;1"]
						.getService(Components.interfaces.nsIAboutNewTabService);
					return aboutNewTabService.newTabURL;
				}
				catch(e) {
					Components.utils.reportError(e);
				}
				try { // Firefox 42+
					var {NewTabURL} = Components.utils.import("resource:///modules/NewTabURL.jsm", {});
					return NewTabURL.get();
				}
				catch(e) {
					if(NewTabURL)
						Components.utils.reportError(e);
				}
				return prefs.getPref("browser.newtab.url") || "about:blank";
			};
			var ptEntry = {
				title:       this.getLocalized("taskBarOpenNewPrivateTab" + sm),
				description: this.getLocalized("taskBarOpenNewPrivateTabDesc" + sm),
				get args() {
					return "-new-tab private:" + getNewTabURL();
				},
				iconIndex:   this.isSeaMonkey ? 0 : 4, // Private browsing mode icon
				open:        true,
				close:       true,
				_privateTab: true
			};
			var i = getEntryIndex(function(entry) {
				return entry.args == "-new-tab about:blank";
			});
			if(i != -1) {
				tasksCfg.splice(i + 1, 0, ptEntry);
				_log('setupJumpLists(): add new item after "Open new tab"');
			}
			else {
				tasksCfg.push(ptEntry);
				_log("setupJumpLists(): add new item at end");
			}
			this.updateJumpList = updateJumpList;
			Services.prefs.addObserver("browser.newtab.url", updateJumpList, false);
			Services.obs.addObserver(updateJumpList, "newtab-url-changed", false); // Firefox 42+
		}
		else {
			var i = getEntryIndex(function(entry) {
				return "_privateTab" in entry;
			});
			if(i != -1) {
				tasksCfg.splice(i, 1);
				_log("setupJumpLists(): remove item");
			}
			else {
				_log("setupJumpLists(): item not found and can't be removed");
			}
			Services.prefs.removeObserver("browser.newtab.url", this.updateJumpList);
			Services.obs.removeObserver(this.updateJumpList, "newtab-url-changed"); // Firefox 42+
			delete this.updateJumpList;
		}
		function updateJumpList() {
			var WinTaskbarJumpList = global.WinTaskbarJumpList;
			var pending = WinTaskbarJumpList._pendingStatements;
			if(!pending) {
				pending = {};
				Components.utils.reportError(LOG_PREFIX + "updateJumpList(): can't get state of pending statements");
			}
			var timer = Components.classes["@mozilla.org/timer;1"]
				.createInstance(Components.interfaces.nsITimer);
			var stopWait = Date.now() + 5e3;
			timer.init(function() {
				for(var statement in pending) {
					if(Date.now() > stopWait)
						timer.cancel();
					return;
				}
				timer.cancel();
				WinTaskbarJumpList.update();
				_log("WinTaskbarJumpList.update()");
			}, lazy ? 150 : 50, timer.TYPE_REPEATING_SLACK);
		}
		updateJumpList();
	},
	_hasDelayedStartupObserver: false,
	setupJumpListsLazy: function(init) {
		if(init == this._hasDelayedStartupObserver)
			return;
		this._hasDelayedStartupObserver = init;
		// Like _onFirstWindowLoaded() from resource:///components/nsBrowserGlue.js
		if(init)
			Services.obs.addObserver(this, "browser-delayed-startup-finished", false);
		else
			Services.obs.removeObserver(this, "browser-delayed-startup-finished");
	},

	initWindow: function(window, reason) {
		if(reason == WINDOW_LOADED && !this.isTargetWindow(window)) {
			delete window.__privateTabOpener;
			return;
		}

		_dbgv && _log("initWindow()");
		var gBrowser = window.gBrowser
			|| window.getBrowser(); // For SeaMonkey
		window.privateTab = new API(window);
		var document = window.document;
		this.loadStyles(window);
		this.ensureTitleModifier(document);
		this.patchBrowsers(gBrowser, true);
		this.patchTabIcons(window, true);
		window.setTimeout(function() {
			// We don't need patched functions right after window "load", so it's better to
			// apply patches after any other extensions
			this.patchBrowserThumbnails(window, true);
			window.setTimeout(function() {
				this.patchWarnAboutClosingWindow(window, true);
				// Wait to not break BROWSER_NEW_TAB_URL in detached window
				this.patchTabBrowserDND(window, gBrowser, true);
				this.patchViewSource(window, true);
			}.bind(this), 50);
			this.importEmptyTabLabels();
			if("TrackingProtection" in window) { // Firefox 42+
				var identityPopup = document.getElementById("identity-popup");
				identityPopup && identityPopup.addEventListener("popupshowing", this, true);
			}
		}.bind(this), 0);

		if(reason == WINDOW_LOADED)
			this.inheritWindowState(window);
		// Show real tab state, but after small delay for better startup performance
		window.setTimeout(function() {
			forEach(gBrowser.tabs, function(tab) {
				this.setTabState(tab);
			}, this);
		}.bind(this), 0);

		if(this.isPrivateWindow(window)) {
			// All tabs should be private... so, update state before real check
			forEach(gBrowser.tabs, function(tab) {
				tab.setAttribute(this.privateAttr, "true");
			}, this);

			var root = document.documentElement;
			// We handle window before gBrowserInit.onLoad(), so set "privatebrowsingmode"
			// for fixAppButtonWidth() manually
			if(!PrivateBrowsingUtils.permanentPrivateBrowsing)
				root.setAttribute("privatebrowsingmode", "temporary");
			root.setAttribute(this.privateAttr, "true");
			root.setAttribute(this.rootPrivateAttr, "true");
		}
		window.setTimeout(function() {
			// Wait for third-party styles like https://addons.mozilla.org/addon/movable-firefox-button/
			this.appButtonNA = false;
			this.fixAppButtonWidth(document);
			this.updateWindowTitle(gBrowser);
		}.bind(this), 5);

		// See https://github.com/Infocatcher/Private_Tab/issues/83
		// It's better to handle "TabOpen" before other extensions, but after our waitForTab()
		// with window.addEventListener("TabOpen", ..., true);
		document.addEventListener("TabOpen", this, true);
		window.addEventListener("SSTabRestoring", this, false);
		window.addEventListener("TabSelect", this, false);
		window.addEventListener("TabClose", this, true);
		window.addEventListener("TabClose", this, false);
		window.addEventListener("SSTabClosing", this, false);
		window.addEventListener("dragstart", this, true);
		window.addEventListener("dragend", this, true);
		window.addEventListener("drop", this, true);
		window.addEventListener("PrivateTab:PrivateChanged", this, false);
		if(this.isMultiProcessWindow(window))
			window.addEventListener("TabRemotenessChange", this, true);
		window.addEventListener("SSWindowStateBusy", this, true);
		window.addEventListener("SSWindowStateReady", this, true);
		window.addEventListener("SSWindowClosing", this, true);
		window.addEventListener("close", this, false);
		window.addEventListener("beforeunload", this, false);
		window.setTimeout(function() {
			this.initHotkeys();
			if(this.hotkeys)
				window.addEventListener(this.keyEvent, this, this.keyHighPriority);
		}.bind(this), 0);
		window.setTimeout(function() {
			this.initControls(document);
			window.setTimeout(function() {
				this.setupListAllTabs(window, true);
				this.setupUndoCloseTabs(window, true);
			}.bind(this), 0);
			window.setTimeout(function() {
				this.setHotkeysText(document);
			}.bind(this), 10);
		}.bind(this), 50);
		this.initToolbarButton(document);
	},
	destroyWindow: function(window, reason) {
		window.removeEventListener("load", this, false); // Window can be closed before "load"
		if(reason == WINDOW_CLOSED && !this.isTargetWindow(window))
			return;
		_log("destroyWindow()");

		if(this.isMultiProcessWindow(window)) {
			var mm = window.messageManager;
			mm.broadcastAsyncMessage("PrivateTab:Action", { action: "Destroy" });
			mm.removeDelayedFrameScript("chrome://privatetab/content/content.js" + this.frameScriptUID);
		}

		var document = window.document;
		var gBrowser = window.gBrowser;
		var force = reason != APP_SHUTDOWN && reason != WINDOW_CLOSED;
		var disable = reason == ADDON_DISABLE || reason == ADDON_UNINSTALL;
		if(force) {
			var isPrivateWindow = this.isPrivateWindow(window);
			forEach(gBrowser.tabs, function(tab) {
				if(disable && isPrivateWindow ^ this.isPrivateTab(tab)) {
					if(this.toggleUsingDupTab) {
						window.setTimeout(function(tab) { // Pseudo async and to not break tabs loop
							this.replaceTabAndTogglePrivate(tab, isPrivateWindow);
						}.bind(this), 0, tab);
					}
					else {
						this.toggleTabPrivate(tab, isPrivateWindow);
						this.fixTabState(tab, false); // Always remove private attribute
					}
				}
				// Note: isPrivateTab() will check for private attributes in e10s mode
				tab.removeAttribute(this.privateAttr);
			}, this);
			document.documentElement.removeAttribute(this.privateAttr);
			_log("Restore title...");
			if(!isPrivateWindow)
				this.updateWindowTitle(gBrowser, false);
			this.destroyTitleModifier(document);
		}
		this.patchBrowsers(gBrowser, false, !force);
		this.patchTabBrowserDND(window, gBrowser, false, false, !force);
		this.patchViewSource(window, false, !force);
		this.patchWarnAboutClosingWindow(window, false, !force);
		if(!prefs.get("allowOpenExternalLinksInPrivateTabs"))
			this.patchBrowserLoadURI(window, false, !force);
		this.patchSearchBar(window, false, !force);
		this.patchTabIcons(window, false, !force);
		this.patchBrowserThumbnails(window, false, !force);

		this.unwatchAppButton(window);
		document.removeEventListener("TabOpen", this, true);
		window.removeEventListener("SSTabRestoring", this, false);
		window.removeEventListener("TabSelect", this, false);
		window.removeEventListener("dragstart", this, true);
		window.removeEventListener("dragend", this, true);
		window.removeEventListener("drop", this, true);
		window.removeEventListener(this.keyEvent, this, this.keyHighPriority);
		window.removeEventListener("PrivateTab:PrivateChanged", this, false);
		if(this.isMultiProcessWindow(window))
			window.removeEventListener("TabRemotenessChange", this, true);
		window.removeEventListener("SSWindowStateBusy", this, true);
		window.removeEventListener("SSWindowStateReady", this, true);
		window.removeEventListener("aftercustomization", this, false);
		if(reason != WINDOW_CLOSED) {
			// See resource:///modules/sessionstore/SessionStore.jsm
			// "domwindowclosed" => onClose() => "SSWindowClosing"
			// This may happens after our "domwindowclosed" notification!
			this.destroyWindowClosingHandler(window);
		}
		if("TrackingProtection" in window) { // Firefox 42+
			var identityPopup = document.getElementById("identity-popup");
			identityPopup && identityPopup.removeEventListener("popupshowing", this, true);
			if(reason != WINDOW_CLOSED) try {
				var TrackingProtection = window.TrackingProtection;
				TrackingProtection.updateEnabled();
				if("icon" in TrackingProtection && !TrackingProtection.enabled)
					TrackingProtection.icon.removeAttribute("state");
				var XULBrowserWindow = window.XULBrowserWindow;
				if(
					XULBrowserWindow && "_state" in XULBrowserWindow
					&& "onSecurityChange" in TrackingProtection
				)
					TrackingProtection.onSecurityChange(XULBrowserWindow._state, true /*aIsSimulated*/);
			}
			catch(e) {
				Components.utils.reportError(e);
			}
		}
		this.setupListAllTabs(window, false);
		this.setupUndoCloseTabs(window, false);
		this.destroyControls(window, force);

		window.privateTab._destroy();
		delete window.privateTab;
	},
	get platformVersion() {
		var pv = parseFloat(Services.appinfo.platformVersion);
		if(Services.appinfo.name == "Pale Moon" || Services.appinfo.name == "Basilisk")
			pv = pv >= 4.1 ? 56 : 28;
		delete this.platformVersion;
		return this.platformVersion = pv;
	},
	get isSeaMonkey() {
		delete this.isSeaMonkey;
		return this.isSeaMonkey = Services.appinfo.name == "SeaMonkey";
	},
	get isAustralis() {
		var window = Services.wm.getMostRecentWindow("navigator:browser");
		if(!window) {
			_log("get isAustralis(): no browser window!");
			return undefined;
		}
		delete this.isAustralis;
		return this.isAustralis = "CustomizableUI" in window;
	},
	get storage() {
		// Simple replacement for Application.storage
		// See https://bugzilla.mozilla.org/show_bug.cgi?id=1090880
		var global = Components.utils.getGlobalForObject(Services);
		var ns = "_privateTabStorage";
		var storage = global[ns] || (global[ns] = global.Object.create(null));
		delete this.storage;
		return this.storage = {
			get: function(key, defaultVal) {
				if(key in storage)
					return storage[key];
				return defaultVal;
			},
			set: function(key, val) {
				if(key === null)
					delete storage[key];
				else
					storage[key] = val;
			}
		};
	},
	get windows() {
		var windows = [];
		var isSeaMonkey = this.isSeaMonkey;
		var ws = Services.wm.getEnumerator(isSeaMonkey ? null : "navigator:browser");
		while(ws.hasMoreElements()) {
			var window = ws.getNext();
			if(!isSeaMonkey || this.isTargetWindow(window))
				windows.push(window);
		}
		return windows;
	},
	getMostRecentBrowserWindow: function() {
		var window = Services.wm.getMostRecentWindow("navigator:browser");
		if(window)
			return window;
		if(this.isSeaMonkey) for(var window of this.windows)
			return window;
		return null;
	},
	isTargetWindow: function(window) {
		// Note: we can't touch document.documentElement in not yet loaded window
		// (to check "windowtype"), see https://github.com/Infocatcher/Private_Tab/issues/61
		// Also we don't have "windowtype" for private windows in SeaMonkey 2.19+,
		// see https://github.com/Infocatcher/Private_Tab/issues/116
		var loc = window.location.href;
		return loc == "chrome://browser/content/browser.xul"
			|| loc == "chrome://browser/content/browser.xhtml" // Firefox 69+
			|| loc == "chrome://navigator/content/navigator.xul";
	},
	inheritWindowState: function(window) {
		var args = window.arguments || undefined;
		_log(
			"inheritWindowState():\nwindow.opener: " + window.opener
			+ "\nwindow.__privateTabOpener: " + (window.__privateTabOpener || undefined)
			+ "\nwindow.arguments:\n" + (args && Array.prototype.map.call(args, String).join("\n"))
		);
		var opener = window.opener || window.__privateTabOpener || null;
		delete window.__privateTabOpener;
		var isEmptyWindow = args && !(3 in args);
		var makeEmptyWindowPrivate = prefs.get("makeNewEmptyWindowsPrivate");
		if((!opener || isEmptyWindow) && makeEmptyWindowPrivate == 1) {
			_log("Make new empty window private");
			this.toggleWindowPrivate(window, true);
			return;
		}
		if(!opener || opener.closed || !this.isTargetWindow(opener) || !opener.gBrowser)
			return;
		// See chrome://browser/content/browser.js, nsBrowserAccess.prototype.openURI()
		// newWindow = openDialog(getBrowserURL(), "_blank", "all,dialog=no", url, null, null, null);
		if(
			args && 3 in args && !(4 in args)
			&& args[1] === null
			&& args[2] === null
			&& args[3] === null
			&& !prefs.get("allowOpenExternalLinksInPrivateTabs")
		) {
			_log("Looks like window, opened from external application, ignore");
			return;
		}
		if(isEmptyWindow) {
			if(makeEmptyWindowPrivate == -1)
				_log("Inherit private state for new empty window");
			else {
				_log("inheritWindowState(): Looks like new empty window, ignore");
				return;
			}
		}
		if(this.isPrivateWindow(window)) {
			_log("inheritWindowState(): Ignore already private window");
			return;
		}
		if(!this.isPrivateContent(opener))
			return;
		_log("Inherit private state from current tab of the opener window");
		this.toggleWindowPrivate(window, true);
	},

	prefChanged: function(pName, pVal) {
		if(pName.startsWith("key."))
			this.updateHotkeys(true);
		else if(pName == "keysUseKeydownEvent" || pName == "keysHighPriority")
			this.updateHotkeys();
		else if(pName == "fixAppButtonWidth") {
			this.appButtonDontChange = !pVal;
			this.restoreAppButtonWidth();
			for(var window of this.windows) {
				var document = window.document;
				this.appButtonNA = false;
				if(pVal && !this.appButtonCssURI)
					this.fixAppButtonWidth(document);
				this.updateTabsInTitlebar(document, true);
			}
		}
		else if(pName.startsWith("fixAfterTabsButtonsAccessibility"))
			this.reloadStyles();
		else if(pName == "dragAndDropTabsBetweenDifferentWindows") {
			for(var window of this.windows)
				this.patchTabBrowserDND(window, window.gBrowser, pVal, true);
		}
		else if(pName == "makeNewEmptyTabsPrivate") {
			var hide = pVal == 1;
			for(var window of this.windows) {
				var document = window.document;
				var menuItem = document.getElementById(this.newTabMenuId);
				if(menuItem)
					menuItem.hidden = hide;
				var appMenuItem = document.getElementById(this.newTabAppMenuId);
				if(appMenuItem)
					appMenuItem.hidden = hide;
			}
		}
		else if(pName == "patchDownloads") {
			if(!pVal) for(var window of this.windows)
				this.updateDownloadPanel(window, this.isPrivateWindow(window));
		}
		else if(pName == "allowOpenExternalLinksInPrivateTabs") {
			for(var window of this.windows)
				this.patchBrowserLoadURI(window, !pVal);
		}
		else if(pName == "enablePrivateProtocol") {
			if(pVal)
				this.initPrivateProtocol();
			else
				this.destroyPrivateProtocol();
			this.reloadStyles();
		}
		else if(pName == "showItemInTaskBarJumpList") {
			if(prefs.get("enablePrivateProtocol"))
				this.setupJumpLists(pVal);
		}
		else if(
			pName == "rememberClosedPrivateTabs"
			|| pName == "rememberClosedPrivateTabs.cleanup"
		) {
			if(
				pName == "rememberClosedPrivateTabs" && !pVal
				|| pName == "rememberClosedPrivateTabs.cleanup" && pVal > 0 && this.isLastPrivate()
			)
				this.forgetAllClosedTabs();
		}
		else if(pName == "usePrivateWindowStyle") {
			for(var window of this.windows)
				this.updateWindowTitle(window.gBrowser, undefined, true);
		}
		else if(pName == "stylesHighPriority" || pName == "stylesHighPriority.tree")
			this.reloadStyles();
		else if(pName == "debug")
			_dbg = pVal;
		else if(pName == "debug.verbose")
			_dbgv = pVal;
	},

	pbuFake: function(isPrivate) {
		return Object.create(PrivateBrowsingUtils, {
			isWindowPrivate: {
				value: function privateTabWrapper(window) {
					return isPrivate; //~ todo: check call stack?
				},
				configurable: true,
				enumerable: true,
				writable: true
			}
		});
	},
	get pbuFakePrivate() {
		delete this.pbuFakePrivate;
		return this.pbuFakePrivate = this.pbuFake(true);
	},
	get pbuFakeNonPrivate() {
		delete this.pbuFakeNonPrivate;
		return this.pbuFakeNonPrivate = this.pbuFake(false);
	},
	patchTabBrowserDND: function(window, gBrowser, applyPatch, skipCheck, forceDestroy) {
		if(!skipCheck && !prefs.get("dragAndDropTabsBetweenDifferentWindows"))
			return;

		if(applyPatch)
			window._privateTabPrivateBrowsingUtils = PrivateBrowsingUtils;
		else {
			delete window._privateTabPrivateBrowsingUtils;
			delete window.PrivateBrowsingUtils;
			window.PrivateBrowsingUtils = PrivateBrowsingUtils;
		}
		// Note: we can't patch gBrowser.tabContainer.__proto__ nor gBrowser.__proto__:
		// someone may patch instance instead of prototype...
		var tabContainer = gBrowser.tabContainer;
		var dndMeth = "_getDropEffectForTabDrag" in tabContainer
			? "_getDropEffectForTabDrag" // Firefox 44+
			: "_setEffectAllowedForDataTransfer";
		this.overridePrivateBrowsingUtils(
			window,
			tabContainer,
			dndMeth,
			"gBrowser.tabContainer." + dndMeth,
			true,
			applyPatch,
			forceDestroy
		);
		this.overridePrivateBrowsingUtils(
			window,
			gBrowser,
			"swapBrowsersAndCloseOther",
			"gBrowser.swapBrowsersAndCloseOther",
			true,
			applyPatch,
			forceDestroy
		);
	},
	patchWarnAboutClosingWindow: function(window, applyPatch, forceDestroy) {
		if(this.isSeaMonkey && !("warnAboutClosingWindow" in window))
			return;
		this.overridePrivateBrowsingUtils(
			window,
			window,
			"warnAboutClosingWindow",
			"window.warnAboutClosingWindow",
			false,
			applyPatch,
			forceDestroy
		);
	},
	patchViewSource: function(window, applyPatch, forceDestroy) {
		var fnViewSource = "BrowserViewSourceOfDocument";
		if(!(fnViewSource in window)) {
			_log("Can't patch " + fnViewSource + "(): function not found");
			return;
		}
		if(applyPatch) {
			patcher.wrapFunction(
				window, fnViewSource, fnViewSource,
				function before(argsOrDoc) {
					if(prefs.getPref("view_source.tab")) {
						var w = this.getNotPopupWindow(window, true) || window;
						var isPrivate = this.isPrivateContent(w);
						_log(fnViewSource + "(): wait for tab to make " + _p(isPrivate));
						this.readyToOpenTab(w, isPrivate);
					}
					else if(!prefs.getPref("view_source.editor.external")) {
						var isPrivate = this.isPrivateContent(window);
						var _this = this;
						_log(fnViewSource + "(): wait for window to make " + _p(isPrivate));
						Services.obs.addObserver(function observer(window, topic, data) {
							Services.obs.removeObserver(observer, topic);
							window.addEventListener("load", function onLoad(e) {
								window.removeEventListener("load", onLoad, false);
								if(window.location.href != "chrome://global/content/viewSource.xul") {
									_log(fnViewSource + "(): can't get view source window");
									return;
								}
								var privacyContext = _this.getPrivacyContext(window);
								if(privacyContext.usePrivateBrowsing == isPrivate)
									_log(fnViewSource + "(): window already " + _p(isPrivate));
								else {
									_log(fnViewSource + "(): make window " + _p(isPrivate));
									privacyContext.usePrivateBrowsing = isPrivate;
								}
							}, false);
						}, "domwindowopened", false);
					}
				}.bind(this)
			);
		}
		else {
			patcher.unwrapFunction(window, fnViewSource, fnViewSource, forceDestroy);
		}
	},
	patchBrowserLoadURI: function(window, applyPatch, forceDestroy) {
		var gBrowser = window.gBrowser;
		var browser = gBrowser.browsers && gBrowser.browsers[0];
		if(!browser) {
			Components.utils.reportError(LOG_PREFIX + "!!! Can't find browser to patch browser.loadURIWithFlags()");
			return;
		}
		var browserProto = Object.getPrototypeOf(browser);
		if(!browserProto || !("loadURIWithFlags" in browserProto)) {
			_log("Can't patch browser: no loadURIWithFlags() method");
			return;
		}
		if(applyPatch) {
			var _this = this;
			patcher.wrapFunction(
				browserProto, "loadURIWithFlags", "browser.loadURIWithFlags",
				function before(aURI, aFlags, aReferrerURI, aCharset, aPostData) {
					var params = aFlags;
					if(params && typeof params == "object") // Firefox 38+
						aFlags = params.flags;
					_dbgv && _log("loadURIWithFlags() flags: " + aFlags);
					if(!(aFlags & Components.interfaces.nsIWebNavigation.LOAD_FLAGS_FROM_EXTERNAL))
						return false;
					var tab = _this.getTabForBrowser(this);
					if(!tab) {
						_log("loadURIWithFlags() with LOAD_FLAGS_FROM_EXTERNAL flag, tab not found!");
						return false;
					}
					if(!_this.isPrivateTab(tab))
						return false;
					// See chrome://browser/content/browser.js, nsBrowserAccess.prototype.openURI()
					var stack = new Error().stack;
					_dbgv && _log("loadURIWithFlags(), stack:\n" + stack);
					if(
						stack.indexOf("addTab@chrome:") != -1
						|| stack.indexOf("loadOneTab@chrome:") != -1
					) {
						_log("loadURIWithFlags() with LOAD_FLAGS_FROM_EXTERNAL flag => make tab not private");
						_this.toggleTabPrivate(tab, false);
						return false;
					}
					_log("loadURIWithFlags() with LOAD_FLAGS_FROM_EXTERNAL flag => open in new tab");
					_this.readyToOpenTab(window, false);
					gBrowser.loadOneTab(aURI || "about:blank", {
						referrerURI: aReferrerURI,
						fromExternal: true,
						inBackground: prefs.getPref("browser.tabs.loadDivertedInBackground")
					});
					return true;
				}
			);
		}
		else {
			patcher.unwrapFunction(browserProto, "loadURIWithFlags", "browser.loadURIWithFlags", forceDestroy);
		}
	},
	patchSearchBar: function(window, applyPatch, forceDestroy) {
		if(!this.isSeaMonkey)
			return;
		var document = window.document;
		var searchBar = document.getElementById("searchbar");
		if(!searchBar) // We can't patch node inside toolbar palette
			return;
		if(!("usePrivateBrowsing" in searchBar)) {
			_log("patchSearchBar(): can't patch, usePrivateBrowsing property not found");
			return;
		}
		var bakKey = "privateTabOrig::usePrivateBrowsing";
		if(applyPatch == bakKey in searchBar)
			return;
		_log("patchSearchBar(" + applyPatch + ")");
		if(applyPatch) {
			var _this = this;
			searchBar[bakKey] = Object.getOwnPropertyDescriptor(searchBar, "usePrivateBrowsing");
			Object.defineProperty(searchBar, "usePrivateBrowsing", {
				get: function() {
					_log("patchSearchBar(): return state of selected tab");
					var window = this.ownerDocument.defaultView.top;
					var isPrivate = _this.isPrivateContent(window);
					if("privateTab" in window) {
						var pt = window.privateTab;
						pt._clearSearchBarUndo = true;
						pt._clearSearchBarValue = isPrivate;
						_dbgv && _log("_clearSearchBarValue: " + isPrivate);
					}
					return isPrivate;
				},
				configurable: true,
				enumerable: true
			});
		}
		else {
			var origDesc = searchBar[bakKey];
			delete searchBar[bakKey];
			if(origDesc)
				Object.defineProperty(searchBar, "usePrivateBrowsing", origDesc);
			else
				delete searchBar.usePrivateBrowsing;
		}
	},
	patchBrowsers: function(gBrowser, applyPatch, forceDestroy) {
		var browser = gBrowser.browsers && gBrowser.browsers[0];
		if(!browser) {
			Components.utils.reportError(LOG_PREFIX + "!!! Can't find browser to patch browser.swapDocShells()");
			return;
		}
		var browserProto = Object.getPrototypeOf(browser);
		if(!browserProto || !("swapDocShells" in browserProto)) {
			_log("Can't patch browser: no swapDocShells() method");
			return;
		}
		// Get the same prototype for remote and non-remote tabs
		for(var p = browserProto; p; p = Object.getPrototypeOf(p)) {
			if(p.hasOwnProperty("swapDocShells")) {
				browserProto = p;
				break;
			}
		}
		if(applyPatch) {
			_log("Patch browser.__proto__.swapDocShells() method");
			// Note: we can't use "SwapDocShells" event: we should do our corrections after swapDocShells() call,
			// see https://github.com/Infocatcher/Private_Tab/issues/115
			var _this = this;
			var _spec = function(br) {
				return br.currentURI && br.currentURI.spec;
			};
			patcher.wrapFunction(
				browserProto, "swapDocShells", "browser.swapDocShells",
				function before(otherBrowser) {
					if("_privateTabIsPrivate" in this) {
						before.isPrivate = this._privateTabIsPrivate;
						delete this._privateTabIsPrivate;
						_log("swapDocShells(): we recently set private state to " + before.isPrivate);
						return;
					}
					try {
						var tab = _this.getTabForBrowser(otherBrowser);
						if(!tab) {
							_log("swapDocShells(): can't get, tab not found for " + _str(_spec(otherBrowser)));
							return;
						}
						var isPrivate = _this.isPrivateTab(tab);
						if(
							isPrivate
							&& this.getAttribute("remote") != "true"
							&& otherBrowser.getAttribute("remote") != "true"
							&& !this.docShell.hasLoadedNonBlankURI
						) {
							_log("swapDocShells(): usePrivateBrowsing = true, inheritPrivateBrowsingId = false");
							this.docShell.QueryInterface(Components.interfaces.nsILoadContext)
								.usePrivateBrowsing = true;
							otherBrowser.docShell.inheritPrivateBrowsingId = false;
							return;
						}
						before.isPrivate = isPrivate;
						_log("swapDocShells(): usePrivateBrowsing: " + before.isPrivate);
					}
					catch(e) {
						Components.utils.reportError(e);
					}
				},
				function after(ret, otherBrowser) {
					var isPrivate = after.before.isPrivate;
					if(isPrivate !== undefined) try {
						var tab = _this.getTabForBrowser(this);
						if(!tab) {
							_log("swapDocShells(): can't set, tab not found for " + _str(_spec(this)));
							return;
						}
						_log("swapDocShells(): set usePrivateBrowsing to " + isPrivate);
						_this.toggleTabPrivate(tab, isPrivate);
					}
					catch(e) {
						Components.utils.reportError(e);
					}
				}
			);
		}
		else {
			_log("Restore browser.__proto__.swapDocShells() method");
			patcher.unwrapFunction(browserProto, "swapDocShells", "browser.swapDocShells", forceDestroy);
		}
	},
	overridePrivateBrowsingUtils: function(window, obj, meth, key, isPrivate, applyPatch, forceDestroy) {
		if(!obj || !(meth in obj)) {
			Components.utils.reportError(LOG_PREFIX + "!!! Can't find " + key + "()");
			return;
		}
		if(applyPatch) {
			//_log("Override window.PrivateBrowsingUtils for " + key + ", isPrivate: " + isPrivate);
			var pbuOrig = PrivateBrowsingUtils;
			var pbuFake = isPrivate ? this.pbuFakePrivate : this.pbuFakeNonPrivate;
			var restoreTimer = 0;
			patcher.wrapFunction(
				obj, meth, key,
				function before(event) {
					//_log("[patcher] Override PrivateBrowsingUtils.isWindowPrivate()");
					window.PrivateBrowsingUtils = pbuFake;
					window.clearTimeout(restoreTimer);
					restoreTimer = window.setTimeout(function() { // Restore anyway
						if(window.PrivateBrowsingUtils != pbuOrig)
							window.PrivateBrowsingUtils = pbuOrig;
					}, 0);
				},
				function after(ret, event) {
					window.PrivateBrowsingUtils = pbuOrig;
				}
			);
		}
		else {
			patcher.unwrapFunction(obj, meth, key, forceDestroy);
		}
	},
	patchTabIcons: function(window, applyPatch, forceDestroy) {
		this.patchSetIcon(window, applyPatch, forceDestroy);
		if(this.isSeaMonkey)
			this.patchTabSetAttribute(window, applyPatch, forceDestroy);
	},
	patchSetIcon: function(window, applyPatch, forceDestroy) {
		var gBrowser = window.gBrowser;
		var meth = "setIcon";
		var key = "gBrowser." + meth;
		if(applyPatch) {
			var _this = this;
			var restore;
			var restoreTimer = 0;
			patcher.wrapFunction(
				gBrowser, meth, key,
				function before(tab, uri, loadingPrincipal) {
					if(!uri || _this.isPrivateWindow(window))
						return;
					var isPrivate = _this.isPrivateTab(tab);
					if(!isPrivate)
						return;
					_log("[patcher] " + key + "(): isPrivate = " + isPrivate);
					_this._overrideIsPrivate = isPrivate;
					window.clearTimeout(restoreTimer);
					var origSetAttr = Object.getOwnPropertyDescriptor(tab, "setAttribute");
					tab.setAttribute = _this.setTabAttributeProxy;
					if(_this.isSeaMonkey) {
						_log("Override gBrowser.usePrivateBrowsing to " + isPrivate);
						var origUsePrivateBrowsing = Object.getOwnPropertyDescriptor(gBrowser, "usePrivateBrowsing");
						Object.defineProperty(gBrowser, "usePrivateBrowsing", {
							get: function() {
								return isPrivate;
							},
							configurable: true,
							enumerable: true
						});
					}
					restore = function() {
						_this._overrideIsPrivate = undefined;
						if(origSetAttr)
							Object.defineProperty(tab, "setAttribute", origSetAttr);
						else
							delete tab.setAttribute;
						if(_this.isSeaMonkey) {
							if(origUsePrivateBrowsing)
								Object.defineProperty(gBrowser, "usePrivateBrowsing", origUsePrivateBrowsing);
							else
								delete gBrowser.usePrivateBrowsing;
						}
						restore = null;
					};
					restoreTimer = window.setTimeout(restore, 0); // Restore anyway
				},
				function after(ret, tab, uri) {
					if(restore) {
						window.clearTimeout(restoreTimer);
						restore();
					}
				}
			);
		}
		else {
			patcher.unwrapFunction(gBrowser, meth, key, forceDestroy);
		}
	},
	patchTabSetAttribute: function(window, applyPatch, forceDestroy) {
		var tab = window.gBrowser.tabs[0];
		var tabProto = Object.getPrototypeOf(tab);
		if(applyPatch) {
			tabProto._privateTabOrigSetAttribute = Object.getOwnPropertyDescriptor(tabProto, "setAttribute");
			tabProto.setAttribute = this.setTabAttributeProxy;
		}
		else {
			var orig = tabProto._privateTabOrigSetAttribute;
			delete tabProto._privateTabOrigSetAttribute;
			if(orig)
				Object.defineProperty(tabProto, "setAttribute", orig);
			else
				delete tabProto.setAttribute;
		}
		_log((applyPatch ? "Override" : "Restore") + " tab.setAttribute()");
	},
	setTabAttributeProxy: function(attr, src) {
		var args = arguments;
		var tab = this;
		var window = tab.ownerDocument.defaultView;
		function done() {
			args[1] = src;
			return window.Element.prototype.setAttribute.apply(tab, args);
		}
		if(attr != "image" || !src)
			return done();
		var pti = privateTabInternal;
		src += ""; // Convert to string
		if(
			src.startsWith("moz-anno:favicon:")
			|| !pti.isPrivateTab(tab)
		)
			return done();

		var browser = tab.linkedBrowser;
		if(pti.isRemoteTab(tab)) {
			var mm = browser.messageManager;
			pti.waitForMessage(mm, "PrivateTab:ImageDocumentDataURL", function(msg) {
				src = msg.data.isImageDocument
					? msg.data.dataURL
					: origSrc || src;
				_log("setTabAttributeProxy(): received response from remote tab, set image to\n" + _str(src));
				done();
			});
			pti.sendAsyncMessage(window, mm, {
				action: "GetImageDocumentDataURL"
			});

			// Actually this doesn't work (if icon isn't cached yet), but we should return something in sync mode
			var origSrc = src;
			src = "moz-anno:favicon:" + src.replace(/[&#]-moz-resolution=\d+,\d+$/, "");
			return done();
		}

		args = Array.prototype.slice.call(args);
		try {
			var doc = browser.contentDocument;
			if(doc && doc instanceof Components.interfaces.nsIImageDocument) {
				// Will use base64 representation for icons of image documents
				var req = doc.imageRequest;
				var image = req && req.image;
				var maxSize = prefs.getPref("browser.chrome.image_icons.max_size", 1024);
				if(image && image.width <= maxSize && image.height <= maxSize) {
					var img = doc.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "img")[0];
					var canvas = doc.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
					canvas.width = image.width;
					canvas.height = image.height;
					var ctx = canvas.getContext("2d");
					ctx.drawImage(img, 0, 0);
					src = canvas.toDataURL();
					_log("setTabAttributeProxy() => data:");
				}
				else {
					_log("setTabAttributeProxy(): image missing or too large");
				}
			}
		}
		catch(e) {
			Components.utils.reportError(e);
			// Something went wrong, will use cached icon
			src = "moz-anno:favicon:" + src.replace(/[&#]-moz-resolution=\d+,\d+$/, "");
			_log("setTabAttributeProxy() => moz-anno:favicon:");
		}
		return done();
	},
	patchBrowserThumbnails: function(window, applyPatch, forceDestroy) {
		if(!("gBrowserThumbnails" in window)) // SeaMonkey?
			return;
		var gBrowserThumbnails = window.gBrowserThumbnails;
		var meth = "_shouldCapture";
		var key = "gBrowserThumbnails." + meth;
		if(applyPatch) {
			var _this = this;
			patcher.wrapFunction(
				gBrowserThumbnails, meth, key,
				function before(browser) {
					if(_this.isPrivateContent(window)) {
						_log(key + ": forbid capturing from " + _str(browser.currentURI.spec));
						return { value: false };
					}
					return false;
				}
			);
		}
		else {
			patcher.unwrapFunction(gBrowserThumbnails, meth, key, forceDestroy);
		}
	},

	tabOpenHandler: function(e) {
		var tab = e.originalTarget || e.target;
		var window = tab.ownerDocument.defaultView;
		if("_privateTabIgnore" in tab) {
			window.setTimeout(function() { // Wait for possible following "SSTabRestoring"
				delete tab._privateTabIgnore;
			}, 0);
			return;
		}
		_dbgv && _log(e.type + ":\n" + new Error().stack);
		var gBrowser = this.getTabBrowser(tab);
		//~ todo: try get real tab owner!
		var isPrivate;
		var makeEmptyTabPrivate = prefs.get("makeNewEmptyTabsPrivate");
		var isEmpty = this.isEmptyTab(tab, gBrowser);
		if(!isEmpty || makeEmptyTabPrivate == -1) {
			if(isEmpty)
				_log("Inherit private state for new empty tab");
			if(this.shouldMakeTabPrivate(window))
				isPrivate = true;
			else if(this.isPrivateWindow(window))
				isPrivate = false; // Override browser behavior!
		}
		else if(
			makeEmptyTabPrivate == 1
			&& window.privateTab
			&& !window.privateTab._ssWindowBusy
		) {
			_log("Make new empty tab private");
			isPrivate = true;
		}
		_log(
			"Tab opened: " + _tab(tab) + (isEmpty ? " (empty)" : " (not empty)")
			+ "\nInherit private state: " + isPrivate
		);
		if(isPrivate != undefined)
			this.toggleTabPrivate(tab, isPrivate);
		else {
			window.setTimeout(function() {
				if(!tab.parentNode) // Ignore, if tab was closed
					return;
				var isPrivate = tab.hasAttribute(this.privateAttr) || undefined;
				if(!isPrivate && this.isPrivateWindow(window)) {
					_log("Restored not private tab in private window");
					isPrivate = false;
				}
				_log("Mark tab as " + _p(isPrivate));
				this.setTabState(tab, isPrivate);
			}.bind(this), 0);
		}

		// Focus URL bar, if opened empty private tab becomes selected
		var privateURI = /^private:\/*#?/i.test(tab.label) && RegExp.rightContext;
		if(
			privateURI
			&& (privateURI == "about:blank" || privateURI == window.BROWSER_NEW_TAB_URL)
		) {
			window.setTimeout(function() {
				if(!tab.selected)
					return;
				if("gURLBar" in window)
					window.gURLBar.value = "";
				this.focusAndSelectUrlBar(window);
			}.bind(this), 0);
		}
	},
	tabRestoringHandler: function(e) {
		var tab = e.originalTarget || e.target;
		var isPrivate = tab.hasAttribute(this.privateAttr);
		var uri = tab.linkedBrowser && tab.linkedBrowser.currentURI.spec;
		_log("Tab restored, private attribute: " + isPrivate + "\nlabel: " + _tab(tab) + "\nURI: " + _str(uri));
		if("_privateTabIgnore" in tab) {
			delete tab._privateTabIgnore;
			_log("Leave restored tab as is");
			this.setTabState(tab); // Private tab may be restored using our API
			return;
		}
		if(this.isRemoteTab(tab) && uri == "about:blank") {
			// Yay, yay, let's take yet another strange trick
			_log(e.type + ": about:blank remote tab, looks like this is buggy event (was loaded some URL into non-remote tab?)");
			return;
		}
		var window = tab.ownerDocument.defaultView;
		if(
			this.isMultiProcessWindow(window) // Just always set...
			|| this.isPrivateTab(tab) != isPrivate
		) {
			_log("Make restored tab " + _p(isPrivate));
			var newIsPrivate = this.toggleTabPrivate(tab, isPrivate);
			if("_privateTabSourceTab" in tab && newIsPrivate === isPrivate)
				this.dispatchPrivateChangedAPIEvent(tab, isPrivate);
			if(isPrivate) {
				this.onFirstPrivateTab(window, tab);
				window.privateTab._onFirstPrivateTab(window, tab);
			}
			// For restored non-remote tabs (and for changes using tab duplication in Firefox 51+)
			tab.selected && this.updateWindowTitle(window.gBrowser);
		}
	},
	tabCloseHandler: function(e) {
		var isCapturing = e.eventPhase == e.CAPTURING_PHASE;
		if(
			typeof e.detail == "object" // Firefox 47+
				? e.detail && e.detail.adoptedBy
				: e.detail
		) {
			if(isCapturing)
				_log(e.type + ": tab moved to another window, ignore");
			return;
		}
		// We can't open new private tab in bubbling phase:
		// Error: TypeError: preview is undefined
		// Source file: resource:///modules/WindowsPreviewPerTab.jsm
		if(isCapturing)
			this.checkForLastPrivateTab(e);
		else
			this.cleanupClosedTab(e);
	},
	tabClosingHandler: function(e) {
		if(this.canFilterSession || !prefs.get("rememberClosedPrivateTabs"))
			return;
		//~ hack: manually add closed private tab to undo close history
		var tab = e.originalTarget || e.target;
		if(!tab.hasAttribute(this.privateAttr) || "_privateTabIgnore" in tab)
			return;
		var window = tab.ownerDocument.defaultView;
		if(this.isPrivateWindow(window))
			return;
		// See SessionStoreInternal.onTabClose() in resource:///modules/sessionstore/SessionStore.jsm
		//~ todo: find some way to not copy code from SessionStore.jsm
		var {TabState} = Components.utils.import("resource:///modules/sessionstore/TabState.jsm", {});
		// Global object was changed in Firefox 57+ https://bugzilla.mozilla.org/show_bug.cgi?id=1186409
		var g = Components.utils.getGlobalForObject(TabState);
		var tabState = TabState.collect(tab);
		if(!tabState.isPrivate) {
			_log("tabClosingHandler(): tab has private attribute, but TabState.jsm doesn't return isPrivate flag");
			return;
		}
		var {SessionStoreInternal} = Components.utils.import("resource:///modules/sessionstore/SessionStore.jsm", {});
		var maxTabsUndo = "_max_tabs_undo" in SessionStoreInternal
			? SessionStoreInternal._max_tabs_undo
			: prefs.getPref("browser.sessionstore.max_tabs_undo", 0);
		if(maxTabsUndo <= 0)
			return;
		if(SessionStoreInternal._shouldSaveTabState(tabState)) {
			this.dontSaveClosedPrivateTabs(true);
			_log("tabClosingHandler(): save closed private tab in undo close history:\n" + _tab(tab));
			if(
				!("attributes" in tabState)
				|| !(this.privateAttr in tabState.attributes)
			) {
				var attrs = tabState.attributes
					|| (tabState.attributes = new g.Object());
				attrs[this.privateAttr] = "true";
				_log("tabClosingHandler(): fix private attribute");
			}
			var tabTitle = tab.label;
			var gBrowser = window.gBrowser;
			if("_replaceLoadingTitle" in SessionStoreInternal)
				tabTitle = SessionStoreInternal._replaceLoadingTitle(tabTitle, gBrowser, tab);
			var _undoData = {
				permanentKey: tab.linkedBrowser.permanentKey || null, // For Firefox 40+
				state: tabState,
				title: tabTitle,
				image: this.getTabIcon(tab),
				pos: tab._tPos, // Note: missing in SeaMonkey, but SeaMonkey still use old nsISessionStore
				closedAt: Date.now()
			};
			var undoData = new g.Object();
			if("assign" in Object) // Firefox 34+
				Object.assign(undoData, _undoData);
			else {
				for(var p in _undoData) if(_undoData.hasOwnProperty(p))
					undoData[p] = _undoData[p];
			}
			var data = SessionStoreInternal._windows[window.__SSi];
			var closedTabs = data._closedTabs;
			if("saveClosedTabData" in SessionStoreInternal) // Firefox 40+
				SessionStoreInternal.saveClosedTabData(closedTabs, undoData);
			else {
				closedTabs.unshift(undoData);
				var length = closedTabs.length;
				if(length > maxTabsUndo)
					closedTabs.splice(maxTabsUndo, length - maxTabsUndo);
			}
		}
	},
	getTabIcon: function(tab) {
		var gBrowser = this.getTabBrowser(tab);
		if("getIcon" in gBrowser)
			return gBrowser.getIcon(tab);
		return (tab.image || "")
			.replace(/[&#]-moz-resolution=\d+,\d+$/, ""); // Firefox 22+
	},
	checkForLastPrivateTab: function(e) {
		var tab = e.originalTarget || e.target;
		var window = tab.ownerDocument.defaultView;
		if(!("privateTab" in window)) {
			_log("checkForLastPrivateTab(): window is closing, do nothing");
			return;
		}
		if(
			window.privateTab._checkLastPrivate
			&& this.isPrivateTab(tab)
		) {
			if(this.isLastPrivate(tab)) {
				_log("Closed last private tab");
				if(this.forbidCloseLastPrivate()) {
					_log("checkForLastPrivateTab(): duplicate closing private tab to stay in private mode");
					var gBrowser = window.gBrowser;
					var pos = "_tPos" in tab
						? tab._tPos
						: Array.prototype.indexOf.call(gBrowser.tabs, tab); // SeaMonkey
					var newTab = "duplicateTab" in gBrowser
						? gBrowser.duplicateTab(tab)
						: this.ss.duplicateTab(window, tab); // SeaMonkey
					tab.pinned && this.forcePinTab(newTab, pos);
					gBrowser.moveTabTo(newTab, pos);
					if(tab.selected)
						gBrowser.selectedTab = newTab;
				}
				else if(
					this.isSeaMonkey
					&& prefs.get("rememberClosedPrivateTabs.cleanup") > 1
				) { // SeaMonkey has some cache for fast tabs restoring and doesn't destroy closed tabs immediately
					window.setTimeout(function() {
						_log("Closed last private tab => forgetAllClosedTabs()");
						this.forgetAllClosedTabs();
					}.bind(this), 0);
				}
			}
			this.checkNoPrivate(window);
		}
	},
	checkNoPrivate: function(window) {
		window.setTimeout(function() {
			if(!this.hasPrivateTab(window)) {
				_log("Closed last private tab in window");
				this.clearSearchBar(window);
			}
		}.bind(this), 0);
	},
	cleanupClosedTab: function(e) {
		if(prefs.get("rememberClosedPrivateTabs"))
			return;
		var tab = e.originalTarget || e.target;
		if(!this.isPrivateTab(tab))
			return;
		var window = tab.ownerDocument.defaultView;
		if(this.isPrivateWindow(window)) {
			_log("Ignore closed private tab in private window");
			return;
		}
		_log("Private tab closed: " + _tab(tab) + "\nTry don't save it in undo close history");
		var silentFail = false;
		if(!this.canFilterSession)
			silentFail = true;
		else if(tab.hasAttribute("closedownloadtabs-closed")) {
			// https://github.com/Infocatcher/Close_Download_Tabs
			_log('Found "closedownloadtabs-closed" attribute');
			silentFail = true;
		}
		else if(this.isBlankTab(tab)) {
			_log("Closed blank tab");
			silentFail = true;
		}
		this.forgetClosedTab(window, silentFail);
		if(this.isSeaMonkey)
			window.setTimeout(this.forgetClosedTab.bind(this, window, silentFail, true), 0);
	},
	closePrivateTabs: function(window) {
		var gBrowser = window.gBrowser;
		var tabs = gBrowser.tabs;
		var hasNotPrivate = false;
		for(var i = tabs.length - 1; i >= 0; --i) {
			var tab = tabs[i];
			if(!tab.hasAttribute(this.privateAttr))
				hasNotPrivate = true;
			else {
				if(i == 0 && !hasNotPrivate)
					gBrowser.selectedTab = gBrowser.addTab("about:blank", { skipAnimation: true });
				tab._privateTabIgnore = true; // To not save in undo close history
				gBrowser.removeTab(tab, { animate: false });
				_log("closePrivateTabs(): remove tab: " + _tab(tab));
			}
		}
		return !hasNotPrivate;
	},
	askToClosePrivateTabs: function() {
		var privateTabs = 0;
		for(var window of this.windows) {
			if(this.isPrivateWindow(window))
				continue;
			forEach(window.gBrowser.tabs, function(tab) {
				if(tab.hasAttribute(this.privateAttr))
					++privateTabs;
			}, this);
		}
		_log("askToClosePrivateTabs(): tabs count: " + privateTabs);
		if(!privateTabs)
			return;
		var ps = Services.prompt;
		// https://bugzilla.mozilla.org/show_bug.cgi?id=345067
		// confirmEx always returns 1 if the user closes the window using the close button in the titlebar
		var single = privateTabs == 1 ? "Single" : "";
		var closeTabs = ps.confirmEx(
			Services.ww.activeWindow,
			this.getLocalized("dialogTitle" + single),
			this.getLocalized("dialogQuestion" + single).replace("%S", privateTabs),
			  ps.BUTTON_POS_0 * ps.BUTTON_TITLE_IS_STRING
			+ ps.BUTTON_POS_1 * ps.BUTTON_TITLE_IS_STRING
			+ ps.BUTTON_POS_0_DEFAULT,
			this.getLocalized("dialogClose" + single),
			this.getLocalized("dialogRestore" + single),
			"",
			null, {}
		) != 1;
		if(closeTabs) for(var window of this.windows)
			if(!this.isPrivateWindow(window) && this.closePrivateTabs(window))
				window.setTimeout(window.close, 0);
	},
	get cleanupClosedPrivateTabs() {
		return prefs.get("rememberClosedPrivateTabs")
			&& prefs.get("rememberClosedPrivateTabs.cleanup") > 0;
	},
	get getClosedPrivateTabs() {
		var fn = this._getClosedPrivateTabs.toString()
			.replace(/__yield/g, "yield");
		try {
			new Function("function test() { yield 0; }");
		}
		catch(e) { // Firefox 58+: SyntaxError: yield expression is only valid in generators
			fn = fn.replace("function", "function*"); // Firefox 26+
		}
		delete this.getClosedPrivateTabs;
		return this.getClosedPrivateTabs = eval("(" + fn + ")");
	},
	_getClosedPrivateTabs: function(window) {
		var closedTabs = JSON.parse(this.ss.getClosedTabData(window));
		for(var i = 0, l = closedTabs.length; i < l; ++i) {
			var closedTab = closedTabs[i];
			var state = closedTab.state;
			//_log("Found closed tab:\n" + JSON.stringify(state));
			if(
				"attributes" in state
				&& this.privateAttr in state.attributes
			)
				__yield(i);
		}
	},
	forgetClosedTab: function(window, silentFail, _secondTry) {
		for(var i in this.getClosedPrivateTabs(window)) {
			this.ss.forgetClosedTab(window, i);
			_log("Forget about closed tab #" + i + (_secondTry ? " (workaround for SeaMonkey)" : ""));
			return;
		}
		var msg = "Can't forget about closed private tab: undo close list doesn't contain private tabs";
		if(silentFail)
			_log(msg + ", but all should be OK");
		else
			Components.utils.reportError(LOG_PREFIX + "!!! " + msg);
	},
	forgetClosedTabs: function(window) {
		var closedTabs = [];
		for(var i in this.getClosedPrivateTabs(window))
			closedTabs.push(i);
		closedTabs.reverse().forEach(function(i) {
			this.ss.forgetClosedTab(window, i);
		}, this);
		_log("Forget about " + closedTabs.length + " closed tabs");
	},
	forgetAllClosedTabs: function() {
		for(var window of this.windows)
			this.forgetClosedTabs(window);
	},
	clearSearchBars: function() {
		_log("clearSearchBars()");
		for(var window of this.windows)
			this.clearSearchBar(window);
	},
	clearSearchBar: function(window) {
		var pt = window.privateTab;
		if(pt && pt._clearSearchBarUndo && !this.isPrivateWindow(window)) {
			var searchBar = window.document.getElementById("searchbar");
			if(searchBar) try {
				var tb = searchBar.textbox;
				if(pt._clearSearchBarValue) {
					_log("Clear search bar value");
					tb.value = "";
				}
				tb.editor.transactionManager.clear();
				_log("Clear search bar undo buffer");
			}
			catch(e) {
				Components.utils.reportError(e);
			}
			pt._clearSearchBarUndo = pt._clearSearchBarValue = false;
		}
	},
	_hasPbExitObserver: false,
	addPbExitObserver: function(add) {
		if(add == this._hasPbExitObserver)
			return;
		this._hasPbExitObserver = add;
		if(add)
			Services.obs.addObserver(this, "last-pb-context-exited", false);
		else
			Services.obs.removeObserver(this, "last-pb-context-exited");
		_log("addPbExitObserver(" + add + ")");
	},
	filterSession: function(stateData) {
		if(!stateData || !(stateData instanceof Components.interfaces.nsISupportsString)) {
			_dbgv && _log("filterSession(): no data");
			return;
		}
		var stateString = stateData.data;
		//_dbgv && _log("filterSession():\n" + stateString);
		if(
			prefs.get("savePrivateTabsInSessions")
			|| stateString.indexOf('"' + this.privateAttr + '":"true"') == -1 // Should be faster, than JSON.parse()
		)
			return;
		var state = JSON.parse(stateString);
		var sessionChanged = false;
		if(this.filterSessionWindows(state.windows)) {
			sessionChanged = true;
			_dbgv && _log("filterSession(): cleanup state.windows");
		}
		if(this.filterSessionWindows(state._closedWindows)) {
			sessionChanged = true;
			_dbgv && _log("filterSession(): cleanup state._closedWindows");
		}
		if(!sessionChanged)
			return;
		var newStateString = JSON.stringify(state);
		if(newStateString == stateString)
			return;
		stateData.data = newStateString;
		//_log("Try override session state");
	},
	filterSessionWindows: function(windows) {
		if(!windows)
			return false;
		var sessionChanged = false;
		windows.forEach(function(windowState) {
			if(windowState.isPrivate) // Browser should ignore private windows itself
				return;
			var windowChanged = false;
			var oldSelected = windowState.selected || 1;
			var newSelected;
			var newIndex = 0;
			var tabs = windowState.tabs = windowState.tabs.filter(function(tabState, i) {
				var isPrivate = "attributes" in tabState && this.privateAttr in tabState.attributes;
				if(isPrivate)
					sessionChanged = windowChanged = true;
				else {
					++newIndex;
					if(!newSelected && i + 1 >= oldSelected)
						newSelected = newIndex;
				}
				return !isPrivate;
			}, this);
			if(windowState._closedTabs) {
				windowState._closedTabs = windowState._closedTabs.filter(function(closedTabState) {
					var tabState = closedTabState.state || closedTabState;
					var isPrivate = "attributes" in tabState && this.privateAttr in tabState.attributes;
					if(isPrivate) {
						sessionChanged = true;
						_dbgv && _log("filterSession() -> filterSessionWindows(): cleanup windowState._closedTabs");
					}
					return !isPrivate;
				}, this);
			}
			if(windowChanged) {
				windowState.selected = newSelected || tabs.length;
				//_log("Correct selected tab: " + oldSelected + " => " + newSelected + " => " + windowState.selected);
			}
			//~ todo: what to do with empty window without tabs ?
		}, this);
		return sessionChanged;
	},
	_dontSaveClosedPrivateTabs: false,
	dontSaveClosedPrivateTabs: function(dontSave) {
		if(dontSave == this._dontSaveClosedPrivateTabs)
			return;
		this._dontSaveClosedPrivateTabs = dontSave;

		// See resource:///modules/sessionstore/SessionSaver.jsm
		// resource:///modules/sessionstore/SessionStore.jsm
		// resource:///modules/sessionstore/PrivacyFilter.jsm
		// SessionSaverInternal._saveState()
		// -> SessionStore.getCurrentState()
		// -> PrivacyFilter.filterPrivateWindowsAndTabs()
		// -> SessionSaverInternal._writeState()
		var ssGlobal = Components.utils.import("resource:///modules/sessionstore/SessionSaver.jsm", {});
		// Note: we can't modify frozen PrivacyFilter object!
		const bakKey = "_privateTabPrivacyFilter";
		const newKey = "_privateTabPrivacyFilterWrapper";
		if(dontSave == bakKey in ssGlobal)
			return;
		var logPrefix = "dontSaveClosedPrivateTabs(" + dontSave + "): ";
		if(dontSave) {
			var _this = this;
			var shallowCopy = "assign" in Object // Firefox 34+
				? function(o) {
					return Object.assign({}, o);
				}
				: function(o) {
					var out = {};
					for(var p in o)
						out[p] = o[p];
					return out;
				};
			var filterPrivateWindowsAndTabs = function privateTabWrapper(browserState) {
				var windows = !prefs.get("savePrivateTabsInSessions")
					&& browserState.windows;
				windows && windows.forEach(function(windowState, i) {
					if(windowState.isPrivate || !windowState._closedTabs)
						return;
					var windowChanged = false;
					var closedTabs = windowState._closedTabs.filter(function(closedTabState) {
						var tabState = closedTabState.state || closedTabState;
						var isPrivate = "attributes" in tabState && _this.privateAttr in tabState.attributes;
						if(isPrivate)
							windowChanged = true;
						return !isPrivate;
					});
					if(windowChanged) {
						// Note: we can't modify original windowState object (will change real undo close history)
						var clonedWindowState = shallowCopy(windowState);
						clonedWindowState._closedTabs = closedTabs;
						windows[i] = clonedWindowState;
						_dbgv && _log(logPrefix + "cleanup windowState._closedTabs");
					}
				});
				return PrivacyFilter.filterPrivateWindowsAndTabs.apply(this, arguments);
			};
			if(newKey in ssGlobal) {
				var PrivacyFilter = ssGlobal[newKey].__proto__;
				ssGlobal[bakKey] = null;
				this.setProperty(ssGlobal[newKey], "filterPrivateWindowsAndTabs", filterPrivateWindowsAndTabs);
				_log(logPrefix + "will use old wrapper for PrivacyFilter");
			}
			else {
				var PrivacyFilter = ssGlobal[bakKey] = ssGlobal.PrivacyFilter;
				var PrivacyFilterWrapper = ssGlobal[newKey] = {
					__proto__: PrivacyFilter,
					filterPrivateWindowsAndTabs: filterPrivateWindowsAndTabs
				};
				this.setProperty(ssGlobal, "PrivacyFilter", PrivacyFilterWrapper);
				_log(logPrefix + "create wrapper for PrivacyFilter");
			}
		}
		else {
			if(ssGlobal.PrivacyFilter == ssGlobal[newKey] && ssGlobal[bakKey]) {
				this.setProperty(ssGlobal, "PrivacyFilter", ssGlobal[bakKey]);
				delete ssGlobal[newKey];
				_log(logPrefix + "restore PrivacyFilter");
			}
			else {
				// Yes, we create some memory leaks here, but it's better than break other extensions
				delete ssGlobal[newKey].filterPrivateWindowsAndTabs;
				_log(logPrefix + "can't completely restore PrivacyFilter: detected third-party wrapper");
			}
			delete ssGlobal[bakKey];
		}
	},
	setProperty: function(o, p, v) {
		Object.defineProperty(o, p, {
			value: v,
			configurable: true,
			writable: true,
			enumerable: true
		});
	},
	tabSelectHandler: function(e) {
		var tab = e.originalTarget || e.target;
		var window = tab.ownerDocument.defaultView;
		var browser = tab.linkedBrowser;
		if(
			!browser
			|| !browser.webProgress
			|| browser.webProgress.isLoadingDocument
			// Something may went wrong with restored tabs (but works fine in multi-process mode),
			// see https://github.com/Infocatcher/Private_Tab/issues/146#issuecomment-137159478
			|| browser.currentURI.spec == "about:blank"
				&& browser.contentDocument
				&& browser.contentDocument.readyState == "uninitialized"
		) {
			_log("Selected tab not yet loaded, wait");
			window.setTimeout(function() {
				this.updateWindowTitle(window.gBrowser);
			}.bind(this), 0);
		}
		else {
			this.updateWindowTitle(window.gBrowser);
		}
		// Show real private state in case of changes from another extensions
		// (or if something went wrong in our code)
		// Note: don't check our tabs to not break async duplication
		if(!("_privateTabWaitInitialize" in tab)) window.setTimeout(function() {
			if(tab.parentNode && !("_privateTabWaitInitialize" in tab)) // Only for not yet closed tabs
				this.setTabState(tab);
		}.bind(this), 200);
	},
	_dndPrivateNode: null,
	get dndPrivateNode() {
		try { // We can get "can't access dead object" error here
			var node = this._dndPrivateNode;
			if(node.parentNode && node.ownerDocument)
				return node;
		}
		catch(e) {
		}
		return null;
	},
	dragStartHandler: function(e) {
		var window = e.currentTarget;
		var sourceNode = this._dndPrivateNode = this.isPrivateContent(window)
			? e.originalTarget || e.target
			: null;
		sourceNode && _log(e.type + ": mark <" + sourceNode.nodeName + "> " + sourceNode + " node as private");
	},
	dragEndHandler: function(e) {
		if(this._dndPrivateNode) {
			_log(e.type + " => this._dndPrivateNode = null");
			this._dndPrivateNode = null;
		}
	},
	dropHandler: function(e) {
		var window = e.currentTarget;
		var dt = e.dataTransfer;

		var sourceNode = dt.mozSourceNode || dt.sourceNode;
		if(!sourceNode) {
			_log(e.type + ": missing source node, ignore");
			return;
		}
		if(
			!this.isSeaMonkey
			&& sourceNode instanceof sourceNode.ownerDocument.defaultView.XULElement
			&& this.getTabFromChild(sourceNode)
		) { // Firefox calls browser.swapDocShells()
			_log(e.type + ": ignore tabs drag-and-drop in Firefox");
			return;
		}
		var isPrivateSource = sourceNode == this.dndPrivateNode;
		this._dndPrivateNode = null;
		_log(e.type + ": from " + _p(isPrivateSource) + " tab");

		var targetTab;
		var trg = e.originalTarget || e.target;
		var inChildProcess = trg.localName == "browser" && trg.getAttribute("remote") == "true";
		if(inChildProcess || e.view.top == window.content) {
			var node = e.target;
			if(inChildProcess) {
				//~ todo: we can only use frame script here?
			}
			if(this.isEditableNode(node)) {
				_log("Dropped into editable node, ignore");
				return;
			}
			targetTab = window.gBrowser.selectedTab;
		}
		else if(e.view.top == window) {
			targetTab = this.getTabFromChild(trg);
			if(
				sourceNode instanceof window.XULElement
				&& this.getTabFromChild(sourceNode)
				&& sourceNode.ownerDocument.defaultView == window
				&& (targetTab || this.getTabBarFromChild(trg))
			) {
				_log(e.type + ": tab was dragged into tab or tab bar in the same window, ignore");
				return;
			}
		}

		var isPrivateTarget = targetTab
			? this.isPrivateTab(targetTab)
			: this.isPrivateWindow(window);
		_log("Will use target private state (from " + (targetTab ? "tab" : "window") + ")");

		var isPrivate;
		var dndBehavior = prefs.get("dragAndDropBehavior", 0);
		if(dndBehavior == 1) {
			isPrivate = isPrivateSource;
			_log("Will use source private state: " + isPrivateSource);
		}
		else if(dndBehavior == 2) {
			isPrivate = isPrivateTarget;
			_log("Will use target private state: " + isPrivateTarget);
		}
		else {
			isPrivate = isPrivateSource || isPrivateTarget;
			_log("Will use source or target private state: " + isPrivateSource + " || " + isPrivateTarget);
		}

		if(targetTab && dndBehavior != 2 && isPrivate != this.isPrivateTab(targetTab)) {
			_log("Dropped link may be opened in already existing tab, will use wrapper for browser.loadURIWithFlags()");
			var browser = targetTab.linkedBrowser;
			var loadURIWithFlagsDesc = Object.getOwnPropertyDescriptor(browser, "loadURIWithFlags");
			var destroyLoadURIWrapper = function() {
				_log("dropHandler(): remove wrapper for browser.loadURIWithFlags()");
				stopWait && stopWait();
				if(loadURIWithFlagsDesc) {
					Object.defineProperty(browser, "loadURIWithFlags", loadURIWithFlagsDesc);
					loadURIWithFlagsDesc = undefined;
				}
				else {
					delete browser.loadURIWithFlags;
				}
			};

			browser.loadURIWithFlags = function privateTabWrapper(uri) {
				const _lp = "dropHandler() -> browser.loadURIWithFlags(): ";
				_log(_lp + uri);
				destroyLoadURIWrapper();
				if(isPrivate == this.isPrivateTab(targetTab)) {
					_log(_lp + "already correct private state: " + _p(isPrivate));
					return;
				}
				if(!this.toggleUsingDupTab) {
					_log(_lp + "change state to " + _p(isPrivate));
					this.toggleTabPrivate(targetTab, isPrivate);
					return;
				}
				_log(_lp + "will use workaround with tab duplication");
				this.replaceTabAndTogglePrivate(targetTab, isPrivate, function onSuccess(dupTab) {
					_log(_lp + "load URI into duplicated tab");
					dupTab.linkedBrowser.loadURI(uri);
				});
			}.bind(this);
		}

		var stopWait = this.waitForTab(window, function(tab) {
			destroyLoadURIWrapper && destroyLoadURIWrapper();
			if(!tab) {
				if(!targetTab)
					return;
				tab = targetTab;
			}
			tab._privateTabIgnore = true; // We should always set this flag!
			_log("drop: make " + (tab == targetTab ? "current" : "new") + " tab " + _p(isPrivate));
			// Strange things happens in private windows, so we force set private flag
			if(this.isPrivateTab(tab) != isPrivate)
				this.toggleTabPrivate(tab, isPrivate);
			else
				_log("Already correct private state, ignore");
		}.bind(this));
	},
	isEditableNode: function(node) {
		var cs = node.ownerDocument.defaultView.getComputedStyle(node, null);
		return (cs.userModify || cs.MozUserModify) == "read-write";
	},
	popupShowingHandler: function(e) {
		if(e.defaultPrevented)
			return;
		var popup = e.target;
		if(popup != e.currentTarget)
			return;
		var window = popup.ownerDocument.defaultView;
		var id = popup.id || popup.getAttribute("anonid");
		if(id == "appmenu-popup" || id == "ctr_appbuttonPopup")
			this.initAppMenu(window, popup);
		else if(id == "contentAreaContextMenu")
			this.updatePageContext(window);
		else if(id == "alltabs-popup" || id == "tm-tabsList-menu")
			this.updateListAllTabs(window, popup);
		else if(id == "historyUndoPopup" || id == "menu_recentTabsPopup")
			this.updateUndoCloseTabs(popup);
		else if(id == "tabContextMenu")
			this.updateTabContext(window);
		else if(id == "identity-popup")
			window.TrackingProtection.updateEnabled();
		else if(
			id == "tabbrowser-tab-tooltip"
			|| this.isSeaMonkey
				&& popup.localName == "tooltip"
				&& popup.parentNode.classList.contains("tabbrowser-strip")
		)
			this.updateTabTooltip(window);
	},
	viewShowingHandler: function(e) {
		if(e.target.id == "PanelUI-history")
			this.updateUndoCloseTabs(e.target);
	},
	updatePageContext: function(window) {
		_log("updatePageContext()");
		var document = window.document;
		var gContextMenu = window.gContextMenu;
		var noLink = !gContextMenu
			|| (!gContextMenu.onSaveableLink && !gContextMenu.onPlainTextLink);
		var inNewTab = document.getElementById("context-openlinkintab");
		if(
			noLink
			&& gContextMenu && gContextMenu.onMailtoLink
			&& inNewTab && !inNewTab.hidden
		) {
			// See chrome://browser/content/nsContextMenu.js
			// Simple way to inherit
			// var shouldShow = this.onSaveableLink || isMailtoInternal || this.onPlainTextLink;
			noLink = false;
		}
		if(!noLink && !gContextMenu.linkURL)
			noLink = true;
		var mi = document.getElementById(this.contextId);
		mi.hidden = noLink;

		var hideNotPrivate = this.isPrivateContent(window);
		// Hide "Open Link in New Tab/Window" from page context menu on private tabs:
		// we inherit private state, so here should be only "Open Link in New Private Tab/Window"
		var inNewWin = document.getElementById("context-openlink");
		var inNewPrivateWin = document.getElementById("context-openlinkprivate")
			|| document.getElementById("context-openlinkinprivatewindow"); // SeaMonkey 2.19a1
		if(inNewTab && !noLink)
			inNewTab.hidden = hideNotPrivate;
		if(inNewWin && inNewPrivateWin && !noLink)
			inNewWin.hidden = hideNotPrivate || this.isPrivateWindow(window);
	},
	updateTabTooltip: function(window) {
		_log("updateTabTooltip()");
		var document = window.document;
		var tab = document.tooltipNode;
		var hide = !tab || tab.localName != "tab"
			|| (tab.parentNode ? !this.isPrivateTab(tab) : !tab.hasAttribute(this.privateAttr));
		var label = document.getElementById(this.tabTipId);
		if(!label && !hide) {
			var tabTip = this.getTabTooltip(document);
			if(tabTip && "_privateTabLabel" in tabTip) {
				label = tabTip._privateTabLabel;
				delete tabTip._privateTabLabel;
				tabTip.insertBefore(
					label,
					tabTip.firstChild != tabTip.lastChild ? tabTip.lastChild : null
				);
			}
		}
		if(label)
			label.hidden = hide;
	},
	updateTabContext: function(window) {
		_log("updateTabContext()");
		var document = window.document;
		var tab = this.getContextTab(window);
		var hide = !tab || tab.localName != "tab";
		var mi = document.getElementById(this.tabContextId);
		mi.hidden = hide;
		if(!hide) {
			var check = this.isPrivateTab(tab);
			if(check)
				mi.setAttribute("checked", "true");
			else
				mi.removeAttribute("checked");
			var accel = this.getAnonChild(document, mi, "class", "menu-accel-container");
			if(accel)
				accel.hidden = !tab.selected;
			//mi.disabled = this.isPendingTab(tab);
		}
	},
	commandHandler: function(e) {
		this.handleCommandFromEvent(e, e.shiftKey || e.ctrlKey || e.altKey || e.metaKey);
	},
	clickHandler: function(e) {
		if(e.currentTarget.id == "tabbrowser-tabs") {
			if(e.button != 0 || !prefs.get("fixAfterTabsButtonsAccessibility"))
				return;
			var btn = this.getNewTabButtonFromChild(e.originalTarget || e.target);
			if(btn) {
				e.preventDefault();
				e.stopPropagation();
				_log(e.type + " on .tabs-newtab-button => doCommand()");
				btn.doCommand();
			}
			return;
		}
		if(e.button == 1 && e.target.getAttribute("disabled") != "true")
			this.handleCommandFromEvent(e, true, true);
	},
	getNewTabButtonFromChild: function(node) {
		var btn = node.localName == "image" ? node.parentNode : node;
		if(btn.classList.contains("tabs-newtab-button"))
			return btn;
		return null;
	},
	handleCommandFromEvent: function(e, shifted, closeMenus) {
		var trg = e.target;
		var cmd = trg.getAttribute(this.cmdAttr);
		var window = trg.ownerDocument.defaultView;
		this.handleCommand(window, cmd, shifted, closeMenus, e);
		if(closeMenus) {
			window.closeMenus(trg);
			var mp = trg.parentNode;
			if("triggerNode" in mp) {
				var tn = mp._privateTabTriggerNode || mp.triggerNode;
				tn && window.closeMenus(tn);
			}
		}
	},
	handleCommand: function(window, cmd, shifted, closeMenus, e) {
		_log("handleCommand: " + cmd);
		switch(cmd) {
			case "openInNewPrivateTab":              this.openInNewPrivateTab(window, shifted);         break;
			case "openNewPrivateTab":                this.openNewPrivateTab(window, shifted);           break;
			case "toggleTabPrivate":                 this.toggleContextTabPrivate(window, shifted);     break;
			case "openPlacesInNewPrivateTab":        this.openPlaceInNewPrivateTab(window, shifted, e); break;
			case "openPlacesInPrivateTabs":          this.openPlacesInPrivateTabs(window, e, false);    break;
			case "openPlacesContainerInPrivateTabs": this.openPlacesInPrivateTabs(window, e, true);     break;
			default:
				var caller = Components.stack.caller;
				throw new Error(LOG_PREFIX + 'Unknown command: "' + cmd + '"', caller.filename, caller.lineNumber);
		}
	},
	keypressHandler: function(e) {
		var keys = this.hotkeys;
		for(var kId in keys) {
			var k = keys[kId];
			if(
				e.ctrlKey == k.ctrlKey
				&& e.altKey == k.altKey
				&& e.shiftKey == k.shiftKey
				&& e.metaKey == k.metaKey
				&& e.getModifierState("OS") == k.osKey
				&& (
					k.char && String.fromCharCode(e.charCode || e.keyCode).toUpperCase() == k.char
					|| k.code && e.keyCode == k.code
				)
			) {
				var phase;
				switch(e.eventPhase) {
					case e.CAPTURING_PHASE: phase = "CAPTURING_PHASE"; break;
					case e.AT_TARGET:       phase = "AT_TARGET";       break;
					case e.BUBBLING_PHASE:  phase = "BUBBLING_PHASE";
				}
				_log(e.type + ": matched key: " + kId + ", phase: " + phase);
				if(e.defaultPrevented && !prefs.get("keysIgnoreDefaultPrevented")) {
					_log(e.type + ": event.defaultPrevented => do nothing");
					return;
				}
				var window = e.currentTarget;
				if(k.forbidInTextFields) {
					var fe = window.document.commandDispatcher.focusedElement;
					if(
						fe instanceof window.XULElement
						&& fe.localName == "browser"
						&& fe.getAttribute("remote") == "true"
					) {
						//var doc = fe.contentDocument;
						//fe = doc.activeElement;
						//while(fe instanceof window.HTMLFrameElement)
						//	fe = fe.contentDocument.activeElement;
						fe = null;
						_log("Single char hotkeys aren't supported in e10s mode");
					}
					if(fe && this.isEditableNode(fe)) {
						_log("Don't use single char hotkey in editable node");
						return;
					}
				}
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				this.handleCommand(window, kId.replace(/#.*$/, ""));
				break;
			}
		}
	},
	privateChangedHandler: function(e) {
		var tab = e.originalTarget || e.target;
		var isPrivate = e.detail == 1;
		if(isPrivate == tab.hasAttribute(this.privateAttr)) // Looks already updated, ignore
			return;
		this.setTabState(tab, isPrivate);
		if(tab.selected) {
			var window = tab.ownerDocument.defaultView;
			window.setTimeout(function() { // Wait to not break just restored tab
				if(!tab.selected)
					return;
				_log(e.type + " + tab is selected => updateWindowTitle()");
				this.updateWindowTitle(window.gBrowser, isPrivate);
			}.bind(this), 0);
		}
		if("mCorrespondingMenuitem" in tab && tab.mCorrespondingMenuitem) { // Opened "List all tabs" menu
			_log("privateChangedHandler(): update tab.mCorrespondingMenuitem");
			this.updateTabMenuItem(tab.mCorrespondingMenuitem, tab, isPrivate);
		}
	},
	fixTabRemoteness: function(e) {
		var tab = e.originalTarget || e.target;
		if("_privateTabWillClosed" in tab)
			return;
		var isPrivate = tab.hasAttribute(this.privateAttr);
		var window = e.currentTarget;
		if(isPrivate == this.isPrivateWindow(window)) {
			_log(e.type + ": tab should have correct private state");
			return;
		}
		_log(e.type + ": force make tab " + _p(isPrivate));
		this.toggleTabPrivate(tab, isPrivate);
	},
	setWindowBusy: function(e, busy) {
		_log("setWindowBusy(): " + busy);
		var window = e.currentTarget;
		var pt = window.privateTab;
		pt._ssWindowBusy = busy;
		if(this.isSeaMonkey) {
			window.clearTimeout(pt._ssWindowBusyRestoreTimer);
			if(busy) {
				pt._ssWindowBusyRestoreTimer = window.setTimeout(function() {
					_log("setWindowBusy(): false (workaround for SeaMonkey)");
					pt._ssWindowBusy = false;
				}, 0);
			}
		}
	},

	openInNewPrivateTab: function(window, toggleInBackground) {
		// Based on nsContextMenu.prototype.openLinkInTab()
		var gContextMenu = window.gContextMenu;
		var uri = gContextMenu.linkURL;
		var ownerDoc = gContextMenu.ownerDoc
			|| gContextMenu.target.ownerDocument;
		var principal = gContextMenu.principal
			|| ownerDoc.nodePrincipal;
		try {
			window.urlSecurityCheck(uri, principal);
		}
		catch(e) {
			throw typeof e == "string" ? new Error(e) : e;
		}
		var cmData = window.gContextMenuContentData || {};
		this.openURIInNewPrivateTab(window, uri, ownerDoc, {
			toggleInBackground: toggleInBackground,
			referer: cmData.documentURIObject
				|| ownerDoc.documentURIObject,
			charset: cmData.charSet
				|| ownerDoc.characterSet,
			ownerTab: window.gBrowser.selectedTab,
			sourcePrincipal: principal,
			openAsChild: true
		});
	},
	openPlaceInNewPrivateTab: function(window, toggleInBackground, e) {
		var mi = e && e.target;
		if(!mi)
			return;
		_log("openPlaceInNewPrivateTab(): " + mi.nodeName + " " + mi.label);
		var placesContext = mi.parentNode;
		var view = placesContext._view;
		var node = view.selectedNode;
		var top = this.getTopWindow(window.top);
		try {
			if(!window.PlacesUIUtils.checkURLSecurity(node, top))
				return;
		}
		catch(e) {
			Components.utils.reportError(e);
		}
		var loadInBackgroundPref = "browser.tabs.loadBookmarksInBackground";
		this.openURIInNewPrivateTab(top, node.uri, null, {
			toggleInBackground: toggleInBackground,
			loadInBackgroundPref: prefs.getPref(loadInBackgroundPref) != undefined && loadInBackgroundPref,
			openAsChild: window.top == top.content // Note: chrome:// tab should be not remote
		});
	},
	openPlacesInPrivateTabs: function(window, e, isContainer) {
		var top = this.getTopWindow(window.top);
		var document = window.document;
		// See view-source:chrome://browser/content/places/placesOverlay.xul
		// <menuitem id="placesContext_openContainer:tabs">, <menuitem id="placesContext_openLinks:tabs">
		var pt = top.privateTab;
		// Current tab may be reused
		//~ todo: try use progress listener
		var tab = top.gBrowser.selectedTab;
		var browser = tab.linkedBrowser;
		var loadURIWithFlags = browser.loadURIWithFlags;
		var loadURIWithFlagsDesc = Object.getOwnPropertyDescriptor(browser, "loadURIWithFlags");
		browser.loadURIWithFlags = function privateTabWrapper() {
			_log("openPlacesInPrivateTabs(): browser.loadURIWithFlags() => toggleTabPrivate()");
			pt.toggleTabPrivate(tab, true);
			destroyLoadURIWrapper();
			return loadURIWithFlags.apply(this, arguments);
		};
		function destroyLoadURIWrapper() {
			_log("openPlacesInPrivateTabs(): remove wrapper for browser.loadURIWithFlags()");
			if(loadURIWithFlagsDesc) {
				Object.defineProperty(browser, "loadURIWithFlags", loadURIWithFlagsDesc);
				loadURIWithFlagsDesc = undefined;
			}
			else {
				delete browser.loadURIWithFlags;
			}
		}
		_log("openPlacesInPrivateTabs(): readyToOpenTabs()");
		pt.readyToOpenTabs(true);
		top.setTimeout(function() {
			_log("openPlacesInPrivateTabs(): stopToOpenTabs()");
			destroyLoadURIWrapper();
			pt.stopToOpenTabs();
		}, 0);

		function mi(id) {
			var mi = e.target.parentNode.getElementsByAttribute("id", id)[0] || null;
			return mi && !mi.disabled && mi;
		}
		var openInTabs = mi("placesContext_openContainer:tabs")
			|| mi("placesContext_openLinks:tabs");
		if(openInTabs && prefs.get("openPlacesInPrivateTabs.callNativeMenuItems")) {
			_log("openPlacesInPrivateTabs(): will use #" + openInTabs.id);
			openInTabs.doCommand();
		}
		else {
			_log(
				"openPlacesInPrivateTabs(): "
				+ (openInTabs ? "" : "can't find built-in menu item, ")
				+ "will use openSelectionInTabs()"
			);
			var view = window.PlacesUIUtils.getViewForNode(document.popupNode);
			view.controller.openSelectionInTabs(e);
		}
	},
	openURIInNewPrivateTab: function(window, uri, sourceDocument, options) {
		var toggleInBackground = options.toggleInBackground || false;
		var loadInBackgroundPref = options.loadInBackgroundPref || "browser.tabs.loadInBackground";
		var openAsChild = options.openAsChild || false;

		var w = this.getNotPopupWindow(window);
		if(w && w != window) {
			openAsChild = false;
			w.setTimeout(w.focus, 0);
			window = w;
		}

		var gBrowser = window.gBrowser;
		var ownerTab;
		if(openAsChild) {
			// http://piro.sakura.ne.jp/xul/_treestyletab.html.en#api
			if("TreeStyleTabService" in window)
				window.TreeStyleTabService.readyToOpenChildTab(gBrowser.selectedTab);
			// Tab Kit https://addons.mozilla.org/firefox/addon/tab-kit/
			// TabKit 2nd Edition https://addons.mozilla.org/firefox/addon/tabkit-2nd-edition/
			if("tabkit" in window)
				window.tabkit.addingTab("related");
			if(sourceDocument && prefs.get("rememberOwnerTab"))
				ownerTab = options.ownerTab || null;
		}

		var referer = null;
		var sendReferer = sourceDocument && prefs.get("sendRefererHeader");
		if(
			sendReferer > 0
			&& (sendReferer > 1 || options.ownerTab && this.isPrivateTab(options.ownerTab))
		)
			referer = options.referer || null;

		this.readyToOpenTab(window, true);
		var tab = gBrowser.addTab(uri, {
			referrerURI: referer,
			charset: options.charset || null,
			ownerTab: ownerTab,
			relatedToCurrent: openAsChild,
			triggeringPrincipal: sourceDocument
				? options.sourcePrincipal
				: Services.scriptSecurityManager.getSystemPrincipal()
		});

		var inBackground = prefs.get("loadInBackground");
		if(inBackground == -1)
			inBackground = prefs.getPref(loadInBackgroundPref);
		if(toggleInBackground)
			inBackground = !inBackground;
		if(!inBackground)
			gBrowser.selectedTab = tab;

		if(openAsChild && "tabkit" in window)
			window.tabkit.addingTabOver();

		this.dispatchAPIEvent(tab, "PrivateTab:OpenInNewTab", openAsChild);
		return tab;
	},
	openNewPrivateTab: function(window, middleClicked, callback) {
		var w = this.getNotPopupWindow(window);
		if(w && w != window) {
			w.setTimeout(w.focus, 0);
			window = w;
		}
		this.readyToOpenTab(window, true, function(tab) {
			if(
				tab
				&& this.dispatchAPIEvent(tab, "PrivateTab:OpenNewTab", !!middleClicked)
				&& middleClicked
			) {
				var gBrowser = window.gBrowser;
				gBrowser.moveTabTo(tab, gBrowser.tabContainer.selectedIndex + 1);
			}
			callback && callback(tab);
		}.bind(this));
		var newTabPref = "newPrivateTabURL" + (this.isPrivateWindow(window) ? ".inPrivateWindow" : "");
		var newTabURL = prefs.get(newTabPref);
		if(!newTabURL && "BrowserOpenTab" in window)
			window.BrowserOpenTab();
		else {
			!newTabURL && _log("openNewPrivateTab(): BrowserOpenTab() not found, will open manually");
			var gBrowser = window.gBrowser;
			gBrowser.selectedTab = gBrowser.addTab(newTabURL || window.BROWSER_NEW_TAB_URL);
			this.focusAndSelectUrlBar(window);
		}
	},
	focusAndSelectUrlBar: function(window) {
		if("focusAndSelectUrlBar" in window)
			window.setTimeout(window.focusAndSelectUrlBar, 0);
		else if("WindowFocusTimerCallback" in window) // SeaMonkey
			window.setTimeout(window.WindowFocusTimerCallback, 0, window.gURLBar);

	},
	readyToOpenTab: function(window, isPrivate, callback) {
		this.waitForTab(window, function(tab) {
			if(tab) {
				_log("readyToOpenTab(): make tab " + _p(isPrivate));
				tab._privateTabIgnore = true;
				this.toggleTabPrivate(tab, isPrivate);
			}
			callback && callback(tab);
		}.bind(this));
	},
	waitForTab: function(window, callback) {
		_log("waitForTab()");
		function destroy(timer) {
			window.removeEventListener("TabOpen", tabOpen, true);
			timer && window.clearTimeout(timer);
		}
		function tabOpen(e) {
			destroy(timer);
			var tab = e.originalTarget || e.target;
			_log("waitForTab(): opened tab");
			callback(tab);
		}
		window.addEventListener("TabOpen", tabOpen, true);
		var timer = window.setTimeout(function() {
			destroy();
			_log("waitForTab(): nothing");
			callback(null);
		}, 0);
		return destroy;
	},
	getNotPopupWindow: function(window, force) {
		if(window.toolbar && window.toolbar.visible)
			return window;
		if(!(force || prefs.get("dontUseTabsInPopupWindows")))
			return null;
		var jsm = {
			"RecentWindow": "getMostRecentBrowserWindow",
			"BrowserWindowTracker": "getTopWindow" // Firefox 61+, https://bugzilla.mozilla.org/show_bug.cgi?id=1034036
		};
		for(var name in jsm) try {
			var o = Components.utils.import("resource:///modules/" + name + ".jsm", {})[name];
			return o[jsm[name]]({
				allowPopups: false
			});
		}
		catch(e) {
			o && Components.utils.reportError(e);
			_log("Failed to use " + name + "." + jsm[name] + "()");
		}
		return null;
	},
	getContextTab: function(window, checkMenuVisibility) {
		var cm, contextTab;
		if("TabContextMenu" in window)
			contextTab = window.TabContextMenu.contextTab || null;
		if(contextTab === undefined || checkMenuVisibility) {
			cm = this.getTabContextMenu(window.document);
			if(checkMenuVisibility && cm.state == "closed")
				return null;
		}
		return contextTab || cm && cm.triggerNode && window.gBrowser.mContextTab;
	},
	updateContextTab: function(window, tab) {
		if("TabContextMenu" in window)
			window.TabContextMenu.contextTab = tab;
	},
	get toggleUsingDupTab() {
		// Unable to toggle in Firefox 51+, see https://bugzilla.mozilla.org/show_bug.cgi?id=1318388#c39
		delete this.toggleUsingDupTab;
		return this.toggleUsingDupTab = this.platformVersion >= 51;
	},
	toggleContextTabPrivate: function(window, toggleReload) {
		var gBrowser = window.gBrowser;
		var tab = this.getContextTab(window, true)
			|| gBrowser.selectedTab; // For hotkey
		var useDupTab = this.toggleUsingDupTab;
		var isPrivate = useDupTab
			? !this.isPrivateTab(tab) // Just get state
			: this.toggleTabPrivate(tab);

		var updateState = function() {
			if(!tab.selected) // Only for hotkey
				return;
			if(useDupTab) { // Trick to set correct state right now (duplication is still in progress)
				var origIsPrivate = tab.hasAttribute(this.privateAttr);
				this.setPrivate(tab, isPrivate);
			}
			this.updateTabContext(window);
			this.updateTabTooltip(window);
			if("TabScope" in window && "_updateTitle" in window.TabScope && window.TabScope._tab)
				window.TabScope._updateTitle();
			if(useDupTab) // Restore initial state
				this.setPrivate(tab, origIsPrivate);
		}.bind(this);

		if(this.isPendingTab(tab)) {
			_log("toggleContextTabPrivate() -> isPendingTab -> fixTabState()");
			this.fixTabState(tab, isPrivate);
			delete tab._privateTabIgnore;
		}
		else {
			var autoReload = prefs.get("toggleTabPrivateAutoReload");
			var stopLoading = prefs.get("toggleTabPrivateAutoReload.stopLoading");
			if(toggleReload)
				autoReload = !autoReload;

			if(useDupTab) {
				if("_privateTabWaitInitialize" in tab) {
					if(Date.now() - tab._privateTabWaitInitialize > 12e3) {
						delete tab._privateTabWaitInitialize;
						_log("toggleContextTabPrivate(): something went wrong, ignore too old wait flag");
					}
					else {
						_log("toggleContextTabPrivate(): found wait flag, do nothing");
						return;
					}
				}
				if(this.isTabNotInitialized(tab)) {
					// It's not safe to duplicate tab right now
					_log("toggleContextTabPrivate(): tab isn't initialized, will wait");
					tab._privateTabWaitInitialize = Date.now();
					var waitTab, startTime = Date.now();
					window.setTimeout(waitTab = function() {
						if(this.isTabNotInitialized(tab) && Date.now() - startTime < 300) {
							window.setTimeout(waitTab, 20);
							return;
						}
						delete tab._privateTabWaitInitialize;
						_log("toggleContextTabPrivate(): wait done in " + (Date.now() - startTime) + " ms");
						tab = this.replaceTabAndTogglePrivate(tab, isPrivate);
						this.updateContextTab(window, tab);
						window.setTimeout(updateState, 0);
					}.bind(this), 20);
					return;
				}
				_log("toggleContextTabPrivate() -> will use gBrowser.duplicateTab()");
				tab = this.replaceTabAndTogglePrivate(tab, isPrivate);
				this.updateContextTab(window, tab);
				// Duplicated tab will be reloaded anyway
				autoReload = stopLoading = false;
			}

			var browser = tab.linkedBrowser;
			if(autoReload) {
				var typed = browser.userTypedValue;
				// Note: contains initial URL, if loading is just started, but typically this is
				// value that typed in location bar (and that's why we prefer reload)
				if(browser.webProgress.isLoadingDocument) {
					if(!stopLoading)
						_log("toggleContextTabPrivate() -> isLoadingDocument -> don't reload");
					else if(browser.currentURI.spec == "about:blank" && /^[\w-]+:\S*$/.test(typed)) {
						_log("toggleContextTabPrivate() -> isLoadingDocument -> load typed URL");
						browser.loadURI(typed);
					}
					else {
						_log("toggleContextTabPrivate() -> isLoadingDocument -> reload()");
						browser.reload();
					}
				}
				else {
					_log("toggleContextTabPrivate() -> reload()");
					browser.reload();
				}
				if(typed != null) window.setTimeout(function() {
					browser.userTypedValue = typed;
				}, 0);
			}
			else if(stopLoading && browser.webProgress.isLoadingDocument) {
				_log("toggleContextTabPrivate() -> stop()");
				browser.stop();
			}
		}
		window.setTimeout(updateState, 0);
	},

	cmdAttr: "privateTab-command",
	toolbarButtonId: "privateTab-toolbar-openNewPrivateTab",
	afterTabsButtonId: "privateTab-afterTabs-openNewPrivateTab",
	showAfterTabsAttr: "privateTab-showButtonAfterTabs",
	hasNewTabAfter: "privateTab-hasNewTabAfter",
	fixAfterTabsA11yAttr: "privateTab-fixAfterTabsButtonsAccessibility",
	contextId: "privateTab-context-openInNewPrivateTab",
	tabContextId: "privateTab-tabContext-toggleTabPrivate",
	newTabMenuId: "privateTab-menu-openNewPrivateTab",
	newTabAppMenuId: "privateTab-appMenu-openNewPrivateTab",
	tabTipId: "privateTab-tooltip-isPrivateTabLabel",
	tabScopeTipId: "privateTab-tabScope-isPrivateTabLabel",
	placesContextId: "privateTab-places-openInNewPrivateTab",
	placesContextMultipleId: "privateTab-places-openInPrivateTabs",
	placesContextContainerId: "privateTab-places-openContainerInPrivateTabs",
	getToolbox: function(window) {
		return window.gNavToolbox || window.getNavToolbox();
	},
	getPaletteButton: function(window) {
		var btns = this.getToolbox(window)
			.palette
			.getElementsByAttribute("id", this.toolbarButtonId);
		return btns.length && btns[0];
	},
	addButtonToPalette: function(window, btn) {
		_log("Insert toolbar button #" + btn.id + " into palette");
		this.getToolbox(window)
			.palette
			.appendChild(btn);
	},
	getNewTabButton: function(window) {
		return this.getTabContainerChild(window, "command", "cmd_newNavigatorTab");
	},
	getAfterTabsButton: function(window) {
		return window.document.getElementById(this.afterTabsButtonId)
			|| this.getTabContainerChild(window, "id", this.afterTabsButtonId);
	},
	getTabContainerChild: function(window, attr, val) {
		return this.getAnonChild(window.document, window.gBrowser.tabContainer, attr, val);
	},
	getTabContextMenu: function(document) {
		return document.getElementById("tabContextMenu")
			|| this.getAnonChild(document, document.defaultView.gBrowser, "anonid", "tabContextMenu");
	},
	getTabTooltip: function(document) {
		var tabTip = document.getElementById("tabbrowser-tab-tooltip");
		if(!tabTip) { // SeaMonkey
			var gBrowser = document.defaultView.gBrowser;
			var tabStrip = this.getAnonChild(document, gBrowser, "anonid", "strip");
			if(tabStrip && tabStrip.firstChild && tabStrip.firstChild.localName == "tooltip")
				tabTip = tabStrip.firstChild;
		}
		return tabTip;
	},
	getAnonChild: function(document, parentNode, attr, val) {
		if("getAnonymousElementByAttribute" in document)
			return document.getAnonymousElementByAttribute(parentNode, attr, val);
		// Firefox 72+
		return parentNode.querySelector("[" + attr + '="' + val + '"]');
	},
	initToolbarButton: function(document) {
		var window = document.defaultView;
		var tbId = this.toolbarButtonId;
		var shortLabel = this.isAustralis // for Australis menu
			&& this.getLocalized("openNewPrivateTabShortInAustralis") == "true"
			? "Short"
			: "";
		var tb = this.createNode(document, "toolbarbutton", tbId, {
			id: tbId,
			"class": "toolbarbutton-1 chromeclass-toolbar-additional",
			removable: "true",
			label: this.getLocalized("openNewPrivateTab" + shortLabel),
			tooltiptext: this.getLocalized("openNewPrivateTabTip"),
			"privateTab-command": "openNewPrivateTab"
		});

		var newTabBtn = this.getNewTabButton(window);
		if(newTabBtn) {
			var tb2 = tb.cloneNode(true);
			tb2.id = this.afterTabsButtonId;
			tb2.className = newTabBtn.className || "tabs-newtab-button";
			var btnBar = newTabBtn.parentNode;
			if(newTabBtn.hasAttribute("onmouseover")) {
				// See view-source:chrome://browser/content/tabbrowser.xml
				// gBrowser.tabContainer._enterNewTab()/_leaveNewTab()
				// This sets "beforehovered" on last tab, so we should prevent this,
				// if our button is placed before "New Tab" button
				tb2.setAttribute("onmouseover", newTabBtn.getAttribute("onmouseover") || "");
				tb2.setAttribute("onmouseout",  newTabBtn.getAttribute("onmouseout")  || "");
				// Note: we should use parent node here, looks like we don't receives
				// all mouse events due to "pointer-events: none"
				btnBar.addEventListener("mouseover", this, true);
				btnBar.addEventListener("mouseout", this, true);
			}
			this.initNodeEvents(tb2);
			btnBar.insertBefore(tb2, newTabBtn.nextSibling);
			window.addEventListener("aftercustomization", this, false);
		}

		if(this.isAustralis) try {
			this.addButtonToPalette(window, tb);
			window.CustomizableUI.ensureWidgetPlacedInWindow(tb.id, window);
			this.updateButtonAfterTabs(window);
			_log("Toolbar button: use CustomizableUI.ensureWidgetPlacedInWindow()");
			return;
		}
		catch(e) {
			Components.utils.reportError(e);
		}

		var toolbars = document.getElementsByTagName("toolbar");
		function isSep(id) {
			return id == "separator" || id == "spring" || id == "spacer";
		}
		for(var i = 0, l = toolbars.length; i < l; ++i) {
			var toolbar = toolbars[i];
			var ids = (toolbar.getAttribute("currentset") || "").split(",");
			var pos = ids.indexOf(tbId);
			if(pos == -1)
				continue;
			_log(
				'Found toolbar with "' + tbId + '" in currentset, toolbar: '
				+ "#" + toolbar.id + ", name: " + toolbar.getAttribute("toolbarname")
			);

			var insPos = null;
			var hasSeps = false;
			for(var j = pos + 1, idsCount = ids.length; j < idsCount; ++j) {
				var id = ids[j];
				if(isSep(id)) {
					hasSeps = true;
					continue;
				}
				var nodes = toolbar.getElementsByAttribute("id", id);
				var node = nodes.length && nodes[0];
				if(!node)
					continue;
				insPos = node;
				_log("Found existing node on toolbar: #" + id);
				if(hasSeps) for(var k = j - 1; k > pos; --k) {
					var id = ids[k];
					if(!isSep(id)) // This node doesn't exist on toolbar: we checked it early
						continue;
					for(var prev = insPos.previousSibling; prev; prev = prev.previousSibling) {
						var ln = prev.localName || "";
						if(ln.startsWith("toolbar") && isSep(ln.substr(7))) {
							if(ln == "toolbar" + id)
								insPos = prev;
							break;
						}
						if(prev.id && prev.getAttribute("skipintoolbarset") != "true")
							break;
					}
				}
				break;
			}
			var insParent = insPos && insPos.parentNode
				|| toolbar.getElementsByAttribute("class", "customization-target")[0]
				|| toolbar;
			insParent.insertBefore(tb, insPos);
			if(newTabBtn && insPos && this.hasNodeAfter(tb, "new-tab-button"))
				newTabBtn.parentNode.insertBefore(newTabBtn, tb2.nextSibling);
			this.updateShowAfterTabs(document, tb);
			_log("Insert toolbar button " + (insPos ? "before " + insPos.id : "at the end"));
			return;
		}
		this.addButtonToPalette(window, tb);
	},
	hasNodeAfter: function(node, id) {
		for(var ns = node.nextSibling; ns; ns = ns.nextSibling)
			if(ns.id == id)
				return true;
		return false;
	},
	updateShowAfterTabs: function(document, tbb) {
		var window = document.defaultView;
		if(tbb === undefined)
			tbb = document.getElementById(this.toolbarButtonId);
		var tabsToolbar = document.getElementById("TabsToolbar");
		var showAfterTabs = this.showAfterTabs(tbb);
		if(showAfterTabs)
			tabsToolbar.setAttribute(this.showAfterTabsAttr, "true");
		else
			tabsToolbar.removeAttribute(this.showAfterTabsAttr);
		if(tbb && tbb.nextElementSibling && tbb.nextElementSibling.id == "new-tab-button")
			tabsToolbar.setAttribute(this.hasNewTabAfter, "true");
		else
			tabsToolbar.removeAttribute(this.hasNewTabAfter);
		if(this.isAustralis) window.setTimeout(function() {
			// Don't apply fix, if tab bar is vertical
			// (and wait for vertical tab bar initialization)
			if(
				showAfterTabs
				&& tabsToolbar.getAttribute("orient") != "vertical"
			) {
				_log("updateShowAfterTabs(): set " + this.fixAfterTabsA11yAttr + "=true");
				tabsToolbar.setAttribute(this.fixAfterTabsA11yAttr, "true");
				// Make buttons clickable with our binding
				window.gBrowser.tabContainer.addEventListener("click", this, true);
			}
			else {
				_log("updateShowAfterTabs(): remove " + this.fixAfterTabsA11yAttr);
				tabsToolbar.removeAttribute(this.fixAfterTabsA11yAttr);
				window.gBrowser.tabContainer.removeEventListener("click", this, true);
			}
			this.watchTabBarChanges(tabsToolbar, showAfterTabs);
		}.bind(this), 10);
	},
	watchTabBarChanges: function(tabsToolbar, watch) {
		if(!tabsToolbar || watch == "_privateTabMutationObserver" in tabsToolbar)
			return;
		_log("watchTabBarChanges(" + watch + ")");
		// Detect changes of tabs toolbar orientation, for extensions like Tree Style Tab
		var window = tabsToolbar.ownerDocument.defaultView;
		if(watch) {
			var oldOrient = tabsToolbar.getAttribute("orient");
			var mo = tabsToolbar._privateTabMutationObserver = new window.MutationObserver(function(mutations) {
				var newOrient = tabsToolbar.getAttribute("orient");
				if(
					this.cssA11yURI // Don't load styles too early!
					&& (newOrient != oldOrient || newOrient != "vertical")
				) {
					_log("Changed orient, width or height attribute of #TabsToolbar");
					this.updateShowAfterTabs(window.document);
					this.reloadStyles(window);
				}
				oldOrient = newOrient;
			}.bind(this));
			mo.observe(tabsToolbar, {
				attributes: true,
				attributeFilter: ["orient", "width", "height"]
			});
		}
		else {
			tabsToolbar._privateTabMutationObserver.disconnect();
			delete tabsToolbar._privateTabMutationObserver;
		}
	},
	showAfterTabs: function(tbb, document) {
		var inTabsToolbar = tbb && tbb.parentNode && (
			tbb.parentNode.id == "TabsToolbar"
			|| tbb.parentNode.id == "TabsToolbar-customization-target"
		);
		if(inTabsToolbar) for(var ps = tbb.previousSibling; ps; ps = ps.previousSibling) {
			var id = ps.id;
			if(id == "new-tab-button" || id == "tabmixScrollBox")
				continue;
			if(id == "tabbrowser-tabs")
				return true;
			return false;
		}
		return false;
	},
	updateToolbars: function(e) {
		var window = e.currentTarget;
		window.setTimeout(function() {
			this.setupListAllTabs(window, true);
			this.patchSearchBar(window, true);
		}.bind(this), 0);
		this.updateButtonAfterTabs(window);
	},
	filterMouseEvent: function(e) {
		var btn = this.getNewTabButtonFromChild(e.originalTarget || e.target);
		if(!btn)
			return;
		for(var ps = btn.previousSibling; ps; ps = ps.previousSibling) {
			var ln = ps.localName;
			if(ln == "tab" || ln == "children") // XBL <children>? D'oh...
				break;
			if(ps.boxObject && ps.boxObject.width) { // Found visible node before button
				e.stopPropagation();
				_dbgv && _log("Stop propagation of " + e.type + " for \"" + btn.tooltipText + "\" button");
				break;
			}
		}
	},
	updateButtonAfterTabs: function(window) {
		var document = window.document;
		var tbBtn = document.getElementById(this.toolbarButtonId);
		this.updateShowAfterTabs(document, tbBtn);
		if(!tbBtn)
			return;
		var afterTabsBtn = this.getAfterTabsButton(window);
		var newTabBtn = this.getNewTabButton(window);
		if(this.hasNodeAfter(tbBtn, "new-tab-button")) {
			_log('Move "New Tab" button after "New Private Tab" button');
			newTabBtn.parentNode.insertBefore(newTabBtn, afterTabsBtn.nextSibling);
		}
		else {
			_log('Move "New Private Tab" button after "New Tab" button');
			newTabBtn.parentNode.insertBefore(afterTabsBtn, newTabBtn.nextSibling);
		}
	},
	initControls: function(document) {
		var window = document.defaultView;

		var contentContext = document.getElementById("contentAreaContextMenu");
		contentContext.addEventListener("popupshowing", this, false);

		var contextItem = this.createNode(document, "menuitem", this.contextId, {
			label:     this.getLocalized("openInNewPrivateTab"),
			accesskey: this.getLocalized("openInNewPrivateTabAccesskey"),
			"privateTab-command": "openInNewPrivateTab"
		});
		this.insertNode(contextItem, contentContext, ["#context-openlinkintab"]);

		var menuItemParent = document.getElementById("menu_NewPopup") // SeaMonkey
			|| document.getElementById("menu_FilePopup");
		var shortLabel = menuItemParent.id == "menu_NewPopup" ? "Short" : "";
		var menuItem = this.createNode(document, "menuitem", this.newTabMenuId, {
			label:     this.getLocalized("openNewPrivateTab" + shortLabel),
			accesskey: this.getLocalized("openNewPrivateTab" + shortLabel + "Accesskey"),
			"privateTab-command": "openNewPrivateTab"
		});
		if(prefs.get("makeNewEmptyTabsPrivate") == 1)
			menuItem.hidden = true;
		if(PrivateBrowsingUtils.permanentPrivateBrowsing)
			menuItem.collapsed = true;
		this.insertNode(menuItem, menuItemParent, ["#menu_newNavigatorTab"]);

		// We can't do 'document.getElementById("appmenu_newPrivateWindow")' while App menu was never open:
		// this (somehow) breaks binding for .menuitem-iconic-tooltip class
		var appMenuPopup = document.getElementById("appmenu-popup")
			|| document.getElementById("ctr_appbuttonPopup"); // Classic Theme Restorer
		var appMenuItemParent = document.getElementById("appmenuPrimaryPane");
		if(appMenuPopup && appMenuItemParent) {
			// So will wait for "popupshowing" to move menuitem (and do other initializations)
			appMenuPopup.addEventListener("popupshowing", this, false);

			var appMenuItem = this.createNode(document, "menuitem", this.newTabAppMenuId, {
				label: this.getLocalized("openNewPrivateTab"),
				class: "menuitem-iconic",
				"privateTab-command": "openNewPrivateTab"
			});
			if(prefs.get("makeNewEmptyTabsPrivate") == 1)
				appMenuItem.hidden = true;
			appMenuItem._privateTabPreviousSibling = appMenuItemParent.lastChild;
			appMenuItemParent.appendChild(appMenuItem);
		}

		var tabContext = this.getTabContextMenu(document);
		tabContext.addEventListener("popupshowing", this, false);
		var tabContextItem = this.createNode(document, "menuitem", this.tabContextId, {
			label:     this.getLocalized("privateTab"),
			accesskey: this.getLocalized("privateTabAccesskey"),
			type: "checkbox",
			"privateTab-command": "toggleTabPrivate"
		});
		this.insertNode(tabContextItem, tabContext, ["#context_unpinTab", '[tbattr="tabbrowser-undoclosetab"]']);

		var tabTip = this.getTabTooltip(document);
		if(tabTip) {
			tabTip.addEventListener("popupshowing", this, false);
			var tabTipLabel = document.createElementNS(XULNS, "label");
			tabTipLabel.id = this.tabTipId;
			tabTipLabel.className = "tooltip-label";
			tabTipLabel.setAttribute("value", this.getLocalized("privateTabTip"));
			tabTipLabel.setAttribute("privateTab-command", "<nothing>");
			tabTipLabel.hidden = true;
			tabTip._privateTabLabel = tabTipLabel; // => updateTabTooltip() => tabTip.insertBefore()

			var tabScope = document.getElementById("tabscope-popup");
			if(tabScope && "TabScope" in window && "_updateTitle" in window.TabScope) {
				var tsTitle = document.getElementById("tabscope-title");
				var tsContainer = tsTitle && tsTitle.parentNode
					|| document.getElementById("tabscope-container")
					|| tabScope;
				var tsTipLabel = tabTipLabel.cloneNode(true);
				tsTipLabel.id = this.tabScopeTipId;
				tsContainer.appendChild(tsTipLabel);
				var _this = this;
				patcher.wrapFunction(
					window.TabScope, "_updateTitle", "TabScope._updateTitle",
					function before() {
						tsTipLabel.hidden = !_this.isPrivateTab(this._tab);
					}
				);
			}
		}

		window.addEventListener("popupshowing", this.initPlacesContext, true);
	},
	initAppMenu: function(window, popup) {
		_log("initAppMenu()");
		popup.removeEventListener("popupshowing", this, false);

		var document = window.document;
		var appMenuItem = document.getElementById(this.newTabAppMenuId);
		if(!appMenuItem || appMenuItem.hasAttribute("privateTab-initialized")) {
			Components.utils.reportError(
				LOG_PREFIX + "#" + this.newTabAppMenuId + " not found or already initialized"
			);
			return;
		}
		appMenuItem.setAttribute("privateTab-initialized", "true");
		var newPrivateWin = document.getElementById("appmenu_newPrivateWindow")
			|| document.getElementById("menu_newPrivateWindow"); // Classic Theme Restorer
		if(newPrivateWin) {
			appMenuItem.className = newPrivateWin.className; // menuitem-iconic menuitem-iconic-tooltip
			if(
				this.isAustralis // Classic Theme Restorer
				&& !appMenuItem.classList.contains("menuitem-iconic-tooltip")
			)
				appMenuItem.classList.add("menuitem-iconic-tooltip");
			if(newPrivateWin.hidden) // Permanent private browsing?
				appMenuItem.collapsed = true;
			var s = window.getComputedStyle(newPrivateWin, null);
			var icon = s.listStyleImage;
			if(icon && icon != "none") {
				appMenuItem.style.listStyleImage = icon;
				appMenuItem.style.MozImageRegion = s.MozImageRegion;
			}
		}
		var ps = appMenuItem._privateTabPreviousSibling;
		delete appMenuItem._privateTabPreviousSibling;
		if(ps != appMenuItem.previousSibling) {
			_log("#" + this.newTabAppMenuId + " was moved (Personal Menu or something similar?), ignore");
			return;
		}
		newPrivateWin && this.insertNode(appMenuItem, appMenuItem.parentNode, [newPrivateWin]);
	},
	get initPlacesContext() {
		delete this.initPlacesContext;
		return this.initPlacesContext = this._initPlacesContext.bind(this);
	},
	_initPlacesContext: function(e) {
		var mp = e.originalTarget || e.target;
		if(mp.id != "placesContext" || e.defaultPrevented)
			return;

		if(mp.getElementsByAttribute("id", this.placesContextId).length) {
			_log("initPlacesContext(): already initialized");
			return;
		}

		var document = mp.ownerDocument;
		var placesItem = this.createNode(document, "menuitem", this.placesContextId, {
			label:     this.getLocalized("openPlacesInNewPrivateTab"),
			accesskey: this.getLocalized("openPlacesInNewPrivateTabAccesskey"),
			selection: "link",
			selectiontype: "single",
			"privateTab-command": "openPlacesInNewPrivateTab"
		});
		var inNewTab = mp.getElementsByAttribute("id", "placesContext_open:newtab")[0];
		this.insertNode(placesItem, mp, [inNewTab]);

		var openInTabsLabel = this.getLocalized("openPlacesInPrivateTabs");
		var openInTabsAccesskey = this.getLocalized("openPlacesInPrivateTabsAccesskey");
		var placesItemMultiple = this.createNode(document, "menuitem", this.placesContextMultipleId, {
			label:     openInTabsLabel,
			accesskey: openInTabsAccesskey,
			selection: "link",
			selectiontype: "multiple",
			"privateTab-command": "openPlacesInPrivateTabs"
		});
		var linksInNewTabs = mp.getElementsByAttribute("id", "placesContext_openLinks:tabs")[0];
		this.insertNode(placesItemMultiple, mp, [linksInNewTabs]);
		var placesItemContainer = this.createNode(document, "menuitem", this.placesContextContainerId, {
			label:     openInTabsLabel,
			accesskey: openInTabsAccesskey,
			selection: "folder|host|query",
			selectiontype: "single",
			"privateTab-command": "openPlacesContainerInPrivateTabs"
		});
		var containerInNewTabs = mp.getElementsByAttribute("id", "placesContext_openContainer:tabs")[0];
		this.insertNode(placesItemContainer, mp, [containerInNewTabs]);
		mp.addEventListener("popupshowing", function initItems(e) {
			mp.removeEventListener(e.type, initItems, false);
			if(linksInNewTabs && linksInNewTabs.disabled)
				placesItemMultiple.disabled = true;
			if(containerInNewTabs && containerInNewTabs.disabled)
				placesItemContainer.disabled = true;
		}, false);

		var waitForTab = function(e) {
			var trg = e.target;
			_log(e.type + ": " + trg.nodeName + "#" + trg.id);
			if(trg != inNewTab && (!trg.id || trg.id != inNewTab.getAttribute("command")))
				return;
			var top = this.getTopWindow(window.top);
			this.waitForTab(top, function(tab) {
				if(!tab)
					return;
				_log("Wait for tab -> set ignore flag");
				tab._privateTabIgnore = true;
				if(this.isPrivateWindow(top)) {
					_log("Wait for tab -> make tab not private");
					this.toggleTabPrivate(tab, false);
				}
			}.bind(this));
		}.bind(this);
		var window = document.defaultView;
		window.addEventListener("command", waitForTab, true);

		// Easy way to remove added items from all documents :)
		mp._privateTabTriggerNode = mp.triggerNode; // When we handle click, triggerNode is already null
		var _this = this;
		mp.addEventListener("popuphiding", function destroyPlacesContext(e) {
			if((e.originalTarget || e.target) != mp)
				return;
			mp.removeEventListener(e.type, destroyPlacesContext, true);
			window.removeEventListener("command", waitForTab, true);
			window.setTimeout(function() {
				_this.destroyNodes(mp, true);
				delete mp._privateTabTriggerNode;
				_log("Remove items from places context: " + document.documentURI);
			}, 0);
		}, true);
	},
	getListAllTabsPopup: function(window, checkInPalette) {
		var document = window.document;
		return document.getElementById("alltabs-popup")
			|| checkInPalette
				&& "gNavToolbox" in window
				&& window.gNavToolbox.palette
				&& window.gNavToolbox.palette.getElementsByAttribute("id", "alltabs-popup")[0]
			|| this.getTabContainerChild(window, "anonid", "alltabs-popup") // SeaMonkey
	},
	setupListAllTabs: function(window, init) {
		_log("setupListAllTabs(" + init + ")");
		// Note: we can't add listener to <menupopup> for button in palette, so we should
		// also call setupListAllTabs() after "aftercustomization" event
		[
			this.getListAllTabsPopup(window, !init),
			window.document.getElementById("tm-tabsList-menu") // Tab Mix Plus
		].forEach(function(popup) {
			if(!popup)
				return;
			_log("setupListAllTabs(" + init + "): #" + (popup.id || popup.getAttribute("anonid")));
			if(init)
				popup.addEventListener("popupshowing", this, false);
			else
				popup.removeEventListener("popupshowing", this, false);
		}, this);
	},
	updateListAllTabs: function(window, popup) {
		_log("updateListAllTabs()");
		var update = function(e) {
			_log("updateListAllTabs(): " + (e ? e.type + " event on parent node" : "fallback delay"));
			window.clearTimeout(fallbackTimer);
			parent.removeEventListener("popupshowing", update, false);
			forEach(
				popup.getElementsByTagName("menuitem"),
				function(mi) {
					if(mi.classList.contains("alltabs-item") && "tab" in mi)
						this.updateTabMenuItem(mi, mi.tab);
				},
				this
			);
		}.bind(this);
		// We should wait, while built-in functions create menu contents
		var parent = popup.parentNode;
		parent.addEventListener("popupshowing", update, false);
		var fallbackTimer = window.setTimeout(update, 0);
	},
	updateTabMenuItem: function(mi, tab, isPrivate) {
		if(isPrivate === undefined)
			isPrivate = this.isPrivateTab(tab);
		this.setPrivate(mi, isPrivate);
	},
	setupUndoCloseTabs: function(window, init) {
		var document = window.document;
		var undoPopup = document.getElementById("historyUndoPopup")
			|| document.getElementById("menu_recentTabsPopup"); // SeaMonkey
		if(init) {
			if(undoPopup)
				undoPopup.addEventListener("popupshowing", this, false);
			if(this.isAustralis)
				window.addEventListener("ViewShowing", this, false);
		}
		else {
			if(undoPopup)
				undoPopup.removeEventListener("popupshowing", this, false);
			if(this.isAustralis)
				window.removeEventListener("ViewShowing", this, false);
		}
	},
	updateUndoCloseTabs: function(popup) {
		_log("updateUndoCloseTabs()");
		var window = popup.ownerDocument.defaultView;
		var items = popup.getElementsByTagName(
			popup.localName == "menupopup"
				? "menuitem"
				: "toolbarbutton" // History list in Australis menu
		);
		var undoTabItems = JSON.parse(this.ss.getClosedTabData(window));
		forEach(items, function(item) {
			var indx = item.getAttribute("value");
			if(!/^\d+$/.test(indx))
				return;
			// Original: undoCloseTab(0);
			// Tab Mix Plus: TMP_ClosedTabs.restoreTab('original', 0);
			if(
				!/undoCloseTab|restoreTab/i.test(item.getAttribute("oncommand"))
				&& popup.id != "menu_recentTabsPopup" // SeaMonkey
			)
				return;
			var undoItem = undoTabItems[indx];
			var state = undoItem && undoItem.state;
			var isPrivate = state
				&& "attributes" in state
				&& this.privateAttr in state.attributes;
			this.setPrivate(item, isPrivate);
		}, this);
	},
	destroyControls: function(window, force) {
		_log("destroyControls(), force: " + force);
		var document = window.document;
		this.destroyNodes(document, force);
		this.destroyNode(this.getPaletteButton(window), force);
		// Force destroy toolbar button in Australis menu
		this.destroyNode(document.getElementById(this.toolbarButtonId), force);
		this.destroyNode(this.getAfterTabsButton(window), force);

		var newTabBtn = this.getNewTabButton(window);
		if(newTabBtn) {
			newTabBtn.parentNode.removeEventListener("mouseover", this, true);
			newTabBtn.parentNode.removeEventListener("mouseout", this, true);
		}

		if(this.isAustralis) {
			window.gBrowser.tabContainer.removeEventListener("click", this, true);
			this.watchTabBarChanges(document.getElementById("TabsToolbar"), false);
		}

		var contentContext = document.getElementById("contentAreaContextMenu");
		contentContext && contentContext.removeEventListener("popupshowing", this, false);

		var appMenuPopup = document.getElementById("appmenu-popup")
			|| document.getElementById("ctr_appbuttonPopup"); // Classic Theme Restorer
		appMenuPopup && appMenuPopup.removeEventListener("popupshowing", this, false);

		var tabContext = this.getTabContextMenu(document);
		tabContext && tabContext.removeEventListener("popupshowing", this, false);
		if(tabContext && !tabContext.id)
			this.destroyNodes(tabContext, force);

		var tabTip = this.getTabTooltip(document);
		if(tabTip) {
			delete tabTip._privateTabLabel;
			tabTip.removeEventListener("popupshowing", this, false);
		}
		var tabTipLabel = document.getElementById(this.tabTipId);
		if(tabTipLabel) // In SeaMonkey we can't simple get anonymous nodes by attribute
			tabTipLabel.parentNode.removeChild(tabTipLabel);
		if("TabScope" in window && "_updateTitle" in window.TabScope)
			patcher.unwrapFunction(window.TabScope, "_updateTitle", "TabScope._updateTitle", !force);

		window.removeEventListener("popupshowing", this.initPlacesContext, true);
	},
	createNode: function(document, nodeName, id, attrs) {
		var mi = document.createElementNS(XULNS, nodeName);
		mi.id = id;
		for(var name in attrs)
			mi.setAttribute(name, attrs[name]);
		this.initNodeEvents(mi);
		return mi;
	},
	initNodeEvents: function(node) {
		node.addEventListener("command", this, false);
		node.addEventListener("click", this, false);
	},
	destroyNodeEvents: function(node) {
		node.removeEventListener("command", this, false);
		node.removeEventListener("click", this, false);
	},
	insertNode: function(node, parent, insertAfter) {
		if(!parent)
			return;
		var insPos;
		for(var i = 0, l = insertAfter.length; i < l; ++i) {
			var id = insertAfter[i];
			var sibling = typeof id == "string"
				? parent.querySelector(insertAfter[i])
				: id;
			if(sibling && sibling.parentNode == parent) {
				insPos = sibling;
				break;
			}
		}
		parent.insertBefore(node, insPos && insPos.nextSibling);
	},
	destroyNodes: function(parent, force) {
		var nodes = parent.getElementsByAttribute(this.cmdAttr, "*");
		for(var i = nodes.length - 1; i >= 0; --i)
			this.destroyNode(nodes[i], force);
	},
	destroyNode: function(node, force) {
		if(!node)
			return;
		this.destroyNodeEvents(node);
		force && node.parentNode.removeChild(node);
	},

	get keyEvent() {
		return prefs.get("keysUseKeydownEvent")
			? "keydown"
			: "keypress";
	},
	get keyHighPriority() {
		return prefs.get("keysHighPriority");
	},
	hotkeys: undefined,
	get KeyEvent() {
		delete this.KeyEvent;
		return this.KeyEvent = Components.interfaces.nsIDOMKeyEvent
			// Removed in Firefox 60+ https://bugzilla.mozilla.org/show_bug.cgi?id=1436508
			|| Services.appShell.hiddenDOMWindow.KeyboardEvent;
	},
	get accelKey() {
		var accelKey = "ctrlKey";
		var ke = this.KeyEvent;
		switch(prefs.getPref("ui.key.accelKey")) {
			case ke.DOM_VK_ALT:  accelKey = "altKey";  break;
			case ke.DOM_VK_META: accelKey = "metaKey";
		}
		delete this.accelKey;
		return this.accelKey = accelKey;
	},
	initHotkeys: function(force) {
		if(this.hotkeys !== undefined && !force)
			return;
		_log("initHotkeys()");
		var hasKeys = false;
		var keys = { __proto__: null };
		function getVKChar(vk) {
			var tmp = {};
			Services.scriptloader.loadSubScript("chrome://privatetab/content/virtualKeyCodes.js", tmp);
			getVKChar = tmp.getVKChar;
			return getVKChar(vk);
		}
		function initHotkey(kId) {
			var keyStr = prefs.get("key." + kId);
			_log("initHotkey: " + kId + " = " + keyStr);
			if(!keyStr)
				return;
			hasKeys = true;
			var k = keys[kId] = {
				ctrlKey:  false,
				altKey:   false,
				shiftKey: false,
				metaKey:  false,
				osKey:    false,
				char: null,
				code: null,
				_key: null,
				_keyCode: null,
				_modifiers: null,
				__proto__: null
			};
			var tokens = keyStr.split(" ");
			var key = tokens.pop() || " ";
			if(key.length == 1) {
				k.char = key.toUpperCase();
				k._key = key;
			}
			else { // VK_*
				k.code = this.KeyEvent["DOM_" + key];
				var chr = getVKChar(key);
				if(chr)
					k._key = chr;
				else
					k._keyCode = key;
			}
			k._modifiers = tokens.join(",");
			tokens.forEach(function(token) {
				switch(token) {
					case "control": k.ctrlKey  = true;       break;
					case "alt":     k.altKey   = true;       break;
					case "shift":   k.shiftKey = true;       break;
					case "meta":    k.metaKey  = true;       break;
					case "os":      k.osKey    = true;       break;
					case "accel":   k[this.accelKey] = true;
				}
			}, this);
			k.forbidInTextFields = k.char && !k.ctrlKey && !k.altKey && !k.metaKey || false;
		}
		Services.prefs.getBranch(prefs.ns + "key.")
			.getChildList("", {})
			.forEach(initHotkey, this);
		this.hotkeys = hasKeys ? keys : null;
		_log("Keys:\n" + JSON.stringify(keys, null, "\t"));
	},
	getHotkeysNodes: function(document, attr) {
		var nodes = [...document.getElementsByAttribute(this.cmdAttr, attr)];
		var tabContext = this.getTabContextMenu(document);
		if(tabContext && !tabContext.id)
			nodes.push.apply(nodes, [...tabContext.getElementsByAttribute(this.cmdAttr, attr)]);
		return nodes;
	},
	keyInTooltip: function(node) {
		var cl = node.classList;
		return cl.contains("menuitem-tooltip") || cl.contains("menuitem-iconic-tooltip");
	},
	setHotkeysText: function(document) {
		_log("setHotkeysText(): " + document.title);
		var window = document.defaultView;

		const keysetId = "privateTab-keyset";
		var keyset = document.getElementById(keysetId);
		keyset && keyset.parentNode.removeChild(keyset);

		var keys = this.hotkeys;
		if(!keys)
			return;

		keyset = document.createElementNS(XULNS, "keyset");
		keyset.id = keysetId;
		keyset.setAttribute("privateTab-command", "<nothing>");
		document.documentElement.appendChild(keyset);
		var uid = "-" + Date.now();
		for(var kId in keys) {
			var k = keys[kId];
			var id = "privateTab-key-" + kId + uid;
			var key = document.createElementNS(XULNS, "key");
			key.setAttribute("id", id);
			k._key       && key.setAttribute("key",       k._key);
			k._keyCode   && key.setAttribute("keycode",   k._keyCode);
			k._modifiers && key.setAttribute("modifiers", k._modifiers);
			keyset.appendChild(key);
			this.getHotkeysNodes(document, kId).forEach(function(node) {
				_log("setHotkeysText(): Update #" + node.id);
				node.removeAttribute("acceltext");
				node.setAttribute("key", id);
				if(this.keyInTooltip(node)) {
					var cn = node.className;
					var cl = node.classList;
					cl.remove("menuitem-tooltip");
					cl.remove("menuitem-iconic-tooltip");
					node.offsetHeight; // Ensure binding changed
					window.setTimeout(function() {
						node.className = cn;
					}, 50);
				}
			}, this);
			if(
				kId == "openNewPrivateTab"
				&& "ShortcutUtils" in window // Australis
			) window.setTimeout(function(key) {
				var keyText = window.ShortcutUtils.prettifyShortcut(key);
				this.setButtonHotkeyTip(document, keyText);
			}.bind(this), 0, key);
		}
	},
	setButtonHotkeyTip: function(document, keyText) {
		var window = document.defaultView;
		var tipAttr = "privateTab-baseTooltip";
		var updateTip = function(btn) {
			if(!btn)
				return;
			var baseTip = btn.getAttribute(tipAttr);
			if(!baseTip) {
				baseTip = btn.getAttribute("tooltiptext");
				btn.setAttribute(tipAttr, baseTip);
			}
			var tip = keyText
				? this.getLocalized("buttonTipTemplate")
					.replace("%tip%", baseTip)
					.replace("%key%", keyText)
				: baseTip;
			btn.setAttribute("tooltiptext", tip);
			_log("setButtonHotkeyTip(): #" + btn.id + "\n" + tip);
		}.bind(this);
		updateTip(document.getElementById(this.toolbarButtonId) || this.getPaletteButton(window));
		updateTip(document.getElementById(this.afterTabsButtonId));
	},
	updateHotkeys: function(updateAll) {
		_log("updateHotkeys(" + (updateAll || "") + ")");
		updateAll && this.initHotkeys(true);
		var hasHotkeys = !!this.hotkeys;
		var keyEvent = this.keyEvent;
		var keyHighPriority = this.keyHighPriority;
		for(var window of this.windows) {
			window.removeEventListener("keydown", this, true);
			window.removeEventListener("keydown", this, false);
			window.removeEventListener("keypress", this, true);
			window.removeEventListener("keypress", this, false);
			hasHotkeys && window.addEventListener(keyEvent, this, keyHighPriority);
			if(!updateAll)
				continue;
			var document = window.document;
			this.getHotkeysNodes(document, "*").forEach(function(node) {
				node.removeAttribute("key");
				node.removeAttribute("acceltext");
				if(this.keyInTooltip(node))
					node.removeAttribute("tooltiptext");
			}, this);
			this.setButtonHotkeyTip(document, "");
			hasHotkeys && this.setHotkeysText(document);
		}
	},

	isEmptyTab: function(tab, gBrowser) {
		// See "addTab" method in chrome://browser/content/tabbrowser.xml
		var tabLabel = tab.label || "";
		// See https://github.com/Infocatcher/Private_Tab/issues/152
		// Note: looks like only new blank tabs have "New Tab" label, all other have empty label
		if(!tabLabel && this.platformVersion >= 33 && !this.isSeaMonkey)
			return false;
		if(tabLabel in this.emptyTabLabels) {
			if(_dbg && this.emptyTabLabels[tabLabel] == "API")
				_log("isEmptyTab() + API: detect \"" + tabLabel + "\" as empty");
			return true;
		}
		if(/^\w+:\S*$/.test(tabLabel))
			return false;
		// Trick for duplicated tabs
		var stack = new Error().stack;
		_dbgv && _log("isEmptyTab() stack: " + stack);
		if(stack.indexOf("\nssi_duplicateTab@resource:///modules/sessionstore/SessionStore.jsm:") != -1) {
			_log("isEmptyTab(): found duplicateTab() in stack => not empty");
			return false;
		}
		var emptyTabLabel = this.getTabBrowserString("tabs.emptyTabTitle", gBrowser)
			|| this.getTabBrowserString("tabs.untitled", gBrowser);
		return tabLabel == emptyTabLabel;
	},
	emptyTabLabels: {
		"": true,
		"undefined": true,
		"about:blank": true,
		"chrome://fvd.speeddial/content/fvd_about_blank.html": true,
		"chrome://speeddial/content/speeddial.xul": true,
		"chrome://superstart/content/index.html": true,
		"about:superstart": true, // Super Start 7.0+
		"Super Start": true, // Super Start 7.0+, extensions.superstart.page.preload = true
		"chrome://fastdial/content/fastdial.html": true,
		__proto__: null
	},
	saveEmptyTabLabels: function() {
		var emptyLabels = { __proto__: null };
		var hasData = false;
		for(var label in this.emptyTabLabels)
			if(this.emptyTabLabels[label] == "API")
				emptyLabels[label] = "API", hasData = true;
		if(!hasData)
			return;
		_log("Save data from privateTab.tabLabelIsEmpty() API");
		this.storage.set("emptyTabLabels", emptyLabels);
	},
	importEmptyTabLabels: function() {
		this.importEmptyTabLabels = function() {}; // Only once
		var emptyLabels = this.storage.get("emptyTabLabels", null);
		if(!emptyLabels)
			return;
		this.storage.set("emptyTabLabels", null);
		for(var label in emptyLabels) {
			if(!(label in this.emptyTabLabels)) {
				_log("Import tabLabelIsEmpty() API: \"" + label + "\"");
				this.emptyTabLabels[label] = "API";
			}
		}
	},
	isBlankTab: function(tab) {
		var window = tab.ownerDocument.defaultView;
		// See chrome://browser/content/browser.js
		if("isTabEmpty" in window) try {
			return window.isTabEmpty(tab);
		}
		catch(e) {
			Components.utils.reportError(e);
		}
		return false;
	},
	getTabBrowserString: function(id, gBrowser) {
		function s(o, m) {
			try { return o[m](id); }
			catch(e) {}
			return undefined;
		}
		if("mStringBundle" in gBrowser)
			return s(gBrowser.mStringBundle, "getString");
		var window = gBrowser.ownerDocument.defaultView;
		if("gTabBrowserBundle" in window) // Firefox 58+
			return s(window.gTabBrowserBundle, "GetStringFromName");
		return Components.utils.reportError(LOG_PREFIX + "getTabBrowserString() failed: string bundle not found");
	},
	handleProtocolBrowser: function(browser, bookmarkURI) {
		var tab = this.getTabForBrowser(browser);
		if(!tab) {
			_log("handleProtocolBrowser(): tab not found");
			return;
		}
		_log("handleProtocolBrowser() -> setTabState()");
		this.setTabState(tab); // Should be private, but let's ensure

		var uri = typeof bookmarkURI == "string"
			? Services.io.newURI(bookmarkURI, null, null)
			: bookmarkURI;
		this.updateBookmarkFavicon(uri, tab);
	},
	fixBrowserFromProtocol: function(browser, uriStr) {
		var tab = this.getTabForBrowser(browser);
		if(!tab) {
			_log("fixBrowserFromProtocol(): tab not found");
			return false;
		}
		if(this.isPrivateTab(tab)) {
			_log("fixBrowserFromProtocol(): tab already private");
			return true;
		}
		_log("fixBrowserFromProtocol(): will use workaround with tab duplication");
		var window = tab.ownerDocument.defaultView;
		this.replaceTabAndTogglePrivate(tab, true, function onSuccess(dupTab) {
			var dupBrowser = dupTab.linkedBrowser;
			dupBrowser.loadURI(uriStr);
			window.setTimeout(function() {
				var pUri = /^private:/i.test(uriStr) ? uriStr : "private:" + uriStr;
				this.handleProtocolBrowser(dupBrowser, pUri);
			}.bind(this), 10);
		}.bind(this));
		return true;
	},
	updateBookmarkFavicon: function(bookmarkURI, tab) {
		_log("updateBookmarkFavicon() for " + _str(bookmarkURI.spec));
		var browser = tab.linkedBrowser;
		var window = browser.ownerDocument.defaultView;
		var _this = this;
		function onLoaded(e, principal) {
			principal = principal || e && e.target.nodePrincipal;
			e && browser.removeEventListener(e.type, onLoaded, true);
			_dbgv && _log("updateBookmarkFavicon(): " + (e ? e.type : "already loaded"));
			window.setTimeout(function() { // Wait for possible changes
				if(!tab.parentNode) // Tab was closed
					return;
				_dbgv && _log("updateBookmarkFavicon(): delay");
				var icon = _this.getTabIcon(tab);
				if(!icon)
					return;
				_log("updateBookmarkFavicon(): tab icon: " + _str(icon));
				var faviconService = Components.classes["@mozilla.org/browser/favicon-service;1"]
					.getService(
						Components.interfaces.mozIAsyncFavicons
						// Firefox 62+:
						// https://bugzilla.mozilla.org/show_bug.cgi?id=1460570
						// Merge mozIAsyncFavicons into nsIFaviconService
						|| Components.interfaces.nsIFaviconService
					);
				faviconService.setAndFetchFaviconForPage(
					bookmarkURI,
					Services.io.newURI(icon, null, null),
					false /*aForceReload*/,
					faviconService.FAVICON_LOAD_PRIVATE,
					null /*nsIFaviconDataCallback aCallback*/,
					principal /*nsIPrincipal aLoadingPrincipal*/
				);
			}, 0);
		}
		if(this.isRemoteTab(tab)) {
			var mm = browser.messageManager;
			this.waitForMessage(mm, "PrivateTab:ContentLoaded", function(msg) {
				onLoaded(null, msg.data.principal);
			});
			this.sendAsyncMessage(window, mm, {
				action: "WaitLoading"
			});
		}
		else if(browser.webProgress.isLoadingDocument)
			browser.addEventListener("load", onLoaded, true);
		else
			onLoaded(null, browser.contentPrincipal);
	},
	setTabState: function(tab, isPrivate) {
		if(isPrivate === undefined) {
			this.isPrivateTabAsync(tab, function(isPrivate) {
				this.setTabState(tab, isPrivate);
			}, this);
			return;
		}
		if(isPrivate == tab.hasAttribute(this.privateAttr))
			return;
		this.setPrivate(tab, isPrivate);
		if(isPrivate) {
			var window = tab.ownerDocument.defaultView;
			this.onFirstPrivateTab(window, tab);
			window.privateTab._onFirstPrivateTab(window, tab);
		}
	},
	setPrivate: function(tab, isPrivate) {
		if(isPrivate)
			tab.setAttribute(this.privateAttr, "true");
		else
			tab.removeAttribute(this.privateAttr);
	},
	onFirstPrivateTab: function(window, tab) {
		this.onFirstPrivateTab = function() {};
		_log("First private tab");
		window.setTimeout(this.persistPrivateAttribute.bind(this), 0);
	},
	persistPrivateAttribute: function() {
		this.persistPrivateAttribute = function() {};
		this.ss.persistTabAttribute(this.privateAttr);
	},
	fixTabState: function(tab, isPrivate) {
		if(!this.isPendingTab(tab) || !prefs.get("workaroundForPendingTabs"))
			return;
		if(isPrivate === undefined)
			isPrivate = this.isPrivateTab(tab);
		_log("Workaround: manually update session state of pending tab");
		try {
			var ssData = JSON.parse(this.ss.getTabState(tab));
			//_log("Before:\n" + JSON.stringify(ssData, null, "\t"));
			var hasAttrs = "attributes" in ssData;
			if(isPrivate) {
				if(!hasAttrs)
					ssData.attributes = {};
				ssData.attributes[this.privateAttr] = "true";
			}
			else if(hasAttrs) {
				delete ssData.attributes[this.privateAttr];
			}
			//_log("After:\n" + JSON.stringify(ssData, null, "\t"));
			tab._privateTabIgnore = true;
			this.ss.setTabState(tab, JSON.stringify(ssData));
		}
		catch(e) {
			Components.utils.reportError(e);
		}
	},
	dispatchPrivateChangedAPIEvent: function(tab, isPrivate) {
		var window = tab.ownerDocument.defaultView;
		var evt = new window.CustomEvent("PrivateTab:PrivateChanged", {
			bubbles: true,
			cancelable: false,
			detail: +isPrivate,
			view: window
		});
		Object.defineProperty(evt, "explicitOriginalTarget", {
			value: tab._privateTabSourceTab || null,
			enumerable: true,
			configurable: true,
			writable: false
		});
		return tab.dispatchEvent(evt);
	},
	dispatchAPIEvent: function(target, eventType, eventDetail) {
		var window = target.defaultView
			|| target.ownerDocument && target.ownerDocument.defaultView
			|| target;
		return target.dispatchEvent(new window.CustomEvent(eventType, {
			bubbles: true,
			cancelable: false,
			detail: +eventDetail,
			view: window
		}));
	},
	toggleTabPrivate: function(tab, isPrivate, _silent) {
		var window = tab.ownerDocument.defaultView;
		if(this.isRemoteTab(tab)) {
			_log("toggleTabPrivate(): will use frame script");

			var isPrivateAttr = isPrivate === undefined
				? !tab.hasAttribute(this.privateAttr)
				: isPrivate;
			if(
				!isPrivateAttr
				&& tab.hasAttribute(this.privateAttr)
			) {
				this.checkNoPrivate(window);
				if(this.isLastPrivate(tab)) {
					_log("toggleTabPrivate() called for last private tab");
					if(this.forbidCloseLastPrivate())
						return undefined;
				}
			}

			var mm = tab.linkedBrowser.messageManager;
			this.waitForMessage(mm, "PrivateTab:PrivateChanged", function(msg) {
				var isPrivate = msg.data.isPrivate;
				_log(
					"Received message from frame script: isPrivate = " + isPrivate
					+ "\nTab: " + _tab(tab)
				);
				if(!_silent)
					this.dispatchPrivateChangedAPIEvent(tab, isPrivate);
			}, this);
			this.sendAsyncMessage(window, mm, {
				action: "ToggleState",
				isPrivate: isPrivate
			});
			return isPrivateAttr;
		}

		var privacyContext = this.getTabPrivacyContext(tab);
		if(isPrivate === undefined)
			isPrivate = !privacyContext.usePrivateBrowsing;
		else if(isPrivate == privacyContext.usePrivateBrowsing)
			return isPrivate; // Nothing to do

		if(
			!isPrivate
			&& privacyContext.usePrivateBrowsing
		) {
			this.checkNoPrivate(window);
			if(this.isLastPrivate(tab)) {
				_log("toggleTabPrivate() called for last private tab");
				if(this.forbidCloseLastPrivate())
					return undefined;
			}
		}

		try {
			privacyContext.usePrivateBrowsing = isPrivate;
		}
		catch(e) {
			// Error: Component returned failure code: 0x80004005 (NS_ERROR_FAILURE) [nsILoadContext.usePrivateBrowsing]
			_log("toggleTabPrivate(): unable to set .usePrivateBrowsing -> " + isPrivate + "\nTab: " + _tab(tab));
			Components.utils.reportError(e);
			return;
		}

		// Workaround for browser.newtab.preload = true
		var browser = tab.linkedBrowser;
		browser._privateTabIsPrivate = isPrivate;
		window.setTimeout(function() {
			delete browser._privateTabIsPrivate;
		}, 0);

		_log("Set usePrivateBrowsing to " + isPrivate + "\nTab: " + _tab(tab));
		if(!_silent)
			this.dispatchPrivateChangedAPIEvent(tab, isPrivate);
		return isPrivate;
	},
	duplicateTabAndTogglePrivate: function(tab, isPrivate, dontAnimate) {
		var window = tab.ownerDocument.defaultView;
		var gBrowser = this.getTabBrowser(tab);
		if(isPrivate === undefined)
			isPrivate = !this.isPrivateTab(tab); // Toggle
		isPrivate && this.persistPrivateAttribute();
		// Simplest way to get correct session state for duplicated tab
		var origIsPrivate = tab.hasAttribute(this.privateAttr);
		this.setPrivate(tab, isPrivate);
		if(this.isRemoteTab(tab) && "privateTab" in window) // Ensure private, but not on disabling/uninstalling
			this.readyToOpenTab(window, isPrivate);
		// Force disable animations, duplicateTab() API doesn't provide such ability
		var animateTabs = dontAnimate && prefs.getPref("browser.tabs.animate");
		animateTabs && prefs.setPref("browser.tabs.animate", false);
		var animateUI = dontAnimate && prefs.getPref("toolkit.cosmeticAnimations.enabled");
		animateUI && prefs.setPref("toolkit.cosmeticAnimations.enabled", false);
		try {
			var dupTab = "duplicateTab" in gBrowser
				? gBrowser.duplicateTab(tab)
				: this.ss.duplicateTab(window, tab); // SeaMonkey
		}
		finally { // Always restore prefs
			animateTabs && prefs.setPref("browser.tabs.animate", true);
			animateUI && prefs.setPref("toolkit.cosmeticAnimations.enabled", true);
		}
		// And then restore original state
		this.setPrivate(tab, origIsPrivate);
		return dupTab;
	},
	replaceTabAndTogglePrivate: function(tab, isPrivate, onSuccess) {
		var window = tab.ownerDocument.defaultView;
		var gBrowser = this.getTabBrowser(tab);
		var gURLBar = window.gURLBar;
		var pos = "_tPos" in tab
			? tab._tPos
			: Array.prototype.indexOf.call(gBrowser.tabs, tab); // SeaMonkey
		tab.collapsed = true;
		this.waitForTab(window, function(dupTab) {
			// This will happens before we leave duplicateTab() statement
			dupTab._privateTabSourceTab = tab;
			window.addEventListener("SSTabRestoring", function onRestored(e) {
				if((e.originalTarget || e.target) != dupTab)
					return;
				window.removeEventListener(e.type, onRestored, false);
				if(typed != null) window.setTimeout(function() {
					if(!dupTab.linkedBrowser) // Already closed?
						return;
					if(focusURLBar) // Force update
						gURLBar.value = typed;
					dupTab.linkedBrowser.userTypedValue = typed;
				}, 100);
				window.setTimeout(function() {
					delete dupTab._privateTabSourceTab;
				}, 250);
				onSuccess && onSuccess(dupTab);
			}, false);
		});
		var focusURLBar = gURLBar.focused;
		var typed = tab.linkedBrowser.userTypedValue;
		var dupTab = this.duplicateTabAndTogglePrivate(tab, isPrivate, true);
		dupTab._privateTabWaitInitialize = Date.now();
		dupTab.collapsed = false; // Not really needed, just to ensure
		tab.pinned && this.forcePinTab(dupTab, pos);
		gBrowser.moveTabTo(dupTab, pos);
		if(tab.selected)
			gBrowser.selectedTab = dupTab;
		if(focusURLBar && !gURLBar.focused)
			gURLBar.focus();
		var removeTab, startTime = Date.now();
		window.setTimeout(removeTab = function() { // Wait for async duplication
			if(this.isTabNotInitialized(dupTab) && Date.now() - startTime < 10e3) {
				window.setTimeout(removeTab, 70);
				return;
			}
			delete dupTab._privateTabWaitInitialize;
			// Make tab empty to not save in undo close history
			tab._privateTabWillClosed = true; // To ignore "TabRemotenessChange" event
			this.ss.setTabState(tab, '{"entries":[]}');
			gBrowser.removeTab(tab, { animate: false });
			_dbgv && _log("replaceTabAndTogglePrivate() -> removeTab() after " + (Date.now() - startTime) + " ms");
		}.bind(this), 300);
		return dupTab;
	},
	forcePinTab: function(tab, pos) {
		var gBrowser = this.getTabBrowser(tab);
		var window = tab.ownerDocument.defaultView;
		if(!("pinTab" in gBrowser))
			return;
		gBrowser.pinTab(tab);
		// Will be unpinned after duplicateTab() -> pinTab(). Really.
		var onTabUnpinned, cleanupTimer;
		var cleanup = function() {
			tab.removeEventListener("TabUnpinned", onTabUnpinned, false);
			window.clearTimeout(cleanupTimer);
		};
		cleanupTimer = window.setTimeout(cleanup, 500);
		tab.addEventListener("TabUnpinned", onTabUnpinned = function(e) {
			cleanup();
			_log("replaceTabAndTogglePrivate() -> " + e.type + " -> pin tab again");
			gBrowser.pinTab(tab);
			gBrowser.moveTabTo(tab, pos); // Will be moved after unpinning, restore position
		}, false);
	},
	isTabNotInitialized: function(tab) {
		return tab.parentNode // Only if not closed
			&& tab.hasAttribute("busy")
			&& tab.linkedBrowser
			&& tab.linkedBrowser.currentURI.spec == "about:blank";
	},
	toggleWindowPrivate: function(window, isPrivate) {
		var gBrowser = window.gBrowser;
		if(isPrivate === undefined)
			isPrivate = !this.isPrivateContent(window);
		//~ todo: add pref for this?
		//this.getPrivacyContext(window).usePrivateBrowsing = true;
		_log("Make all tabs in window " + _p(isPrivate));
		forEach(gBrowser.tabs, function(tab) {
			this.toggleTabPrivate(tab, isPrivate);
		}, this);
	},
	getTabBrowser: function(tab) {
		return this.getTabBrowserFromChild(tab.linkedBrowser);
	},
	getTabForBrowser: function(browser) {
		var gBrowser = this.getTabBrowserFromChild(browser);
		if(!gBrowser || !gBrowser.browsers)
			return null;
		if("getTabForBrowser" in gBrowser) // Firefox 35+
			return gBrowser.getTabForBrowser(browser);
		else if("_getTabForBrowser" in gBrowser)
			return gBrowser._getTabForBrowser(browser);
		// Fallback for SeaMonkey
		var browsers = gBrowser.browsers;
		for(var i = 0, l = browsers.length; i < l; ++i)
			if(browsers[i] == browser)
				return gBrowser.tabs[i];
		return null;
	},
	getTabBrowserFromChild: function(node) {
		for(var tbr = node; tbr; tbr = tbr.parentNode)
			if(tbr.localName == "tabbrowser")
				return tbr;
		return node.ownerDocument.defaultView.gBrowser;
	},
	getTabBarFromChild: function(node) {
		for(; node && "classList" in node; node = node.parentNode)
			if(node.classList.contains("tabbrowser-tabs"))
				return node;
		return null;
	},
	getTabFromChild: function(node) {
		for(; node && "classList" in node; node = node.parentNode)
			if(node.classList.contains("tabbrowser-tab"))
				return node;
		return null;
	},
	get dwu() {
		delete this.dwu;
		return this.dwu = Components.classes["@mozilla.org/inspector/dom-utils;1"]
			.getService(Components.interfaces.inIDOMUtils);
	},
	getTopWindow: function(window) {
		var dwu = window.InspectorUtils // Firefox 59+
			|| this.dwu;
		for(;;) {
			var browser = dwu.getParentForNode(window.document, true);
			if(!browser)
				break;
			window = browser.ownerDocument.defaultView.top;
		}
		return window;
	},
	ensureTitleModifier: function(document) {
		var root = document.documentElement;
		if(
			root.hasAttribute("titlemodifier_normal")
			&& root.hasAttribute("titlemodifier_privatebrowsing")
		)
			return;
		var tm = root.getAttribute("titlemodifier") || "";
		var tmPrivate = root.getAttribute("titleprivate") || "";
		// SeaMonkey >= 2.19a1 (2013-03-27)
		// See chrome://navigator/content/navigator.js, function Startup()
		if(tmPrivate)
			tmPrivate = (tm ? tm + " " : "") + tmPrivate;
		else
			tmPrivate = tm + this.getLocalized("privateBrowsingTitleModifier");
		root.setAttribute("privateTab_titlemodifier_normal", tm);
		root.setAttribute("privateTab_titlemodifier_privatebrowsing", tmPrivate);
	},
	destroyTitleModifier: function(document) {
		var root = document.documentElement;
		if(!root.hasAttribute("privateTab_titlemodifier_normal"))
			return;
		root.removeAttribute("privateTab_titlemodifier_normal");
		root.removeAttribute("privateTab_titlemodifier_privatebrowsing");
	},
	appButtonCssURI: null,
	appButtonNA: false,
	appButtonDontChange: false,
	fixAppButtonWidth: function(document) {
		if(this.appButtonCssURI || this.appButtonNA || this.appButtonDontChange)
			return;
		var appBtn = document.getElementById("appmenu-button");
		if(!appBtn) {
			this.appButtonNA = true;
			return;
		}
		var root = document.documentElement;
		if(root.getAttribute("privatebrowsingmode") != "temporary")
			return;
		var bo = appBtn.boxObject;
		var pbWidth = bo.width;
		if(!pbWidth) { // App button is hidden?
			this.watchAppButton(document.defaultView);
			this.appButtonNA = true; // Don't check and don't call watchAppButton() again
			return;
		}
		root.removeAttribute("privatebrowsingmode");
		var npbWidth = bo.width;
		var iconWidth = pbWidth - npbWidth;
		root.setAttribute("privatebrowsingmode", "temporary");
		if(iconWidth == 0) {
			_log("Fix App button width: nothing to do, corrected width is the same");
			this.appButtonNA = true;
			return;
		}
		var cssStr;
		if(iconWidth > 0) {
			var half = iconWidth/2;
			var s = document.defaultView.getComputedStyle(appBtn, null);
			var pl = parseFloat(s.paddingLeft) - half;
			var pr = parseFloat(s.paddingRight) - half;
			if(pl >= 0 && pr >= 0) {
				_log("Fix App button width:\npadding-left: " + pl + "px\npadding-right: " + pr + "px");
				cssStr = '\
					/* Private Tab: fix App button width */\n\
					@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");\n\
					@-moz-document url("' + document.documentURI + '") {\n\
						#main-window[privatebrowsingmode="temporary"] #appmenu-button {\n\
							padding-left: ' + pl + 'px !important;\n\
							padding-right: ' + pr + 'px !important;\n\
						}\n\
					}';
			}
		}
		if(!cssStr) { // Better than nothing :)
			var maxWidth = Math.max(pbWidth, npbWidth);
			_log("Fix App button width:\nmin-width: " + maxWidth + "px");
			cssStr = '\
				/* Private Tab: fix App button width */\n\
				@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");\n\
				@-moz-document url("' + document.documentURI + '") {\n\
					#appmenu-button {\n\
						min-width: ' + maxWidth + 'px !important;\n\
					}\n\
				}';
		}
		var cssURI = this.appButtonCssURI = this.newCssURI(cssStr);
		var sss = this.sss;
		if(!sss.sheetRegistered(cssURI, sss.USER_SHEET))
			sss.loadAndRegisterSheet(cssURI, sss.USER_SHEET);
	},
	restoreAppButtonWidth: function() {
		var cssURI = this.appButtonCssURI;
		if(!cssURI)
			return;
		this.appButtonCssURI = null;
		var sss = this.sss;
		if(sss.sheetRegistered(cssURI, sss.USER_SHEET))
			sss.unregisterSheet(cssURI, sss.USER_SHEET);
	},
	watchAppButton: function(window) {
		var titlebar = window.document.getElementById("titlebar");
		if(!titlebar)
			return;
		_log("Watch for #titlebar changes");
		var mo = window._privateTabAppButtonWatcher = new window.MutationObserver(function(mutations) {
			if(
				!mutations.some(function(mutation) {
					return mutation.attributeName == "hidden";
				})
				|| titlebar.hidden
			)
				return;
			_log("#titlebar is now visible!");
			mo.disconnect();
			delete window._privateTabAppButtonWatcher;
			this.appButtonNA = false;
			this.fixAppButtonWidth(window.document);
		}.bind(this));
		mo.observe(titlebar, { attributes: true });
	},
	unwatchAppButton: function(window) {
		if("_privateTabAppButtonWatcher" in window) {
			window._privateTabAppButtonWatcher.disconnect();
			delete window._privateTabAppButtonWatcher;
		}
	},
	updateWindowTitle: function(gBrowser, isPrivate, force) {
		var document = gBrowser.ownerDocument;
		var window = document.defaultView;
		if(isPrivate === undefined)
			isPrivate = this.isPrivateContent(window);
		var root = document.documentElement;
		var tm = isPrivate
			? root.getAttribute("titlemodifier_privatebrowsing")
				|| root.getAttribute("privateTab_titlemodifier_privatebrowsing")
			: root.getAttribute("titlemodifier_normal")
				|| root.getAttribute("privateTab_titlemodifier_normal");
		if(!force && root.getAttribute("titlemodifier") == tm)
			return;
		_log("updateWindowTitle() " + tm);
		if(isPrivate)
			root.setAttribute(this.rootPrivateAttr, "true");
		else
			root.removeAttribute(this.rootPrivateAttr);
		root.setAttribute("titlemodifier", tm);
		root.setAttribute(
			"title",
			isPrivate
				? root.getAttribute("title_privatebrowsing")
				: root.getAttribute("title_normal")
		);
		var usePrivateWindowStyle = prefs.get("usePrivateWindowStyle");
		if(force || usePrivateWindowStyle) {
			var indicatePrivate = usePrivateWindowStyle
				? isPrivate
				: this.isPrivateWindow(window);
			if(indicatePrivate) {
				var pbTemp = !PrivateBrowsingUtils.permanentPrivateBrowsing;
				root.setAttribute("privatebrowsingmode", pbTemp ? "temporary" : "permanent");
				pbTemp && this.fixAppButtonWidth(document);
			}
			else {
				root.removeAttribute("privatebrowsingmode");
			}
			// See chrome://browser/content/browser.js, gPrivateBrowsingUI.init()
			// http://hg.mozilla.org/mozilla-central/file/55f750590259/browser/base/content/browser.js#l6734
			if(Services.appinfo.OS == "Darwin" && !this.isAustralis) {
				if(indicatePrivate && pbTemp)
					root.setAttribute("drawintitlebar", "true");
				else
					root.removeAttribute("drawintitlebar");
			}
			// After changing of "privatebrowsingmode" attribute #alltabs-popup may not receive
			// "popuphidden" event (only on Australis?)
			// See view-source:chrome://browser/content/tabbrowser.xml#tabbrowser-alltabs-popup
			if(this.isAustralis) window.setTimeout(function() {
				var allTabsPopup = document.getElementById("alltabs-popup");
				if(
					allTabsPopup
					&& allTabsPopup.state == "closed"
					&& allTabsPopup.getElementsByClassName("alltabs-item").length
				) {
					_log("Force cleanup #alltabs-popup");
					allTabsPopup.dispatchEvent(new window.Event("popuphidden"));
				}
			}.bind(this), 10);
		}
		gBrowser.updateTitlebar();
		this.privateChanged(document, isPrivate);
	},
	privateChanged: function(document, isPrivate) {
		var window = document.defaultView;
		if(prefs.get("usePrivateWindowStyle"))
			this.updateTabsInTitlebar(document);
		if(prefs.get("patchDownloads"))
			this.updateDownloadPanel(window, isPrivate);
		if(
			!isPrivate
			&& "TrackingProtection" in window
			&& "icon" in window.TrackingProtection
		) window.setTimeout(function() { // Firefox 42+
			var TrackingProtection = window.TrackingProtection;
			if(!TrackingProtection.enabled && TrackingProtection.icon.hasAttribute("state")) {
				TrackingProtection.icon.removeAttribute("state");
				_log("Hide tracking protection icon");
			}
		}, 0);
	},
	updateTabsInTitlebar: function(document, force) {
		var window = document.defaultView;
		if(
			"TabsInTitlebar" in window
			&& "_sizePlaceholder" in window.TabsInTitlebar
			&& (force || !this.appButtonCssURI)
		) {
			// Based on code from chrome://browser/content/browser.js
			if(this.isAustralis) {
				var {TabsInTitlebar} = window;
				if("_update" in TabsInTitlebar)
					TabsInTitlebar._update(true);
				// Looks useless: will be updated from Firefox side
				//else
				//	TabsInTitlebar.update(); // Firefox 61+
				_log("updateTabsInTitlebar() => TabsInTitlebar._update(true)");
			}
			else {
				var sizePlaceholder = function(type, baseNodeId) {
					var baseNode = document.getElementById(baseNodeId);
					if(baseNode) {
						var rect = baseNode.getBoundingClientRect();
						if(rect.width) {
							_log("Update size placeholder for #" + baseNodeId);
							window.TabsInTitlebar._sizePlaceholder(type, rect.width);
						}
					}
				};
				sizePlaceholder("appmenu-button", "appmenu-button-container");
				sizePlaceholder("caption-buttons", "titlebar-buttonbox-container");
			}
		}
	},
	updateDownloadPanel: function(window, isPrivate) {
		if(
			!( // SeaMonkey?
				"DownloadsView" in window
				&& "DownloadsPanel" in window
				&& "DownloadsIndicatorView" in window
				&& "DownloadsCommon" in window
			) || window.DownloadsCommon.useToolkitUI
		)
			return;
		var pt = window.privateTab;
		window.clearTimeout(pt._updateDownloadPanelTimer);
		pt._updateDownloadPanelTimer = window.setTimeout(function() {
			// See chrome://browser/content/downloads/downloads.js,
			// chrome://browser/content/downloads/indicator.js,
			// resource:///modules/DownloadsCommon.jsm
			// Clear download panel:
			var DownloadsPanel = window.DownloadsPanel;
			var DownloadsView = window.DownloadsView;
			if(DownloadsPanel._state != DownloadsPanel.kStateUninitialized) {
				if("onDataInvalidated" in DownloadsView) {
					DownloadsView.onDataInvalidated(); // This calls DownloadsPanel.terminate();
					_log("updateDownloadPanel() => DownloadsView.onDataInvalidated()");
				}
				else { // Firefox 28.0a1+
					// Based on code from chrome://browser/content/downloads/downloads.js in Firefox 25.0
					DownloadsPanel.terminate();
					DownloadsView.richListBox.textContent = "";
					// We can't use {} and [] here because of memory leaks!
					if("_downloads" in DownloadsView) // Firefox 38+
						DownloadsView._downloads = new window.Array();
					else {
						DownloadsView._viewItems = new window.Object();
						DownloadsView._dataItems = new window.Array();
					}
					_log("updateDownloadPanel() => DownloadsPanel.terminate() + cleanup manually");
				}
				DownloadsPanel.initialize(function() {
					_log("updateDownloadPanel() => DownloadsPanel.initialize() done");
				});
				_log("updateDownloadPanel() => DownloadsPanel.initialize()");
			}
			// Reinitialize download indicator:
			var diw = window.DownloadsIndicatorView;
			if(diw._initialized) {
				//~ hack: cleanup raw download data, see DownloadsCommon.getData()
				//var global = Components.utils.getGlobalForObject(window.DownloadsCommon);
				// Global object was changed in Firefox 57+ https://bugzilla.mozilla.org/show_bug.cgi?id=1186409
				var global = Components.utils.import("resource:///modules/DownloadsCommon.jsm", {});
				var data = isPrivate
					? global.DownloadsIndicatorData
					: global.PrivateDownloadsIndicatorData;
				var views = data._views;
				for(var i = views.length - 1; i >= 0; --i) {
					var view = views[i];
					if(Components.utils.getGlobalForObject(view) == window)
						data.removeView(view);
				}
				// Restart download indicator:
				diw.ensureTerminated();
				diw.ensureInitialized();
				_log("updateDownloadPanel() => reinitialize download indicator");
			}
		}, 100);
	},
	_overrideIsPrivate: undefined,
	patchPrivateBrowsingUtils: function(applyPatch) {
		var meth = "isWindowPrivate";
		var key = "PrivateBrowsingUtils.isWindowPrivate";
		var pbu = PrivateBrowsingUtils;
		if(applyPatch) {
			var _this = this;
			pbu._privateTabOrigIsWindowPrivate = pbu.isWindowPrivate;
			patcher.wrapFunction(pbu, meth, key,
				function before(window) {
					if(
						!window
						|| !(window instanceof Components.interfaces.nsIDOMChromeWindow)
						|| !_this.isTargetWindow(window)
					)
						return false;
					var isPrivate = _this._overrideIsPrivate;
					if(isPrivate !== undefined) {
						_log(key + "(): override to " + isPrivate);
						return { value: isPrivate };
					}
					var stack = new Error().stack;
					_dbgv && _log(key + "():\n" + stack);

					if(
						(
							stack.indexOf("\nprivateTab.openNewPrivateTab@") != -1 // Firefox 52
							|| stack.indexOf("\nopenNewPrivateTab@") != -1 // Firefox 53+
						)
						&& (
							stack.indexOf("\n_linkBrowserToTab@chrome://browser/content/tabbrowser.xml:") != -1
							|| (_this.platformVersion >= 54 && prefs.getPref("browser.newtab.preload"))
						)
					) {
						_log(key + "(): looks like privateTab.openNewPrivateTab() + preloaded about:newtab, override to true");
						return { value: true };
					}

					var fromSearchBar = stack.indexOf("@chrome://browser/content/search/search.xml:") != -1
						|| stack.indexOf("\ndoSearch@chrome://tabmixplus/content/changecode.js:") != -1;
					var fromDownloads = !fromSearchBar && prefs.get("patchDownloads")
						&& _this.isStackFromDownloads(stack);
					var fromTrackingProtection = !fromSearchBar && !fromDownloads
						&& "TrackingProtection" in window && ( // Firefox 42+
							stack.indexOf("\nTrackingProtection.enabled@chrome://browser/content/browser.js:") != -1
							|| stack.indexOf("@chrome://browser/content/browser-trackingprotection.js:") != -1 // Firefox 45+
						);
					if(fromSearchBar || fromDownloads || fromTrackingProtection) try {
						var isPrivate = _this.isPrivateContent(window);
						_dbgv && _log(key + "(): return state of selected tab: " + isPrivate);
						if(fromSearchBar && "privateTab" in window) {
							var pt = window.privateTab;
							pt._clearSearchBarUndo = true;
							pt._clearSearchBarValue = isPrivate;
							_dbgv && _log("_clearSearchBarValue: " + isPrivate);
						}
						return { value: isPrivate };
					}
					catch(e) {
						Components.utils.reportError(e);
					}
					return false;
				}
			);
		}
		else {
			patcher.unwrapFunction(pbu, meth, key);
			delete pbu._privateTabOrigIsWindowPrivate;
		}
		_log("patchPrivateBrowsingUtils(" + applyPatch + ")");
		if("isContentWindowPrivate" in PrivateBrowsingUtils)
			this.patchPrivateBrowsingUtilsContent(applyPatch);
	},
	patchPrivateBrowsingUtilsContent: function(applyPatch) {
		var meth = "isContentWindowPrivate";
		var key = "PrivateBrowsingUtils.isContentWindowPrivate";
		var pbu = PrivateBrowsingUtils;
		if(applyPatch) {
			var _this = this;
			pbu._privateTabOrigIsContentWindowPrivate = pbu.isContentWindowPrivate;
			patcher.wrapFunction(pbu, meth, key,
				function before(window) {
					if(
						!window
						|| !(window instanceof Components.interfaces.nsIDOMChromeWindow)
						|| !_this.isTargetWindow(window)
					)
						return false;
					var isPrivate = _this._overrideIsPrivate;
					if(isPrivate !== undefined) {
						_log(key + "(): override to " + isPrivate);
						return { value: isPrivate };
					}
					var stack = new Error().stack;
					var fromDownloads = prefs.get("patchDownloads")
						&& _this.isStackFromDownloads(stack);
					_dbgv && _log(key + "():\n" + stack);
					if(fromDownloads) try {
						var isPrivate = _this.isPrivateContent(window);
						_dbgv && _log(key + "(): return state of selected tab: " + isPrivate);
						return { value: isPrivate };
					}
					catch(e) {
						Components.utils.reportError(e);
					}
					return false;
				}
			);
		}
		else {
			patcher.unwrapFunction(pbu, meth, key);
			delete pbu._privateTabOrigIsContentWindowPrivate;
		}
		_log("patchPrivateBrowsingUtilsContent(" + applyPatch + ")");
	},
	isStackFromDownloads: function(stack) {
		return stack.indexOf("@chrome://browser/content/downloads/downloads.js:") != -1
			|| stack.indexOf("/modules/DownloadsCommon.jsm:") != -1
				&& /@resource:\/\/(?:app|gre)?\/modules\/DownloadsCommon\.jsm:/.test(stack)
			|| stack.indexOf("/components/DownloadsUI.js:") != -1
				&& /@resource:\/\/(?:app|gre)?\/components\/DownloadsUI\.jsm:/.test(stack);
	},

	getPrivacyContext: function(window) {
		return PrivateBrowsingUtils.privacyContextFromWindow(window);
	},
	isPrivateWindow: function(window) {
		return window && PrivateBrowsingUtils._privateTabOrigIsWindowPrivate(window);
	},
	isPrivateContent: function(window) {
		var tab = window.gBrowser.selectedTab;
		if(!this.isRemoteTab(tab)) try {
			return this.isPrivateWindow(this.getContentWindow(window));
		}
		catch(e) {
			_log("isPrivateContent() failed, call stack:\n" + new Error().stack);
			Components.utils.reportError(e);
		}
		return tab.hasAttribute(this.privateAttr);
	},
	shouldMakeTabPrivate: function(window) {
		var gBrowser = window.gBrowser;
		var tst = gBrowser && gBrowser.treeStyleTab || null;
		if(tst) try {
			var parentTab = tst.getTabById(tst.parentTab);
			_dbgv && _log("shouldMakeTabPrivate(): parent tab: " + parentTab);
			if(parentTab && parentTab.parentNode) {
				var tabInfo = _tab(parentTab)+ "\n"
					+ _str(parentTab.linkedBrowser && parentTab.linkedBrowser.currentURI.spec || "");
				_log("Will inherit private state from Tree Style Tab's parent tab:\n" + tabInfo);
				return this.isPrivateTab(parentTab);
			}
		}
		catch(e) {
			Components.utils.reportError(e);
		}
		return this.isPrivateContent(window);
	},
	getContentWindow: function(window) {
		// Note: with enabled Electrolysis window.content may refers to
		// previously selected content window right after "TabSelect"
		return window.gBrowser.contentWindow;
	},
	isMultiProcessWindow: function(window) {
		return "gMultiProcessBrowser" in window && window.gMultiProcessBrowser;
	},
	getTabPrivacyContext: function(tab) {
		var browser = tab.linkedBrowser;
		if(!browser) {
			Components.utils.reportError(
				LOG_PREFIX + "getTabPrivacyContext() called for already destroyed tab, call stack:\n"
				+ new Error().stack
			);
		}
		try {
			return this.getPrivacyContext(browser.contentWindow);
		}
		catch(e) {
			_log("getTabPrivacyContext() failed, call stack:\n" + new Error().stack);
			Components.utils.reportError(e);
		}
		return null;
	},
	isPrivateTab: function(tab) {
		if(this.isRemoteTab(tab)) {
			_dbgv && _log("isPrivateTab(): tab is remote, will check private attribute");
			return tab.getAttribute(this.privateAttr) == "true";
		}
		var privacyContext = this.getTabPrivacyContext(tab);
		if(!privacyContext) {
			_log("isPrivateTab(): privacyContext is " + privacyContext + ", will check private attribute");
			return tab.getAttribute(this.privateAttr) == "true";
		}
		return privacyContext.usePrivateBrowsing;
	},
	isPrivateTabAsync: function(tab, feedback, context) {
		if(!this.isRemoteTab(tab)) {
			var privacyContext = this.getTabPrivacyContext(tab);
			if(privacyContext)
				feedback.call(context, privacyContext.usePrivateBrowsing);
			else {
				_log("isPrivateTabAsync(): privacyContext is " + privacyContext + ", will check private attribute");
				feedback.call(context, tab.getAttribute(this.privateAttr) == "true");
			}
			return;
		}
		var window = tab.ownerDocument.defaultView;
		var mm = tab.linkedBrowser.messageManager;
		this.waitForMessage(mm, "PrivateTab:PrivateState", function(msg) {
			feedback.call(context, msg.data.isPrivate);
		});
		this.sendAsyncMessage(window, mm, {
			action: "GetState"
		});
	},
	isRemoteTab: function(tab) {
		var browser = tab.linkedBrowser;
		return browser && browser.getAttribute("remote") == "true";
	},
	isPendingTab: function(tab) {
		return tab.hasAttribute("pending");
	},

	sendAsyncMessage: function(window, mm, data) {
		if(!window.privateTab._frameScriptLoaded) {
			_dbgv && _log("sendAsyncMessage() -> loadFrameScript()");
			window.privateTab._frameScriptLoaded = true;
			window.messageManager.loadFrameScript("chrome://privatetab/content/content.js" + this.frameScriptUID, true);
		}
		_dbgv && _log("sendAsyncMessage():\n" + JSON.stringify(data, null, "\t"));
		mm.sendAsyncMessage("PrivateTab:Action", data);
	},
	waitForMessage: function(mm, name, callback, context) {
		_dbgv && _log('waitForMessage("' + name + '")');
		mm.addMessageListener(name, function receiveMessage(msg) {
			mm.removeMessageListener(name, receiveMessage);
			_dbgv && _log('waitForMessage("' + name + '") -> callback()');
			callback.call(context, msg);
		});
	},

	isLastPrivate: function(tabOrWindow) {
		var ourTab, ourWindow;
		if(tabOrWindow) {
			if(tabOrWindow instanceof Components.interfaces.nsIDOMChromeWindow)
				ourWindow = tabOrWindow;
			else if(tabOrWindow.ownerDocument)
				ourTab = tabOrWindow;
		}
		for(var window of this.windows) {
			if(
				window != ourWindow && (
					this.isPrivateWindow(window)
					|| this.hasPrivateTab(window, ourTab)
				)
			)
				return false;
		}
		return true;
	},
	hasPrivateTab: function(window, ignoreTab) {
		return Array.prototype.some.call(
			window.gBrowser.tabs,
			function(tab) {
				return tab != ignoreTab
					&& !tab.closing
					&& this.isPrivateTab(tab);
			},
			this
		);
	},
	get hasPrivate() {
		for(var window of this.windows)
			if(this.isPrivateWindow(window) || this.hasPrivateTab(window))
				return true;
		return false;
	},
	forbidCloseLastPrivate: function() {
		var exitingCanceled = Components.classes["@mozilla.org/supports-PRBool;1"]
			.createInstance(Components.interfaces.nsISupportsPRBool);
		exitingCanceled.data = false;
		Services.obs.notifyObservers(exitingCanceled, "last-pb-context-exiting", null);
		_log("forbidCloseLastPrivate(): exiting canceled: " + exitingCanceled.data);
		return exitingCanceled.data;
	},

	privateAttr: "privateTab-isPrivate",
	rootPrivateAttr: "privateTab-selectedTabIsPrivate",
	get ss() {
		delete this.ss;
		return this.ss = "nsISessionStore" in Components.interfaces
			? (
				Components.classes["@mozilla.org/browser/sessionstore;1"]
				|| Components.classes["@mozilla.org/suite/sessionstore;1"]
			).getService(Components.interfaces.nsISessionStore)
			// Firefox 61+ https://bugzilla.mozilla.org/show_bug.cgi?id=1450559
			: Components.utils.import("resource:///modules/sessionstore/SessionStore.jsm", {}).SessionStore;
	},
	get canFilterSession() { // See https://bugzilla.mozilla.org/show_bug.cgi?id=899276
		delete this.canFilterSession;
		return this.canFilterSession = this.platformVersion < 29
			|| this.isSeaMonkey
			|| Services.appinfo.name == "Pale Moon";
	},

	_stylesLoaded: false,
	loadStyles: function(window) {
		if(this._stylesLoaded)
			return;
		this._stylesLoaded = true;
		var sss = this.sss;
		var cssURI = this.cssURI = this.makeCssURI(window);
		if(!sss.sheetRegistered(cssURI, sss.USER_SHEET))
			sss.loadAndRegisterSheet(cssURI, sss.USER_SHEET);
		if(this.isAustralis) window.setTimeout(function() {
			var cssA11yURI = this.cssA11yURI = this.makeCssA11yURI(window);
			if(cssA11yURI && !sss.sheetRegistered(cssA11yURI, sss.USER_SHEET))
				sss.loadAndRegisterSheet(cssA11yURI, sss.USER_SHEET);
		}.bind(this), 25);
	},
	unloadStyles: function() {
		if(!this._stylesLoaded)
			return;
		this._stylesLoaded = false;
		var sss = this.sss;
		if(sss.sheetRegistered(this.cssURI, sss.USER_SHEET))
			sss.unregisterSheet(this.cssURI, sss.USER_SHEET);
		if(this.cssA11yURI && sss.sheetRegistered(this.cssA11yURI, sss.USER_SHEET))
			sss.unregisterSheet(this.cssA11yURI, sss.USER_SHEET);
		this.cssURI = this.cssA11yURI = null;
	},
	reloadStyles: function(window) {
		if(!window)
			window = this.getMostRecentBrowserWindow();
		this.unloadStyles();
		if(window)
			this.loadStyles(window);
	},
	get sss() {
		delete this.sss;
		return this.sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
			.getService(Components.interfaces.nsIStyleSheetService);
	},
	makeCssURI: function(window) {
		var document = window.document;
		var s = document.documentElement.style;
		var prefix = "textDecorationColor" in s && "textDecorationStyle" in s
			? ""
			: "-moz-";
		var ttColor = "-moz-nativehyperlinktext";
		var ttAddStyles = "";
		var tt = this.getTabTooltip(document)
			|| document.getElementsByTagName("tooltip")[0];
		var ttOrigColor = tt && window.getComputedStyle(tt, null).color;
		_log("Original tab tooltip color: " + ttOrigColor);
		if(/^rgb\((\d+), *(\d+), *(\d+)\)$/.test(ttOrigColor)) {
			var r = +RegExp.$1, g = +RegExp.$2, b = +RegExp.$3;
			var brightness = Math.max(r/255, g/255, b/255); // HSV, 0..1
			if(brightness > 0.5) { // Bright text, dark background
				_log("Will use special styles for tab tooltip: bright text, dark background");
				ttColor = "currentColor";
				ttAddStyles = '\n\
					font-weight: bold;\n\
					text-decoration: underline;\n\
					' + prefix + 'text-decoration-color: currentColor;\n\
					' + prefix + 'text-decoration-style: dashed;';
			}
		}
		var important = prefs.get("stylesHighPriority") ? " !important" : "";
		var importantTree = prefs.get("stylesHighPriority.tree") ? " !important" : "";
		var cssStr = '\
			/* Private Tab: main styles */\n\
			@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");\n\
			@-moz-document url("' + document.documentURI + '") {\n\
				.tabbrowser-tab[' + this.privateAttr + '],\n\
				.tabbrowser-tab[' + this.privateAttr + '] .tab-text, /* Firefox 75+? */\n\
				menuitem[' + this.privateAttr + '],\n\
				.subviewbutton[' + this.privateAttr + '] {\n\
					text-decoration: underline' + important + ';\n\
					' + prefix + 'text-decoration-color: -moz-nativehyperlinktext' + important + ';\n\
					' + prefix + 'text-decoration-style: dashed' + important + ';\n\
				}\n\
				.tabbrowser-tab[' + this.privateAttr + '][pinned] .tab-icon-image,\n\
				.tabbrowser-tab[' + this.privateAttr + '][pinned] .tab-throbber {\n\
					border-bottom: 1px dashed -moz-nativehyperlinktext' + important + ';\n\
				}\n\
				#' + this.tabTipId + ' {\n\
					color: ' + ttColor + ';' + ttAddStyles + '\n\
				}\n\
				#' + this.tabScopeTipId + '{\n\
					color: -moz-nativehyperlinktext;\n\
					text-align: center;\n\
					margin: 1px;\n\
				}\n\
				#' + this.afterTabsButtonId + ' > .toolbarbutton-menu-dropmarker {\n\
					display: none; /* Quick fix for Firefox 57+ */\n\
				}\n\
			}\n\
			@-moz-document url("' + document.documentURI + '"),\n\
				url("chrome://global/content/customizeToolbar.xul") {\n\
				#' + this.toolbarButtonId + ',\n\
				#' + this.afterTabsButtonId + ' {\n\
					list-style-image: url("chrome://privatetab/content/privacy-24.png") !important;\n\
					-moz-image-region: auto !important;\n\
				}\n\
				toolbar[iconsize="small"] #' + this.toolbarButtonId + ',\n\
				toolbar[iconsize="small"] #' + this.afterTabsButtonId + ' {\n\
					list-style-image: url("chrome://privatetab/content/privacy-16.png") !important;\n\
				}\n\
				/* Special icon for Australis (menu panel and customization area) */\n\
				#' + this.toolbarButtonId + '[cui-areatype="menu-panel"],\n\
				#customization-palette > toolbarpaletteitem[place="palette"] > #' + this.toolbarButtonId + ' {\n\
					list-style-image: url("chrome://privatetab/content/privacy-32.png") !important;\n\
				}\n\
				#' + this.afterTabsButtonId + ' > .toolbarbutton-icon {\n\
					margin: 0 !important;\n\
				}\n\
				/*\n\
				Show button after last tab for [Tabs][New Tab][New Private Tab] and [Tabs][New Private Tab]\n\
				and also show "New Tab" after last tab for [Tabs][New Private Tab][New Tab]\n\
				*/\n\
				#' + this.afterTabsButtonId + ',\n\
				#TabsToolbar[' + this.showAfterTabsAttr + ']:not([customizing="true"])\n\
					#tabbrowser-tabs:not([overflow="true"])\n\
					~ #' + this.toolbarButtonId + ',\n\
				#TabsToolbar[' + this.showAfterTabsAttr + ']:not([customizing="true"])[' + this.hasNewTabAfter + ']\n\
					#tabbrowser-tabs:not([overflow="true"])\n\
					~ #new-tab-button {\n\
					visibility: collapse;\n\
				}\n\
				#TabsToolbar[' + this.showAfterTabsAttr + ']:not([customizing="true"])\n\
					#tabbrowser-tabs:not([overflow="true"])\n\
					#' + this.afterTabsButtonId + ',\n\
				#TabsToolbar[' + this.showAfterTabsAttr + ']:not([customizing="true"])[' + this.hasNewTabAfter + ']\n\
					#tabbrowser-tabs:not([overflow="true"])\n\
					.tabs-newtab-button[command="cmd_newNavigatorTab"] {\n\
					visibility: visible !important;\n\
				}\n\
			}';
		if(prefs.get("enablePrivateProtocol")) {
			cssStr += '\n\
			@-moz-document url("' + document.documentURI + '") {\n\
				.bookmark-item[scheme="private"] {\n\
					text-decoration: underline' + important + ';\n\
					' + prefix + 'text-decoration-color: -moz-nativehyperlinktext' + important + ';\n\
					' + prefix + 'text-decoration-style: dashed' + important + ';\n\
				}\n\
			}\n\
			@-moz-document url("chrome://browser/content/bookmarks/bookmarksPanel.xul"),\n\
				url("chrome://browser/content/places/places.xul"),\n\
				url("chrome://communicator/content/bookmarks/bm-panel.xul"),\n\
				url("chrome://communicator/content/bookmarks/bookmarksManager.xul") {\n\
				treechildren::-moz-tree-cell-text(private) {\n\
					border-bottom: 1px dashed -moz-nativehyperlinktext' + importantTree + ';\n\
					margin-bottom: 1px' + importantTree + ';\n\
				}\n\
			}';
		}
		return this.newCssURI(cssStr);
	},
	makeCssA11yURI: function(window) {
		// See https://github.com/Infocatcher/Private_Tab/issues/137
		// Correct clickable area for buttons after last tab:
		// we use extending binding with display="xul:hbox" to make button's icon accessible,
		// buttons becomes not clickable (no "command" event), so we add "click" listener
		if(
			!this.isAustralis
			|| !prefs.get("fixAfterTabsButtonsAccessibility")
			|| (
				this.platformVersion >= 57 // Tabs (and buttons) should be squared
				&& !prefs.get("fixAfterTabsButtonsAccessibility.force")
			)
		)
			return null;
		var newTabBtn = this.getNewTabButton(window);
		if(!newTabBtn)
			return null;
		var origStyle = newTabBtn.hasAttribute("style") && newTabBtn.getAttribute("style");
		// Force show to get correct size (may be hidden, if there is many tabs)
		newTabBtn.style.visibility = "visible";
		var cs = window.getComputedStyle(newTabBtn, null);
		var origBinding = cs.MozBinding;
		var ext = /^url\("([^"]+)"\)$/.test(origBinding)
			&& RegExp.$1 || "chrome://global/content/bindings/toolbarbutton.xml#toolbarbutton";
		var icon = this.getAnonChild(newTabBtn.ownerDocument, newTabBtn, "class", "toolbarbutton-icon");
		var csi = icon ? window.getComputedStyle(icon, null) : {};
		var padding = prefs.get("fixAfterTabsButtonsAccessibility.iconPadding") || (
			Math.max(0, (
				parseFloat(cs.height) - parseFloat(csi.height || 16)
				+ parseFloat(cs.marginTop) + parseFloat(cs.marginBottom)
				- parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth)
				- parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
				- parseFloat(csi.marginTop || 0) - parseFloat(csi.marginBottom || 0)
			)/2) + "px "
			+ Math.max(0, (
				parseFloat(cs.width) - parseFloat(csi.width || 16)
				+ parseFloat(cs.marginLeft) + parseFloat(cs.marginRight)
				- parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth)
				- parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
				- parseFloat(csi.marginLeft || 0) - parseFloat(csi.marginRight || 0)
			)/2) + "px"
		);
		if(origStyle === false)
			newTabBtn.removeAttribute("style");
		else
			newTabBtn.setAttribute("style", origStyle);
		_log("After tabs button binding:\n" + origBinding + "\n=> " + ext + "\npadding: " + padding);
		var btnBinding = this.trimMultilineString('\
			<?xml version="1.0"?>\n\
			<bindings id="privateTabBindings"\n\
				xmlns="http://www.mozilla.org/xbl"\n\
				xmlns:xul="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul">\n\
				<binding id="toolbarbutton" display="xul:hbox" role="xul:toolbarbutton"\n\
					extends="' + ext + '" />\n\
			</bindings>');
		var btnBindingData = "data:application/xml," + encodeURIComponent(btnBinding) + "#toolbarbutton";
		var cssStr = '\
			/* Private Tab: fix width of clickable area for buttons after last tab */\n\
			@-moz-document url("' + window.document.documentURI + '") {\n\
				#TabsToolbar[' + this.fixAfterTabsA11yAttr + '] .tabs-newtab-button {\n\
					pointer-events: none;\n\
					-moz-binding: url("' + btnBindingData + '");\n\
				}\n\
				#TabsToolbar[' + this.fixAfterTabsA11yAttr + '] .tabs-newtab-button > .toolbarbutton-icon {\n\
					pointer-events: auto;\n\
					width: auto !important;\n\
					height: auto !important;\n\
					padding: ' + padding + ' !important;\n\
				}\n\
			}';
		return this.newCssURI(cssStr);
	},
	newCssURI: function(cssStr) {
		cssStr = this.trimMultilineString(cssStr);
		return Services.io.newURI("data:text/css," + encodeURIComponent(cssStr), null, null);
	},
	trimMultilineString: function(s) {
		var spaces = s.match(/^[ \t]*/)[0];
		return s.replace(new RegExp("^" + spaces, "mg"), "");
	},

	get bundle() {
		try {
			var bundle = Services.strings.createBundle("chrome://privatetab/locale/pt.properties");
		}
		catch(e) {
			Components.utils.reportError(e);
		}
		delete this.bundle;
		return this.bundle = bundle;
	},
	getLocalized: function(sid) {
		try {
			return this.bundle.GetStringFromName(sid);
		}
		catch(e) {
			Components.utils.reportError(LOG_PREFIX + "Can't get localized string for \"" + sid + "\"");
			Components.utils.reportError(e);
		}
		return sid;
	}
};

var privateTabInternal = privateTab;
function API(window) {
	this.window = window;
}
API.prototype = {
	_openNewTabsPrivate: undefined,
	_ssWindowBusy: false,
	_ssWindowBusyRestoreTimer: 0,
	_updateDownloadPanelTimer: 0,
	_checkLastPrivate: true,
	_clearSearchBarUndo: false,
	_clearSearchBarValue: false,
	_frameScriptLoaded: false,
	_destroy: function() {
		if(this._openNewTabsPrivate !== undefined)
			this.stopToOpenTabs();
		this.window = null;
	},
	handleEvent: function(e) {
		if(e.type == "TabOpen" && this._openNewTabsPrivate !== undefined) {
			_log("Used readyToOpenTabs(), make tab private");
			privateTabInternal.toggleTabPrivate(e.originalTarget || e.target, this._openNewTabsPrivate);
		}
	},
	_onFirstPrivateTab: function(window, tab) {
		this._onFirstPrivateTab = function() {};
		_log("First private tab in window");
		if(privateTabInternal.isPrivateWindow(window))
			return;
		window.setTimeout(function() {
			privateTabInternal.addPbExitObserver(true);
			privateTabInternal.patchSearchBar(window, true);
		}, 0);
		if(!prefs.get("allowOpenExternalLinksInPrivateTabs")) window.setTimeout(function() {
			privateTabInternal.patchBrowserLoadURI(window, true);
		}, 50);
	},
	_handleProtocolBrowser: function(browser, bookmarkURI) {
		privateTabInternal.handleProtocolBrowser(browser, bookmarkURI);
	},
	_fixBrowserFromProtocol: function(browser, uri) {
		return privateTabInternal.fixBrowserFromProtocol(browser, uri);
	},
	// Public API:
	isTabPrivate: function privateTab_isTabPrivate(tab) {
		return privateTabInternal.isPrivateTab(tab);
	},
	isTabPrivateAsync: function privateTab_isTabPrivateAsync(tab, feedback, context) {
		// Get real state in e10s mode
		privateTabInternal.isPrivateTabAsync(tab, feedback, context);
	},
	toggleTabPrivate: function privateTab_toggleTabPrivate(tab, isPrivate) {
		isPrivate = privateTabInternal.toggleTabPrivate(tab, isPrivate);
		privateTabInternal.fixTabState(tab, isPrivate);
		return isPrivate;
	},
	duplicateTabAndTogglePrivate: function(tab, isPrivate) {
		return privateTabInternal.duplicateTabAndTogglePrivate(tab, isPrivate);
	},
	replaceTabAndTogglePrivate: function(tab, isPrivate, onSuccess) {
		return privateTabInternal.replaceTabAndTogglePrivate(tab, isPrivate, onSuccess);
	},
	readyToOpenTab: function privateTab_readyToOpenTab(isPrivate) {
		privateTabInternal.readyToOpenTab(this.window, isPrivate);
	},
	readyToOpenTabs: function privateTab_readyToOpenTabs(isPrivate) {
		this._openNewTabsPrivate = isPrivate;
		this.window.addEventListener("TabOpen", this, true);
	},
	stopToOpenTabs: function privateTab_stopToOpenTabs() {
		this._openNewTabsPrivate = undefined;
		this.window.removeEventListener("TabOpen", this, true);
	},
	get hasClosedTabs() {
		for(var i in privateTabInternal.getClosedPrivateTabs(this.window))
			return true;
		return false;
	},
	forgetClosedTabs: function privateTab_forgetClosedTabs() {
		privateTabInternal.forgetClosedTabs(this.window);
	},
	tabLabelIsEmpty: function(tabLabel, isEmpty) {
		var emptyLabels = privateTabInternal.emptyTabLabels;
		if(isEmpty === undefined)
			return tabLabel in emptyLabels;
		if(tabLabel in emptyLabels && emptyLabels[tabLabel] != "API") {
			var stack = Components.stack.caller;
			Components.utils.reportError(new Error(
				LOG_PREFIX + "tabLabelIsEmpty(): \"" + tabLabel + "\" => you can't modify built-in entries!",
				stack.filename,
				stack.lineNumber
			));
			return true;
		}
		if(isEmpty)
			emptyLabels[tabLabel] = "API";
		else
			delete emptyLabels[tabLabel];
		_log("tabLabelIsEmpty(): \"" + tabLabel + "\" => " + isEmpty);
		return isEmpty;
	}
};

var prefs = {
	ns: "extensions.privateTab.",
	version: 1,
	initialized: false,
	init: function() {
		if(this.initialized)
			return;
		this.initialized = true;

		var curVersion = this.getPref(this.ns + "prefsVersion", 0);
		if(curVersion < this.version) {
			_log("Migrate prefs: " + curVersion + " => " + this.version);
			this.migratePrefs(curVersion);
			this.setPref(this.ns + "prefsVersion", this.version);
		}
		//~ todo: add condition when https://bugzilla.mozilla.org/show_bug.cgi?id=564675 will be fixed
		this.loadDefaultPrefs();
		if(privateTab.isSeaMonkey) {
			var defaultBranch = Services.prefs.getDefaultBranch("");
			this.setPref(this.ns + "dragAndDropTabsBetweenDifferentWindows", false, defaultBranch);
			this.setPref(this.ns + "patchDownloads", false, defaultBranch);
		}
		Services.prefs.addObserver(this.ns, this, false);
	},
	destroy: function() {
		if(!this.initialized)
			return;
		this.initialized = false;

		Services.prefs.removeObserver(this.ns, this);
	},
	migratePrefs: function(version) {
		var boolean = function(pName) { // true -> 1
			if(this.getPref(pName) === true) {
				_log("migratePrefs(): set " + pName + " = 1");
				Services.prefs.deleteBranch(pName);
				this.setPref(pName, 1);
			}
		}.bind(this);
		boolean(this.ns + "makeNewEmptyTabsPrivate");
		boolean(this.ns + "makeNewEmptyWindowsPrivate");
	},
	observe: function(subject, topic, pName) {
		if(topic != "nsPref:changed")
			return;
		var shortName = pName.substr(this.ns.length);
		var val = this.getPref(pName);
		this._cache[shortName] = val;
		privateTab.prefChanged(shortName, val);
	},

	loadDefaultPrefs: function() {
		var defaultBranch = Services.prefs.getDefaultBranch("");
		var prefsFile = "chrome://privatetab/content/defaults/preferences/prefs.js";
		var prefs = this;
		Services.scriptloader.loadSubScript(prefsFile, {
			pref: function(pName, val) {
				var pType = defaultBranch.getPrefType(pName);
				if(pType != defaultBranch.PREF_INVALID && pType != prefs.getValueType(val)) {
					Components.utils.reportError(
						LOG_PREFIX + 'Changed preference type for "' + pName
						+ '", old value will be lost!'
					);
					defaultBranch.deleteBranch(pName);
				}
				prefs.setPref(pName, val, defaultBranch);
			}
		});
	},

	_cache: { __proto__: null },
	get: function(pName, defaultVal) {
		var cache = this._cache;
		return pName in cache
			? cache[pName]
			: (cache[pName] = this.getPref(this.ns + pName, defaultVal));
	},
	set: function(pName, val) {
		this.setPref(this.ns + pName, val);
	},
	getPref: function(pName, defaultVal, prefBranch) {
		var ps = prefBranch || Services.prefs;
		switch(ps.getPrefType(pName)) {
			case ps.PREF_BOOL:   return ps.getBoolPref(pName);
			case ps.PREF_INT:    return ps.getIntPref(pName);
			case ps.PREF_STRING:
				if("getStringPref" in ps) // Firefox 58+
					return ps.getStringPref(pName);
				return ps.getComplexValue(pName, Components.interfaces.nsISupportsString).data;
		}
		return defaultVal;
	},
	setPref: function(pName, val, prefBranch) {
		var ps = prefBranch || Services.prefs;
		var pType = ps.getPrefType(pName);
		if(pType == ps.PREF_INVALID)
			pType = this.getValueType(val);
		switch(pType) {
			case ps.PREF_BOOL:   ps.setBoolPref(pName, val); break;
			case ps.PREF_INT:    ps.setIntPref(pName, val);  break;
			case ps.PREF_STRING:
				if("setStringPref" in ps) { // Firefox 58+
					ps.setStringPref(pName, val);
					break;
				}
				var ss = Components.interfaces.nsISupportsString;
				var str = Components.classes["@mozilla.org/supports-string;1"]
					.createInstance(ss);
				str.data = val;
				ps.setComplexValue(pName, ss, str);
		}
	},
	getValueType: function(val) {
		switch(typeof val) {
			case "boolean": return Services.prefs.PREF_BOOL;
			case "number":  return Services.prefs.PREF_INT;
		}
		return Services.prefs.PREF_STRING;
	}
};

var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);