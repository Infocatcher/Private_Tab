#### Private Tab: Changelog

`+` - added<br>
`-` - deleted<br>
`x` - fixed<br>
`*` - improved<br>

##### master/HEAD
`+` Added ability to remove private tabs from undo close history only after private browsing ends (<a href="https://github.com/Infocatcher/Private_Tab/issues/112">#112</a>)<br>
`+` Added highlighting of private tabs in “List all tabs” menu (<a href="https://github.com/Infocatcher/Private_Tab/issues/113">#113</a>)<br>
`x` Correctly ignore single char hotkeys (like just `V` or `Shift+V`) in WYSIWYG editors<br>
`x` Correctly detect built-in private windows in SeaMonkey (<a href="https://github.com/Infocatcher/Private_Tab/issues/116">#116</a>)<br>
`x` Correctly update download panel in Firefox 28.0a1+<br>
`x` Correctly insert button into toolbar in Firefox 28.0a1+ (Australis) (<a href="https://github.com/Infocatcher/Private_Tab/issues/121">#121</a>))<br>
`+` Added preferences to open user-defined URL in new empty private tabs (<em>extensions.privateTab.newPrivateTabURL</em> and <em>extensions.privateTab.newPrivateTabURL.inPrivateWindow</em>) (<a href="https://github.com/Infocatcher/Private_Tab/issues/125">#125</a>)<br>
`*` Minor code improvements<br>
`*` Updated Polish locale (pl), thanks to <a href="https://github.com/marcinsu">marcinsu</a><br>
`*` Updated Hungarian locale (hu), thanks to <a href="https://github.com/evenorbert">evenorbert</a><br>

##### 0.1.6 (2013-10-31)
`*` Improved compatibility with <a href="https://addons.mozilla.org/addon/tab-mix-plus/">Tab Mix Plus</a> (many thanks to <a href="https://addons.mozilla.org/user/onemen/">onemen</a> for fixes from Tab Mix Plus side) (<a href="https://github.com/Infocatcher/Private_Tab/issues/95">#95</a>, <a href="https://github.com/Infocatcher/Private_Tab/issues/96">#96</a>)<br>
`+` Added “new private tab” item to task bar context menu (only Windows 7 and higher, <em>extensions.privateTab.showItemInTaskBarJumpList</em> preference) (<a href="https://github.com/Infocatcher/Private_Tab/issues/98">#98</a>)<br>
`+` Added context menu item to open multiple bookmarks/history items in private tabs (<a href="https://github.com/Infocatcher/Private_Tab/issues/99">#99</a>)<br>
`*` Changed default hotkey for toggle private state of current tab from Ctrl+Alt+<strong>V</strong> to Ctr+Alt+<strong>T</strong> (set <em>extensions.privateTab.key.toggleTabPrivate</em> = “control alt VK_V” to restore old hotkey) (<a href="https://github.com/Infocatcher/Private_Tab/issues/105">#105</a>)<br>
`+` Added ability to inherit private state for new empty tabs and windows (set <em>extensions.privateTab.makeNewEmptyTabsPrivate</em>/<em>extensions.privateTab.makeNewEmptyWindowsPrivate</em> to `-1`) (<a href="https://github.com/Infocatcher/Private_Tab/issues/111">#111</a>)<br>

##### 0.1.5 (2013-08-24)
`*` Added ability to show buttons “New Private Tab” and “New Tab” after last tab (<a href="https://github.com/Infocatcher/Private_Tab/issues/92">#92</a>)<br>
`x` Fixed: tabs, opened from another extensions, may be wrongly detected as externally opened (<a href="https://github.com/Infocatcher/Private_Tab/issues/93">#93</a>)<br>
`x` Fixed: malformed private-protocol URLs reliably crash the browser (<a href="https://github.com/Infocatcher/Private_Tab/issues/94">#94</a>)<br>

##### 0.1.4 (2013-08-19)
`x` Fixed empty tabs tooltips on Firefox 25.0a1+ (<a href="https://github.com/Infocatcher/Private_Tab/issues/75">#75</a>)<br>
`+` Added ability to view source of private tabs (<a href="https://github.com/Infocatcher/Private_Tab/issues/74">#74</a>)<br>
`x` Corrected “(private tab)” label in <a href="https://addons.mozilla.org/addon/tab-scope/">Tab Scope</a>'s popup (<a href="https://github.com/Infocatcher/Private_Tab/issues/78">#78</a>)<br>
`+` Added Indonesian (id) locale, thanks to <a href="https://addons.mozilla.org/user/daisukeDan/">Daisuke Bjm Project</a><br>
`+` Added Ukrainian (uk) locale, thanks to <a href="https://addons.mozilla.org/user/dbv92/">dbv92</a><br>
`+` Added Arabic (ar) locale, thanks to <a href="https://addons.mozilla.org/user/slax/">infinity</a><br>
`*` Improved compatibility with extensions like <a href="https://addons.mozilla.org/addon/fast-dial-5721/">Fast Dial</a> (<a href="https://github.com/Infocatcher/Private_Tab/issues/84">#84</a>)<br>
`x` Fixed incompatibility with <a href="https://addons.mozilla.org/addon/tile-tabs/">Tile Tabs</a> 10.0 (<a href="https://github.com/Infocatcher/Private_Tab/issues/83">#83</a>)<br>
`x` Corrected for changes in Mozilla bug <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=885177">#885177</a> (<a href="https://github.com/Infocatcher/Private_Tab/issues/85">#85</a>)<br>
`*` Preserve text in URL Bar after auto reloading (<a href="https://github.com/Infocatcher/Private_Tab/issues/86">#86</a>)<br>
`*` Improved behavior after closing of private tabs (<em>extensions.privateTab.rememberOwnerTab</em> preference) (<a href="https://github.com/Infocatcher/Private_Tab/issues/87">#87</a>)<br>
`+` Implemented “private” protocol: now we can use special URLs to open private tabs from bookmarks or from command line (example: private:///#https://addons.mozilla.org/, may be disabled using <em>extensions.privateTab.enablePrivateProtocol</em> preference) (<a href="https://github.com/Infocatcher/Private_Tab/issues/89">#89</a>)<br>
`+` Added ability to show “New Private Tab” button after “New Tab” button (<a href="https://github.com/Infocatcher/Private_Tab/issues/90">#90</a>)<br>
`*` Added ability to invert auto reload behavior (<em>extensions.privateTab.toggleTabPrivateAutoReload</em> preference) using middle-click (or left-click with any modifier)<br>

##### 0.1.3 (2013-06-13)
`+` Added ability to prevent private session from ending (in case of active downloads etc.) (<a href="https://github.com/Infocatcher/Private_Tab/issues/53">#53</a>)<br>
`x` Fixed possible memory leak (only if someone use privateTab.readyToOpenTabs() without following privateTab.stopToOpenTabs())<br>
`x` Fixed: small images from private tabs (displayed with favicons) are cached to disk (<a href="https://github.com/Infocatcher/Private_Tab/issues/56">#56</a>)<br>
`x` Disabled thumbnails capturing from private tabs (<a href="https://github.com/Infocatcher/Private_Tab/issues/58">#58</a>)<br>
`+` Added <em>extensions.privateTab.debug.verbose</em> preference to log some additional debug information into Error Console<br>
`x` Fixed conflict with <a href="https://addons.mozilla.org/addon/nosquint/">NoSquint</a> extension (<a href="https://github.com/Infocatcher/Private_Tab/issues/61">#61</a>)<br>
`*` Small performance improvements<br>
`*` Improved localizability of confirmation dialog in case of extension disabling or uninstalling<br>
`+` Added locales:<br>
	Catalan (ca), thanks to <a href="https://github.com/Dimas-sc">Dimas-sc</a><br>
	Hungarian (hu), thanks to <a href="https://github.com/evenorbert">evenorbert</a><br>
	Italian (it), thanks to <a href="https://github.com/moretti">moretti</a><br>
	Portuguese (Brazilian) (pt-BR), thanks to <a href="http://www.babelzilla.org/forum/index.php?showuser=212">Ghelman</a><br>
	Serbian (sr), thanks to <a href="http://www.babelzilla.org/forum/index.php?showuser=8719">DakSrbija</a><br>
	Spanish (es), thanks to <a href="https://github.com/strel">strel</a><br>
`*` Updated locales:<br>
	Chinese (Simplified) (zh-CN), thanks to <a href="https://github.com/Cye3s">Cye3s</a><br>
	Chinese (Traditional) (zh-TW), thanks to <a href="https://github.com/ikurrina">ikurrina</a><br>
	Estonian (et), thanks to <a href="https://github.com/mdr-ksk">mdr-ksk</a><br>
	French (fr) from babelzilla.org (yes, not complete)<br>
	German (de), thanks to <a href="https://github.com/sierkb">sierkb</a><br>
	Greek (el), thanks to <a href="http://www.babelzilla.org/forum/index.php?showuser=15362">Grg68</a><br>
	Japanese (jp), thanks to <a href="https://github.com/charishi">charishi</a><br>
	Polish (pl), thanks to <a href="https://github.com/marcinsu">marcinsu</a><br>

##### 0.1.2 (2013-05-01)
`+` Added Polish locale (pl), thanks to <a href="https://github.com/marcinsu">marcinsu</a><br>
`*` Corrected: don't inherit private state for new tabs and new windows, opened from external application (<em>extensions.privateTab.allowOpenExternalLinksInPrivateTabs</em> preference) (<a href="https://github.com/Infocatcher/Private_Tab/issues/42">#42</a>)<br>
`x` Correctly detect new windows from JavaScript's window.open() with size parameters as not empty<br>
`x` Correct appearance for selected private on Mac OS X (<a href="https://github.com/Infocatcher/Private_Tab/issues/44">#44</a>)<br>
`x` Fixed: remove wrappers when window is closed to avoid memory leaks (<a href="https://github.com/Infocatcher/Private_Tab/issues/45">#45</a>, <a href="https://github.com/Infocatcher/Private_Tab/issues/46">#46</a>)<br>
`+` Added Estonian locale (et), thanks to <a href="http://forums.mozillazine.org/memberlist.php?mode=viewprofile&amp;u=2361677">mdr.ksk</a><br>
`x` Fixed: hotkey isn't shown in File menu on Mac OS X <a href="https://github.com/Infocatcher/Private_Tab/issues/47">#47</a><br>
`+` Added <em>extensions.privateTab.keysHighPriority</em> preference to handle key* event in the capturing (true) or bubbling (false) phase, see http://www.w3.org/TR/DOM-Level-3-Events/#event-flow<br>
`*` Corrected Chinese (Traditional) locale (zh-TW), thanks to <a href="https://github.com/marcinsu">ikurrina</a><br>
`+` Added ability to close all private tabs after extension will be disabled or uninstalled (<a href="https://github.com/Infocatcher/Private_Tab/issues/51">#51</a>)<br>

##### 0.1.1 (2013-04-24)
`+` Added French locale (fr), thanks to <a href="https://github.com/Stis">Stis</a><br>
`+` Added Chinese (Simplified) locale (zh-CN), thanks to <a href="https://github.com/Cye3s">Cye3s</a><br>
`x` Fixed memory leak on extension disabling (due to not deleted window.privateTab) (<a href="https://github.com/Infocatcher/Private_Tab/issues/33">#33</a>)<br>
`+` Added Vietnamese locale (vi), thanks to <a href="https://github.com/leof36">Leof36</a><br>
`+` Added German locale (de), thanks to <a href="https://github.com/sierkb">sierkb</a><br>
`*` Improved compatibility with extensions like <a href="https://addons.mozilla.org/addon/personal-menu/">Personal Menu</a> (<a href="https://github.com/Infocatcher/Private_Tab/issues/35">#35</a>)<br>
`+` Detect <a href="https://addons.mozilla.org/addon/super-start/">Super Start</a> page as blank<br>
`*` Improved: now private tabs aren't saved in sessions (<a href="https://github.com/Infocatcher/Private_Tab/issues/36">#36</a>)<br>
`*` Improved: show downloads from private tabs in not private window (<a href="https://github.com/Infocatcher/Private_Tab/issues/31">#31</a>)<br>
`*` Better tooltip for private tabs on themes with dark tooltip background (<a href="https://github.com/Infocatcher/Private_Tab/issues/38">#38</a>)<br>
`+` Added Greek locale (el), thanks to <a href="http://forums.mozillazine.org/memberlist.php?mode=viewprofile&u=1595963">Grg68</a><br>

##### 0.1.0 (2013-04-09)
`*` Will be used built-in title modifier in latest SeaMonkey 2.19a1+ (2013-03-27+)<br>
`*` Correctly detect built-in private windows in latest SeaMonkey 2.19a1+ (2013-03-27+)<br>
`x` Correctly restore window title in SeaMonkey on extension disabling<br>
`+` Added ability to open all new blank/empty tabs in private mode (experimental, preferences: <em>extensions.privateTab.makeNewEmptyTabsPrivate</em>, <em>extensions.privateTab.makeNewEmptyWindowsPrivate</em>)<br>
`+` Added Chinese (Traditional) locale (zh-TW), thanks to arbiger<br>
`+` Added Japanese locale (ja), thanks to charishi<br>
`x` Workaround for browser.newtab.preload = true<br>
`x` Correctly fix App button width: wait for third-party styles<br>
`x` Fixed: toggle tab private hotkey works for wrong tab sometimes<br>
`*` Allow setup multiple hotkeys for one command: <em>extensions.privateTab.key.</em>%command%<em>#</em>%alias_name%<br>
`x` Fixed (hopefully): hotkeys doesn't work on non-Latin keyboard layouts<br>
`*` Small optimizations<br>

##### 0.1.0b4 (2013-03-26)
`+` Detect Speed Dial and FVD Speed Dial pages as blank<br>
`+` Added “privateTab-isPrivate” attribute to private window (may be used in user styles)<br>
`+` Added toolbar button<br>
`x` Correctly undo close not private tabs in private windows<br>
`+` Don't save closed private tabs in undo close history (<em>extensions.privateTab.rememberClosedPrivateTabs</em> preference)<br>
`+` Added <em>extensions.privateTab.sendRefererHeader</em> preference<br>
`x` Drag-and-drop: correctly change private state of already existing tabs<br>
`*` Drag-and-drop: make new (or target) tab private, if source or target are private (<em>extensions.privateTab.dragAndDropBehavior</em> preference)<br>
`+` Implemented API for other extensions<br>
`+` Reload tab after private state has been changed from context menu (<em>extensions.privateTab.toggleTabPrivateAutoReload</em> preference)<br>

##### 0.1.0b3 (2013-03-19)
`+` Allow drag-and-drop tabs between private and not private windows (<em>extensions.privateTab.dragAndDropTabsBetweenDifferentWindows</em> preference)<br>
`x` Correctly open link in new private tab: in previous versions tab aren't saved in the history, but was used not private cookies<br>

##### 0.1.0b2 (2013-03-17)
`*` Always open not private tab using “Open in a New Tab” in bookmark context menu: now we have “Open in a New Private Tab”, so this is more intuitive<br>
`x` Hide hotkeys text from App menu and don't break hetkey text hiding for built-in “New Private Window” item (<a href="https://github.com/Infocatcher/Private_Tab/issues/3">#3</a>)<br>
`x` Correctly update hotkeys in multiple windows after <em>extensions.privateTab.key.*</em> preferences changes<br>
`x` Fix drop from private tab in private window<br>
`+` Added <em>extensions.privateTab.dragAndDropUseTargetPrivateState</em> preference to use target private state for dropped link-like things (<a href="https://github.com/Infocatcher/Private_Tab/issues/4">#4</a>)<br>
`*` Some internal improvements<br>

##### 0.1.0b2pre (2013-03-14)
`*` Use better way to fix App button width<br>
`*` Update placeholder for App button, if width can't be fixed<br>
`+` Added context menu item for bookmarks (<a href="https://github.com/Infocatcher/Private_Tab/issues/2">#2</a>)<br>

##### 0.1.0b1 (2013-03-13)
`*` Inherit private state from source tab for any dropped link-like thing<br>
`+` Experimental: add menu items to built-in private window too<br>
`*` Allow open new not private window from private tab (using “New Window” command)<br>
`+` Support for built-in “Open Link in Private Window” in SeaMonkey 2.19a1<br>
`*` Fix App button width: the same width for private and not private state (<em>extensions.privateTab.fixAppButtonWidth</em> preference)<br>
`x` Correctly change visibility of built-in “Open Link in New Tab/Window”<br>
`*` Open new private tab with focused URL bar<br>

##### 0.1.0a3 (2013-02-20)
`*` First public release<br>