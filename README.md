Works only in Gecko 20.0 and higher because used API doesn't exist in older versions!

##### Known issues:
We just inherit private state from selected tab and tries preserve private state of dropped link-like things, this is simple to implement, but may confuse a bit…

##### API for other extensions:
You can listen for following events:
<table>
<thead>
<tr><th>event.type               </th><th>event.target</th><th>event.detail                      </th><th>Description                       </th></tr>
</thead>
<tbody>
<tr><td>PrivateTab:PrivateChanged</td><td>tab         </td><td>1 – private tab<br>0 – not private</td><td>Changed private state of the tab  </td></tr>
<tr><td>PrivateTab:OpenInNewTab  </td><td>tab         </td><td align="center">–                  </td><td>Link was opened in new private tab</td></tr>
<tr><td>PrivateTab:OpenNewTab    </td><td>tab         </td><td align="center">–                  </td><td>Opened new (empty) private tab    </td></tr>
</tbody>
</table>

So if you want change private state of tab, use something like following:
```javascript
var tab = gBrowser.selectedTab;
//var privacyContext = tab.linkedBrowser
//	.contentWindow
//	.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
//	.getInterface(Components.interfaces.nsIWebNavigation)
//	.QueryInterface(Components.interfaces.nsILoadContext);
Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
var privacyContext = PrivateBrowsingUtils.privacyContextFromWindow(tab.linkedBrowser.contentWindow);
var isPrivate = privacyContext.usePrivateBrowsing = !privacyContext.usePrivateBrowsing;
// https://github.com/Infocatcher/Private_Tab#api-for-other-extensions
var evt = document.createEvent("UIEvent");
evt.initUIEvent("PrivateTab:PrivateChanged", true, false, window, +isPrivate);
tab.dispatchEvent(evt);
```
(new opened private tabs should be detected automatically)