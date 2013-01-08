Works only in Gecko 20.0 and higher!

##### Known issues:
* We just inherit private state from selected tab (always!), this is simple to implement, but may confuse a bit…
* Hotkeys works only in new windows (or after restart), this is limitation of used <a href="https://developer.mozilla.org/en-US/docs/XUL/key">API</a>.