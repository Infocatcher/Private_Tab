#### Private Tab: Changelog

`+` - added
`-` - deleted
`x` - fixed
`*` - improved

##### master/HEAD
`*` Improved compatibility with <a href="https://addons.mozilla.org/addon/tab-mix-plus/">Tab Mix Plus</a> (many thanks to <a href="https://addons.mozilla.org/user/onemen/">onemen</a> for fixes from Tab Mix Plus side) (#95, #96)
`+` Added “new private tab” item to task bar context menu (only Windows 7 and higher) (<a href="https://github.com/Infocatcher/Private_Tab/issues/98">#98</a>)
`+` Added context menu item to open multiple bookmarks/history items in private tabs (<a href="https://github.com/Infocatcher/Private_Tab/issues/99">#99</a>)
`*` Changed default hotkey for toggle private state of current tab from Ctrl+Alt+<strong>V</strong> to Ctr+Alt+<strong>T</strong> (set <em>extensions.privateTab.key.toggleTabPrivate</em> = “control alt VK_V” to restore old hotkey) (#105)

##### 0.1.5 (2013-08-24)
`*` Added ability to show buttons “New Private Tab” and “New Tab” after last tab (<a href="https://github.com/Infocatcher/Private_Tab/issues/92">#92</a>)
`x` Fixed: tabs, opened from another extensions, may be wrongly detected as externally opened (<a href="https://github.com/Infocatcher/Private_Tab/issues/93">#93</a>)
`x` Fixed: malformed private-protocol URLs reliably crash the browser (<a href="https://github.com/Infocatcher/Private_Tab/issues/94">#94</a>)

##### 0.1.4 (2013-08-19)
`x` Fixed empty tabs tooltips on Firefox 25.0a1+ (<a href="https://github.com/Infocatcher/Private_Tab/issues/75">#75</a>)
`+` Added ability to view source of private tabs (<a href="https://github.com/Infocatcher/Private_Tab/issues/74">#74</a>)
`x` Corrected “(private tab)” label in <a href="https://addons.mozilla.org/addon/tab-scope/">Tab Scope</a>'s popup (<a href="https://github.com/Infocatcher/Private_Tab/issues/78">#78</a>)
`+` Added Indonesian (id) locale, thanks to <a href="https://addons.mozilla.org/user/daisukeDan/">Daisuke Bjm Project</a>
`+` Added Ukrainian (uk) locale, thanks to <a href="https://addons.mozilla.org/user/dbv92/">dbv92</a>
`+` Added Arabic (ar) locale, thanks to <a href="https://addons.mozilla.org/user/slax/">infinity</a>
`*` Improved compatibility with extensions like <a href="https://addons.mozilla.org/addon/fast-dial-5721/">Fast Dial</a> (<a href="https://github.com/Infocatcher/Private_Tab/issues/84">#84</a>)
`x` Fixed incompatibility with <a href="https://addons.mozilla.org/addon/tile-tabs/">Tile Tabs</a> 10.0 (<a href="https://github.com/Infocatcher/Private_Tab/issues/83">#83</a>)
`x` Corrected for changes in Mozilla bug <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=885177">#885177</a> (<a href="https://github.com/Infocatcher/Private_Tab/issues/85">#85</a>)
`*` Preserve text in URL Bar after auto reloading (<a href="https://github.com/Infocatcher/Private_Tab/issues/86">#86</a>)
`*` Improved behavior after closing of private tabs (<em>extensions.privateTab.rememberOwnerTab</em> preference) (<a href="https://github.com/Infocatcher/Private_Tab/issues/87">#87</a>)
`+` Implemented “private” protocol: now we can use special URLs to open private tabs from bookmarks or from command line (example: private:///#https://addons.mozilla.org/, may be disabled using <em>extensions.privateTab.enablePrivateProtocol</em> preference) (<a href="https://github.com/Infocatcher/Private_Tab/issues/89">#89</a>)
`+` Added ability to show “New Private Tab” button after “New Tab” button (<a href="https://github.com/Infocatcher/Private_Tab/issues/90">#90</a>)
`*` Added ability to invert auto reload behavior (<em>extensions.privateTab.toggleTabPrivateAutoReload</em> preference) using middle-click (or left-click with any modifier)

##### 0.1.3 (2013-06-13)
`+` Added ability to prevent private session from ending (in case of active downloads etc.) (<a href="https://github.com/Infocatcher/Private_Tab/issues/53">#53</a>)
`x` Fixed possible memory leak (only if someone use privateTab.readyToOpenTabs() without following privateTab.stopToOpenTabs())
`x` Fixed: small images from private tabs (displayed with favicons) are cached to disk (<a href="https://github.com/Infocatcher/Private_Tab/issues/56">#56</a>)
`x` Disabled thumbnails capturing from private tabs (<a href="https://github.com/Infocatcher/Private_Tab/issues/58">#58</a>)
`+` Added <em>extensions.privateTab.debug.verbose</em> preference to log some additional debug information into Error Console
`x` Fixed conflict with <a href="https://addons.mozilla.org/addon/nosquint/">NoSquint</a> extension (<a href="https://github.com/Infocatcher/Private_Tab/issues/61">#61</a>)
`*` Small performance improvements
`*` Improved localizability of confirmation dialog in case of extension disabling or uninstalling
`+` Added locales:
	Catalan (ca), thanks to <a href="https://github.com/Dimas-sc">Dimas-sc</a>
	Hungarian (hu), thanks to <a href="https://github.com/evenorbert">evenorbert</a>
	Italian (it), thanks to <a href="https://github.com/moretti">moretti</a>
	Portuguese (Brazilian) (pt-BR), thanks to <a href="http://www.babelzilla.org/forum/index.php?showuser=212">Ghelman</a>
	Serbian (sr), thanks to <a href="http://www.babelzilla.org/forum/index.php?showuser=8719">DakSrbija</a>
	Spanish (es), thanks to <a href="https://github.com/strel">strel</a>
`*` Updated locales:
	Chinese (Simplified) (zh-CN), thanks to <a href="https://github.com/Cye3s">Cye3s</a>
	Chinese (Traditional) (zh-TW), thanks to <a href="https://github.com/ikurrina">ikurrina</a>
	Estonian (et), thanks to <a href="https://github.com/mdr-ksk">mdr-ksk</a>
	French (fr) from babelzilla.org (yes, not complete)
	German (de), thanks to <a href="https://github.com/sierkb">sierkb</a>
	Greek (el), thanks to <a href="http://www.babelzilla.org/forum/index.php?showuser=15362">Grg68</a>
	Japanese (jp), thanks to <a href="https://github.com/charishi">charishi</a>
	Polish (pl), thanks to <a href="https://github.com/marcinsu">marcinsu</a>

##### 0.1.2 (2013-05-01)
`+` Added Polish locale (pl), thanks to <a href="https://github.com/marcinsu">marcinsu</a>
`*` Corrected: don't inherit private state for new tabs and new windows, opened from external application (<em>extensions.privateTab.allowOpenExternalLinksInPrivateTabs</em> preference) (<a href="https://github.com/Infocatcher/Private_Tab/issues/42">#42</a>)
`x` Correctly detect new windows from JavaScript's window.open() with size parameters as not empty
`x` Correct appearance for selected private on Mac OS X (<a href="https://github.com/Infocatcher/Private_Tab/issues/44">#44</a>)
`x` Fixed: remove wrappers when window is closed to avoid memory leaks (<a href="https://github.com/Infocatcher/Private_Tab/issues/45">#45</a>, <a href="https://github.com/Infocatcher/Private_Tab/issues/46">#46</a>)
`+` Added Estonian locale (et), thanks to <a href="http://forums.mozillazine.org/memberlist.php?mode=viewprofile&amp;u=2361677">mdr.ksk</a>
`x` Fixed: hotkey isn't shown in File menu on Mac OS X <a href="https://github.com/Infocatcher/Private_Tab/issues/47">#47</a>
`+` Added <em>extensions.privateTab.keysHighPriority</em> preference to handle key* event in the capturing (true) or bubbling (false) phase, see http://www.w3.org/TR/DOM-Level-3-Events/#event-flow
`*` Corrected Chinese (Traditional) locale (zh-TW), thanks to <a href="https://github.com/marcinsu">ikurrina</a>
`+` Added ability to close all private tabs after extension will be disabled or uninstalled (<a href="https://github.com/Infocatcher/Private_Tab/issues/51">#51</a>)

##### 0.1.1 (2013-04-24)
`+` Added French locale (fr), thanks to <a href="https://github.com/Stis">Stis</a>
`+` Added Chinese (Simplified) locale (zh-CN), thanks to <a href="https://github.com/Cye3s">Cye3s</a>
`x` Fixed memory leak on extension disabling (due to not deleted window.privateTab) (<a href="https://github.com/Infocatcher/Private_Tab/issues/33">#33</a>)
`+` Added Vietnamese locale (vi), thanks to <a href="https://github.com/leof36">Leof36</a>
`+` Added German locale (de), thanks to <a href="https://github.com/sierkb">sierkb</a>
`*` Improved compatibility with extensions like <a href="https://addons.mozilla.org/addon/personal-menu/">Personal Menu</a> (<a href="https://github.com/Infocatcher/Private_Tab/issues/35">#35</a>)
`+` Detect <a href="https://addons.mozilla.org/addon/super-start/">Super Start</a> page as blank
`*` Improved: now private tabs aren't saved in sessions (<a href="https://github.com/Infocatcher/Private_Tab/issues/36">#36</a>)
`*` Improved: show downloads from private tabs in not private window (<a href="https://github.com/Infocatcher/Private_Tab/issues/31">#31</a>)
`*` Better tooltip for private tabs on themes with dark tooltip background (<a href="https://github.com/Infocatcher/Private_Tab/issues/38">#38</a>)
`+` Added Greek locale (el), thanks to <a href="http://forums.mozillazine.org/memberlist.php?mode=viewprofile&u=1595963">Grg68</a>

##### 0.1.0 (2013-04-09)
`*` Will be used built-in title modifier in latest SeaMonkey 2.19a1+ (2013-03-27+)
`*` Correctly detect built-in private windows in latest SeaMonkey 2.19a1+ (2013-03-27+)
`x` Correctly restore window title in SeaMonkey on extension disabling
`+` Added ability to open all new blank/empty tabs in private mode (experimental, preferences: <em>extensions.privateTab.makeNewEmptyTabsPrivate</em>, <em>extensions.privateTab.makeNewEmptyWindowsPrivate</em>)
`+` Added Chinese (Traditional) locale (zh-TW), thanks to arbiger
`+` Added Japanese locale (ja), thanks to charishi
`x` Workaround for browser.newtab.preload = true
`x` Correctly fix App button width: wait for third-party styles
`x` Fixed: toggle tab private hotkey works for wrong tab sometimes
`*` Allow setup multiple hotkeys for one command: <em>extensions.privateTab.key.</em>%command%<em>#</em>%alias_name%
`x` Fixed (hopefully): hotkeys doesn't work on non-Latin keyboard layouts
`*` Small optimizations

##### 0.1.0b4 (2013-03-26)
`+` Detect Speed Dial and FVD Speed Dial pages as blank
`+` Added “privateTab-isPrivate” attribute to private window (may be used in user styles)
`+` Added toolbar button
`x` Correctly undo close not private tabs in private windows
`+` Don't save closed private tabs in undo close history (<em>extensions.privateTab.rememberClosedPrivateTabs</em> preference)
`+` Added <em>extensions.privateTab.sendRefererHeader</em> preference
`x` Drag-and-drop: correctly change private state of already existing tabs
`*` Drag-and-drop: make new (or target) tab private, if source or target are private (<em>extensions.privateTab.dragAndDropBehavior</em> preference)
`+` Implemented API for other extensions
`+` Reload tab after private state has been changed from context menu (<em>extensions.privateTab.toggleTabPrivateAutoReload</em> preference)

##### 0.1.0b3 (2013-03-19)
`+` Allow drag-and-drop tabs between private and not private windows (<em>extensions.privateTab.dragAndDropTabsBetweenDifferentWindows</em> preference)
`x` Correctly open link in new private tab: in previous versions tab aren't saved in the history, but was used not private cookies

##### 0.1.0b2 (2013-03-17)
`*` Always open not private tab using “Open in a New Tab” in bookmark context menu: now we have “Open in a New Private Tab”, so this is more intuitive
`x` Hide hotkeys text from App menu and don't break hetkey text hiding for built-in “New Private Window” item (<a href="https://github.com/Infocatcher/Private_Tab/issues/3">#3</a>)
`x` Correctly update hotkeys in multiple windows after <em>extensions.privateTab.key.*</em> preferences changes
`x` Fix drop from private tab in private window
`+` Added <em>extensions.privateTab.dragAndDropUseTargetPrivateState</em> preference to use target private state for dropped link-like things (<a href="https://github.com/Infocatcher/Private_Tab/issues/4">#4</a>)
`*` Some internal improvements

##### 0.1.0b2pre (2013-03-14)
`*` Use better way to fix App button width
`*` Update placeholder for App button, if width can't be fixed
`+` Added context menu item for bookmarks (<a href="https://github.com/Infocatcher/Private_Tab/issues/2">#2</a>)

##### 0.1.0b1 (2013-03-13)
`*` Inherit private state from source tab for any dropped link-like thing
`+` Experimental: add menu items to built-in private window too
`*` Allow open new not private window from private tab (using “New Window” command)
`+` Support for built-in “Open Link in Private Window” in SeaMonkey 2.19a1
`*` Fix App button width: the same width for private and not private state (<em>extensions.privateTab.fixAppButtonWidth</em> preference)
`x` Correctly change visibility of built-in “Open Link in New Tab/Window”
`*` Open new private tab with focused URL bar

##### 0.1.0a3 (2013-02-20)
`*` First public release