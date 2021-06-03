Works only in Gecko 20.0 and higher because used API doesn't exist in older versions!

#### WebExtensions and compatibility with Firefox 57+
<a href="https://github.com/Infocatcher/Private_Tab/issues/254">Issue #254</a> + <a href="https://github.com/Infocatcher/Private_Tab_WE#issues">Private Tab WE</a> repository

#### Known issues:
* We just inherit private state from selected tab and tries preserve private state of dropped link-like things, this is simple to implement, but may confuse a bit…
* If you use "New Private Tab" + "New Tab" buttons after tabs toolbar, you need to manually remove "New Private Tab" button before disabling or uninstalling Private Tab. Or you can remove "New Tab" button, press OK in Customize Toolbar dialog and then place "New Tab" directly after tabs.
* Can't open new private tab, if installed <a href="https://addons.mozilla.org/addon/scriptify/">Scriptify</a>-based extension: please use <a href="https://addons.mozilla.org/addon/greasemonkey/">Greasemonkey</a> or <a href="https://addons.mozilla.org/addon/scriptish/">Scriptish</a> instead (<a href="https://github.com/Infocatcher/Private_Tab/issues/110">#110</a>).
* In Firefox 52+ `private:…` URI may be opened only in new tab due to fix for <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1318388">bug 1318388</a> (<a href="https://github.com/Infocatcher/Private_Tab/issues/251">#251</a>).

#### Styles:
You can use `.tabbrowser-tab[privateTab-isPrivate]` (private tab), `#main-window[privateTab-selectedTabIsPrivate]` (selected tab is private) and `#main-window[privateTab-isPrivate]` (built-in private window) selectors in styles for <a href="http://kb.mozillazine.org/UserChrome.css">userChrome.css</a>/<a href="https://addons.mozilla.org/addon/stylish/">Stylish</a>.
<br>Example styles:
* <a href="https://github.com/Infocatcher/UserStyles/blob/master/Private_Tab_underline">change underline of private tabs</a>
* <a href="https://github.com/Infocatcher/UserStyles/blob/master/Private_Tab_icon">change icon</a>
* <a href="https://github.com/Infocatcher/UserStyles/blob/master/Private_Tab_background">change background color</a>
* <a href="https://github.com/Infocatcher/UserStyles/blob/master/Private_Tab_overlay_icon">add overlay icon</a>
* <a href="https://github.com/Infocatcher/UserStyles/blob/master/Private_Tab_menu_icons">add icons to menu items</a>
* <a href="https://github.com/Infocatcher/UserStyles/blob/master/Private_Tab_hide_items">hide some menu items</a>

#### Options
See <em>extensions.privateTab.</em>\* preferences in <a href="http://kb.mozillazine.org/About:config">about:config</a> page, some descriptions can be found in <a href="https://github.com/Infocatcher/Private_Tab/blob/master/defaults/preferences/prefs.js">defaults/preferences/prefs.js</a>.

* <em>extensions.privateTab.sendRefererHeader</em>
<br>`0` – don't send <a href="https://en.wikipedia.org/wiki/HTTP_referer">HTTP referer</a> when URI is opened in new private tab
<br>`1` – send only if private tab opened from another private tab
<br>`2` – always send (as Firefox itself do for “Open Link in New Private Window”)

* <em>extensions.privateTab.usePrivateWindowStyle</em>
<br>`true` – use style of private window, if current tab is private
<br>`false` – only show private state of window (regardless of current tab private state)

##### Keyboard shortcuts:
You can modify keyboard shortcuts through <a href="http://kb.mozillazine.org/About:config">about:config</a> page, see notes about <em>extensions.privateTab.key.</em>\* preferences in <a href="https://github.com/Infocatcher/Private_Tab/blob/master/defaults/preferences/prefs.js">defaults/preferences/prefs.js</a>.

#### Troubleshooting:
Try <a href="https://support.mozilla.org/en-US/kb/profile-manager-create-and-remove-firefox-profiles">new clean Firefox profile</a> to ensure that there are no conflicts with another extensions or some specific configuration.
##### Debug logs:
Options in <a href="http://kb.mozillazine.org/About:config">about:config</a>:
* <em>extensions.privateTab.debug</em> – enable debug logs
* <em>extensions.privateTab.debug.verbose</em> – additionally enable detailed debug logs (not needed in most cases)

