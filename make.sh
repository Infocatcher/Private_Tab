#!/bin/sh

PROG=false
VER=`sed -nr 's%^\s*<em:version>([.0-9a-z]+)</em:version>\s*$%\1%p' install.rdf`
XPI=private_tab-${VER}.xpi
FILES='install.rdf *.manifest *.js *.jsm *.xul *.xml *.html *.css license* *.png defaults modules components locale chrome idl'

if test -f ${XPI}; then
    echo title Error - Make ${XPI}
    echo =============================================
    echo Something went wrong, please remove or rename
    echo ${XPI}
    echo =============================================
    exit 1
fi

for z in 7za 7z zip
do
	if command -v $z >/dev/null 2>&1
	then
	PROG=$z
	break
	fi
done

if test $PROG = false
then
	echo "usable program not found, abort."
	exit 1
else
	echo "use $PROG to create xpi."
fi

if test $PROG = zip
then
	$PROG -9r $XPI $FILES
else
	$PROG a -tzip -mm=Deflate -mx9 -mfb258 -mpass=15 $XPI $FILES
fi
