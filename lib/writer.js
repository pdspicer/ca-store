var Promise = require('bluebird'),
    log = require('invigilate')(module),
    path = require('path'),
    fs = Promise.promisifyAll(require('fs'));

module.exports = {write: write, writePems: writePems, writeBundle: writeBundle, writeExports: writeExports};

function writePems (certs, dir) {
    var prohibitedFilenameChars = /[\\\s\/\(\)\.]+/g,
        adjacentDashes = /-+/g,
        toStdOut = dir === false,
        pemsDir = dir || '',
        destinationString = toStdOut ? 'stdout' : pemsDir.replace(/'/g, "\\'"),
        pem,
        pemName,
        pemFile;
    
    return Promise.map(certs, writePem)
        .tap(function () { log.info("Wrote " + certs.length + " certificates to '" + destinationString + "'."); });
    
    
    function writePem (cert) {
        pemName = cert.name.toLowerCase().replace(prohibitedFilenameChars, '-').replace(adjacentDashes, '-');
        pemFile = path.join(pemsDir, pemName + '.pem');
        
        return toStdOut ? fs.writeAsync(1, cert.PEM() + '\n') : fs.writeFileAsync(pemFile, cert.PEM());
    }
}

function writeBundle (certs, file) {
    var toStdOut = file === false,
        pemArray = certs.map(function (cert) { return cert.PEM(); }),
        filename = file || '',
        destinationString = toStdOut ? 'stdout' : filename.replace(/'/g, "\\'"),
        bundleContent = pemArray.join('\n');
    
    return (toStdOut ? fs.writeAsync(1, bundleContent) : fs.writeFileAsync(filename, bundleContent))
        .tap(function () { log.info("Wrote bundle to '" + destinationString + "'."); });
    
}

function writeExports (certs, file) {
    var certsArray = certs.map(function (cert) { return cert.quasiPEM(); }),
        joinStr = ',\n\n',
        prefix = 'module.exports = [\n',
        suffix = '\n];\n',
        toStdOut = file === false,
        filename = file || '',
        destinationString = toStdOut ? 'stdout' : filename.replace(/'/g, "\\'"),
        scriptContent = prefix + certsArray.join(joinStr) + suffix;
    
    // write parts is used in place of a simple write because certain systems will truncate writes to stdout if they're
    // too long
    return (toStdOut ? writeParts() : fs.writeFileAsync(filename, scriptContent))
        .tap(function () { log.info("Wrote exports to '" + destinationString + "'."); });
    
    // write parts is going to write out each section of the exports separately
    function writeParts () {
        return fs.writeAsync(1, prefix)
            .then(function () { return writeArray(certsArray, joinStr); })
            .then(function () { return fs.writeAsync(1, suffix)})
    }
}

function writeArray (array, join) {
    var copy = array.splice(0),
        last = copy.pop();
    return Promise.map(copy, function (elem) { return fs.writeAsync(1, elem + join); })
        .then(function () { return fs.writeAsync(1, last); });
}

function write (certs, pemsDir, filename) {
    return Promise.join(writePems(certs, pemsDir), writeExports(certs, filename));
}