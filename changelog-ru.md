#### Private Tab: История изменений

`+` - добавлено<br>
`-` - удалено<br>
`x` - исправлено<br>
`*` - улучшено<br>

##### master/HEAD
`x` Исправлено использование nsISessionStore в Firefox 61+(<a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1450559">bug 1450559</a>, <a href="https://forum.mozilla-russia.org/viewtopic.php?pid=756422#p756422">спасибо Dumby</a>).<br>
`x` Исключены попытки обновления удаленного функционала для вкладок в заголовке окна в Firefox 61+.<br>
`x` Теперь используется `BrowserWindowTracker.getTopWindow()` вместо удаленного `RecentWindow.getMostRecentBrowserWindow()` в Firefox 61+, <a href="https://forum.mozilla-russia.org/viewtopic.php?pid=756915#p756915">спасибо Dumby</a>.<br>
`x` Исправлено определение XULElement в Firefox 61+.<br>
`x` Теперь используется nsIFaviconService вместо удаленного mozIAsyncFavicons в Firefox 62+.<br>
`x` Исправлена работа <em>extensions.privateTab.rememberClosedPrivateTabs</em> = true в Firefox 57+.<br>
`x` Исправлено определение новых пустых вкладок в Firefox 58+ (<a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1409784">bug 1409784</a>).<br>
`x` Исключены попытки обновления удаленного TrackingProtection.icon в Firefox 63+.<br>
`x` Исправления для совместимости с Pale Moon 28.1+ и Basilisk.<br>
`x` Исправлена подсветка закрытых приватных вкладок в меню.<br>
`x` Исправлена кнопка после последней вкладки в Firefox 65+ (теперь доступна только через getAnonymousElementByAttribute(), также теперь используется специальный атрибут вместо использования трюка c [currentset*=…] в стилях).<br>
`x` Исправлен приватный протокол в Firefox 63+: восстановлено обновление иконки закладки без nsIContentFrameMessageManager (<a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1475727">bug 1475727</a>).<br>
`x` Исправлена валидация about:… ссылок типа private:about:newtab.<br>
`x` Исправлено контекстное меню в Firefox 64+, теперь передается triggeringPrincipal для открытия ссылок в приватных вкладках.<br>

##### 0.2.3pre (2018-03-23)
`x` Добавлен хак для перетаскивания приватной вкладки в другое окно (при отключенном мультипроцессном режиме, <a href="https://forum.mozilla-russia.org/viewtopic.php?pid=737516#p737516">спасибо Dumby</a>) (<a href="https://github.com/Infocatcher/Private_Tab/issues/242">#242</a>).<br>
`+` Добавлена Dutch локаль (nl), спасибо <a href="https://github.com/TonnesM">TonnesM</a> (<a href="https://github.com/Infocatcher/Private_Tab/pull/268">#268</a>).<br>
`+` Добавлена болгарская локаль (bg), спасибо <a href="https://github.com/spacy01">Peyu Yovev</a> (<a href="https://github.com/Infocatcher/Private_Tab/pull/270">#270</a>, <a href="https://github.com/Infocatcher/Private_Tab/pull/271">#271</a>, <a href="https://github.com/Infocatcher/Private_Tab/pull/272">#272</a>).<br>
`+` Обновлена арабская (ar) локаль, спасибо <a href="https://github.com/tahani5">tahani5</a>.<br>
`*` Улучшен внешний вид кнопки после последней вкладки в Firefox 57+ (для <em>extensions.legacy.enabled</em> = true, также добавлена настройка <em>extensions.privateTab.fixAfterTabsButtonsAccessibility.force</em>).<br>
`*` Корректировки для совместимости с Basilisk.<br>
`x` Исправлено использование функций-генераторов в Firefox 58+ (<a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1083482">bug 1083482</a>).<br>
`x` Исправлены строковые настройки в Firefox 58+ (<a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1414096">bug 1414096</a>).<br>
`x` Исправлен приватный протокол в Firefox 58+ (странное поведение с __defineGetter__(), доступный только для чтения nsIURI.spec) (<a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1431204">bug 1431204</a>).<br>
`x` Исправлено использование inIDOMUtils в Firefox 59+, теперь используется window.InspectorUtils  (<a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1427419">bug 1427419</a>).<br>
`x` Исправлена обработка первого окна браузера в Firefox 60+ (<em>browser.startup.blankWindow</em> = true, <a href="https://forum.mozilla-russia.org/viewtopic.php?pid=755523#p755523">спасибо Dumby</a>) (<a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1336227">bug 1336227</a>).<br>
`x` Исправлены горячие клавиши в Firefox 60+, добавлена замена для удаленного nsIDOMKeyEvent <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1436508">bug 1436508</a>.<br>
`x` Исправлена работа с внутренними данными DownloadsCommon.jsm в Firefox 57+.<br>

##### 0.2.2 (2017-05-27)
`*` Обновлено и откорректировано API-событие `PrivateTab:PrivateChanged` <a href="https://github.com/Infocatcher/Private_Tab#events">API event</a>: добавлена возможность отслеживания переключения с помощью дублирования вкладки в Firefox 51+ (<a href="https://github.com/Infocatcher/Private_Tab/issues/244">#244</a>).<br>
`*` Переключение приватности через клонирование вкладки: теперь делается попытка восстановить текст в адресной строке (<a href="https://github.com/Infocatcher/Private_Tab/issues/237">#237</a>).<br>
`x` Исправлен приватный протокол в Firefox 37-43 (возникало исключение в `nsIIOService.newChannelFromURIWithLoadInfo(…, null)`) (<a href="https://github.com/Infocatcher/Private_Tab/issues/247">#247</a>).<br>
`+` Обновлена индонезийская (id) локаль, спасибо <a href="https://github.com/DhannyNara">Muhammad Anwari Ramadhan</a>.<br>
`x` Исправлена возможность открытия новой приватной вкладки в Firefox 54+ (с <em>browser.newtab.preload</em> = true) (<a href="https://github.com/Infocatcher/Private_Tab/issues/252">#252</a>).<br>
`+` Добавлен API <a href="https://github.com/Infocatcher/Private_Tab#privatetabreplacetabandtoggleprivate">privateTab.replaceTabAndTogglePrivate()</a>.<br>
`x` Исправлена возможность открытия private:… ссылок в уже открытых вкладках (будет использоваться обходной путь с клонированием вкладки) (<a href="https://github.com/Infocatcher/Private_Tab/issues/251">#251</a>).<br>

##### 0.2.1.2 (2017-01-27)
`x` Исправлено переключение приватности выгруженных вкладок в Firefox 51+ (<a href="https://github.com/Infocatcher/Private_Tab/issues/237">#237</a>).<br>
`x` Добавлен запрет переключения приватности еще не загруженных вкладок в 51+ во избежание повреждения содержимого вкладок: добавлено ожидание загрузки и предотвращаются слишком частые вызовы переключения (<a href="https://github.com/Infocatcher/Private_Tab/issues/237">#237</a>).<br>
`x` Исправлено удаление оберток для функций из других расширений типа `window.TabScope._updateTitle()` в Firefox 45+ (теперь для расширений используется «песочница», и будет использован трюк для получения ссылки на актуальный объект `window` для сохранения внутренних данных).<br>
`x` Исправлено переключение приватности вкладок при выключенном мультипроцессном режиме в Firefox 51+ (<a href="https://github.com/Infocatcher/Private_Tab/issues/237">#237</a>, <a href="https://github.com/Infocatcher/Private_Tab/issues/241">#241</a>).<br>
`x` Исправлено переключение приватности закрепленных вкладок в Firefox 51+ (добавлено восстановление закрепленности) (<a href="https://github.com/Infocatcher/Private_Tab/issues/237">#237</a>).<br>

##### 0.2.1.1 (2017-01-21)
`x` Исправлено обновление заголовка и внешнего вида окна при переключении приватности активной не мультипроцессной вкладки (восстановлении не мультипроцессной приватной вкладки) в Firefox 51+ (<a href="https://github.com/Infocatcher/Private_Tab/issues/237">#237</a>, <a href="https://github.com/Infocatcher/Private_Tab/issues/239">#239</a>).<br>
`x` При отключении расширения закрытые приватные вкладки теперь не сохраняются в списке для восстановления (<em>extensions.privateTab.rememberOwnerTab</em> = true).<br>
`x` Подкорректировано переключение приватности уже открытых вкладок в Firefox 51+: теперь используется более надежный способ ожидания асинхронного клонирования вкладки (<a href="https://github.com/Infocatcher/Private_Tab/issues/237">#237</a>).<br>
`x` Исправлено переключение приватных вкладок в обычный режим при отключении расширения в Firefox 51+.<br>
`x` Исправлено: расширение не запускалось на новом профиле (ReferenceError: _log is not defined) (<a href="https://github.com/Infocatcher/Private_Tab/issues/240">#240</a>).<br>

##### 0.2.1 (2017-01-18)
`*` Немного улучшена производительность при запуске в мультипроцессном режиме: frame script теперь загружается после небольшой задержки.<br>
`x` Исправлено восстановление обертки вокруг `browser.swapDocShells()` для обработки «оторванных» вкладок в мультипроцессном режиме.<br>
`*` Улучшена производительность в мультипроцессном режиме (<a href="https://github.com/Infocatcher/Private_Tab/issues/234">#234</a>).<br>
`*` Открытие всех закладок: улучшена совместимость с другими расширениями, например, с <a href="https://addons.mozilla.org/firefox/addon/tree-style-tab/">Tree Style Tab</a> (настройка <em>extensions.privateTab.openPlacesInPrivateTabs.callNativeMenuItems</em>).<br>
`*` Улучшено потребление памяти в мультипроцессном режиме: теперь используется общий модуль content.jsm для frame scripts (<a href="https://github.com/Infocatcher/Private_Tab/issues/235">#235</a>).<br>
`+` Добавлен API <a href="https://github.com/Infocatcher/Private_Tab#privatetabistabprivateasync">privateTab.isTabPrivateAsync()</a>.<br>
`x` Исправлена совместимость с будущими версиями Firefox: прекращено использование Array generics вида `Array.forEach()` (<a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1222547">bug 1222547</a>).<br>
`x` Исправлено открытие новой приватной вкладки с предзагруженным about:newtab в Firefox 52+ (<a href="https://forum.mozilla-russia.org/viewtopic.php?pid=728403#p728403">спасибо Dumby</a>).<br>
`x` Исправлена возможность переключения приватности вкладок в Firefox 51+, теперь будет использоваться клонированная вкладка (<a href="https://github.com/Infocatcher/Private_Tab/issues/237">#237</a>).<br>
`x` Исправлен патчер при наличии оберток от других расширений (TypeError: Array is undefined) (<a href="https://forum.mozilla-russia.org/viewtopic.php?pid=728469#p728469">спасибо Dumby</a>).<br>
`x` Исправлена совместимость с будущими версиями Firefox: прекращено использование `Date.prototype.toLocaleFormat()` (<a href="https://bugzilla.mozilla.org/show_bug.cgi?id=818634">bug 818634</a>).<br>
`+` Добавлен API <a href="https://github.com/Infocatcher/Private_Tab#privatetabduplicatetabandtoggleprivate">privateTab.duplicateTabAndTogglePrivate()</a>.<br>
`x` Добавлено игнорирование некорректного оповещения "last-pb-context-exited" в мультипроцессном режиме (<a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1329912">bug 1329912</a>).<br>
`x` Исправлена возможность восстановления закрытых приватных вкладок в мультипроцессном режиме (настройка <em>extensions.privateTab.rememberClosedPrivateTabs</em>) (<a href="https://github.com/Infocatcher/Private_Tab/issues/239">#239</a>).<br>

##### 0.2.0 (2016-08-25)
`x` Исправления для мультипроцессного режима (Electrolysis aka e10s) в части «unsafe CPOW usage» (<a href="https://github.com/Infocatcher/Private_Tab/issues/208">#208</a>).<br>
`*` Обновлена португальская (Португалия) локаль (pt-PT), спасибо <a href="https://github.com/SW1FT">SW1FT</a> (<a href="https://github.com/Infocatcher/Private_Tab/pull/210">#210</a>).<br>
`x` Исправлен приватный протокол в мультипроцессном режиме (<a href="https://github.com/Infocatcher/Private_Tab/issues/211">#211</a>).<br>
`x` Некоторые улучшения и исправления для мультипроцессного режима (<a href="https://github.com/Infocatcher/Private_Tab/issues/162">#162</a>).<br>
`*` Теперь используется только один frame script для обмена сообщениями в мультипроцессном режиме (<a href="https://github.com/Infocatcher/Private_Tab/issues/213">#213</a>).<br>
`x` Исправлена возможная рекурсия в обертке для `tab.setAttribute("image", …)` (<a href="https://github.com/Infocatcher/Private_Tab/issues/214">#214</a>).<br>
`x` Исправлена совместимость с Firefox 51+ (SyntaxError: non-generator method definitions may not contain yield) (<a href="https://github.com/Infocatcher/Private_Tab/issues/228">#228</a>).<br>
`x` Исправлено определение клонированных вкладок как не пустых (<a href="https://github.com/Infocatcher/Private_Tab/issues/230">#230</a>).<br>
`x` Исправлено определение закрытия вкладок в Firefox 47+ (из-за изменений в свойстве `detail` события `TabClose`).<br>
`x` Исправлено отсутствие иконок вкладок в мультипроцессном режиме (<a href="https://github.com/Infocatcher/Private_Tab/issues/224">#224</a>).<br>
`+` Добавлена финская локаль (fi), спасибо <a href="https://github.com/hellojole">hellojole</a> (<a href="https://github.com/Infocatcher/Private_Tab/pull/226">#226</a>).<br>
`*` Небольшие внутренние улучшения и исправления.<br>

##### 0.1.9.1 (2016-02-01)
`x` Исправлена синтаксическая ошибка в Firefox 46.0a1+ при использовании generator comprehension (<a href="https://github.com/Infocatcher/Private_Tab/issues/203">#203</a>).<br>
`x` Исправлена обработка вкладок для просмотра исходного кода страницы (<a href="https://github.com/Infocatcher/Private_Tab/issues/204">#204</a>).<br>
`x` Учитывается настройка <em>browser.chrome.image_icons.max_size</em> при просмотре отдельных изображений.<br>
`x` Ссылки, открытые в новой приватной вкладке, становились не приватными (мультипроцессный режим: Electrolysis aka e10s) (<a href="https://github.com/Infocatcher/Private_Tab/issues/202">#202</a>).<br>
`x` Исправлено обновление заголовка окна и индикатора приватного режима в мультипроцессном режиме.<br>
`*` Обновлена французская локаль (fr), спасибо <a href="https://github.com/charlesmilette">Charles Milette</a> (<a href="https://github.com/Infocatcher/Private_Tab/pull/207">#207</a>).<br>

##### 0.1.9 (2016-01-02)
`*` Используется новый API для получения адреса новой вкладки в Firefox 44+ (см. <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1204983#c89">bug 1204983</a>).<br>
`x` Исправлена обработка перетаскивания вкладок между приватными и обычными окнами в Firefox 44+.<br>
`+` Добавлена поддержка пользовательского интерфейса защиты от отслеживания в Firefox 42+ (<a href="https://github.com/Infocatcher/Private_Tab/issues/196">#196</a>).<br>
`x` Исправлено: настройка <em>extensions.privateTab.rememberClosedPrivateTabs</em> в некоторых случаях могла ломать возможность восстановления закрытых вкладок (<a href="https://github.com/Infocatcher/Private_Tab/issues/197">#197</a>).<br>
`+` Добавлена португальская (Португалия) локаль (pt-PT), спасибо <a href="https://github.com/SW1FT">SW1FT</a> (<a href="https://github.com/Infocatcher/Private_Tab/issues/199">#199</a>).<br>

##### 0.1.8.1 (2015-10-24)
`x` Исправлена поддержка приватных загрузок в панели загрузок в Firefox 42+ (<a href="https://github.com/Infocatcher/Private_Tab/issues/186">#186</a>).<br>
`x` Исправлено: настройка <em>extensions.privateTab.rememberClosedPrivateTabs</em> могла не работать в некоторых случаях (см. <a href="https://github.com/Infocatcher/Private_Tab/issues/146">#146</a>).<br>

##### 0.1.8 (2015-08-12)
`x` Исправлена совместимость с будущими версиями Firefox (<a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1090880">bug 1090880</a>, <a href="https://github.com/Infocatcher/Private_Tab/issues/178">#178</a>).<br>
`x` Исправлены иконки кнопок после последней вкладки в Firefox 40+ (<a href="https://github.com/Infocatcher/Private_Tab/issues/180">#180</a>).<br>
`x` Используется правильный адрес при открытии приватной вкладки через панель задач Windows в Firefox 42+ (см. <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1118285">bug 1118285</a>).<br>
`x` Некоторые исправления для мультипроцессного режима (Electrolysis aka e10s) (<a href="https://github.com/Infocatcher/Private_Tab/issues/162">#162</a>).<br>
`x` Исправлено определение вкладок, открытых из внешнего приложения в Firefox 38+ (<a href="https://github.com/Infocatcher/Private_Tab/issues/184">#184</a>).<br>

##### 0.1.7.5 (2015-05-21)
`x` Исправлено обновление панели загрузок при переключении между приватными и обычными вкладками в Firefox 38+ (<a href="https://github.com/Infocatcher/Private_Tab/issues/176">#176</a>).<br>

##### 0.1.7.4 (2015-05-10)
`x` Исправлена возможность запоминать закрытые приватные вкладки в Firefox 29+ (настройка <em>extensions.privateTab.rememberClosedPrivateTabs</em>) (<a href="https://github.com/Infocatcher/Private_Tab/issues/146">#146</a>).<br>
`+` Добавлена подсветка закрытых приватных вкладок в меню «Недавно закрытые вкладки» (<a href="https://github.com/Infocatcher/Private_Tab/issues/154">#154</a>).<br>
`*` Улучшена работа галочки «Приватная вкладка» (в контекстном меню вкладок) для загружающихся вкладок (настройка <em>extensions.privateTab.toggleTabPrivateAutoReload.stopLoading</em>).<br>
`x` Исправлен размер кнопки «Новая приватная вкладка» после последней вкладки, если открыто много вкладок и кнопка была скрыта на момент запуска.<br>
`x` Исправлена совместимость с Firefox 38+ (<a href="https://github.com/Infocatcher/Private_Tab/issues/165">#165</a>).<br>
`+` Добавлено: <a href="https://github.com/Infocatcher/Private_Tab#privatetabhasclosedtabs">privateTab.hasClosedTabs</a> и <a href="https://github.com/Infocatcher/Private_Tab#privatetabforgetclosedtabs">privateTab.forgetClosedTabs()</a> API для других расширений.<br>

##### 0.1.7.3 (2014-08-09)
`x` Исправлено восстановление закрытых не приватных вкладок в приватных окнах.<br>
`*` Улучшена поддержка иконок у private:… закладок (<a href="https://github.com/Infocatcher/Private_Tab/issues/147">#147</a>).<br>
`*` Обновлена вьетнамская локаль (vi), спасибо <a href="https://github.com/leof36">Leof36</a>.<br>
`x` Исправлен протокол «private» в Firefox 20 и 21 (<a href="https://github.com/Infocatcher/Private_Tab/issues/150">#150</a>).<br>
`*` Увеличена <a href="https://developer.mozilla.org/en-US/Add-ons/Install_Manifests#iconURL">иконка расширения, отображающаяся в управлении дополнениями</a>: теперь используется 48×48px вместо 32×32px.<br>
`x` Исправлено определение пустых вкладок в Firefox 33+ (не пустые вкладки некорректно определялись как пустые и становились не приватными) (<a href="https://github.com/Infocatcher/Private_Tab/issues/152">#152</a>).<br>

##### 0.1.7.2 (2014-05-18)
`*` Добавлена возможность использовать простые ссылки вида private:example.com, префикс `http://` будет автоматически добавлен ко всем ссылкам без протокола.<br>
`x` Подправлена подпись кнопки «Новая приватная вкладка» в русской и французской локалях в Firefox 29+ (Australis): теперь используется короткий вариант из-за небольшой доступной длины в новом меню (<a href="https://github.com/Infocatcher/Private_Tab/issues/141">#141</a>).<br>
`x` Подкорректировано предыдущее исправление вида кнопки «Новая приватная вкладка» после последней вкладки при наведении курсора в Firefox 29+ (Australis) (<a href="https://github.com/Infocatcher/Private_Tab/issues/138">#138</a>).<br>
`+` Добавлена турецкая локаль (tr), спасибо <a href="http://www.babelzilla.org/forum/index.php?showuser=17436">alfapegasi</a>.<br>
`x` Исправлено определение страниц от <a href="https://addons.mozilla.org/addon/super-start/">Super Start</a> 7.0+ как пустых (<a href="https://github.com/Infocatcher/Private_Tab/issues/142">#142</a>).<br>
`+` Добавлено: <a href="https://github.com/Infocatcher/Private_Tab#privatetabtablabelisempty">privateTab.tabLabelIsEmpty()</a> API для других расширений (<a href="https://github.com/Infocatcher/Private_Tab/issues/143">#143</a>).<br>
`x` Исправлено: закрытые приватные вкладки по ошибке удалялись в приватных окнах (<a href="https://github.com/Infocatcher/Private_Tab/issues/145">#145</a>).<br>

##### 0.1.7.1 (2014-04-20)
`+` Добавлено отображение сочетания клавиш во всплывающей подсказке кнопки для панелей инструментов в Firefox 29+ (Australis) (<a href="https://github.com/Infocatcher/Private_Tab/issues/136">#136</a>).<br>
`x` Workaround для корректного обновления заголовка окна в Firefox 29+ (Australis), также см. <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=987929">bug 987929</a> (или вы можете использовать более корректно работающий обходной путь – установить <em>browser.tabs.drawInTitlebar</em> = false или <em>extensions.privateTab.usePrivateWindowStyle</em> = false).<br>
`x` Исправлена ширина кликабельной области кнопки «Новая приватная вкладка» после последней вкладки в Firefox 29+ (Australis) (<a href="https://github.com/Infocatcher/Private_Tab/issues/137">#137</a>).<br>
`x` Подправлен внешний вид кнопки «Новая приватная вкладка» после последней вкладки в Firefox 29+ (Australis) (<a href="https://github.com/Infocatcher/Private_Tab/issues/138">#138</a>).<br>
`*` Улучшен протокол «private»: теперь работают простые ссылки вида private:http://example.com/, а не только private:///#http://example.com/.<br>

##### 0.1.7 (2014-02-11)
`+` Добавлена возможность удалять приватные вкладки из списка для восстановления закрытых вкладок только после завершения приватного просмотра (<a href="https://github.com/Infocatcher/Private_Tab/issues/112">#112</a>).<br>
`+` Добавлена подсветка приватных вкладок в меню «Список всех вкладок» (<a href="https://github.com/Infocatcher/Private_Tab/issues/113">#113</a>).<br>
`x` Исправлено: сочетания клавиш из одного символа (например, просто `V` или `Shift+V`) теперь игнорируются в WYSIWYG редакторах.<br>
`x` Исправлена обработка встроенных приватных окон в SeaMonkey (<a href="https://github.com/Infocatcher/Private_Tab/issues/116">#116</a>).<br>
`x` Исправлено обновление панели загрузок в Firefox 28.0a1+.<br>
`x` Исправлено добавление кнопки на панель инструментов в Firefox 29+ (Australis) (<a href="https://github.com/Infocatcher/Private_Tab/issues/121">#121</a>).<br>
`+` Добавлены настройки для изменения адреса, который будет открываться в новых пустых вкладках (<em>extensions.privateTab.newPrivateTabURL</em> и <em>extensions.privateTab.newPrivateTabURL.inPrivateWindow</em>) (<a href="https://github.com/Infocatcher/Private_Tab/issues/125">#125</a>).<br>
`+` Добавлена возможность отключения стилей приватного окна, если активна приватная вкладка (настройка <em>extensions.privateTab.usePrivateWindowStyle</em>).<br>
`+` Упрощена возможность перезаписи стилей приватных вкладок/закладок из других тем/расширений (по умолчанию отключено, см. настройки <em>extensions.privateTab.stylesHighPriority\*</em>) (<a href="https://github.com/Infocatcher/Private_Tab/issues/127">#127</a>).<br>
`+` Добавлена иконка 32×32px для Australis'а (используется в панели меню и при настройке панелей) (<a href="https://github.com/Infocatcher/Private_Tab/issues/128">#128</a>).<br>
`x` Исправлено: история панели поиска сохранялась в приватных вкладках (<a href="https://github.com/Infocatcher/Private_Tab/issues/129">#129</a>).<br>
`*` Небольшие улучшения кода.<br>
`+` Обновлена польская локаль (pl), спасибо <a href="https://github.com/marcinsu">marcinsu</a>.<br>
`*` Обновлена венгерская локаль (hu), спасибо <a href="https://github.com/evenorbert">evenorbert</a>.<br>

##### 0.1.6 (2013-10-31)
`*` Улучшена совместимость с <a href="https://addons.mozilla.org/addon/tab-mix-plus/">Tab Mix Plus</a> (большое спасибо <a href="https://addons.mozilla.org/user/onemen/">onemen</a>'у за исправления со стороны Tab Mix Plus) (<a href="https://github.com/Infocatcher/Private_Tab/issues/95">#95</a>, <a href="https://github.com/Infocatcher/Private_Tab/issues/96">#96</a>).<br>
`+` В контекстное меню кнопки на панели задач добавлен пункт «новая приватная вкладка» (только Windows 7 и выше, настройка <em>extensions.privateTab.showItemInTaskBarJumpList</em>) (<a href="https://github.com/Infocatcher/Private_Tab/issues/98">#98</a>).<br>
`+` Добавлен пункт контекстного меню для открытия нескольких закладок/элементов истории в приватных вкладках (<a href="https://github.com/Infocatcher/Private_Tab/issues/99">#99</a>).<br>
`*` Изменено сочетание клавиш по умолчанию для переключения приватности текущей вкладки с Ctrl+Alt+<strong>V</strong> на Ctr+Alt+<strong>T</strong> (установите <em>extensions.privateTab.key.toggleTabPrivate</em> = «control alt VK_V» для восстановления старого сочетания) (<a href="https://github.com/Infocatcher/Private_Tab/issues/105">#105</a>).<br>
`+` Добавлена возможность наследования приватного состояния для новых пустых вкладок и окон (установите <em>extensions.privateTab.makeNewEmptyTabsPrivate</em>/<em>extensions.privateTab.makeNewEmptyWindowsPrivate</em> в `-1`) (<a href="https://github.com/Infocatcher/Private_Tab/issues/111">#111</a>).<br>

##### 0.1.5 (2013-08-24)
`*` Добавлена возможность отображения кнопок «Новая приватная вкладка» и «Новая вкладка» после последней вкладки (<a href="https://github.com/Infocatcher/Private_Tab/issues/92">#92</a>).<br>
`x` Исправлено: вкладки, открытые из других расширений, могли некорректно определяться как открытые из внешнего приложения (<a href="https://github.com/Infocatcher/Private_Tab/issues/93">#93</a>).<br>
`x` Исправлено: некорректные ссылки с использованием протокола «private» приводили к падению браузера (<a href="https://github.com/Infocatcher/Private_Tab/issues/94">#94</a>).<br>

##### 0.1.4 (2013-08-19)
`x` Исправлены пустые всплывающие подсказки у вкладок в Firefox 25.0a1+ (<a href="https://github.com/Infocatcher/Private_Tab/issues/75">#75</a>).<br>
`+` Добавлена возможность просмотра исходного кода приватных вкладок (<a href="https://github.com/Infocatcher/Private_Tab/issues/74">#74</a>).<br>
`x` Подкорректирована метка «(приватная вкладка)» на всплывающей панели <a href="https://addons.mozilla.org/addon/tab-scope/">Tab Scope</a> (<a href="https://github.com/Infocatcher/Private_Tab/issues/78">#78</a>).<br>
`+` Добавлена индонезийская (id) локаль, спасибо <a href="https://addons.mozilla.org/user/daisukeDan/">Daisuke Bjm Project</a>.<br>
`+` Добавлена украинская (uk) локаль, спасибо <a href="https://addons.mozilla.org/user/dbv92/">dbv92</a>.<br>
`+` Добавлена арабская (ar) локаль, спасибо <a href="https://addons.mozilla.org/user/slax/">infinity</a>.<br>
`*` Улучшена совместимость с расширениями типа <a href="https://addons.mozilla.org/addon/fast-dial/">Fast Dial</a> (<a href="https://github.com/Infocatcher/Private_Tab/issues/84">#84</a>).<br>
`x` Исправлена несовместимость с расширением <a href="https://addons.mozilla.org/addon/tile-tabs/">Tile Tabs</a> 10.0 (<a href="https://github.com/Infocatcher/Private_Tab/issues/83">#83</a>).<br>
`x` Добавлены исправления для бага Mozilla <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=885177">#885177</a> (<a href="https://github.com/Infocatcher/Private_Tab/issues/85">#85</a>).<br>
`*` Добавлено сохранение текста в адресной строке после автоматической перезагрузке (<a href="https://github.com/Infocatcher/Private_Tab/issues/86">#86</a>).<br>
`*` Улучшено поведение после закрытия приватных вкладок (настройка <em>extensions.privateTab.rememberOwnerTab</em>) (<a href="https://github.com/Infocatcher/Private_Tab/issues/87">#87</a>).<br>
`+` Реализован протокол «private»: теперь можно использовать специальные ссылки для открытия приватных вкладок из закладок или из командной строки (пример: private:///#https://addons.mozilla.org/, может быть отключено с помощью настройки <em>extensions.privateTab.enablePrivateProtocol</em>) (<a href="https://github.com/Infocatcher/Private_Tab/issues/89">#89</a>).<br>
`+` Добавлена возможность показывать кнопку «Новая приватная вкладка» после кнопки «Новая вкладка» (<a href="https://github.com/Infocatcher/Private_Tab/issues/90">#90</a>).<br>
`*` Добавлена возможность инвертирования поведения автоматической перезагрузки (настройка <em>extensions.privateTab.toggleTabPrivateAutoReload</em>) с помощью клика средней кнопкой мыли (или левой с любым модификатором).<br>

##### 0.1.3 (2013-06-13)
`+` Добавлена возможность предотвращения завершения приватной сессии (в случае наличия активных загрузок и т.п.) (<a href="https://github.com/Infocatcher/Private_Tab/issues/53">#53</a>).<br>
`x` Исправлена возможная утечка памяти (только если кто-то использовал privateTab.readyToOpenTabs() без последующего privateTab.stopToOpenTabs()).<br>
`x` Исправлено: небольшие изображения из приватных вкладок (отображаются с иконками на вкладках) кэшировались на диск (<a href="https://github.com/Infocatcher/Private_Tab/issues/56">#56</a>).<br>
`x` Отключено сохранение миниатюр для приватных вкладок (<a href="https://github.com/Infocatcher/Private_Tab/issues/58">#58</a>).<br>
`+` Добавлена настройка <em>extensions.privateTab.debug.verbose</em> для разрешения вывода дополнительной отладочной информации в консоль ошибок.<br>
`x` Исправлен конфликт с расширением <a href="https://addons.mozilla.org/addon/nosquint/">NoSquint</a> (<a href="https://github.com/Infocatcher/Private_Tab/issues/61">#61</a>).<br>
`*` Небольшие улучшения производительности.<br>
`*` Улучшена возможность локализации диалога подтверждения в случае отключения или удаления расширения.<br>
`+` Добавлены локали:<br>
&emsp;&emsp;Catalan (ca), спасибо <a href="https://github.com/Dimas-sc">Dimas-sc</a><br>
&emsp;&emsp;Hungarian (hu), спасибо <a href="https://github.com/evenorbert">evenorbert</a><br>
&emsp;&emsp;Italian (it), спасибо <a href="https://github.com/moretti">moretti</a><br>
&emsp;&emsp;Portuguese (Brazilian) (pt-BR), спасибо <a href="http://www.babelzilla.org/forum/index.php?showuser=212">Ghelman</a><br>
&emsp;&emsp;Serbian (sr), спасибо <a href="http://www.babelzilla.org/forum/index.php?showuser=8719">DakSrbija</a><br>
&emsp;&emsp;Spanish (es), спасибо <a href="https://github.com/strel">strel</a><br>
`*` Обновлены локали:<br>
&emsp;&emsp;Chinese (Simplified) (zh-CN), спасибо <a href="https://github.com/Cye3s">Cye3s</a><br>
&emsp;&emsp;Chinese (Traditional) (zh-TW), спасибо <a href="https://github.com/ikurrina">ikurrina</a><br>
&emsp;&emsp;Estonian (et), спасибо <a href="https://github.com/mdr-ksk">mdr-ksk</a><br>
&emsp;&emsp;French (fr) из babelzilla.org (переведено не все)<br>
&emsp;&emsp;German (de), спасибо <a href="https://github.com/sierkb">sierkb</a><br>
&emsp;&emsp;Greek (el), спасибо <a href="http://www.babelzilla.org/forum/index.php?showuser=15362">Grg68</a><br>
&emsp;&emsp;Japanese (jp), спасибо <a href="https://github.com/charishi">charishi</a><br>
&emsp;&emsp;Polish (pl), спасибо <a href="https://github.com/marcinsu">marcinsu</a><br>

##### 0.1.2 (2013-05-01)
`+` Добавлена польская локаль (pl), спасибо <a href="https://github.com/marcinsu">marcinsu</a>.<br>
`*` Подкорректировано: приватность текущей вкладки теперь не наследуется для новых вкладок и окон, открытых из внешних приложений (настройка <em>extensions.privateTab.allowOpenExternalLinksInPrivateTabs</em>) (<a href="https://github.com/Infocatcher/Private_Tab/issues/42">#42</a>).<br>
`x` Исправлено определение новых окон, открытых с помощью JavaScript-функции window.open() с указанием размеров как не пустых.<br>
`x` Исправлен внешний вид текущей приватной вкладки в Mac OS X (<a href="https://github.com/Infocatcher/Private_Tab/issues/44">#44</a>).<br>
`x` Исправлено: добавлено удаление оберток при закрытии окна, чтобы исключить утечки памяти (<a href="https://github.com/Infocatcher/Private_Tab/issues/45">#45</a>, <a href="https://github.com/Infocatcher/Private_Tab/issues/46">#46</a>).<br>
`+` Добавлена эстонская локать (et), спасибо <a href="http://forums.mozillazine.org/memberlist.php?mode=viewprofile&amp;u=2361677">mdr.ksk</a>.<br>
`x` Исправлено: сочетание клавиш не отображалось в меню Файл в Mac OS X <a href="https://github.com/Infocatcher/Private_Tab/issues/47">#47</a>.<br>
`+` Добавлена настройка <em>extensions.privateTab.keysHighPriority</em> для обработки key\*-события в capturing (true) или bubbling (false) фазе, см. http://www.w3.org/TR/DOM-Level-3-Events/#event-flow.<br>
`*` Подкорректирована китайская (Traditional) локаль (zh-TW), спасибо <a href="https://github.com/marcinsu">ikurrina</a>.<br>
`+` Добавлена возможность закрытия всех приватных вкладок при отключении или удалении расширения (<a href="https://github.com/Infocatcher/Private_Tab/issues/51">#51</a>).<br>

##### 0.1.1 (2013-04-24)
`+` Добавлена французская локаль (fr), спасибо <a href="https://github.com/Stis">Stis</a>.<br>
`+` Добавлена китайская (Simplified) локаль (zh-CN), спасибо <a href="https://github.com/Cye3s">Cye3s</a>.<br>
`x` Исправлена утечка памяти при отключении расширения (не удалялся объект window.privateTab) (<a href="https://github.com/Infocatcher/Private_Tab/issues/33">#33</a>).<br>
`+` Добавлена вьетнамская локаль (vi), спасибо <a href="https://github.com/leof36">Leof36</a>.<br>
`+` Добавлена немецкая локаль (de), спасибо <a href="https://github.com/sierkb">sierkb</a>.<br>
`*` Улучшена совместимость с расширениями типа <a href="https://addons.mozilla.org/addon/personal-menu/">Personal Menu</a> (<a href="https://github.com/Infocatcher/Private_Tab/issues/35">#35</a>).<br>
`+` Добавлено определение страниц от <a href="https://addons.mozilla.org/addon/super-start/">Super Start</a> как пустых.<br>
`*` Улучшено: теперь приватные вкладки не сохраняются в сессиях (<a href="https://github.com/Infocatcher/Private_Tab/issues/36">#36</a>).<br>
`*` Улучшено: добавлено отображение загрузок из приватных вкладок в не приватном окне (<a href="https://github.com/Infocatcher/Private_Tab/issues/31">#31</a>).<br>
`*` Улучшена всплывающая подсказка для приватных вкладок в темах оформления с темным фоном всплывающих подсказок (<a href="https://github.com/Infocatcher/Private_Tab/issues/38">#38</a>).<br>
`+` Добавлена греческая локаль (el), спасибо <a href="http://forums.mozillazine.org/memberlist.php?mode=viewprofile&u=1595963">Grg68</a>.<br>

##### 0.1.0 (2013-04-09)
`*` Используется встроенный модификатор заголовка окна в последних версиях SeaMonkey 2.19a1+ (2013-03-27+).<br>
`*` Исправлено определение встроенных приватных окон в последних версиях SeaMonkey 2.19a1+ (2013-03-27+).<br>
`x` Исправлено восстановление заголовка окна в SeaMonkey при отключении расширения.<br>
`+` Добавлена возможность открывать все новые пустые вкладки в приватном режиме (экспериментальное, настройки: <em>extensions.privateTab.makeNewEmptyTabsPrivate</em>, <em>extensions.privateTab.makeNewEmptyWindowsPrivate</em>).<br>
`+` Добавлена китайская (Traditional) локаль (zh-TW), спасибо arbiger.<br>
`+` Добавлена японская локаль (ja), спасибо charishi.<br>
`x` Workaround для <em>browser.newtab.preload</em> = true.<br>
`x` Исправлено корректирование ширины кнопки-меню приложения: добавлена задержка, чтобы успели примениться стили других расширений.<br>
`x` Исправлено: сочетание клавиш для переключения приватности вкладки иногда работало не для текущей вкладки.<br>
`*` Добавлена возможность задания нескольких сочетаний клавиш для одной команды: <em>extensions.privateTab.key.</em>%command%<em>#</em>%alias_name%.<br>
`x` Исправлено (надеюсь): сочетания клавиш не работали на не латинских раскладках клавиатуры (<a href="https://github.com/Infocatcher/Private_Tab/issues/19">#19</a>).<br>
`*` Небольшие оптимизации.<br>

##### 0.1.0b4 (2013-03-26)
`+` Добавлено определение страниц от Speed Dial и FVD Speed Dial как пустых.<br>
`+` Добавлен атрибут «privateTab-isPrivate» для приватного окна (может использоваться в пользовательских стилях).<br>
`+` Добавлена кнопка для панелей инструментов.<br>
`x` Исправлено восстановление закрытых не приватных вкладок в приватных окнах.<br>
`+` Закрытые приватные вкладки больше не сохраняются в списке недавно закрытых (настройка <em>extensions.privateTab.rememberClosedPrivateTabs</em>).<br>
`+` Добавлена настройка <em>extensions.privateTab.sendRefererHeader</em>.<br>
`x` Перетаскивание: исправлено изменение приватности уже открытых вкладок.<br>
`*` Перетаскивание: новая вкладка (или вкладка, на которую перетащили) становится приватной, если источник или получатель были приватными (настройка <em>extensions.privateTab.dragAndDropBehavior</em>).<br>
`+` Реализованы API для других расширений.<br>
`+` Добавлено обновление вкладки после переключения приватности из контекстного меню (настройка <em>extensions.privateTab.toggleTabPrivateAutoReload</em>).<br>

##### 0.1.0b3 (2013-03-19)
`+` Добавлена возможность перетаскивания вкладок между приватными и не приватными окнами (настройка <em>extensions.privateTab.dragAndDropTabsBetweenDifferentWindows</em>).<br>
`x` Исправлено открытие ссылок в приватных вкладках: вкладки не сохранялись в истории, но использовались не приватные cookies.<br>

##### 0.1.0b2 (2013-03-17)
`*` Пункт контекстного меню закладок «Открыть в новой вкладке» теперь всегда открывает не приватную вкладку: после добавления пункта «Открыть в новой приватной вкладке» такое поведение более интуитивно.<br>
`x` Добавлено скрытие текста сочетаний клавиш в меню приложения и исправлено некорректное отображение текста сочетаний клавиш встроенного пункта «Новое приватное окно» (<a href="https://github.com/Infocatcher/Private_Tab/issues/3">#3</a>).<br>
`x` Исправлено обновление сочетаний клавиш в нескольких окнах при изменении настроек <em>extensions.privateTab.key.\*</em>.<br>
`x` Исправлено перетаскивание из приватных вкладок в приватном окне.<br>
`+` Добавлена настройка <em>extensions.privateTab.dragAndDropUseTargetPrivateState</em> для использования приватного состояния «получателя» для перетаскиваемых ссылок (<a href="https://github.com/Infocatcher/Private_Tab/issues/4">#4</a>).<br>
`*` Некоторые внутренние улучшения.<br>

##### 0.1.0b2pre (2013-03-14)
`*` Улучшен способ фиксирования ширины кнопки-меню приложения.<br>
`*` Добавлено обновление ширины «заполнителя» для кнопки-меню приложения, если ширина кнопки не может быть зафиксирована.<br>
`+` Добавлен пункт контекстного меню для закладок (<a href="https://github.com/Infocatcher/Private_Tab/issues/2">#2</a>).<br>

##### 0.1.0b1 (2013-03-13)
`*` Приватное состояние при перетаскивании теперь наследуется от вкладки-источника.<br>
`+` Экспериментальное: пункты меню теперь также добавляются и во встроенные приватные окна.<br>
`*` Теперь можно открыть новое не приватное окно из приватной вкладки (с помощью команды «Новое окно»).<br>
`+` Добавлена поддержка встроенного пункта контекстного меню «Открыть ссылку в новом приватном окне» в SeaMonkey 2.19a1.<br>
`*` Исправлена ширина кнопки-меню приложения: используется одна и та же ширина для приватного и не приватного состояния (настройка <em>extensions.privateTab.fixAppButtonWidth</em>).<br>
`x` Исправлено некорректное отображение пунктов контекстного меню «Открыть ссылку в новой вкладке/новом окне».<br>
`*` При открытии новой приватной вкладки фокус переносится а адресную строку.<br>

##### 0.1.0a3 (2013-02-20)
`*` Первая публичная версия.<br>