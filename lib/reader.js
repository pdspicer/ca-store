'use strict';

// Explained here: https://groups.google.com/d/msg/nodejs/AjkHSYmiGYs/1LfNHbMhd48J

var Promise = require('bluebird'),
    fs = Promise.promisifyAll(require('fs')),
    path = require('path'),
    log = require('invigilate')(module),
    request = require('request'),
    CERTDB_URL = 'https://mxr.mozilla.org/nss/source/lib/ckfw/builtins/certdata.txt?raw=1';
    
module.exports = {read: read, download: download, GenerationError: GenerationError};

function download () {
    var status,
        contentType,
        isPlain;
    
    log.info("Loading latest certificates from " + CERTDB_URL);
    
    return new Promise(function (resolve, reject) {
        request.get(CERTDB_URL, function (error, response, body) {
            if (error) return reject(new GenerationError(error, 1));
            
            status = response.statusCode;
            contentType = response.headers['content-type'];
            isPlain = contentType.indexOf('text/plain') === 0;
            
            if (status !== 200) return reject(new GenerationError("Fetching failed with status code " + status, 2));
            if (!isPlain) return reject(new GenerationError("Fetching failed with incorrect content type " + contentType, 2));
            
            return resolve(body);
        });
    });
}

function read (filepath, options, async) {
    var opts = options instanceof Object ? options : {},
        depth = opts.depth === undefined ? Infinity : (+opts.depth || 0),
        file = path.resolve(process.cwd(), filepath || 'ssl-root-cas'),
        extsByPreference = buildExts(opts.extensions);
    
    return async ? getFirstMatch(file, depth).then(resultOrArray) : resultOrArray(getFirstMatch(file, depth));
    
    function resultOrArray (result) {
        return result || [];
    }
    
    function buildExts (extensions) {
        if (!extensions) return ['', '.js', '.pem', '.crt', '.cert'];
        return [].concat(extensions)
            .filter(function (ext) { return !!ext; })
            .map(function (ext) { return ext.indexOf('.') !== 0 ? '.' + ext : ext;})
            .concat('');
    }
    
    function getFirstMatch (file, depth) {
        return async
            ? Promise.reduce(extsByPreference, matchReducer, null)
            : extsByPreference.reduce(matchReducer, null);
        
        function matchReducer (match, ext) {
            if (match) return match;
            return checkFile(file + ext, depth);
        }
    }
    
    function checkFile (file, depth) {
        if (async) return fs.statAsync(file).then(processStat).catch(handleError);

        try { return processStat(fs.statSync(file)); }
        catch (err) { return handleError(err); }
        
        function processStat (stat) { return stat.isDirectory() ? checkDir(file, depth) : readFile(file); }
        function handleError (err) {
            return null;
        }
    }
    
    function checkDir (dir, depth) {
        if (depth-- <= 0) return null;
        var files = (async ? fs.readdirAsync(dir) : fs.readdirSync(dir))
            .filter(function (file) { return extsByPreference.indexOf(path.extname(file)) >= 0; })
            .map(function (file) { return getFirstMatch(path.join(dir,file), depth); });
        
        return async ? files.then(flatten) : flatten(files);
    }
    
    function readFile (file) {
        return path.extname(file) !== '.js'
            ? splitCa(file)
            : require(file);
    }
    
    function flatten (list) {
        return [].concat.apply([], list);
    }
    
    function splitCa(filepath) {
        var ca = [];
        
        if (async) return fs.readFileAsync(filepath, opts.encoding || 'utf8')
            .then(bufferToString)
            .then(checkContents)
            .reduce(caReducer, null)
            .return(ca);
        
        checkContents(bufferToString(fs.readFileSync(filepath, opts.encoding || 'utf8')))
            .reduce(caReducer, null);
        
        return ca;
    
        function bufferToString(buffer) { return buffer.toString(); }
        function checkContents (contents) {
            if(contents.indexOf("-END CERTIFICATE-") < 0 || contents.indexOf("-BEGIN CERTIFICATE-") < 0) {
                throw Error("File does not contain 'BEGIN CERTIFICATE' or 'END CERTIFICATE'");
            }
            return contents.split('\n');
        }
        function caReducer (cert, line) {
            if (line.match(/-BEGIN CERTIFICATE-/)) return [line];
            if (!cert) return null;
            if (line.length) cert.push(line);
            if (line.match(/-END CERTIFICATE-/)) {
                ca.push(cert.join('\n')+'\n');
                return null;
            }
            return cert;
        }
    }
}

function GenerationError (error, code) {
  Error.call(this);
  Error.captureStackTrace(this, GenerationError);
  this.name = 'GenerationError';
  this.error = this.message = error instanceof Error ? error.message : error;
  this.code = code;
  log.error(this.stack);
}

GenerationError.prototype = Object.create(Error.prototype);

