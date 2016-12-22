module.exports = Certificate;

function Certificate() {
    this.name = null;
    this.body = '';
    this.trusted = true;
}

Certificate.prototype.pemArray = function pemArray() {
    if (this.lines) return this.lines;
    this.lines = Certificate.fromOctal(this.body);
    return this.lines;
};

Certificate.prototype.PEM = function PEM() {
    return this.pemArray().toString();
};

Certificate.prototype.quasiPEM = function quasiPEM() {
    var joinStr = ' +\n',
        wrapComment = makeWrapper('  // ', '\n'),
        wrapLine = makeWrapper('  "', '\\n"');
    
    return wrapComment(this.name) + this.pemArray().map(wrapLine).join(joinStr);
    
    function makeWrapper (prefix, suffix) {
        return function (str) {
            return prefix + str + suffix;
        }
    }
};

Certificate.fromOctal = function fromOctal (octal) {
    var bytes = octal.split('\\'),
        converted = new Buffer(bytes.length - 1),
        offset = 0,
        captureLine = /(.{1,76})/g,
        beginCert = "-----BEGIN CERTIFICATE-----",
        endCert = "-----END CERTIFICATE-----",
        lines;
    
    bytes.shift();
    while(bytes.length > 0) {
        converted.writeUInt8(parseInt(bytes.shift(), 8), offset++);
    }
    lines = converted.toString('base64').match(captureLine);
    lines.unshift(beginCert);
    lines.push(endCert);
    lines.toString = function linesToString() {
        return this.join('\n');
    };
    
    return lines;
};