Works only in Gecko 20.0 and higher because used API doesn't exist in older versions!

#### Known issues:
* We just inherit private state from selected tab and tries preserve private state of dropped link-like things, this is simple to implement, but may confuse a bit…
* If you use "New Private Tab" + "New Tab" buttons after tabs toolbar, you need to manually remove "New Private Tab" button before disabling or uninstalling Private Tab. Or you can remove "New Tab" button, press OK in Customize Toolbar dialog and then place "New Tab" directly after tabs.

#### Styles:
You can use `.tabbrowser-tab[privateTab-isPrivate]` (private tab) and `#main-window[privateTab-isPrivate]` (built-in private window) selectors in styles for <a href="http://kb.mozillazine.org/UserChrome.css">userChrome.css</a>/<a href="https://addons.mozilla.org/addon/stylish/">Stylish</a>.
<br>Example styles:
* <a href="https://github.com/Infocatcher/UserStyles/blob/master/Private_Tab_underline">change underline of private tabs</a>
* <a href="https://github.com/Infocatcher/UserStyles/blob/master/Private_Tab_icon">change icon</a>
* <a href="https://github.com/Infocatcher/UserStyles/blob/master/Private_Tab_background">change background color</a>
* <a href="https://github.com/Infocatcher/UserStyles/blob/master/Private_Tab_overlay_icon">add overlay icon</a>
* <a href="https://github.com/Infocatcher/UserStyles/blob/master/Private_Tab_menu_icons">add icons to menu items</a>

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
		<td>Changed private state of the tab</td>
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
<br>boolean [privateTab.toggleTabPrivate](#privatetabtoggletabprivate)(in DOMNode tab[, in boolean isPrivate])
<br>void [privateTab.readyToOpenTab](#privatetabreadytoopentab)(in boolean isPrivate)
<br>void [privateTab.readyToOpenTabs](#privatetabreadytoopentabs)(in boolean isPrivate)

###### privateTab.isTabPrivate()
Investigates that the tab are private (`true`) or not (`false`), example:
```javascript
// Close all (visible) private tabs:
Array.slice(gBrowser.visibleTabs || gBrowser.tabs).forEach(function(tab) {
	if(privateTab.isTabPrivate(tab))
		gBrowser.removeTab(tab);
});
```
###### privateTab.toggleTabPrivate()
Changes tab private state:
<br>Toggle: `privateTab.toggleTabPrivate(tab)`
<br>Make private: `privateTab.toggleTabPrivate(tab, true)`
<br>Make not private: `privateTab.toggleTabPrivate(tab, false)`
```javascript
// Make all (visible) tabs private:
Array.forEach(
	gBrowser.visibleTabs || gBrowser.tabs,
	function(tab) {
		if(!privateTab.isTabPrivate(tab))
			privateTab.toggleTabPrivate(tab, true);
	}
);
```
###### privateTab.readyToOpenTab()
Allows to open private or not private tab (independent of any inheritance mechanism), example:
```javascript
// Open in private tab:
privateTab.readyToOpenTab(true);
gBrowser.addTab("https://mozilla.org/");
```
```javascript
// Open in not private tab:
privateTab.readyToOpenTab(false);
gBrowser.addTab("https://mozilla.org/");
```
###### privateTab.readyToOpenTabs()
Allows to open many private or not private tabs (independent of any inheritance mechanism), example:
```javascript
// Open in private tabs:
privateTab.readyToOpenTabs(true);
gBrowser.addTab("https://mozilla.org/");
gBrowser.addTab("https://addons.mozilla.org/");
// ...
privateTab.stopToOpenTabs();
```

##### Backward compatibility:
Check for Private Tab installed (and enabled):
```javascript
if("privateTab" in window) {
	// Do something with "privateTab" object
}
```