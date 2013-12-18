#!/bin/sh

PROG=false
XPI=private_tab-latest.xpi
FILES='install.rdf *.manifest *.js *.jsm *.xul *.xml *.html license* *.png defaults modules components locale chrome idl'

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