var log = require('invigilate')(module),
    Certificate = require('./certificate'),
    isComment = /^#|^\s*$/,
    isCert = /^CKA_CLASS CK_OBJECT_CLASS CKO_CERTIFICATE/,
    isName = /^CKA_LABEL UTF8 \"(.*)\"/,
    isBody = /^CKA_VALUE MULTILINE_OCTAL/,
    isEnd = /^END/,
    isTrustSection = /^CKA_CLASS CK_OBJECT_CLASS CKO_NSS_TRUST/,
    isUntrusted = /^CKA_TRUST_SERVER_AUTH\s+CK_TRUST\s+CKT_NSS_NOT_TRUSTED$/,
    isUnknown = /^CKA_TRUST_SERVER_AUTH\s+CK_TRUST\s+CKT_NSS_TRUST_UNKNOWN$/;

module.exports = Parser;

function Parser (body) {
    this.body = body;
    this.certs = [];
    this.skipped = 0;
}

Parser.prototype = {
    parse: parseCertData,
    parseLine: parseLine,
    parseBody: parseBody,
    doUntil: doUntil
};

Parser.parse = function (body) {
    return new Parser(body).parse();
}

function parseCertData() {
    var cert;
    
    this.lines = this.body.split('\n');
    this.certs = [];
    this.skipped = 0;
    
    while (this.lines.length > 0) cert = this.parseLine(this.lines.shift(), cert);
    
    log.info("Skipped %s untrusted certificates.", this.skipped);
    log.info("Processed %s certificates.", this.certs.length);
    
    return this.certs;
}

function parseLine(line, current) {
    var match,
        trusted;
    
    // check if we're inside or outside of a cert on this line
    if (isCert.test(line)) return new Certificate();
    else if (isComment.test(line) || !current) return current;
    
    // check if the line is name or body
    if (match = line.match(isName)) current.name = decodeURIComponent(match[1]);
    else if (isBody.test(line)) {
        trusted = this.parseBody(current);
        trusted ? this.certs.push(trusted) : this.skipped++;
        return null;
    }
    
    return current;
}

function parseBody(current) {
    this.doUntil(isEnd, buildBody);
    this.doUntil(isTrustSection, null);
    this.doUntil(isComment, checkTrust);
    
    if (current.trusted) return current;
    
    function buildBody (line) {
        current.body += line;
    }
    
    function checkTrust (line) {
        if (isUntrusted.test(line) || isUnknown.test(line)) current.trusted = false;
    }
}

function doUntil (match, fn) {
    var line = null;
    while (this.lines.length > 0) {
        line = this.lines.shift();
        if(match.test(line)) return line;
        fn && fn(line);
    }
}