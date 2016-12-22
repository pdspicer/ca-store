#!/usr/bin/env node

var CaStore = require('..'),
    command = process.argv[2],
    file = process.argv[3] || false,
    commands = ['generate', 'bundle', 'pems', 'exports'];

// if we don't know what command to run, just print usage
if (commands.indexOf(command) < 0) printUsage();

// if command was to generate but no file is given, default to 'pems' command
if ((command === 'generate' || command === 'bundle') && !file) command = 'pems';

CaStore[command](file)
    .then(function () {
        if (file) process.exit(0);
        process.stdout.write('\n');
        process.once("drain", function () {
            process.exit(0)
        })
    })
    .catch(function (err) {
        console.error(err.stack);
        process.exit(err.code || 1);
    });

function printUsage () {
    var help = [
        "",
        "usage: ca-store [command] [output]",
        "",
        "commands:",
        "  help             print this usage info",
        "  pems <dir>       saves latest root certs to individual PEM files in <dir>",
        "  exports <file>   writes latest root certs to <file> as a node.js script",
        "                   that exports them as an array",
        "  generate <file>  does both exports and pems commands, pems are saved to ",
        "                   pems/ directory at the same path where <file> is located",
        "  bundle <file>    saves latest root certs to a single .crt bundle file",
        "",
        "output (relative to current working directory):",
        "  <file>    the path of the file to write to",
        "  <dir>     the path of the directory to write to",
        "  <stdout>  omitting [file] or [dir] will cause all output to be written to ",
        "            stdout, which can then be piped to other programs.",
        ""
    ];
    console.info(help.join('\n  '));
    
    process.exit(0);
}