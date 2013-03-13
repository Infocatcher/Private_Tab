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

		var ws = Services.wm.getEnumerator("navigator:browser");
		while(ws.hasMoreElements())
			this.initWindow(ws.getNext(), reason);
		Services.ww.registerNotification(this);
	},
	destroy: function(reason) {
		if(!this.initialized)
			return;
		this.initialized = false;

		var ws = Services.wm.getEnumerator("navigator:browser");
		while(ws.hasMoreElements())
			this.destroyWindow(ws.getNext(), reason);
		Services.ww.unregisterNotification(this);

		this.unloadStyles();
		this.restoreAppButtonWidth();
		prefs.destroy();
		this._dndPrivateNode = null;
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
			case "dragstart":                 this.dragStartHandler(e);      break;
			case "dragend":                   this.dragEndHandler(e);        break;
			case "drop":                      this.dropHandler(e);           break;
			case "popupshowing":              this.popupShowingHandler(e);   break;
			case "command":                   this.commandHandler(e);        break;
			case "click":                     this.clickHandler(e);          break;
			case "keypress":                  this.keypressHandler(e);       break;
			case "PrivateTab:PrivateChanged": this.privateChangedHandler(e);
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
		this.patchBrowser(gBrowser, true);

		if(reason == WINDOW_LOADED)
			this.inheritWindowState(window);
		Array.forEach(gBrowser.tabs, function(tab) {
			this.setTabState(tab);
		}, this);
		this.appButtonNA = false;
		this.fixAppButtonWidth(document);
		window.setTimeout(function() {
			this.updateWindowTitle(gBrowser);
		}.bind(this), 0);

		window.addEventListener("TabOpen", this, false);
		window.addEventListener("SSTabRestoring", this, false);
		window.addEventListener("TabSelect", this, false);
		window.addEventListener("dragstart", this, true);
		window.addEventListener("dragend", this, true);
		window.addEventListener("drop", this, true);
		window.addEventListener("PrivateTab:PrivateChanged", this, false);
		if(this.hotkeys)
			window.addEventListener("keypress", this, true);
		window.setTimeout(function() {
			this.initControls(document);
			window.setTimeout(function() {
				this.initHotkeysText(document);
			}.bind(this), 10);
		}.bind(this), 50);
	},
	destroyWindow: function(window, reason) {
		window.removeEventListener("load", this, false); // Window can be closed before "load"
		if(reason == WINDOW_CLOSED && !this.isTargetWindow(window))
			return;
		var force = reason != APP_SHUTDOWN && reason != WINDOW_CLOSED;
		var disable = reason == ADDON_DISABLE || reason == ADDON_UNINSTALL;
		if(force) {
			this.destroyTitleModifier(window.document);
			var gBrowser = window.gBrowser;
			var isPrivateWindow = this.isPrivateWindow(window);
			Array.forEach(gBrowser.tabs, function(tab) {
				tab.removeAttribute(this.privateAttr);
				if(disable && isPrivateWindow ^ this.isPrivateTab(tab)) {
					this.toggleTabPrivate(tab, isPrivateWindow);
					this.fixTabState(tab, false); // Always remove this.privateAttr
				}
			}, this);
			_log("Restore title...");
			if(!isPrivateWindow)
				this.updateWindowTitle(gBrowser, false);
			this.patchBrowser(gBrowser, false);
		}
		this.unwatchAppButton(window);
		window.removeEventListener("TabOpen", this, false);
		window.removeEventListener("SSTabRestoring", this, false);
		window.removeEventListener("TabSelect", this, false);
		window.removeEventListener("dragstart", this, true);
		window.removeEventListener("dragend", this, true);
		window.removeEventListener("drop", this, true);
		window.removeEventListener("keypress", this, true);
		window.removeEventListener("PrivateTab:PrivateChanged", this, false);
		this.destroyControls(window, force);
	},
	isTargetWindow: function(window) {
		return window.document.documentElement.getAttribute("windowtype") == "navigator:browser";
	},
	inheritWindowState: function(window) {
		_log(
			"inheritWindowState():\nwindow.opener: " + window.opener
			+ "\nwindow.__privateTabOpener: " + (window.__privateTabOpener || undefined)
			+ "\nwindow.arguments:\n" + Array.map(window.arguments || [], String).join("\n")
		);
		var opener = window.opener || window.__privateTabOpener || null;
		delete window.__privateTabOpener;
		if(!opener || opener.closed || !this.isTargetWindow(opener) || !opener.gBrowser)
			return;
		if(!("arguments" in window) || !(3 in window.arguments)) {
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
		//~ todo: add pref for this?
		//this.getPrivacyContext(window).usePrivateBrowsing = true;
		Array.forEach(window.gBrowser.tabs, function(tab) {
			this.toggleTabPrivate(tab, true);
		}, this);
	},

	prefChanged: function(pName, pVal) {
		if(pName.substr(0, 4) == "key.")
			this.updateHotkeys();
		else if(pName == "fixAppButtonWidth") {
			this.appButtonDontChange = !pVal;
			this.restoreAppButtonWidth();
			if(pVal) {
				var ws = Services.wm.getEnumerator("navigator:browser");
				while(ws.hasMoreElements()) {
					var window = ws.getNext();
					this.appButtonNA = false;
					this.fixAppButtonWidth(window.document);
					if(this.appButtonCssURI)
						break;
				}
			}
		}
	},

	patchBrowser: function(gBrowser, applyPatch) {
		var browser = gBrowser.browsers && gBrowser.browsers[0];
		if(!browser) {
			Components.utils.reportError(LOG_PREFIX + "!!! Can't find browser to patch browser.swapDocShells()");
			return;
		}
		var proto = Object.getPrototypeOf(browser);
		if(!proto || !("swapDocShells" in proto)) {
			_log("Can't patch browser: no swapDocShells() method");
			return;
		}
		if(applyPatch) {
			_log("Patch browser.__proto__.swapDocShells() method");
			var _this = this;
			patcher.wrapFunction(
				browser.__proto__, "swapDocShells", "browser.swapDocShells",
				function before(otherBrowser) {
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
			patcher.unwrapFunction(browser.__proto__, "swapDocShells", "browser.swapDocShells");
		}
	},

	tabOpenHandler: function(e) {
		var tab = e.originalTarget || e.target;
		if("_privateTabIgnore" in tab) {
			delete tab._privateTabIgnore;
			return;
		}
		var gBrowser = this.getTabBrowser(tab);
		//~ todo: try get real tab owner!
		var isPrivate;
		if(!this.isEmptyTab(tab, gBrowser)) {
			if(this.isPrivateTab(gBrowser.selectedTab))
				isPrivate = true;
			else if(this.isPrivateWindow(tab.ownerDocument.defaultView))
				isPrivate = false; // Override browser behavior!
		}
		_log(
			"Tab opened: " + (tab.getAttribute("label") || "").substr(0, 256)
			+ "\nInherit private state: " + isPrivate
		);
		if(isPrivate != undefined)
			this.toggleTabPrivate(tab, isPrivate);
		else {
			tab.ownerDocument.defaultView.setTimeout(function() {
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
		if(tab.hasAttribute(this.privateAttr)) {
			_log("Restored tab has " + this.privateAttr + " attribute");
			this.toggleTabPrivate(tab, true);
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
		var isPrivate = sourceNode == this.dndPrivateNode;
		this._dndPrivateNode = null;
		_log(e.type + ": from " + (isPrivate ? "private" : "not private") + " tab");

		var targetTab;
		if(e.view.top == window) {
			var trg = e.originalTarget || e.target;
			targetTab = this.getTabFromChild(trg);
			if(
				sourceNode
				&& sourceNode instanceof window.XULElement
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

		var inheritPrivateState = function(tab) {
			tab._privateTabIgnore = true; // We should always set this flag!
			_log(
				"drop: make " + (tab == targetTab ? "current" : "new") + " tab "
				+ (isPrivate ? "private" : "not private")
			);
			if(this.isPrivateTab(tab) != isPrivate)
				this.toggleTabPrivate(tab, isPrivate);
			else
				_log("Already correct private state, ignore");
		}.bind(this);
		var tabOpen = function(e) {
			window.removeEventListener("TabOpen", tabOpen, true);
			window.clearTimeout(timer);
			var tab = e.originalTarget || e.target;
			_log("drop: update new tab");
			inheritPrivateState(tab);
		}.bind(this);
		window.addEventListener("TabOpen", tabOpen, true);
		var timer = window.setTimeout(function() {
			window.removeEventListener("TabOpen", tabOpen, true);
			if(targetTab) {
				_log("drop: update current tab");
				inheritPrivateState(targetTab);
			}
		}, 0);
	},
	popupShowingHandler: function(e) {
		var popup = e.target;
		if(popup != e.currentTarget)
			return;
		var window = popup.ownerDocument.defaultView;
		if(popup.id == "contentAreaContextMenu")
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
		this.handleCommand(window, cmd, shifted, closeMenus);
		closeMenus && window.closeMenus(trg);
	},
	handleCommand: function(window, cmd, shifted, closeMenus) {
		_log("handleCommand: " + cmd);
		if(cmd == "openInNewPrivateTab")
			this.openInNewPrivateTab(window, shifted);
		else if(cmd == "openNewPrivateTab")
			this.openNewPrivateTab(window);
		else if(cmd == "toggleTabPrivate")
			this.toggleContextTabPrivate(window);
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
					k.char && String.fromCharCode(e.charCode).toUpperCase() == k.char
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
				this.handleCommand(window, kId);
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

	openInNewPrivateTab: function(window, toggleInBackground) {
		// Based on nsContextMenu.prototype.openLinkInTab()
		var gContextMenu = window.gContextMenu;
		var uri = gContextMenu.linkURL;
		var doc = gContextMenu.target.ownerDocument;
		window.urlSecurityCheck(uri, doc.nodePrincipal);

		var relatedToCurrent;
		var openAsChild = true;
		var w = this.getNotPopupWindow(window);
		if(w) {
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

		var tab = gBrowser.addTab(uri, {
			referrerURI: doc.documentURIObject,
			charset: doc.characterSet,
			ownerTab: gBrowser.selectedTab,
			relatedToCurrent: relatedToCurrent
		});
		this.toggleTabPrivate(tab, true);

		var inBackground = prefs.get("loadInBackground");
		if(inBackground == -1)
			inBackground = prefs.getPref("browser.tabs.loadInBackground");
		if(toggleInBackground)
			inBackground = !inBackground;
		if(!inBackground)
			gBrowser.selectedTab = tab;

		if(openAsChild && "tabkit" in window)
			window.tabkit.addingTabOver();

		this.dispatchAPIEvent(tab, "PrivateTab:OpenInNewTab");
		return tab;
	},
	openNewPrivateTab: function(window) {
		var w = this.getNotPopupWindow(window);
		if(w) {
			w.setTimeout(w.focus, 0);
			window = w;
		}
		var gBrowser = window.gBrowser;
		var tab = gBrowser.selectedTab = gBrowser.addTab(window.BROWSER_NEW_TAB_URL);
		this.toggleTabPrivate(tab, true);
		if("focusAndSelectUrlBar" in window)
			window.focusAndSelectUrlBar();
		else if("WindowFocusTimerCallback" in window) // SeaMonkey
			window.setTimeout(window.WindowFocusTimerCallback, 0, window.gURLBar);

		this.dispatchAPIEvent(tab, "PrivateTab:OpenNewTab");
		return tab;
	},
	getNotPopupWindow: function(window) {
		if(
			"getTopWin" in window
			&& window.getTopWin.length > 0 // Only in Firefox for now
			&& !window.toolbar.visible // Popup window
			&& prefs.get("dontUseTabsInPopupWindows")
		)
			return window.getTopWin(true);
		return null;
	},
	getContextTab: function(window) {
		if("TabContextMenu" in window)
			return window.TabContextMenu.contextTab;
		var cm = this.getTabContextMenu(window.document);
		return cm.triggerNode && window.gBrowser.mContextTab;
	},
	toggleContextTabPrivate: function(window) {
		var tab = this.getContextTab(window)
			|| window.gBrowser.selectedTab; // For hotkey
		var isPrivate = this.toggleTabPrivate(tab);
		this.fixTabState(tab, isPrivate);
		if(tab == this.getTabBrowser(tab).selectedTab) {
			this.updateTabContext(window);
			this.updateTabTooltip(window);
			if("TabScope" in window && "_updateTitle" in window.TabScope && window.TabScope._tab)
				 window.TabScope._updateTitle();
		}
	},

	cmdAttr: "privateTab-command",
	contextId: "privateTab-context-openInNewPrivateTab",
	tabContextId: "privateTab-tabContext-toggleTabPrivate",
	newTabMenuId: "privateTab-menu-openNewPrivateTab",
	newTabAppMenuId: "privateTab-appMenu-openNewPrivateTab",
	tabTipId: "privateTab-tooltip-isPrivateTabLabel",
	tabScopeTipId: "privateTab-tabScope-isPrivateTabLabel",
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
	initControls: function(document) {
		var window = document.defaultView;
		var createMenuitem = function(id, attrs) {
			var mi = document.createElement("menuitem");
			mi.id = id;
			for(var name in attrs)
				mi.setAttribute(name, attrs[name]);
			mi.addEventListener("command", this, false);
			mi.addEventListener("click", this, false);
			return mi;
		}.bind(this);
		var insertMenuitem = function(mi, parent, insertAfter) {
			if(!parent)
				return;
			var insPos;
			for(var i = 0, l = insertAfter.length; i < l; ++i) {
				var id = insertAfter[i];
				var node = typeof id == "string"
					? parent.querySelector(insertAfter[i])
					: id;
				if(node && node.parentNode == parent) {
					insPos = node;
					break;
				}
			}
			parent.insertBefore(mi, insPos && insPos.nextSibling);
		}.bind(this);

		var contentContext = document.getElementById("contentAreaContextMenu");
		contentContext.addEventListener("popupshowing", this, false);

		var contextItem = createMenuitem(this.contextId, {
			label:     this.getLocalized("openInNewPrivateTab"),
			accesskey: this.getLocalized("openInNewPrivateTabAccesskey"),
			"privateTab-command": "openInNewPrivateTab"
		});
		insertMenuitem(contextItem, contentContext, ["#context-openlinkintab"]);

		var menuItemParent = document.getElementById("menu_NewPopup") // SeaMonkey
			|| document.getElementById("menu_FilePopup");
		var shortLabel = menuItemParent.id == "menu_NewPopup" ? "Short" : "";
		var menuItem = createMenuitem(this.newTabMenuId, {
			label:     this.getLocalized("openNewPrivateTab" + shortLabel),
			accesskey: this.getLocalized("openNewPrivateTab" + shortLabel + "Accesskey"),
			"privateTab-command": "openNewPrivateTab"
		});
		insertMenuitem(menuItem, menuItemParent, ["#menu_newNavigatorTab"]);

		var appMenuItemParent = document.getElementById("appmenuPrimaryPane");
		if(appMenuItemParent) {
			var appMenuItem = createMenuitem(this.newTabAppMenuId, {
				label:     this.getLocalized("openNewPrivateTab"),
				"privateTab-command": "openNewPrivateTab"
			});
			var newPrivateWin = document.getElementById("appmenu_newPrivateWindow");
			if(newPrivateWin) {
				var s = window.getComputedStyle(newPrivateWin, null);
				var icon = s.listStyleImage;
				if(icon && icon != "none") {
					appMenuItem.className = "menuitem-iconic";
					appMenuItem.style.listStyleImage = icon;
					appMenuItem.style.MozImageRegion = s.MozImageRegion;
				}
			}
			insertMenuitem(appMenuItem, appMenuItemParent, [newPrivateWin]);
		}

		var tabContext = this.getTabContextMenu(document);
		_log("tabContext: " + tabContext);
		tabContext.addEventListener("popupshowing", this, false);
		var tabContextItem = createMenuitem(this.tabContextId, {
			label:     this.getLocalized("privateTab"),
			accesskey: this.getLocalized("privateTabAccesskey"),
			type: "checkbox",
			"privateTab-command": "toggleTabPrivate"
		});
		insertMenuitem(tabContextItem, tabContext, ["#context_unpinTab", '[tbattr="tabbrowser-undoclosetab"]']);

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
	},
	destroyControls: function(window, force) {
		_log("destroyControls(), force: " + force);
		var document = window.document;
		var contentContext = document.getElementById("contentAreaContextMenu");
		contentContext && contentContext.removeEventListener("popupshowing", this, false);

		this.destroyNodes(document, force);
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
	},
	destroyNodes: function(parent, force) {
		var nodes = parent.getElementsByAttribute(this.cmdAttr, "*");
		for(var i = nodes.length - 1; i >= 0; --i) {
			var node = nodes[i];
			node.removeEventListener("command", this, false);
			node.removeEventListener("click", this, false);
			force && node.parentNode.removeChild(node);
		}
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
	initHotkeysText: function(document) {
		var keys = this.hotkeys;
		if(!keys)
			return;
		if(this._hotkeysHasText) {
			_log("setHotkeysText()");
			this.setHotkeysText(document);
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
					_log("Key text: " + mi.getAttribute("acceltext"));
				}
			);
			this._hotkeysHasText = true;
			_log("=> setHotkeysText()");
			mp.parentNode.removeChild(mp);
			keyset.parentNode.removeChild(keyset);
			window.clearInterval(tryAgain);
			window.clearTimeout(tryAgainLimit);
			this.setHotkeysText(document);
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
		var keys = this.hotkeys;
		for(var kId in keys) {
			var keyText = keys[kId]._keyText;
			_log("Set " + keyText + " for " + kId);
			this.getHotkeysNodes(document, kId).forEach(function(node) {
				node.setAttribute("acceltext", keyText);
			});
		}
	},
	updateHotkeys: function() {
		_log("updateHotkeys()");
		this.initHotkeys();
		var hasHotkeys = !!this.hotkeys;
		var ws = Services.wm.getEnumerator("navigator:browser");
		while(ws.hasMoreElements()) {
			var window = ws.getNext();
			window.removeEventListener("keypress", this, true);
			hasHotkeys && window.addEventListener("keypress", this, true);
			var document = window.document;
			this.getHotkeysNodes(document, "*").forEach(function(node) {
				node.removeAttribute("acceltext");
			});
			// May fail without setTimeout(), if other popup not yet hidden
			hasHotkeys && window.setTimeout(function() {
				this.initHotkeysText(document);
			}.bind(this), 0);
		}
	},

	isEmptyTab: function(tab, gBrowser) {
		// See "addTab" method in chrome://browser/content/tabbrowser.xml
		var tabLabel = tab.getAttribute("label") || "";
		if(!tabLabel || tabLabel == "undefined" || tabLabel == "about:blank")
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
	toggleTabPrivate: function(tab, isPrivate) {
		var privacyContext = this.getTabPrivacyContext(tab);
		if(isPrivate === undefined)
			isPrivate = !privacyContext.usePrivateBrowsing;
		privacyContext.usePrivateBrowsing = isPrivate;
		_log("Set usePrivateBrowsing to " + isPrivate + "\nTab: " + (tab.getAttribute("label") || "").substr(0, 255));
		this.dispatchAPIEvent(tab, "PrivateTab:PrivateChanged", isPrivate);
		return isPrivate;
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
	ensureTitleModifier: function(document) {
		var root = document.documentElement;
		if(
			root.hasAttribute("titlemodifier_normal")
			&& root.hasAttribute("titlemodifier_privatebrowsing")
		)
			return;
		var tm = root.getAttribute("titlemodifier");
		root.setAttribute("privateTab_titlemodifier_normal", tm);
		root.setAttribute(
			"privateTab_titlemodifier_privatebrowsing",
			tm + this.getLocalized("privateBrowsingTitleModifier")
		);
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
		var iconWidth = bo.width;
		if(!iconWidth) { // App button are hidden?
			this.watchAppButton(document.defaultView);
			this.appButtonNA = true; // Don't check and don't call watchAppButton() again
			return;
		}
		root.removeAttribute("privatebrowsingmode");
		iconWidth -= bo.width;
		root.setAttribute("privatebrowsingmode", "temporary");
		if(iconWidth <= 0) {
			this.appButtonNA = true;
			return;
		}
		var half = iconWidth/2;
		var s = document.defaultView.getComputedStyle(appBtn, null);
		var pl = parseFloat(s.paddingLeft) - half;
		var pr = parseFloat(s.paddingRight) - half;
		if(pl < 0 || pr < 0) { // Can't correct...
			this.appButtonNA = true;
			return;
		}
		_log("Fix App button width:\npadding-left: " + pl + "px\npadding-right: " + pr + "px");
		var cssStr = '\
			@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");\n\
			@-moz-document url("' + document.documentURI + '") {\n\
				#main-window[privatebrowsingmode="temporary"] #appmenu-button {\n\
					padding-left: ' + pl + 'px !important;\n\
					padding-right: ' + pr + 'px !important;\n\
				}\n\
			}';
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

var prefs = {
	ns: "extensions.privateTab.",
	initialized: false,
	init: function() {
		if(this.initialized)
			return;
		this.initialized = true;

		//~ todo: add condition when https://bugzilla.mozilla.org/show_bug.cgi?id=564675 will be fixed
		this.loadDefaultPrefs();
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
	wrapNS: "privateTabMod::",
	wrapFunction: function(obj, meth, key, callBefore, callAfter) {
		var win = Components.utils.getGlobalForObject(obj);
		key = this.wrapNS + key;
		var orig, wrapped;
		if(!(key in win)) {
			_log("[patcher] Patch " + key);
			orig = obj[meth];
			wrapped = obj[meth] = callAfter
				? function wrapper() {
					if(win[key].before.apply(this, arguments))
						return undefined;
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
					if(win[key].before.apply(this, arguments))
						return undefined;
					return orig.apply(this, arguments);
				};
			// Someone may want to do eval() patch...
			var patch = callAfter
				? function(s) {
					var ret = "_ret_" + Math.random().toFixed(14).substr(2);
					return s
						.replace(
							"{",
							'{\n\tif(window["' + key + '"].before.apply(this, arguments)) return;\n'
							+ "\tvar " + ret + " = (function() {\n"
						)
						.replace(
							/\}$/,
							"}).apply(this, arguments);\n"
							+ '\twindow["' + key + '"].after.apply(this, [' + ret + "].concat(Array.slice(arguments)));\n"
							+ "\treturn " + ret + ";\n"
							+ "}"
						);
				}
				: function(s) {
					return s.replace(
						"{",
						'{\n\tif(window["' + key + '"].before.apply(this, arguments)) return;\n'
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
			_log("[patcher] Will use previous patch for " + key);
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
		key = this.wrapNS + key;
		if(!(key in win))
			return;
		var wrapper = win[key];
		if(obj[meth] != wrapper.wrapped) {
			_log("[patcher] Can't completely restore " + key + ": detected third-party wrapper!");
			var dummy = function() {};
			win[key] = {
				before: dummy,
				after: wrapper.after && dummy
			};
		}
		else {
			_log("[patcher] Restore " + key);
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