#### Private Tab: История изменений

`+` - добавлено<br>
`-` - удалено<br>
`x` - исправлено<br>
`*` - улучшено<br>

##### master/HEAD
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
`*` Улучшена совместимость с расширениями типа <a href="https://addons.mozilla.org/addon/fast-dial-5721/">Fast Dial</a> (<a href="https://github.com/Infocatcher/Private_Tab/issues/84">#84</a>).<br>
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
`x` Исправлено (надеюсь): сочетания клавиш не работали на не латинских раскладках клавиатуры.<br>
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