Then use <a href="https://developer.mozilla.org/en-US/docs/Tools/Browser_Console">Browser Console</a> (formerly <a href="https://developer.mozilla.org/en-US/docs/Error_Console">Error Console</a>, Ctrl+Shift+J) to see messages like `[Private Tab] …`.

#### API for other extensions:
##### Events:
You can listen for following events:
<table>
<thead>
<tr>
	<th>event.type</th>
	<th>event.target</th>
	<th>event.detail</th>
	<th>Description</th>
</tr>
</thead>
<tbody>
	<tr>
		<td>PrivateTab:PrivateChanged</td>
		<td>tab</td>
		<td>1 – private tab<br>0 – not private</td>
		<td>Changed private state of the tab<br><strong>event.explicitOriginalTarget</strong> – initial tab in case of toggling using duplication (Firefox 51+, Private Tab 0.2.1.3+)</td>
	</tr>
	<tr>
		<td>PrivateTab:OpenInNewTab</td>
		<td>tab</td>
		<td>1 – may be opened as child tab</td>
		<td>Link was opened in new private tab</td>
	</tr>
	<tr>
		<td>PrivateTab:OpenNewTab</td>
		<td>tab</td>
		<td>1 – opened using middle-click<br>(or left-click with any modifier)</td>
		<td>Opened new (empty) private tab</td>
	</tr>
</tbody>
</table>

