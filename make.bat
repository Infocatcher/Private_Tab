@echo off
set _7zip="%COMMANDER_PATH%\arch\7-Zip-4.65\7z.exe"
set _out=private_tab-latest.xpi
set _out_tmp=%_out%.tmp

if not exist %_7zip% set _7zip="%ProgramFiles%\7-Zip\7z.exe"
if not exist %_7zip% echo 7-Zip not found! & pause & exit /b
echo =^> %_7zip%

cd /d "%~dp0"

%_7zip% a -tzip -mx9 -mfb=258 -mpass=15 -- %_out_tmp% install.rdf *.manifest *.js *.xul *.xml license* icon*.png defaults modules components locale chrome

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