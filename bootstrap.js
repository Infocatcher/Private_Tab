const WINDOW_LOADED = -1;
const WINDOW_CLOSED = -2;

const LOG_PREFIX = "[Private Tab] ";

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");

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
	windowsObserver.init(reason);
}
function shutdown(params, reason) {
	windowsObserver.destroy(reason);
}

var windowsObserver = {
	initialized: false,
	init: function(reason) {
		if(this.initialized)
			return;
		this.initialized = true;

		prefs.init();
		this.initHotkeys();
		this.appButtonDontChange = !prefs.get("fixAppButtonWidth");

		this.windows.forEach(function(window) {
			this.initWindow(window, reason);
		}, this);
		Services.ww.registerNotification(this);

		this.patchPrivateBrowsingUtils(true);
	},
	destroy: function(reason) {
		if(!this.initialized)
			return;
		this.initialized = false;

		this.windows.forEach(function(window) {
			this.destroyWindow(window, reason);
		}, this);
		Services.ww.unregisterNotification(this);

		this.unloadStyles();
		this.restoreAppButtonWidth();
		prefs.destroy();
		this._dndPrivateNode = null;

		this.patchPrivateBrowsingUtils(false);
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
	},

	handleEvent: function(e) {
		switch(e.type) {
			case "load":                      this.loadHandler(e);           break;
			case "TabOpen":                   this.tabOpenHandler(e);        break;
			case "SSTabRestoring":            this.tabRestoringHandler(e);   break;
			case "TabSelect":                 this.tabSelectHandler(e);      break;
			case "TabClose":                  this.tabCloseHandler(e);       break;
			case "dragstart":                 this.dragStartHandler(e);      break;
			case "dragend":                   this.dragEndHandler(e);        break;
			case "drop":                      this.dropHandler(e);           break;
			case "popupshowing":              this.popupShowingHandler(e);   break;
			case "command":                   this.commandHandler(e);        break;
			case "click":                     this.clickHandler(e);          break;
			case "keydown":
			case "keypress":                  this.keypressHandler(e);       break;
			case "PrivateTab:PrivateChanged": this.privateChangedHandler(e); break;
			case "SSWindowStateBusy":         this.setWindowBusy(e, true);   break;
			case "SSWindowStateReady":        this.setWindowBusy(e, false);
		}
	},
	loadHandler: function(e) {
		var window = e.originalTarget.defaultView;
		window.removeEventListener("load", this, false);
		this.initWindow(window, WINDOW_LOADED);
	},

	initWindow: function(window, reason) {
		if(reason == WINDOW_LOADED && !this.isTargetWindow(window)) {
			delete window.__privateTabOpener;
			return;
		}

		var document = window.document;
		this.loadStyles(window);
		var gBrowser = window.gBrowser
			|| window.getBrowser(); // For SeaMonkey
		this.ensureTitleModifier(document);
		this.patchBrowsers(gBrowser, true);
		window.setTimeout(function() {
			// We don't need patched functions right after window "load", so it's better to
			// apply patches after any other extensions
			this.patchTabBrowserDND(window, gBrowser, true);
		}.bind(this), 0);

		if(reason == WINDOW_LOADED)
			this.inheritWindowState(window);
		Array.forEach(gBrowser.tabs, function(tab) {
			this.setTabState(tab);
		}, this);

		if(this.isPrivateWindow(window)) {
			var root = document.documentElement;
			// We handle window before gBrowserInit.onLoad(), so set "privatebrowsingmode"
			// for fixAppButtonWidth() manually
			if(!PrivateBrowsingUtils.permanentPrivateBrowsing)
				root.setAttribute("privatebrowsingmode", "temporary");
			root.setAttribute(this.privateAttr, "true");
		}
		window.setTimeout(function() {
			// Wait for third-party styles like https://addons.mozilla.org/addon/movable-firefox-button/
			this.appButtonNA = false;
			this.fixAppButtonWidth(document);
			this.updateWindowTitle(gBrowser);
		}.bind(this), 0);

		window.addEventListener("TabOpen", this, false);
		window.addEventListener("SSTabRestoring", this, false);
		window.addEventListener("TabSelect", this, false);
		window.addEventListener("TabClose", this, false);
		window.addEventListener("dragstart", this, true);
		window.addEventListener("dragend", this, true);
		window.addEventListener("drop", this, true);
		window.addEventListener("PrivateTab:PrivateChanged", this, false);
		window.addEventListener("SSWindowStateBusy", this, true);
		window.addEventListener("SSWindowStateReady", this, true);
		if(this.hotkeys)
			window.addEventListener(this.keyEvent, this, true);
		window.setTimeout(function() {
			this.initControls(document);
			window.setTimeout(function() {
				this.initHotkeysText(document);
			}.bind(this), 10);
		}.bind(this), 50);
		this.initToolbarButton(document);
		window.privateTab = new API(window);
	},
	destroyWindow: function(window, reason) {
		window.removeEventListener("load", this, false); // Window can be closed before "load"
		if(reason == WINDOW_CLOSED && !this.isTargetWindow(window))
			return;
		var force = reason != APP_SHUTDOWN && reason != WINDOW_CLOSED;
		var disable = reason == ADDON_DISABLE || reason == ADDON_UNINSTALL;
		if(force) {
			var document = window.document;
			var gBrowser = window.gBrowser;
			var isPrivateWindow = this.isPrivateWindow(window);
			Array.forEach(gBrowser.tabs, function(tab) {
				tab.removeAttribute(this.privateAttr);
				if(disable && isPrivateWindow ^ this.isPrivateTab(tab)) {
					this.toggleTabPrivate(tab, isPrivateWindow);
					this.fixTabState(tab, false); // Always remove this.privateAttr
				}
			}, this);
			document.documentElement.removeAttribute(this.privateAttr);
			_log("Restore title...");
			if(!isPrivateWindow)
				this.updateWindowTitle(gBrowser, false);
			this.destroyTitleModifier(document);
			this.patchBrowsers(gBrowser, false);
			this.patchTabBrowserDND(window, gBrowser, false);
			delete window.privateTab;
		}
		this.unwatchAppButton(window);
		window.removeEventListener("TabOpen", this, false);
		window.removeEventListener("SSTabRestoring", this, false);
		window.removeEventListener("TabSelect", this, false);
		window.removeEventListener("TabClose", this, false);
		window.removeEventListener("dragstart", this, true);
		window.removeEventListener("dragend", this, true);
		window.removeEventListener("drop", this, true);
		window.removeEventListener(this.keyEvent, this, true);
		window.removeEventListener("PrivateTab:PrivateChanged", this, false);
		window.removeEventListener("SSWindowStateBusy", this, true);
		window.removeEventListener("SSWindowStateReady", this, true);
		this.destroyControls(window, force);
	},
	get isSeaMonkey() {
		delete this.isSeaMonkey;
		return this.isSeaMonkey = Services.appinfo.name == "SeaMonkey";
	},
	get windows() {
		var windows = [];
		var ws = Services.wm.getEnumerator(this.isSeaMonkey ? null : "navigator:browser");
		while(ws.hasMoreElements()) {
			var window = ws.getNext();
			if(this.isTargetWindow(window))
				windows.push(window);
		}
		return windows;
	},
	isTargetWindow: function(window) {
		var winType = window.document.documentElement.getAttribute("windowtype");
		return winType == "navigator:browser"
			|| winType == "navigator:private"; // SeaMonkey >= 2.19a1 (2013-03-27)
	},
	inheritWindowState: function(window) {
		_log(
			"inheritWindowState():\nwindow.opener: " + window.opener
			+ "\nwindow.__privateTabOpener: " + (window.__privateTabOpener || undefined)
			+ "\nwindow.arguments:\n" + Array.map(window.arguments || [], String).join("\n")
		);
		var opener = window.opener || window.__privateTabOpener || null;
		delete window.__privateTabOpener;
		var isEmptyWindow = !("arguments" in window) || !(3 in window.arguments);
		if((!opener || isEmptyWindow) && prefs.get("makeNewEmptyWindowsPrivate")) {
			_log("Make new empty window private");
			this.toggleWindowPrivate(window, true);
			return;
		}
		if(!opener || opener.closed || !this.isTargetWindow(opener) || !opener.gBrowser)
			return;
		if(isEmptyWindow) {
			_log("inheritWindowState(): Looks like new empty window, ignore");
			return;
		}
		if(this.isPrivateWindow(window)) {
			_log("inheritWindowState(): Ignore already private window");
			return;
		}
		if(!this.isPrivateTab(opener.gBrowser.selectedTab))
			return;
		_log("Inherit private state from current tab of the opener window");
		this.toggleWindowPrivate(window, true);
	},

	prefChanged: function(pName, pVal) {
		if(pName.startsWith("key."))
			this.updateHotkeys(true);
		else if(pName == "keysUseKeydownEvent")
			this.updateHotkeys();
		else if(pName == "fixAppButtonWidth") {
			this.appButtonDontChange = !pVal;
			this.restoreAppButtonWidth();
			this.windows.forEach(function(window) {
				var document = window.document;
				this.appButtonNA = false;
				if(pVal && !this.appButtonCssURI)
					this.fixAppButtonWidth(document);
				this.updateAppButtonWidth(document, true);
			}, this);
		}
		else if(pName == "dragAndDropTabsBetweenDifferentWindows") {
			this.windows.forEach(function(window) {
				this.patchTabBrowserDND(window, window.gBrowser, pVal);
			}, this);
		}
		else if(pName == "makeNewEmptyTabsPrivate") {
			this.windows.forEach(function(window) {
				var document = window.document;
				var menuItem = document.getElementById(this.newTabMenuId);
				if(menuItem)
					menuItem.hidden = pVal;
				var appMenuItem = document.getElementById(this.newTabAppMenuId);
				if(appMenuItem)
					appMenuItem.hidden = pVal;
			}, this);
		}
	},

	get pbuFake() {
		delete this.pbuFake;
		return this.pbuFake = Object.create(PrivateBrowsingUtils, {
			isWindowPrivate: {
				value: function privateTabWrapper(window) {
					return true; //~ todo: check call stack?
				},
				configurable: true,
				enumerable: true
			}
		});
	},
	patchTabBrowserDND: function(window, gBrowser, applyPatch) {
		if(
			!prefs.get("dragAndDropTabsBetweenDifferentWindows")
			&& (applyPatch || !("_privateTabPrivateBrowsingUtils" in window))
		)
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
		this.overridePrivateBrowsingUtils(
			window,
			gBrowser.tabContainer,
			"_setEffectAllowedForDataTransfer",
			"gBrowser.tabContainer._setEffectAllowedForDataTransfer",
			applyPatch
		);
		this.overridePrivateBrowsingUtils(
			window,
			gBrowser,
			"swapBrowsersAndCloseOther",
			"gBrowser.swapBrowsersAndCloseOther",
			applyPatch
		);
	},
	patchBrowsers: function(gBrowser, applyPatch) {
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
		if(applyPatch) {
			_log("Patch browser.__proto__.swapDocShells() method");
			var _this = this;
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
						before.isPrivate = otherBrowser.webNavigation
							.QueryInterface(Components.interfaces.nsILoadContext)
							.usePrivateBrowsing;
						_log("swapDocShells(): usePrivateBrowsing: " + before.isPrivate);
					}
					catch(e) {
						Components.utils.reportError(e);
					}
				},
				function after(ret, otherBrowser) {
					var isPrivate = after.before.isPrivate;
					if(isPrivate !== undefined) try {
						this.webNavigation
							.QueryInterface(Components.interfaces.nsILoadContext)
							.usePrivateBrowsing = isPrivate;
						_log("swapDocShells(): set usePrivateBrowsing to " + isPrivate);
						var tab = _this.getTabForBrowser(this);
						tab && _this.dispatchAPIEvent(tab, "PrivateTab:PrivateChanged", isPrivate);
					}
					catch(e) {
						Components.utils.reportError(e);
					}
				}
			);
		}
		else {
			_log("Restore browser.__proto__.swapDocShells() method");
			patcher.unwrapFunction(browserProto, "swapDocShells", "browser.swapDocShells");
		}
	},
	overridePrivateBrowsingUtils: function(window, obj, meth, key, applyPatch) {
		if(!obj || !(meth in obj)) {
			Components.utils.reportError(LOG_PREFIX + "!!! Can't find " + key + "()");
			return;
		}
		if(applyPatch) {
			var pbuOrig = PrivateBrowsingUtils;
			var pbuFake = this.pbuFake;
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
			patcher.unwrapFunction(obj, meth, key);
		}
	},

	tabOpenHandler: function(e) {
		var tab = e.originalTarget || e.target;
		if("_privateTabIgnore" in tab) {
			delete tab._privateTabIgnore;
			return;
		}
		var gBrowser = this.getTabBrowser(tab);
		var window = tab.ownerDocument.defaultView;
		//~ todo: try get real tab owner!
		var isPrivate;
		if(!this.isEmptyTab(tab, gBrowser)) {
			if(this.isPrivateTab(gBrowser.selectedTab))
				isPrivate = true;
			else if(this.isPrivateWindow(window))
				isPrivate = false; // Override browser behavior!
		}
		else if(
			window.privateTab
			&& !window.privateTab._ssWindowBusy
			&& prefs.get("makeNewEmptyTabsPrivate")
		) {
			_log("Make new empty tab private");
			isPrivate = true;
		}
		_log(
			"Tab opened: " + (tab.getAttribute("label") || "").substr(0, 256)
			+ "\nInherit private state: " + isPrivate
		);
		if(isPrivate != undefined)
			this.toggleTabPrivate(tab, isPrivate);
		else {
			window.setTimeout(function() {
				this.setTabState(tab);
			}.bind(this), 0);
		}
	},
	tabRestoringHandler: function(e) {
		var tab = e.originalTarget || e.target;
		if("_privateTabIgnore" in tab) {
			delete tab._privateTabIgnore;
			return;
		}
		_log("Tab restored: " + (tab.getAttribute("label") || "").substr(0, 256));
		var isPrivate = tab.hasAttribute(this.privateAttr);
		if(this.isPrivateTab(tab) != isPrivate) {
			_log("Make restored tab " + (isPrivate ? "private" : "not private"));
			this.toggleTabPrivate(tab, isPrivate);
		}
	},
	tabCloseHandler: function(e) {
		if(prefs.get("rememberClosedPrivateTabs"))
			return;
		var tab = e.originalTarget || e.target;
		if(!this.isPrivateTab(tab))
			return;
		_log(
			"Private tab closed: " + (tab.getAttribute("label") || "").substr(0, 256)
			+ "\nTry don't save it in undo close history"
		);
		var window = tab.ownerDocument.defaultView;
		var tabState = this.ss.getTabState(tab);
		//_log("Closed tab state:\n" + state);
		if(this.isSeaMonkey)
			window.setTimeout(this.forgetClosedTab.bind(this, window, tabState), 0);
		else
			this.forgetClosedTab(window, tabState);
	},
	forgetClosedTab: function(window, tabState) {
		var closedTabs = JSON.parse(this.ss.getClosedTabData(window));
		for(var i = 0, l = closedTabs.length; i < l; ++i) {
			var closedTab = closedTabs[i];
			var state = closedTab.state;
			//_log("Found closed tab:\n" + JSON.stringify(state));
			if(JSON.stringify(state) == tabState) {
				this.ss.forgetClosedTab(window, i);
				_log("Forget about closed tab #" + i);
				break;
			}
		}
	},
	tabSelectHandler: function(e) {
		var tab = e.originalTarget || e.target;
		var window = tab.ownerDocument.defaultView;
		var browser = tab.linkedBrowser;
		if(
			!browser
			|| !browser.webProgress
			|| browser.webProgress.isLoadingDocument
		) {
			_log("Selected tab not yet loaded, wait");
			window.setTimeout(function() {
				this.updateWindowTitle(window.gBrowser);
			}.bind(this), 0);
		}
		else {
			this.updateWindowTitle(window.gBrowser);
		}
		window.setTimeout(function() {
			// Someone may change "usePrivateBrowsing"...
			// It's good to show real state
			if(tab.parentNode) // Ignore removed tabs
				this.setTabState(tab);
		}.bind(this), 50);
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
		var sourceNode = this._dndPrivateNode = this.isPrivateTab(window.gBrowser.selectedTab)
			? e.originalTarget || e.target
			: null;
		sourceNode && _log(e.type + ": mark <" + sourceNode.nodeName + "> " + sourceNode + " node as private");
	},
	dragEndHandler: function(e) {
		this._dndPrivateNode && _log(e.type + " => this._dndPrivateNode = null");
		this._dndPrivateNode = null;
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
		_log(e.type + ": from " + (isPrivateSource ? "private" : "not private") + " tab");

		var targetTab;
		if(e.view.top == window) {
			var trg = e.originalTarget || e.target;
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
		else if(e.view.top == window.content) {
			var trg = e.target;
			var cs = trg.ownerDocument.defaultView.getComputedStyle(trg, null);
			var userModify = "userModify" in cs ? cs.userModify : cs.MozUserModify;
			if(userModify == "read-write") {
				_log("Dropped into editable node, ignore");
				return;
			}
			targetTab = window.gBrowser.selectedTab;
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

		var origIsPrivate;
		if(targetTab && dndBehavior != 2 && isPrivate != this.isPrivateTab(targetTab)) {
			origIsPrivate = !isPrivate;
			_log(
				"Dropped link may be opened in already existing tab, so make it "
				+ (isPrivate ? "private" : "not private")
			);
			this.toggleTabPrivate(targetTab, isPrivate, true);
		}

		this.waitForTab(window, function(tab) {
			if(!tab) {
				if(!targetTab)
					return;
				tab = targetTab;
			}
			if(origIsPrivate != undefined) {
				if(tab == targetTab) {
					_log("Highlight target tab as " + (isPrivate ? "private" : "not private"));
					this.dispatchAPIEvent(targetTab, "PrivateTab:PrivateChanged", isPrivate);
				}
				else {
					_log("Restore private state of target tab");
					this.toggleTabPrivate(targetTab, origIsPrivate, true);
				}
			}
			tab._privateTabIgnore = true; // We should always set this flag!
			_log(
				"drop: make " + (tab == targetTab ? "current" : "new") + " tab "
				+ (isPrivate ? "private" : "not private")
			);
			// Strange things happens in private windows, so we force set private flag
			if(this.isPrivateTab(tab) != isPrivate || isPrivate)
				this.toggleTabPrivate(tab, isPrivate);
			else
				_log("Already correct private state, ignore");
		}.bind(this));
	},
	popupShowingHandler: function(e) {
		var popup = e.target;
		if(popup != e.currentTarget)
			return;
		var window = popup.ownerDocument.defaultView;
		if(popup.id == "appmenu-popup")
			this.initAppMenu(window, popup);
		else if(popup.id == "contentAreaContextMenu")
			this.updatePageContext(window);
		else if(popup.localName == "tooltip")
			this.updateTabTooltip(window);
		else
			this.updateTabContext(window);
	},
	updatePageContext: function(window) {
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

		var hideNotPrivate = this.isPrivateTab(window.gBrowser.selectedTab);
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
		var document = window.document;
		var tab = document.tooltipNode;
		var hide = !tab || tab.localName != "tab" || !this.isPrivateTab(tab);
		var label = document.getElementById(this.tabTipId);
		if(label)
			label.hidden = hide;
	},
	updateTabContext: function(window) {
		var document = window.document;
		_log("updateTabContext()");
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
			var accel = document.getAnonymousElementByAttribute(mi, "class", "menu-accel-container");
			if(accel)
				accel.hidden = tab != window.gBrowser.selectedTab;
			//mi.disabled = this.isPendingTab(tab);
		}
	},
	commandHandler: function(e) {
		this.handleCommandFromEvent(e, e.shiftKey || e.ctrlKey || e.altKey || e.metaKey);
	},
	clickHandler: function(e) {
		if(e.button == 1 && e.target.getAttribute("disabled") != "true")
			this.handleCommandFromEvent(e, true, true);
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
		if(cmd == "openInNewPrivateTab")
			this.openInNewPrivateTab(window, shifted);
		else if(cmd == "openNewPrivateTab")
			this.openNewPrivateTab(window);
		else if(cmd == "toggleTabPrivate")
			this.toggleContextTabPrivate(window);
		else if(cmd == "openPlacesInNewPrivateTab")
			this.openPlaceInNewPrivateTab(window, shifted, e);
		else {
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
				_log(e.type + ": matched key: " + kId);
				if(e.defaultPrevented && !prefs.get("keysIgnoreDefaultPrevented")) {
					_log(e.type + ": event.defaultPrevented => do nothing");
					return;
				}
				var window = e.currentTarget;
				if(k.forbidInTextFields) {
					var fe = window.document.commandDispatcher.focusedElement;
					if(
						fe && (
							fe instanceof window.HTMLInputElement
							|| fe instanceof window.HTMLTextAreaElement
						)
					) {
						try { // Throws on not-text input elements
							if(typeof fe.selectionStart == "number") {
								_log("Don't use single char hotkey in text field");
								return;
							}
						}
						catch(e) {
						}
					}
				}
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				this.handleCommand(window, kId.replace(/#.*$/, ""));
			}
		}
	},
	privateChangedHandler: function(e) {
		var tab = e.originalTarget || e.target;
		var isPrivate = e.detail == 1;
		this.setTabState(tab, isPrivate);
		var gBrowser = tab.ownerDocument.defaultView.gBrowser;
		if(gBrowser.selectedTab == tab) {
			_log(e.type + " + gBrowser.selectedTab == tab => updateWindowTitle()");
			this.updateWindowTitle(gBrowser, isPrivate);
		}
	},
	setWindowBusy: function(e, busy) {
		_log("setWindowBusy(): " + busy);
		var window = e.currentTarget;
		var privateTab = window.privateTab;
		privateTab._ssWindowBusy = busy;
		if(this.isSeaMonkey) {
			window.clearTimeout(privateTab._ssWindowBusyRestoreTimer);
			if(busy) {
				privateTab._ssWindowBusyRestoreTimer = window.setTimeout(function() {
					_log("setWindowBusy(): false (workaround for SeaMonkey)");
					privateTab._ssWindowBusy = false;
				}, 0);
			}
		}
	},

	openInNewPrivateTab: function(window, toggleInBackground) {
		// Based on nsContextMenu.prototype.openLinkInTab()
		var gContextMenu = window.gContextMenu;
		var uri = gContextMenu.linkURL;
		var doc = gContextMenu.target.ownerDocument;
		window.urlSecurityCheck(uri, doc.nodePrincipal);
		this.openURIInNewPrivateTab(window, uri, doc, {
			toggleInBackground: toggleInBackground
		});
	},
	openPlaceInNewPrivateTab: function(window, toggleInBackground, e) {
		var mi = e && e.target;
		if(!mi)
			return;
		_log("openPlaceInNewPrivateTab(): " + mi.nodeName + " " + mi.getAttribute("label"));
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
			openAsChild: window.top == top.content
		});
	},
	openURIInNewPrivateTab: function(window, uri, sourceDocument, options) {
		var toggleInBackground = "toggleInBackground" in options && options.toggleInBackground;
		var loadInBackgroundPref = options.loadInBackgroundPref || "browser.tabs.loadInBackground";
		var openAsChild = "openAsChild" in options ? options.openAsChild : true;

		var relatedToCurrent;
		var w = this.getNotPopupWindow(window);
		if(w && w != window) {
			relatedToCurrent = openAsChild = false;
			w.setTimeout(w.focus, 0);
			window = w;
		}
		var gBrowser = window.gBrowser;

		if(openAsChild) {
			// http://piro.sakura.ne.jp/xul/_treestyletab.html.en#api
			if("TreeStyleTabService" in window)
				window.TreeStyleTabService.readyToOpenChildTab(gBrowser.selectedTab);
			// Tab Kit https://addons.mozilla.org/firefox/addon/tab-kit/
			// TabKit 2nd Edition https://addons.mozilla.org/firefox/addon/tabkit-2nd-edition/
			if("tabkit" in window)
				window.tabkit.addingTab("related");
		}

		var referer = null;
		if(sourceDocument) {
			var sendReferer = prefs.get("sendRefererHeader");
			if(
				sendReferer > 0
				&& (sendReferer > 1 || this.isPrivateWindow(sourceDocument.defaultView))
			)
				referer = sourceDocument.documentURIObject;
		}

		this.readyToOpenPrivateTab(window);
		var tab = gBrowser.addTab(uri, {
			referrerURI: referer,
			charset: sourceDocument ? sourceDocument.characterSet : null,
			ownerTab: gBrowser.selectedTab,
			relatedToCurrent: relatedToCurrent
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
	openNewPrivateTab: function(window) {
		var w = this.getNotPopupWindow(window);
		if(w && w != window) {
			w.setTimeout(w.focus, 0);
			window = w;
		}
		var gBrowser = window.gBrowser;
		this.readyToOpenPrivateTab(window);
		var tab = gBrowser.selectedTab = gBrowser.addTab(window.BROWSER_NEW_TAB_URL);
		if("focusAndSelectUrlBar" in window)
			window.setTimeout(window.focusAndSelectUrlBar, 0);
		else if("WindowFocusTimerCallback" in window) // SeaMonkey
			window.setTimeout(window.WindowFocusTimerCallback, 0, window.gURLBar);

		this.dispatchAPIEvent(tab, "PrivateTab:OpenNewTab");
		return tab;
	},
	readyToOpenPrivateTab: function(window) {
		this.waitForTab(window, function(tab) {
			if(!tab)
				return;
			tab._privateTabIgnore = true;
			this.toggleTabPrivate(tab, true);
		}.bind(this));
	},
	waitForTab: function(window, callback) {
		_log("waitForTab()");
		function tabOpen(e) {
			window.removeEventListener("TabOpen", tabOpen, true);
			window.clearTimeout(timer);
			var tab = e.originalTarget || e.target;
			_log("waitForTab(): opened tab");
			callback(tab);
		};
		window.addEventListener("TabOpen", tabOpen, true);
		var timer = window.setTimeout(function() {
			window.removeEventListener("TabOpen", tabOpen, true);
			_log("waitForTab(): nothing");
			callback(null);
		}, 0);
	},
	getNotPopupWindow: function(window) {
		if(window.toolbar.visible)
			return window;
		if(prefs.get("dontUseTabsInPopupWindows")) try {
			Components.utils.import("resource:///modules/RecentWindow.jsm");
			return RecentWindow.getMostRecentBrowserWindow({
				allowPopups: false
			});
		}
		catch(e) {
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
	toggleContextTabPrivate: function(window) {
		var tab = this.getContextTab(window, true)
			|| window.gBrowser.selectedTab; // For hotkey
		var isPrivate = this.toggleTabPrivate(tab);
		if(this.isPendingTab(tab))
			this.fixTabState(tab, isPrivate);
		else if(prefs.get("toggleTabPrivateAutoReload")) {
			var browser = tab.linkedBrowser;
			if(!browser.webProgress.isLoadingDocument)
				tab.linkedBrowser.reload();
		}
		if(tab == this.getTabBrowser(tab).selectedTab) {
			this.updateTabContext(window);
			this.updateTabTooltip(window);
			if("TabScope" in window && "_updateTitle" in window.TabScope && window.TabScope._tab)
				 window.TabScope._updateTitle();
		}
	},

	cmdAttr: "privateTab-command",
	toolbarButtonId: "privateTab-toolbar-openNewPrivateTab",
	contextId: "privateTab-context-openInNewPrivateTab",
	tabContextId: "privateTab-tabContext-toggleTabPrivate",
	newTabMenuId: "privateTab-menu-openNewPrivateTab",
	newTabAppMenuId: "privateTab-appMenu-openNewPrivateTab",
	tabTipId: "privateTab-tooltip-isPrivateTabLabel",
	tabScopeTipId: "privateTab-tabScope-isPrivateTabLabel",
	placesContextId: "privateTab-places-openInNewPrivateTab",
	getToolbox: function(window) {
		return window.gNavToolbox || window.getNavToolbox();
	},
	getPaletteButton: function(window) {
		var btns = this.getToolbox(window)
			.palette
			.getElementsByAttribute("id", this.toolbarButtonId);
		return btns.length && btns[0];
	},
	getTabContextMenu: function(document) {
		return document.getElementById("tabContextMenu")
			|| document.getAnonymousElementByAttribute(
				document.defaultView.gBrowser,
				"anonid",
				"tabContextMenu"
			);
	},
	getTabTooltip: function(document) {
		var tabTip = document.getElementById("tabbrowser-tab-tooltip");
		if(!tabTip) { // SeaMonkey
			var gBrowser = document.defaultView.gBrowser;
			var tabStrip = document.getAnonymousElementByAttribute(gBrowser, "anonid", "strip");
			if(tabStrip && tabStrip.firstChild && tabStrip.firstChild.localName == "tooltip")
				tabTip = tabStrip.firstChild;
		}
		return tabTip;
	},
	initToolbarButton: function(document) {
		var tbId = this.toolbarButtonId;
		var tb = this.createNode(document, "toolbarbutton", tbId, {
			id: tbId,
			"class": "toolbarbutton-1 chromeclass-toolbar-additional",
			removable: "true",
			label: this.getLocalized("openNewPrivateTab"),
			tooltiptext: this.getLocalized("openNewPrivateTabTip"),
			"privateTab-command": "openNewPrivateTab"
		});

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
			toolbar.insertBefore(tb, insPos);
			_log("Insert toolbar button " + (insPos ? "before " + insPos.id : "at the end"));
			return;
		}

		this.getToolbox(document.defaultView)
			.palette
			.appendChild(tb);
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
		if(prefs.get("makeNewEmptyTabsPrivate"))
			menuItem.hidden = true;
		if(PrivateBrowsingUtils.permanentPrivateBrowsing)
			menuItem.collapsed = true;
		this.insertNode(menuItem, menuItemParent, ["#menu_newNavigatorTab"]);

		// We can't do 'document.getElementById("appmenu_newPrivateWindow")' while App menu was never open:
		// this (somehow) breaks binding for .menuitem-iconic-tooltip class
		var appMenuPopup = document.getElementById("appmenu-popup");
		appMenuPopup && appMenuPopup.addEventListener("popupshowing", this, false);

		var tabContext = this.getTabContextMenu(document);
		_log("tabContext: " + tabContext);
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
			var tabTipLabel = document.createElement("label");
			tabTipLabel.id = this.tabTipId;
			tabTipLabel.className = "tooltip-label";
			tabTipLabel.setAttribute("value", this.getLocalized("privateTabTip"));
			tabTipLabel.setAttribute("privateTab-command", "<nothing>");
			tabTipLabel.hidden = true;
			tabTip.insertBefore(
				tabTipLabel,
				tabTip.firstChild != tabTip.lastChild ? tabTip.lastChild : null
			);

			var tabScope = document.getElementById("tabscope-popup");
			if(tabScope && "TabScope" in window && "_updateTitle" in window.TabScope) {
				var tsTipLabel = tabTipLabel.cloneNode(true);
				tsTipLabel.id = this.tabScopeTipId;
				tabScope.appendChild(tsTipLabel);
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
		if(document.getElementById(this.newTabAppMenuId)) {
			Components.utils.reportError(LOG_PREFIX + "#" + this.newTabAppMenuId + " already created");
			return;
		}
		var appMenuItemParent = document.getElementById("appmenuPrimaryPane");
		if(!appMenuItemParent)
			return;
		var appMenuItem = this.createNode(document, "menuitem", this.newTabAppMenuId, {
			label: this.getLocalized("openNewPrivateTab"),
			acceltext: this.hotkeys
				&& this.hotkeys.openNewPrivateTab
				&& this.hotkeys.openNewPrivateTab._keyText || "",
			"privateTab-command": "openNewPrivateTab"
		});
		if(prefs.get("makeNewEmptyTabsPrivate"))
			appMenuItem.hidden = true;
		var newPrivateWin = document.getElementById("appmenu_newPrivateWindow");
		if(newPrivateWin) {
			appMenuItem.className = newPrivateWin.className; // menuitem-iconic menuitem-iconic-tooltip
			if(newPrivateWin.hidden) // Permanent private browsing?
				appMenuItem.collapsed = true;
			var s = window.getComputedStyle(newPrivateWin, null);
			var icon = s.listStyleImage;
			if(icon && icon != "none") {
				appMenuItem.style.listStyleImage = icon;
				appMenuItem.style.MozImageRegion = s.MozImageRegion;
			}
		}
		this.insertNode(appMenuItem, appMenuItemParent, [newPrivateWin]);
	},
	get initPlacesContext() {
		delete this.initPlacesContext;
		return this.initPlacesContext = this._initPlacesContext.bind(this);
	},
	_initPlacesContext: function(e) {
		var mp = e.originalTarget || e.target;
		if(mp.id != "placesContext")
			return;

		var nodes = mp.getElementsByAttribute("id", this.placesContextId);
		var placesItem = nodes.length && nodes[0];
		placesItem && placesItem.parentNode.removeChild(placesItem);

		var document = mp.ownerDocument;
		placesItem = this.createNode(document, "menuitem", this.placesContextId, {
			label:     this.getLocalized("openPlacesInNewPrivateTab"),
			accesskey: this.getLocalized("openPlacesInNewPrivateTabAccesskey"),
			selection: "link",
			selectiontype: "single",
			"privateTab-command": "openPlacesInNewPrivateTab"
		});
		var inNewTab = mp.getElementsByAttribute("id", "placesContext_open:newtab")[0];
		this.insertNode(placesItem, mp, [inNewTab]);

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
		mp._privateTabTriggerNode = mp.triggerNode; // When we handle click, triggerNode are already null
		mp.addEventListener("popuphiding", function destroyPlacesContext(e) {
			if(e.originalTarget != mp)
				return;
			mp.removeEventListener(e.type, destroyPlacesContext, true);
			window.removeEventListener("command", waitForTab, true);
			window.setTimeout(function() {
				mp.removeChild(placesItem);
				delete mp._privateTabTriggerNode;
				_log("Remove item from places context: " + document.documentURI);
			}, 0);
		}, true);
	},
	destroyControls: function(window, force) {
		_log("destroyControls(), force: " + force);
		var document = window.document;
		this.destroyNodes(document, force);
		this.destroyNode(this.getPaletteButton(window), force);

		var contentContext = document.getElementById("contentAreaContextMenu");
		contentContext && contentContext.removeEventListener("popupshowing", this, false);

		var appMenuPopup = document.getElementById("appmenu-popup");
		appMenuPopup && appMenuPopup.removeEventListener("popupshowing", this, false);

		var tabContext = this.getTabContextMenu(document);
		tabContext && tabContext.removeEventListener("popupshowing", this, false);
		if(tabContext && !tabContext.id)
			this.destroyNodes(tabContext, force);

		var tabTip = this.getTabTooltip(document);
		tabTip && tabTip.removeEventListener("popupshowing", this, false);
		var tabTipLabel = document.getElementById(this.tabTipId);
		if(tabTipLabel) // In SeaMonkey we can't simple get anonymous nodes by attribute
			tabTipLabel.parentNode.removeChild(tabTipLabel);
		if("TabScope" in window && "_updateTitle" in window.TabScope)
			patcher.unwrapFunction(window.TabScope, "_updateTitle", "TabScope._updateTitle");

		window.removeEventListener("popupshowing", this.initPlacesContext, true);
	},
	get createNode() {
		delete this.createNode;
		return this.createNode = this._createNode.bind(this);
	},
	_createNode: function(document, nodeName, id, attrs) {
		var mi = document.createElement(nodeName);
		mi.id = id;
		for(var name in attrs)
			mi.setAttribute(name, attrs[name]);
		mi.addEventListener("command", this, false);
		mi.addEventListener("click", this, false);
		return mi;
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
		node.removeEventListener("command", this, false);
		node.removeEventListener("click", this, false);
		force && node.parentNode.removeChild(node);
	},

	get keyEvent() {
		return prefs.get("keysUseKeydownEvent")
			? "keydown"
			: "keypress";
	},
	hotkeys: null,
	_hotkeysHasText: false,
	get accelKey() {
		var accelKey = "ctrlKey";
		var ke = Components.interfaces.nsIDOMKeyEvent;
		switch(prefs.getPref("ui.key.accelKey")) {
			case ke.DOM_VK_ALT:  accelKey = "altKey";  break;
			case ke.DOM_VK_META: accelKey = "metaKey";
		}
		delete this.accelKey;
		return this.accelKey = accelKey;
	},
	initHotkeys: function() {
		_log("initHotkeys()");
		this._hotkeysHasText = false;
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
				_keyText: "",
				__proto__: null
			};
			var tokens = keyStr.split(" ");
			var key = tokens.pop() || " ";
			if(key.length == 1) {
				k.char = key.toUpperCase();
				k._key = key;
			}
			else { // VK_*
				k.code = Components.interfaces.nsIDOMKeyEvent["DOM_" + key];
				var char = getVKChar(key);
				if(char)
					k._key = char;
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
			k.forbidInTextFields = k.char && !k.ctrlKey && !k.altKey && !k.metaKey;
		}
		Services.prefs.getBranch(prefs.ns + "key.")
			.getChildList("", {})
			.forEach(initHotkey, this);
		this.hotkeys = hasKeys ? keys : null;
		_log("Keys:\n" + JSON.stringify(keys, null, "\t"));
	},
	_hotkeysDocuments: null,
	initHotkeysText: function(document) {
		var keys = this.hotkeys;
		if(!keys)
			return;
		if(this._hotkeysHasText) {
			_log("setHotkeysText()");
			this.setHotkeysText(document);
			return;
		}
		if(!this._hotkeysDocuments)
			this._hotkeysDocuments = [];
		if(this._hotkeysDocuments.push(document) > 1) {
			_log("initHotkeysText(): already called and not yet finished");
			return;
		}
		_log("initHotkeysText()");
		//~ hack: show fake hidden popup to get descriptions
		var root = document.documentElement;
		var keyset = document.createElement("keyset");
		var mp = document.createElement("menupopup");
		mp.style.visibility = "collapse";
		for(var kId in keys) {
			var k = keys[kId];
			var id = "_privateTab-key-" + kId;
			var key = document.createElement("key");
			key.setAttribute("id", id);
			k._key       && key.setAttribute("key",       k._key);
			k._keyCode   && key.setAttribute("keycode",   k._keyCode);
			k._modifiers && key.setAttribute("modifiers", k._modifiers);
			var mi = document.createElement("menuitem");
			mi.setAttribute("key", id);
			mi._id = kId;
			keyset.appendChild(key);
			mp.appendChild(mi);
		}
		root.appendChild(keyset);
		root.appendChild(mp);

		var window = document.defaultView;
		mp._onpopupshown = function() {
			Array.forEach(
				mp.childNodes,
				function(mi) {
					var k = keys[mi._id];
					k._keyText = mi.getAttribute("acceltext") || "";
					_log('Key text for "' + mi._id + '": ' + k._keyText);
				}
			);
			this._hotkeysHasText = true;
			_log("=> setHotkeysText()");
			mp.parentNode.removeChild(mp);
			keyset.parentNode.removeChild(keyset);
			window.clearInterval(tryAgain);
			window.clearTimeout(tryAgainLimit);
			this._hotkeysDocuments.forEach(this.setHotkeysText, this);
			this._hotkeysDocuments = null;
		}.bind(this);
		mp.setAttribute("onpopupshown", "this._onpopupshown();");
		var tryAgain = window.setInterval(function() {
			_log("initHotkeysText(), next try...");
			mp.hidePopup();
			mp.openPopup();
		}, 1e3);
		var tryAgainLimit = window.setTimeout(function() {
			window.clearInterval(tryAgain);
		}, 15e3);
		mp.openPopup();
	},
	getHotkeysNodes: function(document, attr) {
		var nodes = Array.slice(document.getElementsByAttribute(this.cmdAttr, attr));
		var tabContext = this.getTabContextMenu(document);
		if(tabContext && !tabContext.id)
			nodes.push.apply(nodes, Array.slice(tabContext.getElementsByAttribute(this.cmdAttr, attr)));
		return nodes;
	},
	setHotkeysText: function(document) {
		_log("setHotkeysText(): " + document.title);
		var keys = this.hotkeys;
		for(var kId in keys) {
			var keyText = keys[kId]._keyText;
			_log("Set " + keyText + " for " + kId);
			this.getHotkeysNodes(document, kId).forEach(function(node) {
				var cl = node.classList;
				if(cl.contains("menuitem-tooltip") || cl.contains("menuitem-iconic-tooltip"))
					node.setAttribute("tooltiptext", keyText);
				else
					node.setAttribute("acceltext", keyText);
			});
		}
	},
	updateHotkeys: function(updateAll) {
		_log("updateHotkeys(" + (updateAll || "") + ")");
		updateAll && this.initHotkeys();
		var hasHotkeys = !!this.hotkeys;
		var keyEvent = this.keyEvent;
		this.windows.forEach(function(window) {
			window.removeEventListener("keydown", this, true);
			window.removeEventListener("keypress", this, true);
			hasHotkeys && window.addEventListener(keyEvent, this, true);
			if(!updateAll)
				return;
			var document = window.document;
			this.getHotkeysNodes(document, "*").forEach(function(node) {
				var cl = node.classList;
				if(cl.contains("menuitem-tooltip") || cl.contains("menuitem-iconic-tooltip"))
					node.removeAttribute("tooltiptext");
				node.setAttribute("acceltext", "");
			});
			// May fail without setTimeout(), if other popup not yet hidden
			hasHotkeys && window.setTimeout(function() {
				this.initHotkeysText(document);
			}.bind(this), 0);
		}, this);
	},

	isEmptyTab: function(tab, gBrowser) {
		// See "addTab" method in chrome://browser/content/tabbrowser.xml
		var tabLabel = tab.getAttribute("label") || "";
		if(
			!tabLabel
			|| tabLabel == "undefined"
			|| tabLabel == "about:blank"
			|| tabLabel == "chrome://fvd.speeddial/content/fvd_about_blank.html"
			|| tabLabel == "chrome://speeddial/content/speeddial.xul"
		)
			return true;
		if(/^\w+:\S*$/.test(tabLabel))
			return false;
		// We should check tab label for SeaMonkey and old Firefox
		var emptyTabLabel = this.getTabBrowserString("tabs.emptyTabTitle", gBrowser)
			|| this.getTabBrowserString("tabs.untitled", gBrowser);
		return tabLabel == emptyTabLabel;
	},
	getTabBrowserString: function(id, gBrowser) {
		try {
			return gBrowser.mStringBundle.getString(id);
		}
		catch(e) {
		}
		return undefined;
	},
	setTabState: function(tab, isPrivate) {
		if(isPrivate === undefined)
			isPrivate = this.isPrivateTab(tab);
		if(!isPrivate ^ tab.hasAttribute(this.privateAttr))
			return;
		if(isPrivate) {
			tab.setAttribute(this.privateAttr, "true");
			this.persistTabAttributeOnce();
		}
		else {
			tab.removeAttribute(this.privateAttr);
		}
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
	dispatchAPIEvent: function(target, eventType, eventDetail) {
		var document = target.ownerDocument || target;
		if(eventDetail === undefined) {
			var evt = document.createEvent("Events");
			evt.initEvent(eventType, true, false);
		}
		else {
			var evt = document.createEvent("UIEvent");
			evt.initUIEvent(eventType, true, false, document.defaultView, +eventDetail);
		}
		target.dispatchEvent(evt);
	},
	toggleTabPrivate: function(tab, isPrivate, _silent) {
		var privacyContext = this.getTabPrivacyContext(tab);
		if(isPrivate === undefined)
			isPrivate = !privacyContext.usePrivateBrowsing;
		privacyContext.usePrivateBrowsing = isPrivate;

		// Workaround for browser.newtab.preload = true
		var browser = tab.linkedBrowser;
		browser._privateTabIsPrivate = isPrivate;
		tab.ownerDocument.defaultView.setTimeout(function() {
			delete browser._privateTabIsPrivate;
		}, 0);

		_log("Set usePrivateBrowsing to " + isPrivate + "\nTab: " + (tab.getAttribute("label") || "").substr(0, 255));
		if(!_silent)
			this.dispatchAPIEvent(tab, "PrivateTab:PrivateChanged", isPrivate);
		return isPrivate;
	},
	toggleWindowPrivate: function(window, isPrivate) {
		var gBrowser = window.gBrowser;
		if(isPrivate === undefined)
			this.isPrivateTab(gBrowser.selectedTab);
		//~ todo: add pref for this?
		//this.getPrivacyContext(window).usePrivateBrowsing = true;
		_log("Make all tabs in window private");
		Array.forEach(gBrowser.tabs, function(tab) {
			this.toggleTabPrivate(tab, isPrivate);
		}, this);
	},
	getTabBrowser: function(tab) {
		return this.getTabBrowserFromChild(tab.linkedBrowser);
	},
	getTabForBrowser: function(browser) {
		var gBrowser = this.getTabBrowserFromChild(browser);
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
		for(;;) {
			var browser = this.dwu.getParentForNode(window.document, true);
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
		var root = document.documentElement;
		if(root.getAttribute("privatebrowsingmode") != "temporary")
			return;
		var appBtn = document.getElementById("appmenu-button");
		if(!appBtn) {
			this.appButtonNA = true;
			return;
		}
		var bo = appBtn.boxObject;
		var pbWidth = bo.width;
		if(!pbWidth) { // App button are hidden?
			this.watchAppButton(document.defaultView);
			this.appButtonNA = true; // Don't check and don't call watchAppButton() again
			return;
		}
		root.removeAttribute("privatebrowsingmode");
		var npbWidth = bo.width;
		var iconWidth = pbWidth - npbWidth;
		root.setAttribute("privatebrowsingmode", "temporary");
		if(iconWidth == 0) {
			_log("Fix App button width: nothing to do, width are the same");
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
				@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");\n\
				@-moz-document url("' + document.documentURI + '") {\n\
					#appmenu-button {\n\
						min-width: ' + maxWidth + 'px !important;\n\
					}\n\
				}';
		}
		var cssURI = this.appButtonCssURI = Services.io.newURI(
			"data:text/css," + encodeURIComponent(cssStr), null, null
		);
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
	updateWindowTitle: function(gBrowser, isPrivate) {
		var document = gBrowser.ownerDocument;
		if(isPrivate === undefined)
			isPrivate = this.isPrivateTab(gBrowser.selectedTab);
		var root = document.documentElement;
		var tm = isPrivate
			? root.getAttribute("titlemodifier_privatebrowsing")
				|| root.getAttribute("privateTab_titlemodifier_privatebrowsing")
			: root.getAttribute("titlemodifier_normal")
				|| root.getAttribute("privateTab_titlemodifier_normal");
		if(root.getAttribute("titlemodifier") == tm)
			return;
		_log("updateWindowTitle() " + tm);
		root.setAttribute("titlemodifier", tm);
		root.setAttribute(
			"title",
			isPrivate
				? root.getAttribute("title_privatebrowsing")
				: root.getAttribute("title_normal")
		);
		if(isPrivate) {
			var pbTemp = !PrivateBrowsingUtils.permanentPrivateBrowsing;
			root.setAttribute("privatebrowsingmode", pbTemp ? "temporary" : "permanent");
			pbTemp && this.fixAppButtonWidth(document);
		}
		else {
			root.removeAttribute("privatebrowsingmode");
		}
		gBrowser.updateTitlebar();
		this.updateAppButtonWidth(document);
	},
	updateAppButtonWidth: function(document, force) {
		var window = document.defaultView;
		if(
			"TabsInTitlebar" in window
			&& "_sizePlaceholder" in window.TabsInTitlebar
			&& (force || !this.appButtonCssURI)
		) {
			window.setTimeout(function() { // Pseudo async
				// Based on code from chrome://browser/content/browser.js
				var appBtnBox = document.getElementById("appmenu-button-container");
				if(appBtnBox) {
					var rect = appBtnBox.getBoundingClientRect();
					if(rect.width) {
						_log("Update size placeholder for App button");
						window.TabsInTitlebar._sizePlaceholder("appmenu-button", rect.width);
					}
				}
			}, 0);
		}
	},
	patchPrivateBrowsingUtils: function(applyPatch) {
		if(applyPatch) {
			var _this = this;
			var pbu = PrivateBrowsingUtils;
			pbu._privateTabOrigIsWindowPrivate = pbu.isWindowPrivate;
			patcher.wrapFunction(pbu, "isWindowPrivate", "PrivateBrowsingUtils.isWindowPrivate",
				function before(window) {
					if(
						!window
						|| !(window instanceof Components.interfaces.nsIDOMChromeWindow)
						|| !_this.isTargetWindow(window)
					)
						return false;
					var stack = new Error().stack;
					//_log("PrivateBrowsingUtils.isWindowPrivate(): " + stack);
					if(
						stack.indexOf("@chrome://browser/content/downloads/downloads.js:") != -1
						|| stack.indexOf("@resource://app/modules/DownloadsCommon.jsm:") != -1
					) try {
						//_log("PrivateBrowsingUtils.isWindowPrivate(): return state of selected tab");
						return {
							value: _this.isPrivateTab(window.gBrowser.selectedTab)
						};
					}
					catch(e) {
						Components.utils.reportError(e);
					}
					return false;
				}
			);
		}
		else {
			patcher.unwrapFunction(PrivateBrowsingUtils, "isWindowPrivate", "PrivateBrowsingUtils.isWindowPrivate");
			delete PrivateBrowsingUtils._privateTabOrigIsWindowPrivate;
		}
		_log("patchPrivateBrowsingUtils(" + applyPatch + ")");
	},

	getPrivacyContext: function(window) {
		return PrivateBrowsingUtils.privacyContextFromWindow(window);
	},
	isPrivateWindow: function(window) {
		return window && PrivateBrowsingUtils.isWindowPrivate(window);
	},
	getTabPrivacyContext: function(tab) {
		return this.getPrivacyContext(tab.linkedBrowser.contentWindow);
	},
	isPrivateTab: function(tab) {
		return tab && this.getTabPrivacyContext(tab).usePrivateBrowsing;
	},
	isPendingTab: function(tab) {
		return tab.hasAttribute("pending")
			|| tab.linkedBrowser.contentDocument.readyState == "uninitialized";
	},

	privateAttr: "privateTab-isPrivate",
	get ss() {
		delete this.ss;
		return this.ss = (
			Components.classes["@mozilla.org/browser/sessionstore;1"]
			|| Components.classes["@mozilla.org/suite/sessionstore;1"]
		).getService(Components.interfaces.nsISessionStore);
	},
	persistTabAttributeOnce: function() {
		this.persistTabAttributeOnce = function() {};
		this.ss.persistTabAttribute(this.privateAttr);
	},

	_stylesLoaded: false,
	loadStyles: function(window) {
		if(this._stylesLoaded)
			return;
		this._stylesLoaded = true;
		var sss = this.sss;
		var cssURI = this.cssURI = this.makeCSSURI(window);
		if(!sss.sheetRegistered(cssURI, sss.USER_SHEET))
			sss.loadAndRegisterSheet(cssURI, sss.USER_SHEET);
	},
	unloadStyles: function() {
		if(!this._stylesLoaded)
			return;
		this._stylesLoaded = false;
		var sss = this.sss;
		if(sss.sheetRegistered(this.cssURI, sss.USER_SHEET))
			sss.unregisterSheet(this.cssURI, sss.USER_SHEET);
	},
	get sss() {
		delete this.sss;
		return this.sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
			.getService(Components.interfaces.nsIStyleSheetService);
	},
	makeCSSURI: function(window) {
		var s = window.document.documentElement.style;
		var prefix = "textDecorationColor" in s && "textDecorationStyle" in s
			? ""
			: "-moz-";
		var cssStr = '\
			@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");\n\
			@-moz-document url("' + window.document.documentURI + '") {\n\
				.tabbrowser-tab[' + this.privateAttr + '] {\n\
					text-decoration: underline !important;\n\
					' + prefix + 'text-decoration-color: -moz-nativehyperlinktext !important;\n\
					' + prefix + 'text-decoration-style: dashed !important;\n\
				}\n\
				.tabbrowser-tab[' + this.privateAttr + '][pinned] .tab-icon-image,\n\
				.tabbrowser-tab[' + this.privateAttr + '][pinned] .tab-throbber {\n\
					border-bottom: 1px dashed -moz-nativehyperlinktext !important;\n\
				}\n\
				#' + this.tabTipId + ' {\n\
					color: -moz-nativehyperlinktext;\n\
				}\n\
				#' + this.tabScopeTipId + '{\n\
					color: -moz-nativehyperlinktext;\n\
					text-align: center;\n\
					margin: 1px;\n\
				}\n\
			}\n\
			@-moz-document url("' + window.document.documentURI + '"),\n\
				url("chrome://global/content/customizeToolbar.xul") {\n\
				#' + this.toolbarButtonId + ' {\n\
					list-style-image: url("chrome://privatetab/content/privacy-24.png") !important;\n\
					-moz-image-region: auto !important;\n\
				}\n\
				toolbar[iconsize="small"] #' + this.toolbarButtonId + ' {\n\
					list-style-image: url("chrome://privatetab/content/privacy-16.png") !important;\n\
				}\n\
			}';
		return Services.io.newURI("data:text/css," + encodeURIComponent(cssStr), null, null);
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

var privateTabInternal = windowsObserver;
function API(window) {
	this.window = window;
}
API.prototype = {
	_openNewTabsPrivate: undefined,
	_ssWindowBusy: false,
	_ssWindowBusyRestoreTimer: 0,
	_destroy: function() {
		if(this._openNewTabsPrivate !== undefined)
			this.stopToOpenTabs();
		this.window = null;
	},
	handleEvent: function(e) {
		if(e.type == "TabOpen" && this._openNewTabsPrivate !== undefined)
			privateTabInternal.toggleTabPrivate(e.originalTarget || e.target, this._openNewTabsPrivate);
	},
	// Public API:
	isTabPrivate: function privateTab_isTabPrivate(tab) {
		return privateTabInternal.isPrivateTab(tab);
	},
	toggleTabPrivate: function privateTab_toggleTabPrivate(tab, isPrivate) {
		isPrivate = privateTabInternal.toggleTabPrivate(tab, isPrivate);
		privateTabInternal.fixTabState(tab, isPrivate);
		return isPrivate;
	},
	readyToOpenTab: function privateTab_readyToOpenTab(isPrivate) {
		privateTabInternal.waitForTab(this.window, function(tab) {
			if(!tab)
				return;
			tab._privateTabIgnore = true;
			privateTabInternal.toggleTabPrivate(tab, isPrivate);
		}.bind(this));
	},
	readyToOpenTabs: function privateTab_readyToOpenTabs(isPrivate) {
		this._openNewTabsPrivate = isPrivate;
		this.window.addEventListener("TabOpen", this, true);
	},
	stopToOpenTabs: function  privateTab_stopToOpenTabs() {
		this._openNewTabsPrivate = undefined;
		this.window.removeEventListener("TabOpen", this, true);
	}
};

var prefs = {
	ns: "extensions.privateTab.",
	initialized: false,
	init: function() {
		if(this.initialized)
			return;
		this.initialized = true;

		//~ todo: add condition when https://bugzilla.mozilla.org/show_bug.cgi?id=564675 will be fixed
		this.loadDefaultPrefs();
		if(windowsObserver.isSeaMonkey) {
			this.setPref(
				this.ns + "dragAndDropTabsBetweenDifferentWindows",
				false,
				Services.prefs.getDefaultBranch("")
			);
		}
		Services.prefs.addObserver(this.ns, this, false);
	},
	destroy: function() {
		if(!this.initialized)
			return;
		this.initialized = false;

		Services.prefs.removeObserver(this.ns, this);
	},
	observe: function(subject, topic, pName) {
		if(topic != "nsPref:changed")
			return;
		var shortName = pName.substr(this.ns.length);
		var val = this.getPref(pName);
		this._cache[shortName] = val;
		windowsObserver.prefChanged(shortName, val);
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
		return this.setPref(this.ns + pName, val);
	},
	getPref: function(pName, defaultVal, prefBranch) {
		var ps = prefBranch || Services.prefs;
		switch(ps.getPrefType(pName)) {
			case ps.PREF_BOOL:   return ps.getBoolPref(pName);
			case ps.PREF_INT:    return ps.getIntPref(pName);
			case ps.PREF_STRING: return ps.getComplexValue(pName, Components.interfaces.nsISupportsString).data;
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
				var ss = Components.interfaces.nsISupportsString;
				var str = Components.classes["@mozilla.org/supports-string;1"]
					.createInstance(ss);
				str.data = val;
				ps.setComplexValue(pName, ss, str);
		}
		return this;
	},
	getValueType: function(val) {
		switch(typeof val) {
			case "boolean": return Services.prefs.PREF_BOOL;
			case "number":  return Services.prefs.PREF_INT;
		}
		return Services.prefs.PREF_STRING;
	}
};

var patcher = {
	// Do some magic to restore third party wrappers from other extensions
	wrapNS: "privateTabMod:2:",
	wrapFunction: function(obj, meth, key, callBefore, callAfter) {
		var win = Components.utils.getGlobalForObject(obj);
		var name = key;
		key = this.wrapNS + key;
		var orig, wrapped;
		if(!(key in win)) {
			_log("[patcher] Patch " + name);
			orig = obj[meth];
			wrapped = obj[meth] = callAfter
				? function wrapper() {
					var res = win[key].before.apply(this, arguments);
					if(res)
						return typeof res == "object" ? res.value : undefined;
					try {
						var ret = orig.apply(this, arguments);
					}
					catch(e) {
						Components.utils.reportError(e);
					}
					win[key].after.apply(this, [ret].concat(Array.slice(arguments)));
					return ret;
				}
				: function wrapper() {
					var res = win[key].before.apply(this, arguments);
					if(res)
						return typeof res == "object" ? res.value : undefined;
					return orig.apply(this, arguments);
				};
			// Someone may want to do eval() patch...
			var patch = callAfter
				? function(s) {
					var rnd = Math.random().toFixed(14).substr(2);
					var res = "_res_" + rnd;
					var ret = "_ret_" + rnd;
					return s
						.replace(
							"{",
							'{\n\tvar ' + res + ' = window["' + key + '"].before.apply(this, arguments);\n'
							+ '\tif(' + res + ') return typeof ' + res + ' == "object" ? ' + res + '.value : undefined;\n'
							+ "\tvar " + ret + " = (function() {\n"
						)
						.replace(
							/\}$/,
							"\t}).apply(this, arguments);\n"
							+ '\twindow["' + key + '"].after.apply(this, [' + ret + "].concat(Array.slice(arguments)));\n"
							+ "\treturn " + ret + ";\n"
							+ "}"
						);
				}
				: function(s) {
					var rnd = Math.random().toFixed(14).substr(2);
					var res = "_res_" + rnd;
					return s.replace(
						"{",
						'{\n\tvar ' + res + ' = window["' + key + '"].before.apply(this, arguments);\n'
						+ '\tif(' + res + ') return typeof ' + res + ' == "object" ? ' + res + '.value : undefined;\n'
					);
				};
			wrapped.toString = function() {
				return patch(orig.toString());
			};
			wrapped.toSource = function() {
				return patch(orig.toSource());
			};
		}
		else {
			_log("[patcher] Will use previous patch for " + name);
		}
		win[key] = {
			before:  callBefore,
			after:   callAfter,
			orig:    orig,
			wrapped: wrapped
		};
		if(callAfter)
			callAfter.before = callBefore;
	},
	unwrapFunction: function(obj, meth, key) {
		var win = Components.utils.getGlobalForObject(obj);
		var name = key;
		key = this.wrapNS + key;
		if(!(key in win))
			return;
		var wrapper = win[key];
		if(obj[meth] != wrapper.wrapped) {
			_log("[patcher] Can't completely restore " + name + ": detected third-party wrapper!");
			var dummy = function() {};
			win[key] = {
				before: dummy,
				after: wrapper.after && dummy
			};
		}
		else {
			_log("[patcher] Restore " + name);
			delete win[key];
			obj[meth] = wrapper.orig;
		}
	}
};

// Be careful, loggers always works until prefs aren't initialized
// (and if "debug" preference has default value)
function ts() {
	var d = new Date();
	var ms = d.getMilliseconds();
	return d.toLocaleFormat("%M:%S:") + "000".substr(String(ms).length) + ms + " ";
}
function _log(s) {
	if(prefs.get("debug", true))
		Services.console.logStringMessage(LOG_PREFIX + ts() + s);
}
function _dump(s) {
	if(prefs.get("debug", true))
		dump(LOG_PREFIX + ts() + s + "\n");
}