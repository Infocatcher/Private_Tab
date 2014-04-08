pref("extensions.privateTab.loadInBackground", -1);
// -1 - use built-in browser.tabs.loadInBackground or browser.tabs.loadBookmarksInBackground
// 0  - load in foreground
// 1  - load in background

pref("extensions.privateTab.keysUseKeydownEvent", true); // Use "keydown" event instead of "keypress"
pref("extensions.privateTab.keysHighPriority", true); // Handle key* event in capturing phase
pref("extensions.privateTab.keysIgnoreDefaultPrevented", false); // Ignore, if someone stops key* event
// See https://developer.mozilla.org/en-US/docs/XUL/Tutorial/Keyboard_Shortcuts
// and https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent#Virtual_key_codes
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
// But be careful: undo close history with private tabs will be saved to the disk!
pref("extensions.privateTab.rememberClosedPrivateTabs.cleanup", 2); // (only for rememberClosedPrivateTabs == true)
// Remove closed private tabs from undo close history in closing windows and after closing of last private tab/window
// 0 - disable cleanup
// 1 - perform cleanup after "last-pb-context-exited" notification
// 2 - additionally perform cleanup after closing of last private tab in SeaMonkey (SeaMonkey has
//     some cache for fast tabs restoring and doesn't destroy closed tabs immediately)
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
pref("extensions.privateTab.fixAfterTabsButtonsAccessibility", true);
// Fix width of clickable area for "New Tab" and "New Private Tab" buttons after last tab
pref("extensions.privateTab.fixAfterTabsButtonsAccessibility.iconPadding", "");
// Custom padding for button's icon (to override autodetected value), example: "6px 11px"
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