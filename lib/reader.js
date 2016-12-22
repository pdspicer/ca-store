'use strict';

// Explained here: https://groups.google.com/d/msg/nodejs/AjkHSYmiGYs/1LfNHbMhd48J

var Promise = require('bluebird'),
    fs = require('fs'),
    log = require('invigilate')(module),
    request = require('request'),
    CERTDB_URL = 'https://mxr.mozilla.org/nss/source/lib/ckfw/builtins/certdata.txt?raw=1';
    
module.exports = {download: download, GenerationError: GenerationError};

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

function GenerationError (error, code) {
  Error.call(this);
  Error.captureStackTrace(this, GenerationError);
  this.name = 'GenerationError';
  this.error = this.message = error instanceof Error ? error.message : error;
  this.code = code;
  log.error(this.stack);
}

GenerationError.prototype = Object.create(Error.prototype);

