var path = require('path');
var https = require('https');
var fs = require('fs');
var Promise = require('bluebird');
var reader = require('./lib/reader'),
    writer = require('./lib/writer'),
    parser = require('./lib/parser');

var CaStore = module.exports = {};

CaStore.download = function downloadToPems () {
    return download().map(toPEM);
};

CaStore.generate = function generate (filepath) {
    var file = path.resolve(process.cwd(), filepath || 'ssl-root-cas'),
        extNotJs = path.extname(file) !== '.js',
        outputFile = extNotJs ? (file + '.js') : file,
        
        // pems output file location, relative to the current working directory and the directory of the output file
        outputPemsDir = path.resolve(process.cwd(), path.dirname(outputFile), 'pems');

    return chkdirAndDownload(outputPemsDir)
        .tap(function (certs) { return writer.write(certs, outputPemsDir, outputFile); })
        .map(toPEM);
};

CaStore.exports = function pems (filepath) {
    var toFile = filepath !== false,
        file = path.resolve(process.cwd(), filepath || 'ssl-root-cas'),
        extNotJs = path.extname(file) !== '.js',
        outputFile = extNotJs ? (file + '.js') : file,
        certs = toFile ? chkdirAndDownload(path.dirname(outputFile)) : download();
    
    return certs
        .tap(function (certs) { return writer.writeExports(certs, toFile && outputFile); })
        .map(toPEM);
};

CaStore.pems = function pems (filepath) {
    var toFile = filepath !== false,
        outputPemsDir = path.resolve(process.cwd(), filepath || 'pems'),
        certs = toFile ? chkdirAndDownload(outputPemsDir) : download();
    
    return certs
        .tap(function (certs) { return writer.writePems(certs, toFile && outputPemsDir); })
        .map(toPEM);
};

CaStore.bundle = function (filepath) {
    var file = path.resolve(process.cwd(), filepath || 'ssl-root-ca-bundle'),
        extNotJs = path.extname(file) !== '.crt',
        outputFile = extNotJs ? (file + '.crt') : file;
    
    return download()
        .tap(function (certs) { return writer.writeBundle(certs, outputFile); })
        .map(toPEM);
}

CaStore.load = function generate (filepath) {
    var file = path.resolve(process.cwd(), filepath || 'ssl-root-cas'),
        extNotJs = path.extname(file) !== '.js',
        outputFile = extNotJs ? (file + '.js') : file,
        stat;
    
    try {
        stat = fs.statSync(outputFile);
        if (stat.isDirectory()) return [];
    }
    catch (err) {
        return [];
    }
    return require(outputFile);
};

function chkdirAndDownload (file) {
    return chkdirAsync(file).then(download);
}

function download () {
    return reader.download().then(parser.parse);
}

function toPEM (cert) {
    return cert.PEM();
}

function chkdirAsync (dir) {
    return new Promise(function (res, rej) {
        try {
            chkdir(dir);
            res(true);
        }
        catch (err) {
            rej(err);
        }
    })
}

function chkdir (dir) {
    var stat,
        error = null;
    try {
        stat = fs.statSync(dir);
        if (!stat.isDirectory()) error = new Error('Could not create directory structure: ' + dir + ' is not a directory');
    }
    catch (err) {
        if (err.code === 'ENOENT' && chkdir(path.dirname(dir))) fs.mkdirSync(dir);
        else error = err;
    }
    
    if (error) throw error;
    return true;
}