##### API functions:
boolean [privateTab.isTabPrivate](#privatetabistabprivate)(in DOMNode tab)
<br>void [privateTab.isTabPrivateAsync](#privatetabistabprivateasync)(in DOMNode tab, in function callback[, in object context])
<br>boolean [privateTab.toggleTabPrivate](#privatetabtoggletabprivate)(in DOMNode tab[, in boolean isPrivate])
<br>DOMNode [privateTab.duplicateTabAndTogglePrivate](#privatetabduplicatetabandtoggleprivate)(in DOMNode tab[, in boolean isPrivate])
<br>DOMNode [privateTab.replaceTabAndTogglePrivate](#privatetabreplacetabandtoggleprivate)(in DOMNode tab[, in boolean isPrivate[, in function onSuccessCallback]])
<br>void [privateTab.readyToOpenTab](#privatetabreadytoopentab)(in boolean isPrivate)
<br>void [privateTab.readyToOpenTabs](#privatetabreadytoopentabs)(in boolean isPrivate)
<br>boolean [privateTab.hasClosedTabs](#privatetabhasclosedtabs)
<br>void [privateTab.forgetClosedTabs](#privatetabforgetclosedtabs)()
<br>boolean [privateTab.tabLabelIsEmpty](#privatetabtablabelisempty)(in string tabLabel[, in boolean isEmpty])

###### privateTab.isTabPrivate()
Investigates that the tab are private (`true`) or not (`false`), example:
```js
// Close all (visible) private tabs:
Array.slice(gBrowser.visibleTabs || gBrowser.tabs).forEach(function(tab) {
	if(privateTab.isTabPrivate(tab))
		gBrowser.removeTab(tab);
});
```
###### privateTab.isTabPrivateAsync()
The same as [privateTab.isTabPrivate](#privatetabistabprivate), but get real state of `nsILoadContext.usePrivateBrowsing` in multi-process mode (Electrolysis aka e10s), Private Tab 0.2.1+.
<br>Not needed in most cases!
```js
// Asynchronously get privacy state of given tab.
// In most cases should be replaced with synchronous privateTab.isTabPrivate()
privateTab.isTabPrivateAsync(gBrowser.selectedTab, function(isPrivate) {
	alert("Selected tab is " + (isPrivate ? "private" : "not private"));
});
```
###### privateTab.toggleTabPrivate()
Changes tab private state:
<br>Toggle: `privateTab.toggleTabPrivate(tab)`
<br>Make private: `privateTab.toggleTabPrivate(tab, true)`
<br>Make not private: `privateTab.toggleTabPrivate(tab, false)`
```js
// Make all (visible) tabs private:
Array.forEach(
	gBrowser.visibleTabs || gBrowser.tabs,
	function(tab) {
		if(!privateTab.isTabPrivate(tab))
			privateTab.toggleTabPrivate(tab, true);
	}
);
```
###### privateTab.duplicateTabAndTogglePrivate()
Duplicate already opened tab in private or non-private tab.
```js
// Duplicate selected tab and toggle private state of duplicated tab
var tab = gBrowser.selectedTab;
var pos = "_tPos" in tab
	? tab._tPos
	: Array.prototype.indexOf.call(gBrowser.tabs, tab); // SeaMonkey
var dupTab = gBrowser.selectedTab = privateTab.duplicateTabAndTogglePrivate(tab);
gBrowser.moveTabTo(dupTab, pos + 1); // Place right after initial tab
```
###### privateTab.replaceTabAndTogglePrivate()
Changes tab private state using tab duplication (for Firefox 52+):
```js
// Duplicate selected tab, toggle private state of duplicated tab and then close initial tab
privateTab.replaceTabAndTogglePrivate(gBrowser.selectedTab);
// The same as above + also load new URL into duplicated tab (Private Tab 0.2.3+)
privateTab.replaceTabAndTogglePrivate(gBrowser.selectedTab, undefined, function onSuccess(dupTab) {
	dupTab.linkedBrowser.loadURI("https://example.com/");
});
```
###### privateTab.readyToOpenTab()
Allows to open private or not private tab (independent of any inheritance mechanism), example:
```js
// Open in private tab:
privateTab.readyToOpenTab(true);
gBrowser.addTab("https://mozilla.org/");
```
```js
// Open in not private tab:
privateTab.readyToOpenTab(false);
gBrowser.addTab("https://mozilla.org/");
```
###### privateTab.readyToOpenTabs()
Allows to open many private or not private tabs (independent of any inheritance mechanism), example:
```js
// Open in private tabs:
privateTab.readyToOpenTabs(true);
gBrowser.addTab("https://mozilla.org/");
gBrowser.addTab("https://addons.mozilla.org/");
// ...
privateTab.stopToOpenTabs();
```
###### privateTab.hasClosedTabs
Only for <em>extensions.privateTab.rememberClosedPrivateTabs</em> = true, Private Tab 0.1.7.4+.
<br>Return true, if there is at least one private tab in undo close list, example:
```js
if(privateTab.hasClosedTabs)
	alert("We have at least one closed private tabs");
else
	alert("We don't have closed private tabs");
```
###### privateTab.forgetClosedTabs()
Only for <em>extensions.privateTab.rememberClosedPrivateTabs</em> = true, Private Tab 0.1.7.4+.
<br>Forget about all closed private tabs in window, example:
```js
// Forget about all closed private tabs in window
privateTab.forgetClosedTabs();
```
###### privateTab.tabLabelIsEmpty()
Mark tab label as empty (or non-empty), example:
```js
// Mark tab label/URI as empty:
if("tabLabelIsEmpty" in privateTab) // Private Tab 0.1.7.2+
	privateTab.tabLabelIsEmpty("chrome://speeddial/content/speeddial.xul", true);
```
```js
// Check state:
var isEmpty = privateTab.tabLabelIsEmpty("chrome://speeddial/content/speeddial.xul");
```
```js
// Restore state (e.g. for restartless extensions):
privateTab.tabLabelIsEmpty("chrome://speeddial/content/speeddial.xul", false);
```
Note: used global storage for labels (not per-window)! So, it's enough to call this function only once.

##### Backward compatibility:
Check for Private Tab installed (and enabled):
```js
if("privateTab" in window) {
	// Do something with "privateTab" object
}
```

##### Code examples:
Open link in private tab using <a href="https://addons.mozilla.org/addon/firegestures/?src=search">FireGestures</a> extension:
```js
// Remember the active tab's position
var tab = gBrowser.selectedTab;
var pos = "_tPos" in tab
	? tab._tPos
	: Array.prototype.indexOf.call(gBrowser.tabs, tab); // SeaMonkey
// Get the DOM node at the starting point of gesture
var srcNode = FireGestures.sourceNode;
// Get the link URL inside the node
var linkURL = FireGestures.getLinkURL(srcNode);
if (!linkURL)
    throw "Not on a link";
// Check the URL is safe
FireGestures.checkURL(linkURL, srcNode.ownerDocument);
// Open link in new private tab
privateTab.readyToOpenTab(true);
var newPrivateTab = gBrowser.addTab(linkURL);
gBrowser.moveTabTo(newPrivateTab, pos + 1); // Place right after initial tab
```