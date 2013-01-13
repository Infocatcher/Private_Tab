pref("extensions.privateTab.loadInBackground", -1);
// -1 - use built-in browser.tabs.loadInBackground
// 0  - load in foreground
// 1  - load in background

pref("extensions.privateTab.keysIgnoreDefaultPrevented", false); // Ignore, if someone stops "keypress" event
pref("extensions.privateTab.key.openNewPrivateTab", "control alt p");
pref("extensions.privateTab.key.toggleTabPrivate", "control alt v");

pref("extensions.privateTab.workaroundForPendingTabs", true);
pref("extensions.privateTab.dontUseTabsInPopupWindows", true);

pref("extensions.privateTab.debug", false);