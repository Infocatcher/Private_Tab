pref("extensions.privateTab.loadInBackground", -1);
// -1 - use built-in browser.tabs.loadInBackground or browser.tabs.loadBookmarksInBackground
// 0  - load in foreground
// 1  - load in background

pref("extensions.privateTab.keysUseKeydownEvent", true); // Use "keydown" event instead of "keypress"
pref("extensions.privateTab.keysHighPriority", true); // Handle key* event in capturing phase
pref("extensions.privateTab.keysIgnoreDefaultPrevented", false); // Ignore, if someone stops key* event
// See https://developer.mozilla.org/en-US/docs/XUL/Tutorial/Keyboard_Shortcuts
// and https://developer.mozilla.org/en-US/docs/DOM/KeyboardEvent#Virtual_key_codes
// Syntax: [<modifiers> ]<key or keycode>
// It's better to use VK_* codes for keysUseKeydownEvent = true.
// You can also create alias for hotkey using extensions.privateTab.key.%command%#%alias_name%, example:
// pref("extensions.privateTab.key.openNewPrivateTab#2", "VK_F8")
pref("extensions.privateTab.key.openNewPrivateTab", "control alt VK_P");
pref("extensions.privateTab.key.toggleTabPrivate", "control alt VK_T");

pref("extensions.privateTab.newPrivateTabURL", "");
pref("extensions.privateTab.newPrivateTabURL.inPrivateWindow", "");
// Any URL to open it in new empty private tabs or leave empty to open the same as in new non-private tabs

pref("extensions.privateTab.dragAndDropBehavior", 0);
// 0 - make new (or target) tab private, if source or target are private
// 1 - use source private state
// 2 - use target private state
pref("extensions.privateTab.dragAndDropTabsBetweenDifferentWindows", true);
pref("extensions.privateTab.rememberClosedPrivateTabs", false);
pref("extensions.privateTab.rememberClosedPrivateTabs.enableCleanup", true);
// Remove closed private tabs from undo close list in closing windows and after closing of
// last private tab/window (only for rememberClosedPrivateTabs = true)
pref("extensions.privateTab.savePrivateTabsInSessions", false);
pref("extensions.privateTab.makeNewEmptyTabsPrivate", 0);
pref("extensions.privateTab.makeNewEmptyWindowsPrivate", 0);
// -1 - inherit private state from owner tab
// 0  - ignore new empty tabs (windows)
// 1  - make new empty tabs private (make single empty tab in new empty windows private)
pref("extensions.privateTab.allowOpenExternalLinksInPrivateTabs", false);
pref("extensions.privateTab.sendRefererHeader", 2);
// 0 - don't send
// 1 - only if private tab opened from private tab
// 2 - always send (as Firefox itself do for "Open Link in New Private Window")
pref("extensions.privateTab.toggleTabPrivateAutoReload", true);
pref("extensions.privateTab.workaroundForPendingTabs", true);
pref("extensions.privateTab.dontUseTabsInPopupWindows", true);
pref("extensions.privateTab.rememberOwnerTab", false);
pref("extensions.privateTab.fixAppButtonWidth", true);
pref("extensions.privateTab.patchDownloads", true);
pref("extensions.privateTab.enablePrivateProtocol", true);
pref("extensions.privateTab.showItemInTaskBarJumpList", true); // Works only if enablePrivateProtocol == true
pref("extensions.privateTab.usePrivateWindowStyle", true);
// true  - apply private window style to private tabs (and show tab private state)
// false - show window private state
pref("extensions.privateTab.stylesHighPriority", true); // Set "!important" flag to force override third-party styles
pref("extensions.privateTab.stylesHighPriority.tree", true); // The same as above for private:///#... bookmarks inside XUL <tree>

pref("extensions.privateTab.debug", false);
pref("extensions.privateTab.debug.verbose", false);