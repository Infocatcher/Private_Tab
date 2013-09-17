#### Private Tab: История изменений

`+` - добавлено
`-` - удалено
`x` - исправлено
`*` - улучшено

##### master/HEAD
`*` Улучшена совместимость с <a href="https://addons.mozilla.org/addon/tab-mix-plus/">Tab Mix Plus</a> (большое спасибо <a href="https://addons.mozilla.org/user/onemen/">onemen</a>'у за исправления со стороны Tab Mix Plus) (#95, #96)
`+` В контекстное меню кнопки на панели задач добавлен пункт «новая приватная вкладка» (только Windows 7 и выше) (<a href="https://github.com/Infocatcher/Private_Tab/issues/98">#98</a>)
`+` Добавлен пункт контекстного меню для открытия нескольких закладок/элементов истории в приватных вкладках (<a href="https://github.com/Infocatcher/Private_Tab/issues/99">#99</a>)
`*` Изменено сочетание клавиш по умолчанию для переключения приватности текущей вкладки с Ctrl+Alt+<strong>V</strong> на Ctr+Alt+<strong>T</strong> (установите <em>extensions.privateTab.key.toggleTabPrivate</em> = «control alt VK_V» для восстановления старого сочетания) (<a href="https://github.com/Infocatcher/Private_Tab/issues/105">#105</a>)

##### 0.1.5 (2013-08-24)
`*` Добавлена возможность отображения кнопок «Новая приватная вкладка» и «Новая вкладка» после последней вкладки (<a href="https://github.com/Infocatcher/Private_Tab/issues/92">#92</a>)
`x` Исправлено: вкладки, открытые из других расширений, могли некорректно определяться как открытые из внешнего приложения (<a href="https://github.com/Infocatcher/Private_Tab/issues/93">#93</a>)
`x` Исправлено: некорректные ссылки с использованием протокола «private» приводили к падению браузера (<a href="https://github.com/Infocatcher/Private_Tab/issues/94">#94</a>)

##### 0.1.4 (2013-08-19)
`x` Исправлены пустые всплывающие подсказки у вкладок в Firefox 25.0a1+ (<a href="https://github.com/Infocatcher/Private_Tab/issues/75">#75</a>)
`+` Добавлена возможность просмотра исходного кода приватных вкладок (<a href="https://github.com/Infocatcher/Private_Tab/issues/74">#74</a>)
`x` Подкорректирована метка «(приватная вкладка)» на всплывающей панели <a href="https://addons.mozilla.org/addon/tab-scope/">Tab Scope</a> (<a href="https://github.com/Infocatcher/Private_Tab/issues/78">#78</a>)
`+` Добавлена индонезийская (id) локаль, спасибо <a href="https://addons.mozilla.org/user/daisukeDan/">Daisuke Bjm Project</a>
`+` Добавлена украинская (uk) локаль, спасибо <a href="https://addons.mozilla.org/user/dbv92/">dbv92</a>
`+` Добавлена арабская (ar) локаль, спасибо <a href="https://addons.mozilla.org/user/slax/">infinity</a>
`*` Улучшена совместимость с расширениями типа <a href="https://addons.mozilla.org/addon/fast-dial-5721/">Fast Dial</a> (<a href="https://github.com/Infocatcher/Private_Tab/issues/84">#84</a>)
`x` Исправлена несовместимость с расширением <a href="https://addons.mozilla.org/addon/tile-tabs/">Tile Tabs</a> 10.0 (<a href="https://github.com/Infocatcher/Private_Tab/issues/83">#83</a>)
`x` Добавлены исправления для бага Mozilla <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=885177">#885177</a> (<a href="https://github.com/Infocatcher/Private_Tab/issues/85">#85</a>)
`*` Добавлено сохранение текста в адресной строке после автоматической перезагрузке (<a href="https://github.com/Infocatcher/Private_Tab/issues/86">#86</a>)
`*` Улучшено поведение после закрытия приватных вкладок (настройка <em>extensions.privateTab.rememberOwnerTab</em>) (<a href="https://github.com/Infocatcher/Private_Tab/issues/87">#87</a>)
`+` Реализован протокол «private»: теперь можно использовать специальные ссылки для открытия приватных вкладок из закладок или из командной строки (пример: private:///#https://addons.mozilla.org/, может быть отключено с помощью настройки <em>extensions.privateTab.enablePrivateProtocol</em>) (<a href="https://github.com/Infocatcher/Private_Tab/issues/89">#89</a>)
`+` Добавлена возможность показывать кнопку «Новая приватная вкладка» после кнопки «Новая вкладка» (<a href="https://github.com/Infocatcher/Private_Tab/issues/90">#90</a>)
`*` Добавлена возможность инвертирования поведения автоматической перезагрузки (настройка <em>extensions.privateTab.toggleTabPrivateAutoReload</em>) с помощью клика средней кнопкой мыли (или левой с любым модификатором)

0.1.3 (2013-06-13)
`+` Добавлена возможность предотвращения завершения приватной сессии (в случае наличия активных загрузок и т.п.) (<a href="https://github.com/Infocatcher/Private_Tab/issues/53">#53</a>)
`x` Исправлена возможная утечка памяти (только если кто-то использовал privateTab.readyToOpenTabs() без последующего privateTab.stopToOpenTabs())
`x` Исправлено: небольшие изображения из приватных вкладок (отображаются с иконками на вкладках) кэшировались на диск (<a href="https://github.com/Infocatcher/Private_Tab/issues/56">#56</a>)
`x` Отключено сохранение миниатюр для приватных вкладок (<a href="https://github.com/Infocatcher/Private_Tab/issues/58">#58</a>)
`+` Добавлена настройка <em>extensions.privateTab.debug.verbose</em> для разрешения вывода дополнительной отладочной информации в консоль ошибок
`x` Исправлен конфликт с расширением <a href="https://addons.mozilla.org/addon/nosquint/">NoSquint</a> (<a href="https://github.com/Infocatcher/Private_Tab/issues/61">#61</a>)
`*` Небольшие улучшения производительности
`*` Улучшена возможность локализации диалога подтверждения в случае отключения или удаления расширения
`+` Добавлены локали:
	Catalan (ca), спасибо <a href="https://github.com/Dimas-sc">Dimas-sc</a>
	Hungarian (hu), спасибо <a href="https://github.com/evenorbert">evenorbert</a>
	Italian (it), спасибо <a href="https://github.com/moretti">moretti</a>
	Portuguese (Brazilian) (pt-BR), спасибо <a href="http://www.babelzilla.org/forum/index.php?showuser=212">Ghelman</a>
	Serbian (sr), спасибо <a href="http://www.babelzilla.org/forum/index.php?showuser=8719">DakSrbija</a>
	Spanish (es), спасибо <a href="https://github.com/strel">strel</a>
`*` Обновлены локали:
	Chinese (Simplified) (zh-CN), спасибо <a href="https://github.com/Cye3s">Cye3s</a>
	Chinese (Traditional) (zh-TW), спасибо <a href="https://github.com/ikurrina">ikurrina</a>
	Estonian (et), спасибо <a href="https://github.com/mdr-ksk">mdr-ksk</a>
	French (fr) из babelzilla.org (переведено не все)
	German (de), спасибо <a href="https://github.com/sierkb">sierkb</a>
	Greek (el), спасибо <a href="http://www.babelzilla.org/forum/index.php?showuser=15362">Grg68</a>
	Japanese (jp), спасибо <a href="https://github.com/charishi">charishi</a>
	Polish (pl), спасибо <a href="https://github.com/marcinsu">marcinsu</a>

##### 0.1.2 (2013-05-01)
`+` Добавлена польская локаль (pl), спасибо <a href="https://github.com/marcinsu">marcinsu</a>
`*` Подкорректировано: приватность текущей вкладки теперь не наследуется для новых вкладок и окон, открытых из внешних приложений (настройка <em>extensions.privateTab.allowOpenExternalLinksInPrivateTabs</em>) (<a href="https://github.com/Infocatcher/Private_Tab/issues/42">#42</a>)
`x` Исправлено определение новых окон, открытых с помощью JavaScript-функции window.open() с указанием размеров как не пустых
`x` Исправлен внешний вид текущей приватной вкладки в Mac OS X (<a href="https://github.com/Infocatcher/Private_Tab/issues/44">#44</a>)
`x` Исправлено: добавлено удаление оберток при закрытии окна, чтобы исключить утечки памяти (<a href="https://github.com/Infocatcher/Private_Tab/issues/45">#45</a>, <a href="https://github.com/Infocatcher/Private_Tab/issues/46">#46</a>)
`+` Добавлена эстонская локать (et), спасибо <a href="http://forums.mozillazine.org/memberlist.php?mode=viewprofile&amp;u=2361677">mdr.ksk</a>
`x` Исправлено: сочетание клавиш не отображалось в меню Файл в Mac OS X <a href="https://github.com/Infocatcher/Private_Tab/issues/47">#47</a>
`+` Добавлена настройка <em>extensions.privateTab.keysHighPriority</em> для обработки key*-события в capturing (true) или bubbling (false) фазе, см. http://www.w3.org/TR/DOM-Level-3-Events/#event-flow
`*` Подкорректирована китайская (Traditional) локаль (zh-TW), спасибо <a href="https://github.com/marcinsu">ikurrina</a>
`+` Добавлена возможность закрытия всех приватных вкладок при отключении или удалении расширения (<a href="https://github.com/Infocatcher/Private_Tab/issues/51">#51</a>)

0.1.1 (2013-04-24)
`+` Добавлена французская локаль (fr), спасибо <a href="https://github.com/Stis">Stis</a>
`+` Добавлена китайская (Simplified) локаль (zh-CN), спасибо <a href="https://github.com/Cye3s">Cye3s</a>
`x` Исправлена утечка памяти при отключении расширения (не удалялся объект window.privateTab) (<a href="https://github.com/Infocatcher/Private_Tab/issues/33">#33</a>)
`+` Добавлена вьетнамская локаль (vi), спасибо <a href="https://github.com/leof36">Leof36</a>
`+` Добавлена немецкая локаль (de), спасибо <a href="https://github.com/sierkb">sierkb</a>
`*` Улучшена совместимость с расширениями типа <a href="https://addons.mozilla.org/addon/personal-menu/">Personal Menu</a> (<a href="https://github.com/Infocatcher/Private_Tab/issues/35">#35</a>)
`+` Добавлено определение страниц от <a href="https://addons.mozilla.org/addon/super-start/">Super Start</a> как пустых
`*` Улучшено: теперь приватные вкладки не сохраняются в сессиях (<a href="https://github.com/Infocatcher/Private_Tab/issues/36">#36</a>)
`*` Улучшено: добавлено отображение загрузок из приватных вкладок в не приватном окне (<a href="https://github.com/Infocatcher/Private_Tab/issues/31">#31</a>)
`*` Улучшена всплывающая подсказка для приватных вкладок в темах оформления с темным фоном всплывающих подсказок (<a href="https://github.com/Infocatcher/Private_Tab/issues/38">#38</a>)
`+` Добавлена греческая локаль (el), спасибо <a href="http://forums.mozillazine.org/memberlist.php?mode=viewprofile&u=1595963">Grg68</a>

##### 0.1.0 (2013-04-09)
`*` Используется встроенный модификатор заголовка окна в последних версиях SeaMonkey 2.19a1+ (2013-03-27+)
`*` Исправлено определение встроенных приватных окон в последних версиях SeaMonkey 2.19a1+ (2013-03-27+)
`x` Исправлено восстановление заголовка окна в SeaMonkey при отключении расширения
`+` Добавлена возможность открывать все новые пустые вкладки в приватном режиме (экспериментальное, настройки: <em>extensions.privateTab.makeNewEmptyTabsPrivate</em>, <em>extensions.privateTab.makeNewEmptyWindowsPrivate</em>)
`+` Добавлена китайская (Traditional) локаль (zh-TW), спасибо arbiger
`+` Добавлена японская локаль (ja), спасибо charishi
`x` Workaround для browser.newtab.preload = true
`x` Исправлено корректирование ширины кнопки-меню приложения: добавлена задержка, чтобы успели примениться стили других расширений
`x` Исправлено: сочетание клавиш для переключения приватности вкладки иногда работало не для текущей вкладки
`*` Добавлена возможность задания нескольких сочетаний клавиш для одной команды: <em>extensions.privateTab.key.</em>%command%<em>#</em>%alias_name%
`x` Исправлено (надеюсь): сочетания клавиш не работали на не латинских раскладках клавиатуры
`*` Небольшие оптимизации

##### 0.1.0b4 (2013-03-26)
`+` Добавлено определение страниц от Speed Dial и FVD Speed Dial как пустых
`+` Добавлен атрибут «privateTab-isPrivate» для приватного окна (может использоваться в пользовательских стилях)
`+` Добавлена кнопка для панелей инструментов
`x` Исправлено восстановление закрытых не приватных вкладок в приватных окнах
`+` Закрытые приватные вкладки больше не сохраняются в списке недавно закрытых (настройка <em>extensions.privateTab.rememberClosedPrivateTabs</em>)
`+` Добавлена настройка <em>extensions.privateTab.sendRefererHeader</em>
`x` Перетаскивание: исправлено изменение приватности уже открытых вкладок
`*` Перетаскивание: новая вкладка (или вкладка, на которую перетащили) становится приватной, если источник или получатель были приватными (настройка <em>extensions.privateTab.dragAndDropBehavior</em>)
`+` Реализованы API для других расширений
`+` Добавлено обновление вкладки после переключения приватности из контекстного меню (настройка <em>extensions.privateTab.toggleTabPrivateAutoReload</em>)

##### 0.1.0b3 (2013-03-19)
`+` Добавлена возможность перетаскивания вкладок между приватными и не приватными окнами (настройка <em>extensions.privateTab.dragAndDropTabsBetweenDifferentWindows</em>)
`x` Исправлено открытие ссылок в приватных вкладках: вкладки не сохранялись в истории, но использовались не приватные cookies

##### 0.1.0b2 (2013-03-17)
`*` Пункт контекстного меню закладок «Открыть в новой вкладке» теперь всегда открывает не приватную вкладку: после добавления пункта «Открыть в новой приватной вкладке» такое поведение более интуитивно
`x` Добавлено скрытие текста сочетаний клавиш в меню приложения и исправлено некорректное отображение текста сочетаний клавиш встроенного пункта «Новое приватное окно» (<a href="https://github.com/Infocatcher/Private_Tab/issues/3">#3</a>)
`x` Исправлено обновление сочетаний клавиш в нескольких окнах при изменении настроек <em>extensions.privateTab.key.*</em>
`x` Исправлено перетаскивание из приватных вкладок в приватном окне
`+` Добавлена настройка <em>extensions.privateTab.dragAndDropUseTargetPrivateState</em> для использования приватного состояния «получателя» для перетаскиваемых ссылок (<a href="https://github.com/Infocatcher/Private_Tab/issues/4">#4</a>)
`*` Некоторые внутренние улучшения

##### 0.1.0b2pre (2013-03-14)
`*` Улучшен способ фиксирования ширины кнопки-меню приложения
`*` Добавлено обновление ширины «заполнителя» для кнопки-меню приложения, если ширина кнопки не может быть зафиксирована
`+` Добавлен пункт контекстного меню для закладок (<a href="https://github.com/Infocatcher/Private_Tab/issues/2">#2</a>)

##### 0.1.0b1 (2013-03-13)
`*` Приватное состояние при перетаскивании теперь наследуется от вкладки-источника
`+` Экспериментальное: пункты меню теперь также добавляются и во встроенные приватные окна
`*` Теперь можно открыть новое не приватное окно из приватной вкладки (с помощью команды «Новое окно»)
`+` Добавлена поддержка встроенного пункта контекстного меню «Открыть ссылку в новом приватном окне» в SeaMonkey 2.19a1
`*` Исправлена ширина кнопки-меню приложения: используется одна и та же ширина для приватного и не приватного состояния (настройка <em>extensions.privateTab.fixAppButtonWidth</em>)
`x` Исправлено некорректное отображение пунктов контекстного меню «Открыть ссылку в новой вкладке/новом окне»
`*` При открытии новой приватной вкладки фокус переносится а адресную строку

##### 0.1.0a3 (2013-02-20)
`*` Первая публичная версия