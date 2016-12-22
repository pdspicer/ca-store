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
    console.info("Usage:");
    console.info("       ca-store help");
    console.info("       ca-store generate [outputfile]");
    console.info("       ca-store pems [outputdir]");
    console.info("       ca-store exports [outputfile]");
    console.info("   where [outputfile] is the name of the file to write to, relative to the current working directory");
    console.info("   Note that for generate, a 'pems/' directory will also be created at the same location as the [outputfile], " +
        "   containing individual .pem files.");
    console.info("   Omitting [outputfile] or [outputdir] will cause all output to be written to stdout");
    
    process.exit(0);
}