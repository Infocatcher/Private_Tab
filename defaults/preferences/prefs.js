pref("extensions.privateTab.loadInBackground", -1);
// -1 - use built-in browser.tabs.loadInBackground or browser.tabs.loadBookmarksInBackground
// 0  - load in foreground
// 1  - load in background

pref("extensions.privateTab.keysIgnoreDefaultPrevented", false); // Ignore, if someone stops "keypress" event
// See https://developer.mozilla.org/en-US/docs/XUL/Tutorial/Keyboard_Shortcuts
// Syntax: [<modifiers> ]<key or keycode>
pref("extensions.privateTab.key.openNewPrivateTab", "control alt p");
pref("extensions.privateTab.key.toggleTabPrivate", "control alt v");

pref("extensions.privateTab.dragAndDropBehavior", 0);
// 0 - make new (or target) tab private, if source or target are private
// 1 - use source private state
// 2 - use target private state
pref("extensions.privateTab.dragAndDropTabsBetweenDifferentWindows", true);
pref("extensions.privateTab.rememberClosedPrivateTabs", false);
pref("extensions.privateTab.sendRefererHeader", 2);
// 0 - don't send
// 1 - only if private tab opened from private tab
// 2 - always send (as Firefox itself do for "Open Link in New Private Window")
pref("extensions.privateTab.workaroundForPendingTabs", true);
pref("extensions.privateTab.dontUseTabsInPopupWindows", true);
pref("extensions.privateTab.fixAppButtonWidth", true);

pref("extensions.privateTab.debug", false);