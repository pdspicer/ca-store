# ca-store

This module is a derivative of ssl-root-cas by AJ ONeal and Forrest Norvell.

It can be used as a global utility for managing certificate files or locally to retrieve a list of root-cas for
use in other scripts. Unlike ssl-root-cas, it does not do any trust management for node processes, thus if you 
are looking to solve these types of problems, you should still refer to ssl-root-cas.

## Usage
All ca-store methods return bluebird promises, with the exception of the `load()` method.

ca-store can be used to download the latest mozilla root ca chain: 
```javascript
var caStore = require('ca-store');

caStore.download().then(rootCas => {
    /* 
     * rootCas is an array of PEM-style certs:
     * -----BEGIN CERTIFICATE-----
     * ...
     * -----END CERTIFICATE-----
     */
})
```
It can also be used to load a local chain:
```javascript
// sync
var rootCas = caStore.load('/etc/ssl/certs/ca-bundle.crt');

// async
caStore.loadAsync('/etc/ssl/certs/ca-bundle.crt').then(rootCas => {
    /* ... */
})
```
ca-store also provides some methods for saving output from the cert download. These are described below.

## API
### caStore.download(options)
* **Params:**
    - _options (object)_: controls return type
        - _raw (boolean)_: whether or not to return raw cert with metaata, defaults to false
* **Returns:** A bluebird-style promise that resolves to an array of the newly downloaded certs (plus metadata, if raw: true)
in _options_.

Downloads and returns the latest certificates from mozilla. Basic usage shown above. If options.raw is truthy, returned
array will contain objects that include the cert name, trust, and raw cert string in octal. The PEM format can be extracted
by using cert.PEM(), which will return the string representation.

### caStore.exports(scriptName)
* **Params:**
    - _scriptName (string)_: filepath of the script to generate, defaults to "./ssl-root-cas.js"
* **Returns:** A bluebird-style promise that resolves to an array of the newly downloaded certs

Downloads the latest certificates from mozilla, saving the output to a .js script. The location is interpreted relative 
to the cwd of the node process. Full paths can be provided and any missing intermediate directories will be automatically 
created. If the script does not end with .js, it will be added to the provided filepath.
If _scriptName_ is explicitly set to false, output will be sent to `process.stdout`.
```javascript
caStore.generate('path/to/rootCas.js')
```
The file structure relative to the cwd after `exports` completes will be as follows:
```
cwd/
  path/
    to/
      rootCas.js
      pems/
        some-cert.pem
        ...
        ...
```
and rootCas.js will be a simple node script that exports an array of all saved PEMs:
```javascript
module.exports = [
  // some-cert
  "-----BEGIN CERTIFICATE-----\n" +
  "...\n" +
  "-----END CERTIFICATE-----\n",
  
  // more-certs
  ...
];
```
### caStore.pems(destinationDirectory)
* **Params:**
    - _destinationDirectory (string)_: filepath of the directory to write .pems to, defaults to "./pems"
* **Returns:** A bluebird-style promise that resolves to an array of the newly downloaded certs

Downloads the latest certificates from mozilla, saving the output to individual files for each cert to the provided 
destination directory. As with exports, paths will be relative to cwd, and all intermediate directories (including the 
actual output directory) will be created if they did not previously exist. This operation will overwrite existing files 
in those locations if their names conflict.
If _scriptName_ is explicitly set to false, output will be sent to `process.stdout`.

### caStore.generate(scriptName)
* **Params:**
    - _scriptName (string)_: filepath of the script to generate, defaults to "./ssl-root-cas.js"
* **Returns:** A bluebird-style promise that resolves to an array of the newly downloaded certs

Does both `caStore.exports` and `caStore.pems`, writing the script as specified above, and .pems to a pems/ directory that 
will be located in the same directory as the saved script. 

### caStore.bundle(destinationFile)
* **Params:**
    - _scriptName (string)_: filepath of the bundle to generate, defaults to "./ssl-root-ca-bundle.crt"
* **Returns:** A bluebird-style promise that resolves to an array of the newly downloaded certs

Operates similarly to `caStore.pems`, but outputs a single bundle file instead of a directory of individual .pem files.
If the provided destination file does not end with .crt, .cert, or .pem, the ".crt" extension will be added.

### caStore.load(path, options)
* **Params:**
    - _path (string)_: filepath of the file(s) to load, can be a directory or individual file, defaults to './ssl-root-cas'
    - _options (object)_: (optional... who woulda thought?) provides a couple of ways to customize the loading process
        - _extensions (string | Array)_: one or more file extensions to whitelist, defaults to ['', '.js', '.pem', '.crt', '.cert'].
        Order matters, earlier extensions will be preferred over later ones if a specific filename is provided (see below)
        - _depth (number)_: number of directories to recurse down through when loading certs. Defaults to Infinity
        - _encoding (string)_: file encoding to use when reading, defaults to utf-8
* **Returns:** An array of the loaded certs

Loads certs from the filesystem located at or below the provided path, which is once again relative to the cwd. By default
this process will recurse through directories until all matching files have been read. Matching files will be whitelisted
based on extension, which can be customized using options. If a specific filename is provided without an extension, and the
directory in question has multiple files by that name with different extensions, then ordering for extensions also represents
a preference for which of these files to load, where lower-indexed extensions will take precedent over higher-indexed extensions
in the `options.extensions` field.

### caStore.loadAsync(path, options)
Same as `caStore.load` but returns a bluebird-style promise that resolves to an array of the loaded certs and uses non-blocking
file operations instead of their sync counterparts.

## CLI
ca-store exposes a CLI that can be used directly if installing globally, or within npm scripts locally. For convenience,
the usage message from the CLI is included below. The functionality is the same as the API, but with the intent that output
can be piped to other processes if output locations are omitted.
```
> ca-store help

  usage: ca-store [command] [output]
  
  commands:
    help             print this usage info
    pems <dir>       saves latest root certs to individual PEM files in <dir>
    exports <file>   writes latest root certs to <file> as a node.js script
                     that exports them as an array
    generate <file>  does both exports and pems commands, pems are saved to 
                     pems/ directory at the same path where <file> is located
    bundle <file>    saves latest root certs to a single .crt bundle file
  
  output (relative to current working directory):
    <file>    the path of the file to write to
    <dir>     the path of the directory to write to
    <stdout>  omitting [file] or [dir] will cause all output to be written to 
              stdout, which can then be piped to other programs.
  
```

## License
Copyright 2016 Paul Spicer.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.