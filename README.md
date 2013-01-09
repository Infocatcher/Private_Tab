Works only in Gecko 20.0 and higher because used API doesn't exist in older versions!

##### Known issues:
* We just inherit private state from selected tab (always!), this is simple to implement, but may confuse a bit…
* <del>Hotkeys works only in new windows (or after restart), this is limitation of used <a href="https://developer.mozilla.org/en-US/docs/XUL/key">API</a>.</del> * 7ceb95f5565e477c1e7961a118a37351634bb750