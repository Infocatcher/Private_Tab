pref("extensions.privateTab.loadInBackground", -1);
// -1 - use built-in browser.tabs.loadInBackground or browser.tabs.loadBookmarksInBackground
// 0  - load in foreground
// 1  - load in background

pref("extensions.privateTab.keysUseKeydownEvent", true); // Use "keydown" event instead of "keypress"
pref("extensions.privateTab.keysIgnoreDefaultPrevented", false); // Ignore, if someone stops key* event
// See https://developer.mozilla.org/en-US/docs/XUL/Tutorial/Keyboard_Shortcuts
// and https://developer.mozilla.org/en-US/docs/DOM/KeyboardEvent#Virtual_key_codes
// Syntax: [<modifiers> ]<key or keycode>
// It's better to use VK_* codes for keysUseKeydownEvent = true.
// You can also create alias for hotkey using extensions.privateTab.key.%command%#%alias_name%, example:
// pref("extensions.privateTab.key.openNewPrivateTab#2", "VK_F8")
pref("extensions.privateTab.key.openNewPrivateTab", "control alt VK_P");
pref("extensions.privateTab.key.toggleTabPrivate", "control alt VK_V");

pref("extensions.privateTab.dragAndDropBehavior", 0);
// 0 - make new (or target) tab private, if source or target are private
// 1 - use source private state
// 2 - use target private state
pref("extensions.privateTab.dragAndDropTabsBetweenDifferentWindows", true);
pref("extensions.privateTab.rememberClosedPrivateTabs", false);
pref("extensions.privateTab.savePrivateTabsInSessions", false);
pref("extensions.privateTab.makeNewEmptyTabsPrivate", false);
pref("extensions.privateTab.makeNewEmptyWindowsPrivate", false); // Note: make single empty tab in new window private
pref("extensions.privateTab.sendRefererHeader", 2);
// 0 - don't send
// 1 - only if private tab opened from private tab
// 2 - always send (as Firefox itself do for "Open Link in New Private Window")
pref("extensions.privateTab.toggleTabPrivateAutoReload", true);
pref("extensions.privateTab.workaroundForPendingTabs", true);
pref("extensions.privateTab.dontUseTabsInPopupWindows", true);
pref("extensions.privateTab.fixAppButtonWidth", true);
pref("extensions.privateTab.patchDownloads", true);

pref("extensions.privateTab.debug", false);