@echo off
set _out=private_tab-latest.xpi
set _out_tmp=%~d0\~%_out%.tmp
if exist %_out_tmp% set _out_tmp=%_out%.tmp
set _7zip="%COMMANDER_PATH%\arch\7-Zip-4.65\7z.exe"
set _winRar="%COMMANDER_PATH%\arch\WinRAR\WinRAR.exe"

if not exist %_7zip% set _7zip="%ProgramFiles%\7-Zip\7z.exe"
if not exist %_winRar% set _winRar="%ProgramFiles%\WinRAR\WinRAR.exe"

if not exist %_7zip% (
	echo 7-Zip not found!
	if not exist %_winRar% (
		echo WinRAR not found!
		pause
		exit /b
	)
)

cd /d "%~dp0"

set _files=install.rdf *.manifest *.js *.xul *.xml license* changelog* *.png defaults modules components locale chrome idl
if exist %_7zip% (
	echo =^> %_7zip%
	%_7zip% a -tzip -mx9 -mfb=258 -mpass=15 -- %_out_tmp% %_files%
) else (
	echo =^> %_winRar%
	%_winRar% a -afzip -m5 -r -- %_out_tmp% %_files%
)

if not exist %_out_tmp% echo Error: %_out_tmp% not found! & pause & exit /b

if not exist %_out% goto skipCompare
fc /l /lb2 /t %_out% %_out_tmp%
if %ErrorLevel% == 0 (
	del %_out_tmp%
	echo ===============
	echo ==^> No changes!
	echo ===============
	if not "%1" == "nodelay" ping -n 3 127.0.0.1 > nul
	exit /b
)
:skipCompare

echo ==^> Changed, update...
move /y %_out_tmp% %_out%