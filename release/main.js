'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

class EnergieSourceData {
    constructor(sourceId) {
        this.sourceId = sourceId;
    }
}

class MineralSourceData {
    constructor(sourceId, type) {
        this.mineralId = sourceId;
        this.mineralType = type;
    }
}

function extendRoom() {
    Room.prototype.getOrFindEnergieSource = function () {
        let ids = this.memory.energySources;
        if (ids && ids.length > 0) {
            return ids;
        }
        const source = Game.rooms[this.name].find(FIND_SOURCES);
        this.memory.energySources = [];
        for (let s of source) {
            this.memory.energySources.push(new EnergieSourceData(s.id));
        }
        return this.memory.energySources;
    };
    Room.prototype.getMaxAvailableEnergy = function () {
        var _a;
        const room = Game.rooms[this.name];
        if (!room.controller || !room.controller.my) {
            return 0;
        }
        const controllerLevel = room.controller.level;
        // Spawns: Level 1+ = 1 Spawn, Level 7+ = 2 Spawns, Level 8 = 3 Spawns
        let maxSpawns = 1;
        if (controllerLevel >= 7)
            maxSpawns = 2;
        if (controllerLevel >= 8)
            maxSpawns = 3;
        // Extensions basierend auf Controller Level
        const maxExtensionsByLevel = [0, 0, 5, 10, 20, 30, 40, 50, 60];
        const maxExtensions = maxExtensionsByLevel[controllerLevel] || 0;
        // Aktuelle Spawns und Extensions zählen (aber maximal erlaubte)
        const actualSpawns = room.find(FIND_MY_SPAWNS);
        const actualExtensions = room.find(FIND_MY_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_EXTENSION
        });
        const usableSpawns = Math.min(actualSpawns.length, maxSpawns);
        const usableExtensions = Math.min(actualExtensions.length, maxExtensions);
        let total = (usableSpawns * 300) + (usableExtensions * 50);
        if (room.memory.spawnPrioBlock && ((room.storage && ((_a = room.storage) === null || _a === void 0 ? void 0 : _a.store[RESOURCE_ENERGY]) < total) || !room.storage)) {
            if (controllerLevel > 4 && controllerLevel < 6) {
                return total / 2;
            }
            if (controllerLevel > 5) {
                return total / 3;
            }
        }
        // Berechne verfügbare Energie
        return total;
    };
    Room.prototype.findAllContainersNearSpawns = function () {
        const spawns = Game.rooms[this.name].find(FIND_MY_SPAWNS);
        const containers = [];
        for (const spawn of spawns) {
            const nearbyContainers = spawn.pos.findInRange(FIND_STRUCTURES, 2, {
                filter: (structure) => {
                    return structure.structureType === STRUCTURE_CONTAINER;
                }
            });
            // Duplikate vermeiden
            for (const container of nearbyContainers) {
                if (!containers.find(c => c.id === container.id)) {
                    containers.push(container);
                }
            }
        }
        return containers;
    };
    Room.prototype.findAllContainersNearController = function () {
        var _a;
        let room = Game.rooms[this.name];
        if (!room.controller || !room.controller.my) {
            return [];
        }
        const containers = [];
        const nearbyContainers = (_a = Game.rooms[this.name].controller) === null || _a === void 0 ? void 0 : _a.pos.findInRange(FIND_STRUCTURES, 2, {
            filter: (structure) => {
                return structure.structureType === STRUCTURE_CONTAINER;
            }
        });
        // Duplikate vermeiden
        for (const container of nearbyContainers) {
            if (!containers.find(c => c.id === container.id)) {
                containers.push(container);
            }
        }
        return containers;
    };
    Room.prototype.findAllLinksNearController = function () {
        var _a;
        let room = Game.rooms[this.name];
        if (!room.controller || !room.controller.my) {
            return [];
        }
        const links = [];
        const nearby = (_a = Game.rooms[this.name].controller) === null || _a === void 0 ? void 0 : _a.pos.findInRange(FIND_STRUCTURES, 3, {
            filter: (structure) => {
                return structure.structureType === STRUCTURE_LINK;
            }
        });
        // Duplikate vermeiden
        for (const link of nearby) {
            if (!links.find(c => c.id === link.id)) {
                links.push(link);
            }
        }
        return links;
    };
    Room.prototype.findAllLinksNearSpawns = function () {
        const spawns = Game.rooms[this.name].find(FIND_MY_SPAWNS);
        const links = [];
        for (const spawn of spawns) {
            const nearby = spawn.pos.findInRange(FIND_STRUCTURES, 3, {
                filter: (structure) => {
                    return structure.structureType === STRUCTURE_LINK;
                }
            });
            // Duplikate vermeiden
            for (const link of nearby) {
                if (!links.find(c => c.id === link.id)) {
                    links.push(link);
                }
            }
        }
        return links;
    };
    Room.prototype.getOrFindRoomStorage = function () {
        var _a, _b;
        const room = Game.rooms[this.name];
        if (!this.memory.storage) {
            this.memory.storage = {
                storageContainerId: [],
                storageId: (_a = room.storage) === null || _a === void 0 ? void 0 : _a.id
            };
            const containers = [
                ...room.findAllContainersNearSpawns(),
                ...room.findAllContainersNearController()
            ];
            const uniqueContainers = containers.filter((container, index, arr) => arr.findIndex(c => c.id === container.id) === index);
            this.memory.storage.storageContainerId = uniqueContainers.map(c => c.id);
        }
        if (this.memory.state >= 4 /* eRoomState.phase4 */ && !this.memory.storage.storageId) {
            this.memory.storage.storageId = (_b = room.storage) === null || _b === void 0 ? void 0 : _b.id;
        }
        return this.memory.storage;
    };
    Room.prototype.getOrFindTargetLinks = function () {
        if (this.memory.state < 5 /* eRoomState.phase5 */) {
            return [];
        }
        const room = Game.rooms[this.name];
        if (!this.memory.targetLinkIds || this.memory.targetLinkIds.length == 0) {
            this.memory.targetLinkIds = [];
            const links = [
                ...room.findAllLinksNearSpawns(),
                ...room.findAllLinksNearController()
            ];
            const unique = links.filter((link, index, arr) => arr.findIndex(c => c.id === link.id) === index);
            this.memory.targetLinkIds = unique.map(c => c.id);
        }
        return this.memory.targetLinkIds;
    };
    Room.prototype.getOrFindMineralSource = function () {
        let ids = this.memory.mineralSources;
        if (ids && ids.length > 0) {
            return ids;
        }
        const mineral = Game.rooms[this.name].find(FIND_MINERALS);
        for (let m of mineral) {
            this.memory.mineralSources.push(new MineralSourceData(m.id, m.mineralType));
        }
        return this.memory.mineralSources;
    };
    Room.prototype.setRoomState = function (controller) {
        let state = 0 /* eRoomState.neutral */;
        if (!controller.my && controller.owner != undefined && controller.owner.username != undefined) {
            state = 9 /* eRoomState.otherPlayer */;
        }
        switch (controller.level) {
            case 1:
                state = 1 /* eRoomState.phase1 */;
                break;
            case 2:
                state = 2 /* eRoomState.phase2 */;
                break;
            case 3:
                state = 3 /* eRoomState.phase3 */;
                break;
            case 4:
                state = 4 /* eRoomState.phase4 */;
                break;
            case 5:
                state = 5 /* eRoomState.phase5 */;
                break;
            case 6:
                state = 6 /* eRoomState.phase6 */;
                break;
            case 7:
                state = 7 /* eRoomState.phase7 */;
                break;
            case 8:
                state = 8 /* eRoomState.phase8 */;
                break;
        }
        if (state != this.memory.state) { //bei jedem wechsel wird alles zurückgesetzt
            this.memory.storage = { storageId: undefined, storageContainerId: [] };
            this.memory.targetLinkIds = [];
            this.memory.state = state;
        }
    };
}

function loadExtensions() {
    extendRoom();
}

var sourceMapGenerator = {};

var base64Vlq = {};

var base64$1 = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var intToCharMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');

/**
 * Encode an integer in the range of 0 to 63 to a single base 64 digit.
 */
base64$1.encode = function (number) {
  if (0 <= number && number < intToCharMap.length) {
    return intToCharMap[number];
  }
  throw new TypeError("Must be between 0 and 63: " + number);
};

/**
 * Decode a single base 64 character code digit to an integer. Returns -1 on
 * failure.
 */
base64$1.decode = function (charCode) {
  var bigA = 65;     // 'A'
  var bigZ = 90;     // 'Z'

  var littleA = 97;  // 'a'
  var littleZ = 122; // 'z'

  var zero = 48;     // '0'
  var nine = 57;     // '9'

  var plus = 43;     // '+'
  var slash = 47;    // '/'

  var littleOffset = 26;
  var numberOffset = 52;

  // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
  if (bigA <= charCode && charCode <= bigZ) {
    return (charCode - bigA);
  }

  // 26 - 51: abcdefghijklmnopqrstuvwxyz
  if (littleA <= charCode && charCode <= littleZ) {
    return (charCode - littleA + littleOffset);
  }

  // 52 - 61: 0123456789
  if (zero <= charCode && charCode <= nine) {
    return (charCode - zero + numberOffset);
  }

  // 62: +
  if (charCode == plus) {
    return 62;
  }

  // 63: /
  if (charCode == slash) {
    return 63;
  }

  // Invalid base64 digit.
  return -1;
};

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 *
 * Based on the Base 64 VLQ implementation in Closure Compiler:
 * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
 *
 * Copyright 2011 The Closure Compiler Authors. All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above
 *    copyright notice, this list of conditions and the following
 *    disclaimer in the documentation and/or other materials provided
 *    with the distribution.
 *  * Neither the name of Google Inc. nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var base64 = base64$1;

// A single base 64 digit can contain 6 bits of data. For the base 64 variable
// length quantities we use in the source map spec, the first bit is the sign,
// the next four bits are the actual value, and the 6th bit is the
// continuation bit. The continuation bit tells us whether there are more
// digits in this value following this digit.
//
//   Continuation
//   |    Sign
//   |    |
//   V    V
//   101011

var VLQ_BASE_SHIFT = 5;

// binary: 100000
var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

// binary: 011111
var VLQ_BASE_MASK = VLQ_BASE - 1;

// binary: 100000
var VLQ_CONTINUATION_BIT = VLQ_BASE;

/**
 * Converts from a two-complement value to a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
 *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
 */
function toVLQSigned(aValue) {
  return aValue < 0
    ? ((-aValue) << 1) + 1
    : (aValue << 1) + 0;
}

/**
 * Converts to a two-complement value from a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
 *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
 */
function fromVLQSigned(aValue) {
  var isNegative = (aValue & 1) === 1;
  var shifted = aValue >> 1;
  return isNegative
    ? -shifted
    : shifted;
}

/**
 * Returns the base 64 VLQ encoded value.
 */
base64Vlq.encode = function base64VLQ_encode(aValue) {
  var encoded = "";
  var digit;

  var vlq = toVLQSigned(aValue);

  do {
    digit = vlq & VLQ_BASE_MASK;
    vlq >>>= VLQ_BASE_SHIFT;
    if (vlq > 0) {
      // There are still more digits in this value, so we must make sure the
      // continuation bit is marked.
      digit |= VLQ_CONTINUATION_BIT;
    }
    encoded += base64.encode(digit);
  } while (vlq > 0);

  return encoded;
};

/**
 * Decodes the next base 64 VLQ value from the given string and returns the
 * value and the rest of the string via the out parameter.
 */
base64Vlq.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
  var strLen = aStr.length;
  var result = 0;
  var shift = 0;
  var continuation, digit;

  do {
    if (aIndex >= strLen) {
      throw new Error("Expected more digits in base 64 VLQ value.");
    }

    digit = base64.decode(aStr.charCodeAt(aIndex++));
    if (digit === -1) {
      throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
    }

    continuation = !!(digit & VLQ_CONTINUATION_BIT);
    digit &= VLQ_BASE_MASK;
    result = result + (digit << shift);
    shift += VLQ_BASE_SHIFT;
  } while (continuation);

  aOutParam.value = fromVLQSigned(result);
  aOutParam.rest = aIndex;
};

var util$5 = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

(function (exports) {
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

/**
 * This is a helper function for getting values from parameter/options
 * objects.
 *
 * @param args The object we are extracting values from
 * @param name The name of the property we are getting.
 * @param defaultValue An optional value to return if the property is missing
 * from the object. If this is not specified and the property is missing, an
 * error will be thrown.
 */
function getArg(aArgs, aName, aDefaultValue) {
  if (aName in aArgs) {
    return aArgs[aName];
  } else if (arguments.length === 3) {
    return aDefaultValue;
  } else {
    throw new Error('"' + aName + '" is a required argument.');
  }
}
exports.getArg = getArg;

var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;
var dataUrlRegexp = /^data:.+\,.+$/;

function urlParse(aUrl) {
  var match = aUrl.match(urlRegexp);
  if (!match) {
    return null;
  }
  return {
    scheme: match[1],
    auth: match[2],
    host: match[3],
    port: match[4],
    path: match[5]
  };
}
exports.urlParse = urlParse;

function urlGenerate(aParsedUrl) {
  var url = '';
  if (aParsedUrl.scheme) {
    url += aParsedUrl.scheme + ':';
  }
  url += '//';
  if (aParsedUrl.auth) {
    url += aParsedUrl.auth + '@';
  }
  if (aParsedUrl.host) {
    url += aParsedUrl.host;
  }
  if (aParsedUrl.port) {
    url += ":" + aParsedUrl.port;
  }
  if (aParsedUrl.path) {
    url += aParsedUrl.path;
  }
  return url;
}
exports.urlGenerate = urlGenerate;

/**
 * Normalizes a path, or the path portion of a URL:
 *
 * - Replaces consecutive slashes with one slash.
 * - Removes unnecessary '.' parts.
 * - Removes unnecessary '<dir>/..' parts.
 *
 * Based on code in the Node.js 'path' core module.
 *
 * @param aPath The path or url to normalize.
 */
function normalize(aPath) {
  var path = aPath;
  var url = urlParse(aPath);
  if (url) {
    if (!url.path) {
      return aPath;
    }
    path = url.path;
  }
  var isAbsolute = exports.isAbsolute(path);

  var parts = path.split(/\/+/);
  for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
    part = parts[i];
    if (part === '.') {
      parts.splice(i, 1);
    } else if (part === '..') {
      up++;
    } else if (up > 0) {
      if (part === '') {
        // The first part is blank if the path is absolute. Trying to go
        // above the root is a no-op. Therefore we can remove all '..' parts
        // directly after the root.
        parts.splice(i + 1, up);
        up = 0;
      } else {
        parts.splice(i, 2);
        up--;
      }
    }
  }
  path = parts.join('/');

  if (path === '') {
    path = isAbsolute ? '/' : '.';
  }

  if (url) {
    url.path = path;
    return urlGenerate(url);
  }
  return path;
}
exports.normalize = normalize;

/**
 * Joins two paths/URLs.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be joined with the root.
 *
 * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
 *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
 *   first.
 * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
 *   is updated with the result and aRoot is returned. Otherwise the result
 *   is returned.
 *   - If aPath is absolute, the result is aPath.
 *   - Otherwise the two paths are joined with a slash.
 * - Joining for example 'http://' and 'www.example.com' is also supported.
 */
function join(aRoot, aPath) {
  if (aRoot === "") {
    aRoot = ".";
  }
  if (aPath === "") {
    aPath = ".";
  }
  var aPathUrl = urlParse(aPath);
  var aRootUrl = urlParse(aRoot);
  if (aRootUrl) {
    aRoot = aRootUrl.path || '/';
  }

  // `join(foo, '//www.example.org')`
  if (aPathUrl && !aPathUrl.scheme) {
    if (aRootUrl) {
      aPathUrl.scheme = aRootUrl.scheme;
    }
    return urlGenerate(aPathUrl);
  }

  if (aPathUrl || aPath.match(dataUrlRegexp)) {
    return aPath;
  }

  // `join('http://', 'www.example.com')`
  if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
    aRootUrl.host = aPath;
    return urlGenerate(aRootUrl);
  }

  var joined = aPath.charAt(0) === '/'
    ? aPath
    : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

  if (aRootUrl) {
    aRootUrl.path = joined;
    return urlGenerate(aRootUrl);
  }
  return joined;
}
exports.join = join;

exports.isAbsolute = function (aPath) {
  return aPath.charAt(0) === '/' || urlRegexp.test(aPath);
};

/**
 * Make a path relative to a URL or another path.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be made relative to aRoot.
 */
function relative(aRoot, aPath) {
  if (aRoot === "") {
    aRoot = ".";
  }

  aRoot = aRoot.replace(/\/$/, '');

  // It is possible for the path to be above the root. In this case, simply
  // checking whether the root is a prefix of the path won't work. Instead, we
  // need to remove components from the root one by one, until either we find
  // a prefix that fits, or we run out of components to remove.
  var level = 0;
  while (aPath.indexOf(aRoot + '/') !== 0) {
    var index = aRoot.lastIndexOf("/");
    if (index < 0) {
      return aPath;
    }

    // If the only part of the root that is left is the scheme (i.e. http://,
    // file:///, etc.), one or more slashes (/), or simply nothing at all, we
    // have exhausted all components, so the path is not relative to the root.
    aRoot = aRoot.slice(0, index);
    if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
      return aPath;
    }

    ++level;
  }

  // Make sure we add a "../" for each component we removed from the root.
  return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
}
exports.relative = relative;

var supportsNullProto = (function () {
  var obj = Object.create(null);
  return !('__proto__' in obj);
}());

function identity (s) {
  return s;
}

/**
 * Because behavior goes wacky when you set `__proto__` on objects, we
 * have to prefix all the strings in our set with an arbitrary character.
 *
 * See https://github.com/mozilla/source-map/pull/31 and
 * https://github.com/mozilla/source-map/issues/30
 *
 * @param String aStr
 */
function toSetString(aStr) {
  if (isProtoString(aStr)) {
    return '$' + aStr;
  }

  return aStr;
}
exports.toSetString = supportsNullProto ? identity : toSetString;

function fromSetString(aStr) {
  if (isProtoString(aStr)) {
    return aStr.slice(1);
  }

  return aStr;
}
exports.fromSetString = supportsNullProto ? identity : fromSetString;

function isProtoString(s) {
  if (!s) {
    return false;
  }

  var length = s.length;

  if (length < 9 /* "__proto__".length */) {
    return false;
  }

  if (s.charCodeAt(length - 1) !== 95  /* '_' */ ||
      s.charCodeAt(length - 2) !== 95  /* '_' */ ||
      s.charCodeAt(length - 3) !== 111 /* 'o' */ ||
      s.charCodeAt(length - 4) !== 116 /* 't' */ ||
      s.charCodeAt(length - 5) !== 111 /* 'o' */ ||
      s.charCodeAt(length - 6) !== 114 /* 'r' */ ||
      s.charCodeAt(length - 7) !== 112 /* 'p' */ ||
      s.charCodeAt(length - 8) !== 95  /* '_' */ ||
      s.charCodeAt(length - 9) !== 95  /* '_' */) {
    return false;
  }

  for (var i = length - 10; i >= 0; i--) {
    if (s.charCodeAt(i) !== 36 /* '$' */) {
      return false;
    }
  }

  return true;
}

/**
 * Comparator between two mappings where the original positions are compared.
 *
 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
 * mappings with the same original source/line/column, but different generated
 * line and column the same. Useful when searching for a mapping with a
 * stubbed out mapping.
 */
function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
  var cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0 || onlyCompareOriginal) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByOriginalPositions = compareByOriginalPositions;

/**
 * Comparator between two mappings with deflated source and name indices where
 * the generated positions are compared.
 *
 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
 * mappings with the same generated line and column, but different
 * source/name/original line and column the same. Useful when searching for a
 * mapping with a stubbed out mapping.
 */
function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
  var cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0 || onlyCompareGenerated) {
    return cmp;
  }

  cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;

function strcmp(aStr1, aStr2) {
  if (aStr1 === aStr2) {
    return 0;
  }

  if (aStr1 === null) {
    return 1; // aStr2 !== null
  }

  if (aStr2 === null) {
    return -1; // aStr1 !== null
  }

  if (aStr1 > aStr2) {
    return 1;
  }

  return -1;
}

/**
 * Comparator between two mappings with inflated source and name strings where
 * the generated positions are compared.
 */
function compareByGeneratedPositionsInflated(mappingA, mappingB) {
  var cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;

/**
 * Strip any JSON XSSI avoidance prefix from the string (as documented
 * in the source maps specification), and then parse the string as
 * JSON.
 */
function parseSourceMapInput(str) {
  return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ''));
}
exports.parseSourceMapInput = parseSourceMapInput;

/**
 * Compute the URL of a source given the the source root, the source's
 * URL, and the source map's URL.
 */
function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
  sourceURL = sourceURL || '';

  if (sourceRoot) {
    // This follows what Chrome does.
    if (sourceRoot[sourceRoot.length - 1] !== '/' && sourceURL[0] !== '/') {
      sourceRoot += '/';
    }
    // The spec says:
    //   Line 4: An optional source root, useful for relocating source
    //   files on a server or removing repeated values in the
    //   “sources” entry.  This value is prepended to the individual
    //   entries in the “source” field.
    sourceURL = sourceRoot + sourceURL;
  }

  // Historically, SourceMapConsumer did not take the sourceMapURL as
  // a parameter.  This mode is still somewhat supported, which is why
  // this code block is conditional.  However, it's preferable to pass
  // the source map URL to SourceMapConsumer, so that this function
  // can implement the source URL resolution algorithm as outlined in
  // the spec.  This block is basically the equivalent of:
  //    new URL(sourceURL, sourceMapURL).toString()
  // ... except it avoids using URL, which wasn't available in the
  // older releases of node still supported by this library.
  //
  // The spec says:
  //   If the sources are not absolute URLs after prepending of the
  //   “sourceRoot”, the sources are resolved relative to the
  //   SourceMap (like resolving script src in a html document).
  if (sourceMapURL) {
    var parsed = urlParse(sourceMapURL);
    if (!parsed) {
      throw new Error("sourceMapURL could not be parsed");
    }
    if (parsed.path) {
      // Strip the last path component, but keep the "/".
      var index = parsed.path.lastIndexOf('/');
      if (index >= 0) {
        parsed.path = parsed.path.substring(0, index + 1);
      }
    }
    sourceURL = join(urlGenerate(parsed), sourceURL);
  }

  return normalize(sourceURL);
}
exports.computeSourceURL = computeSourceURL;
}(util$5));

var arraySet = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util$4 = util$5;
var has = Object.prototype.hasOwnProperty;
var hasNativeMap = typeof Map !== "undefined";

/**
 * A data structure which is a combination of an array and a set. Adding a new
 * member is O(1), testing for membership is O(1), and finding the index of an
 * element is O(1). Removing elements from the set is not supported. Only
 * strings are supported for membership.
 */
function ArraySet$2() {
  this._array = [];
  this._set = hasNativeMap ? new Map() : Object.create(null);
}

/**
 * Static method for creating ArraySet instances from an existing array.
 */
ArraySet$2.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
  var set = new ArraySet$2();
  for (var i = 0, len = aArray.length; i < len; i++) {
    set.add(aArray[i], aAllowDuplicates);
  }
  return set;
};

/**
 * Return how many unique items are in this ArraySet. If duplicates have been
 * added, than those do not count towards the size.
 *
 * @returns Number
 */
ArraySet$2.prototype.size = function ArraySet_size() {
  return hasNativeMap ? this._set.size : Object.getOwnPropertyNames(this._set).length;
};

/**
 * Add the given string to this set.
 *
 * @param String aStr
 */
ArraySet$2.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
  var sStr = hasNativeMap ? aStr : util$4.toSetString(aStr);
  var isDuplicate = hasNativeMap ? this.has(aStr) : has.call(this._set, sStr);
  var idx = this._array.length;
  if (!isDuplicate || aAllowDuplicates) {
    this._array.push(aStr);
  }
  if (!isDuplicate) {
    if (hasNativeMap) {
      this._set.set(aStr, idx);
    } else {
      this._set[sStr] = idx;
    }
  }
};

/**
 * Is the given string a member of this set?
 *
 * @param String aStr
 */
ArraySet$2.prototype.has = function ArraySet_has(aStr) {
  if (hasNativeMap) {
    return this._set.has(aStr);
  } else {
    var sStr = util$4.toSetString(aStr);
    return has.call(this._set, sStr);
  }
};

/**
 * What is the index of the given string in the array?
 *
 * @param String aStr
 */
ArraySet$2.prototype.indexOf = function ArraySet_indexOf(aStr) {
  if (hasNativeMap) {
    var idx = this._set.get(aStr);
    if (idx >= 0) {
        return idx;
    }
  } else {
    var sStr = util$4.toSetString(aStr);
    if (has.call(this._set, sStr)) {
      return this._set[sStr];
    }
  }

  throw new Error('"' + aStr + '" is not in the set.');
};

/**
 * What is the element at the given index?
 *
 * @param Number aIdx
 */
ArraySet$2.prototype.at = function ArraySet_at(aIdx) {
  if (aIdx >= 0 && aIdx < this._array.length) {
    return this._array[aIdx];
  }
  throw new Error('No element indexed by ' + aIdx);
};

/**
 * Returns the array representation of this set (which has the proper indices
 * indicated by indexOf). Note that this is a copy of the internal array used
 * for storing the members so that no one can mess with internal state.
 */
ArraySet$2.prototype.toArray = function ArraySet_toArray() {
  return this._array.slice();
};

arraySet.ArraySet = ArraySet$2;

var mappingList = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2014 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util$3 = util$5;

/**
 * Determine whether mappingB is after mappingA with respect to generated
 * position.
 */
function generatedPositionAfter(mappingA, mappingB) {
  // Optimized for most common case
  var lineA = mappingA.generatedLine;
  var lineB = mappingB.generatedLine;
  var columnA = mappingA.generatedColumn;
  var columnB = mappingB.generatedColumn;
  return lineB > lineA || lineB == lineA && columnB >= columnA ||
         util$3.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
}

/**
 * A data structure to provide a sorted view of accumulated mappings in a
 * performance conscious manner. It trades a neglibable overhead in general
 * case for a large speedup in case of mappings being added in order.
 */
function MappingList$1() {
  this._array = [];
  this._sorted = true;
  // Serves as infimum
  this._last = {generatedLine: -1, generatedColumn: 0};
}

/**
 * Iterate through internal items. This method takes the same arguments that
 * `Array.prototype.forEach` takes.
 *
 * NOTE: The order of the mappings is NOT guaranteed.
 */
MappingList$1.prototype.unsortedForEach =
  function MappingList_forEach(aCallback, aThisArg) {
    this._array.forEach(aCallback, aThisArg);
  };

/**
 * Add the given source mapping.
 *
 * @param Object aMapping
 */
MappingList$1.prototype.add = function MappingList_add(aMapping) {
  if (generatedPositionAfter(this._last, aMapping)) {
    this._last = aMapping;
    this._array.push(aMapping);
  } else {
    this._sorted = false;
    this._array.push(aMapping);
  }
};

/**
 * Returns the flat, sorted array of mappings. The mappings are sorted by
 * generated position.
 *
 * WARNING: This method returns internal data without copying, for
 * performance. The return value must NOT be mutated, and should be treated as
 * an immutable borrow. If you want to take ownership, you must make your own
 * copy.
 */
MappingList$1.prototype.toArray = function MappingList_toArray() {
  if (!this._sorted) {
    this._array.sort(util$3.compareByGeneratedPositionsInflated);
    this._sorted = true;
  }
  return this._array;
};

mappingList.MappingList = MappingList$1;

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var base64VLQ$1 = base64Vlq;
var util$2 = util$5;
var ArraySet$1 = arraySet.ArraySet;
var MappingList = mappingList.MappingList;

/**
 * An instance of the SourceMapGenerator represents a source map which is
 * being built incrementally. You may pass an object with the following
 * properties:
 *
 *   - file: The filename of the generated source.
 *   - sourceRoot: A root for all relative URLs in this source map.
 */
function SourceMapGenerator$1(aArgs) {
  if (!aArgs) {
    aArgs = {};
  }
  this._file = util$2.getArg(aArgs, 'file', null);
  this._sourceRoot = util$2.getArg(aArgs, 'sourceRoot', null);
  this._skipValidation = util$2.getArg(aArgs, 'skipValidation', false);
  this._sources = new ArraySet$1();
  this._names = new ArraySet$1();
  this._mappings = new MappingList();
  this._sourcesContents = null;
}

SourceMapGenerator$1.prototype._version = 3;

/**
 * Creates a new SourceMapGenerator based on a SourceMapConsumer
 *
 * @param aSourceMapConsumer The SourceMap.
 */
SourceMapGenerator$1.fromSourceMap =
  function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
    var sourceRoot = aSourceMapConsumer.sourceRoot;
    var generator = new SourceMapGenerator$1({
      file: aSourceMapConsumer.file,
      sourceRoot: sourceRoot
    });
    aSourceMapConsumer.eachMapping(function (mapping) {
      var newMapping = {
        generated: {
          line: mapping.generatedLine,
          column: mapping.generatedColumn
        }
      };

      if (mapping.source != null) {
        newMapping.source = mapping.source;
        if (sourceRoot != null) {
          newMapping.source = util$2.relative(sourceRoot, newMapping.source);
        }

        newMapping.original = {
          line: mapping.originalLine,
          column: mapping.originalColumn
        };

        if (mapping.name != null) {
          newMapping.name = mapping.name;
        }
      }

      generator.addMapping(newMapping);
    });
    aSourceMapConsumer.sources.forEach(function (sourceFile) {
      var sourceRelative = sourceFile;
      if (sourceRoot !== null) {
        sourceRelative = util$2.relative(sourceRoot, sourceFile);
      }

      if (!generator._sources.has(sourceRelative)) {
        generator._sources.add(sourceRelative);
      }

      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        generator.setSourceContent(sourceFile, content);
      }
    });
    return generator;
  };

/**
 * Add a single mapping from original source line and column to the generated
 * source's line and column for this source map being created. The mapping
 * object should have the following properties:
 *
 *   - generated: An object with the generated line and column positions.
 *   - original: An object with the original line and column positions.
 *   - source: The original source file (relative to the sourceRoot).
 *   - name: An optional original token name for this mapping.
 */
SourceMapGenerator$1.prototype.addMapping =
  function SourceMapGenerator_addMapping(aArgs) {
    var generated = util$2.getArg(aArgs, 'generated');
    var original = util$2.getArg(aArgs, 'original', null);
    var source = util$2.getArg(aArgs, 'source', null);
    var name = util$2.getArg(aArgs, 'name', null);

    if (!this._skipValidation) {
      this._validateMapping(generated, original, source, name);
    }

    if (source != null) {
      source = String(source);
      if (!this._sources.has(source)) {
        this._sources.add(source);
      }
    }

    if (name != null) {
      name = String(name);
      if (!this._names.has(name)) {
        this._names.add(name);
      }
    }

    this._mappings.add({
      generatedLine: generated.line,
      generatedColumn: generated.column,
      originalLine: original != null && original.line,
      originalColumn: original != null && original.column,
      source: source,
      name: name
    });
  };

/**
 * Set the source content for a source file.
 */
SourceMapGenerator$1.prototype.setSourceContent =
  function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
    var source = aSourceFile;
    if (this._sourceRoot != null) {
      source = util$2.relative(this._sourceRoot, source);
    }

    if (aSourceContent != null) {
      // Add the source content to the _sourcesContents map.
      // Create a new _sourcesContents map if the property is null.
      if (!this._sourcesContents) {
        this._sourcesContents = Object.create(null);
      }
      this._sourcesContents[util$2.toSetString(source)] = aSourceContent;
    } else if (this._sourcesContents) {
      // Remove the source file from the _sourcesContents map.
      // If the _sourcesContents map is empty, set the property to null.
      delete this._sourcesContents[util$2.toSetString(source)];
      if (Object.keys(this._sourcesContents).length === 0) {
        this._sourcesContents = null;
      }
    }
  };

/**
 * Applies the mappings of a sub-source-map for a specific source file to the
 * source map being generated. Each mapping to the supplied source file is
 * rewritten using the supplied source map. Note: The resolution for the
 * resulting mappings is the minimium of this map and the supplied map.
 *
 * @param aSourceMapConsumer The source map to be applied.
 * @param aSourceFile Optional. The filename of the source file.
 *        If omitted, SourceMapConsumer's file property will be used.
 * @param aSourceMapPath Optional. The dirname of the path to the source map
 *        to be applied. If relative, it is relative to the SourceMapConsumer.
 *        This parameter is needed when the two source maps aren't in the same
 *        directory, and the source map to be applied contains relative source
 *        paths. If so, those relative source paths need to be rewritten
 *        relative to the SourceMapGenerator.
 */
SourceMapGenerator$1.prototype.applySourceMap =
  function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
    var sourceFile = aSourceFile;
    // If aSourceFile is omitted, we will use the file property of the SourceMap
    if (aSourceFile == null) {
      if (aSourceMapConsumer.file == null) {
        throw new Error(
          'SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' +
          'or the source map\'s "file" property. Both were omitted.'
        );
      }
      sourceFile = aSourceMapConsumer.file;
    }
    var sourceRoot = this._sourceRoot;
    // Make "sourceFile" relative if an absolute Url is passed.
    if (sourceRoot != null) {
      sourceFile = util$2.relative(sourceRoot, sourceFile);
    }
    // Applying the SourceMap can add and remove items from the sources and
    // the names array.
    var newSources = new ArraySet$1();
    var newNames = new ArraySet$1();

    // Find mappings for the "sourceFile"
    this._mappings.unsortedForEach(function (mapping) {
      if (mapping.source === sourceFile && mapping.originalLine != null) {
        // Check if it can be mapped by the source map, then update the mapping.
        var original = aSourceMapConsumer.originalPositionFor({
          line: mapping.originalLine,
          column: mapping.originalColumn
        });
        if (original.source != null) {
          // Copy mapping
          mapping.source = original.source;
          if (aSourceMapPath != null) {
            mapping.source = util$2.join(aSourceMapPath, mapping.source);
          }
          if (sourceRoot != null) {
            mapping.source = util$2.relative(sourceRoot, mapping.source);
          }
          mapping.originalLine = original.line;
          mapping.originalColumn = original.column;
          if (original.name != null) {
            mapping.name = original.name;
          }
        }
      }

      var source = mapping.source;
      if (source != null && !newSources.has(source)) {
        newSources.add(source);
      }

      var name = mapping.name;
      if (name != null && !newNames.has(name)) {
        newNames.add(name);
      }

    }, this);
    this._sources = newSources;
    this._names = newNames;

    // Copy sourcesContents of applied map.
    aSourceMapConsumer.sources.forEach(function (sourceFile) {
      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        if (aSourceMapPath != null) {
          sourceFile = util$2.join(aSourceMapPath, sourceFile);
        }
        if (sourceRoot != null) {
          sourceFile = util$2.relative(sourceRoot, sourceFile);
        }
        this.setSourceContent(sourceFile, content);
      }
    }, this);
  };

/**
 * A mapping can have one of the three levels of data:
 *
 *   1. Just the generated position.
 *   2. The Generated position, original position, and original source.
 *   3. Generated and original position, original source, as well as a name
 *      token.
 *
 * To maintain consistency, we validate that any new mapping being added falls
 * in to one of these categories.
 */
SourceMapGenerator$1.prototype._validateMapping =
  function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource,
                                              aName) {
    // When aOriginal is truthy but has empty values for .line and .column,
    // it is most likely a programmer error. In this case we throw a very
    // specific error message to try to guide them the right way.
    // For example: https://github.com/Polymer/polymer-bundler/pull/519
    if (aOriginal && typeof aOriginal.line !== 'number' && typeof aOriginal.column !== 'number') {
        throw new Error(
            'original.line and original.column are not numbers -- you probably meant to omit ' +
            'the original mapping entirely and only map the generated position. If so, pass ' +
            'null for the original mapping instead of an object with empty or null values.'
        );
    }

    if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
        && aGenerated.line > 0 && aGenerated.column >= 0
        && !aOriginal && !aSource && !aName) {
      // Case 1.
      return;
    }
    else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
             && aOriginal && 'line' in aOriginal && 'column' in aOriginal
             && aGenerated.line > 0 && aGenerated.column >= 0
             && aOriginal.line > 0 && aOriginal.column >= 0
             && aSource) {
      // Cases 2 and 3.
      return;
    }
    else {
      throw new Error('Invalid mapping: ' + JSON.stringify({
        generated: aGenerated,
        source: aSource,
        original: aOriginal,
        name: aName
      }));
    }
  };

/**
 * Serialize the accumulated mappings in to the stream of base 64 VLQs
 * specified by the source map format.
 */
SourceMapGenerator$1.prototype._serializeMappings =
  function SourceMapGenerator_serializeMappings() {
    var previousGeneratedColumn = 0;
    var previousGeneratedLine = 1;
    var previousOriginalColumn = 0;
    var previousOriginalLine = 0;
    var previousName = 0;
    var previousSource = 0;
    var result = '';
    var next;
    var mapping;
    var nameIdx;
    var sourceIdx;

    var mappings = this._mappings.toArray();
    for (var i = 0, len = mappings.length; i < len; i++) {
      mapping = mappings[i];
      next = '';

      if (mapping.generatedLine !== previousGeneratedLine) {
        previousGeneratedColumn = 0;
        while (mapping.generatedLine !== previousGeneratedLine) {
          next += ';';
          previousGeneratedLine++;
        }
      }
      else {
        if (i > 0) {
          if (!util$2.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
            continue;
          }
          next += ',';
        }
      }

      next += base64VLQ$1.encode(mapping.generatedColumn
                                 - previousGeneratedColumn);
      previousGeneratedColumn = mapping.generatedColumn;

      if (mapping.source != null) {
        sourceIdx = this._sources.indexOf(mapping.source);
        next += base64VLQ$1.encode(sourceIdx - previousSource);
        previousSource = sourceIdx;

        // lines are stored 0-based in SourceMap spec version 3
        next += base64VLQ$1.encode(mapping.originalLine - 1
                                   - previousOriginalLine);
        previousOriginalLine = mapping.originalLine - 1;

        next += base64VLQ$1.encode(mapping.originalColumn
                                   - previousOriginalColumn);
        previousOriginalColumn = mapping.originalColumn;

        if (mapping.name != null) {
          nameIdx = this._names.indexOf(mapping.name);
          next += base64VLQ$1.encode(nameIdx - previousName);
          previousName = nameIdx;
        }
      }

      result += next;
    }

    return result;
  };

SourceMapGenerator$1.prototype._generateSourcesContent =
  function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
    return aSources.map(function (source) {
      if (!this._sourcesContents) {
        return null;
      }
      if (aSourceRoot != null) {
        source = util$2.relative(aSourceRoot, source);
      }
      var key = util$2.toSetString(source);
      return Object.prototype.hasOwnProperty.call(this._sourcesContents, key)
        ? this._sourcesContents[key]
        : null;
    }, this);
  };

/**
 * Externalize the source map.
 */
SourceMapGenerator$1.prototype.toJSON =
  function SourceMapGenerator_toJSON() {
    var map = {
      version: this._version,
      sources: this._sources.toArray(),
      names: this._names.toArray(),
      mappings: this._serializeMappings()
    };
    if (this._file != null) {
      map.file = this._file;
    }
    if (this._sourceRoot != null) {
      map.sourceRoot = this._sourceRoot;
    }
    if (this._sourcesContents) {
      map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
    }

    return map;
  };

/**
 * Render the source map being generated to a string.
 */
SourceMapGenerator$1.prototype.toString =
  function SourceMapGenerator_toString() {
    return JSON.stringify(this.toJSON());
  };

sourceMapGenerator.SourceMapGenerator = SourceMapGenerator$1;

var sourceMapConsumer = {};

var binarySearch$1 = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

(function (exports) {
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

exports.GREATEST_LOWER_BOUND = 1;
exports.LEAST_UPPER_BOUND = 2;

/**
 * Recursive implementation of binary search.
 *
 * @param aLow Indices here and lower do not contain the needle.
 * @param aHigh Indices here and higher do not contain the needle.
 * @param aNeedle The element being searched for.
 * @param aHaystack The non-empty array being searched.
 * @param aCompare Function which takes two elements and returns -1, 0, or 1.
 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 */
function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
  // This function terminates when one of the following is true:
  //
  //   1. We find the exact element we are looking for.
  //
  //   2. We did not find the exact element, but we can return the index of
  //      the next-closest element.
  //
  //   3. We did not find the exact element, and there is no next-closest
  //      element than the one we are searching for, so we return -1.
  var mid = Math.floor((aHigh - aLow) / 2) + aLow;
  var cmp = aCompare(aNeedle, aHaystack[mid], true);
  if (cmp === 0) {
    // Found the element we are looking for.
    return mid;
  }
  else if (cmp > 0) {
    // Our needle is greater than aHaystack[mid].
    if (aHigh - mid > 1) {
      // The element is in the upper half.
      return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
    }

    // The exact needle element was not found in this haystack. Determine if
    // we are in termination case (3) or (2) and return the appropriate thing.
    if (aBias == exports.LEAST_UPPER_BOUND) {
      return aHigh < aHaystack.length ? aHigh : -1;
    } else {
      return mid;
    }
  }
  else {
    // Our needle is less than aHaystack[mid].
    if (mid - aLow > 1) {
      // The element is in the lower half.
      return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
    }

    // we are in termination case (3) or (2) and return the appropriate thing.
    if (aBias == exports.LEAST_UPPER_BOUND) {
      return mid;
    } else {
      return aLow < 0 ? -1 : aLow;
    }
  }
}

/**
 * This is an implementation of binary search which will always try and return
 * the index of the closest element if there is no exact hit. This is because
 * mappings between original and generated line/col pairs are single points,
 * and there is an implicit region between each of them, so a miss just means
 * that you aren't on the very start of a region.
 *
 * @param aNeedle The element you are looking for.
 * @param aHaystack The array that is being searched.
 * @param aCompare A function which takes the needle and an element in the
 *     array and returns -1, 0, or 1 depending on whether the needle is less
 *     than, equal to, or greater than the element, respectively.
 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'binarySearch.GREATEST_LOWER_BOUND'.
 */
exports.search = function search(aNeedle, aHaystack, aCompare, aBias) {
  if (aHaystack.length === 0) {
    return -1;
  }

  var index = recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack,
                              aCompare, aBias || exports.GREATEST_LOWER_BOUND);
  if (index < 0) {
    return -1;
  }

  // We have found either the exact element, or the next-closest element than
  // the one we are searching for. However, there may be more than one such
  // element. Make sure we always return the smallest of these.
  while (index - 1 >= 0) {
    if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
      break;
    }
    --index;
  }

  return index;
};
}(binarySearch$1));

var quickSort$1 = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

// It turns out that some (most?) JavaScript engines don't self-host
// `Array.prototype.sort`. This makes sense because C++ will likely remain
// faster than JS when doing raw CPU-intensive sorting. However, when using a
// custom comparator function, calling back and forth between the VM's C++ and
// JIT'd JS is rather slow *and* loses JIT type information, resulting in
// worse generated code for the comparator function than would be optimal. In
// fact, when sorting with a comparator, these costs outweigh the benefits of
// sorting in C++. By using our own JS-implemented Quick Sort (below), we get
// a ~3500ms mean speed-up in `bench/bench.html`.

/**
 * Swap the elements indexed by `x` and `y` in the array `ary`.
 *
 * @param {Array} ary
 *        The array.
 * @param {Number} x
 *        The index of the first item.
 * @param {Number} y
 *        The index of the second item.
 */
function swap(ary, x, y) {
  var temp = ary[x];
  ary[x] = ary[y];
  ary[y] = temp;
}

/**
 * Returns a random integer within the range `low .. high` inclusive.
 *
 * @param {Number} low
 *        The lower bound on the range.
 * @param {Number} high
 *        The upper bound on the range.
 */
function randomIntInRange(low, high) {
  return Math.round(low + (Math.random() * (high - low)));
}

/**
 * The Quick Sort algorithm.
 *
 * @param {Array} ary
 *        An array to sort.
 * @param {function} comparator
 *        Function to use to compare two items.
 * @param {Number} p
 *        Start index of the array
 * @param {Number} r
 *        End index of the array
 */
function doQuickSort(ary, comparator, p, r) {
  // If our lower bound is less than our upper bound, we (1) partition the
  // array into two pieces and (2) recurse on each half. If it is not, this is
  // the empty array and our base case.

  if (p < r) {
    // (1) Partitioning.
    //
    // The partitioning chooses a pivot between `p` and `r` and moves all
    // elements that are less than or equal to the pivot to the before it, and
    // all the elements that are greater than it after it. The effect is that
    // once partition is done, the pivot is in the exact place it will be when
    // the array is put in sorted order, and it will not need to be moved
    // again. This runs in O(n) time.

    // Always choose a random pivot so that an input array which is reverse
    // sorted does not cause O(n^2) running time.
    var pivotIndex = randomIntInRange(p, r);
    var i = p - 1;

    swap(ary, pivotIndex, r);
    var pivot = ary[r];

    // Immediately after `j` is incremented in this loop, the following hold
    // true:
    //
    //   * Every element in `ary[p .. i]` is less than or equal to the pivot.
    //
    //   * Every element in `ary[i+1 .. j-1]` is greater than the pivot.
    for (var j = p; j < r; j++) {
      if (comparator(ary[j], pivot) <= 0) {
        i += 1;
        swap(ary, i, j);
      }
    }

    swap(ary, i + 1, j);
    var q = i + 1;

    // (2) Recurse on each half.

    doQuickSort(ary, comparator, p, q - 1);
    doQuickSort(ary, comparator, q + 1, r);
  }
}

/**
 * Sort the given array in-place with the given comparator function.
 *
 * @param {Array} ary
 *        An array to sort.
 * @param {function} comparator
 *        Function to use to compare two items.
 */
quickSort$1.quickSort = function (ary, comparator) {
  doQuickSort(ary, comparator, 0, ary.length - 1);
};

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util$1 = util$5;
var binarySearch = binarySearch$1;
var ArraySet = arraySet.ArraySet;
var base64VLQ = base64Vlq;
var quickSort = quickSort$1.quickSort;

function SourceMapConsumer$1(aSourceMap, aSourceMapURL) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = util$1.parseSourceMapInput(aSourceMap);
  }

  return sourceMap.sections != null
    ? new IndexedSourceMapConsumer(sourceMap, aSourceMapURL)
    : new BasicSourceMapConsumer(sourceMap, aSourceMapURL);
}

SourceMapConsumer$1.fromSourceMap = function(aSourceMap, aSourceMapURL) {
  return BasicSourceMapConsumer.fromSourceMap(aSourceMap, aSourceMapURL);
};

/**
 * The version of the source mapping spec that we are consuming.
 */
SourceMapConsumer$1.prototype._version = 3;

// `__generatedMappings` and `__originalMappings` are arrays that hold the
// parsed mapping coordinates from the source map's "mappings" attribute. They
// are lazily instantiated, accessed via the `_generatedMappings` and
// `_originalMappings` getters respectively, and we only parse the mappings
// and create these arrays once queried for a source location. We jump through
// these hoops because there can be many thousands of mappings, and parsing
// them is expensive, so we only want to do it if we must.
//
// Each object in the arrays is of the form:
//
//     {
//       generatedLine: The line number in the generated code,
//       generatedColumn: The column number in the generated code,
//       source: The path to the original source file that generated this
//               chunk of code,
//       originalLine: The line number in the original source that
//                     corresponds to this chunk of generated code,
//       originalColumn: The column number in the original source that
//                       corresponds to this chunk of generated code,
//       name: The name of the original symbol which generated this chunk of
//             code.
//     }
//
// All properties except for `generatedLine` and `generatedColumn` can be
// `null`.
//
// `_generatedMappings` is ordered by the generated positions.
//
// `_originalMappings` is ordered by the original positions.

SourceMapConsumer$1.prototype.__generatedMappings = null;
Object.defineProperty(SourceMapConsumer$1.prototype, '_generatedMappings', {
  configurable: true,
  enumerable: true,
  get: function () {
    if (!this.__generatedMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__generatedMappings;
  }
});

SourceMapConsumer$1.prototype.__originalMappings = null;
Object.defineProperty(SourceMapConsumer$1.prototype, '_originalMappings', {
  configurable: true,
  enumerable: true,
  get: function () {
    if (!this.__originalMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__originalMappings;
  }
});

SourceMapConsumer$1.prototype._charIsMappingSeparator =
  function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
    var c = aStr.charAt(index);
    return c === ";" || c === ",";
  };

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
SourceMapConsumer$1.prototype._parseMappings =
  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    throw new Error("Subclasses must implement _parseMappings");
  };

SourceMapConsumer$1.GENERATED_ORDER = 1;
SourceMapConsumer$1.ORIGINAL_ORDER = 2;

SourceMapConsumer$1.GREATEST_LOWER_BOUND = 1;
SourceMapConsumer$1.LEAST_UPPER_BOUND = 2;

/**
 * Iterate over each mapping between an original source/line/column and a
 * generated line/column in this source map.
 *
 * @param Function aCallback
 *        The function that is called with each mapping.
 * @param Object aContext
 *        Optional. If specified, this object will be the value of `this` every
 *        time that `aCallback` is called.
 * @param aOrder
 *        Either `SourceMapConsumer.GENERATED_ORDER` or
 *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
 *        iterate over the mappings sorted by the generated file's line/column
 *        order or the original's source/line/column order, respectively. Defaults to
 *        `SourceMapConsumer.GENERATED_ORDER`.
 */
SourceMapConsumer$1.prototype.eachMapping =
  function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
    var context = aContext || null;
    var order = aOrder || SourceMapConsumer$1.GENERATED_ORDER;

    var mappings;
    switch (order) {
    case SourceMapConsumer$1.GENERATED_ORDER:
      mappings = this._generatedMappings;
      break;
    case SourceMapConsumer$1.ORIGINAL_ORDER:
      mappings = this._originalMappings;
      break;
    default:
      throw new Error("Unknown order of iteration.");
    }

    var sourceRoot = this.sourceRoot;
    mappings.map(function (mapping) {
      var source = mapping.source === null ? null : this._sources.at(mapping.source);
      source = util$1.computeSourceURL(sourceRoot, source, this._sourceMapURL);
      return {
        source: source,
        generatedLine: mapping.generatedLine,
        generatedColumn: mapping.generatedColumn,
        originalLine: mapping.originalLine,
        originalColumn: mapping.originalColumn,
        name: mapping.name === null ? null : this._names.at(mapping.name)
      };
    }, this).forEach(aCallback, context);
  };

/**
 * Returns all generated line and column information for the original source,
 * line, and column provided. If no column is provided, returns all mappings
 * corresponding to a either the line we are searching for or the next
 * closest line that has any mappings. Otherwise, returns all mappings
 * corresponding to the given line and either the column we are searching for
 * or the next closest column that has any offsets.
 *
 * The only argument is an object with the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.  The line number is 1-based.
 *   - column: Optional. the column number in the original source.
 *    The column number is 0-based.
 *
 * and an array of objects is returned, each with the following properties:
 *
 *   - line: The line number in the generated source, or null.  The
 *    line number is 1-based.
 *   - column: The column number in the generated source, or null.
 *    The column number is 0-based.
 */
SourceMapConsumer$1.prototype.allGeneratedPositionsFor =
  function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
    var line = util$1.getArg(aArgs, 'line');

    // When there is no exact match, BasicSourceMapConsumer.prototype._findMapping
    // returns the index of the closest mapping less than the needle. By
    // setting needle.originalColumn to 0, we thus find the last mapping for
    // the given line, provided such a mapping exists.
    var needle = {
      source: util$1.getArg(aArgs, 'source'),
      originalLine: line,
      originalColumn: util$1.getArg(aArgs, 'column', 0)
    };

    needle.source = this._findSourceIndex(needle.source);
    if (needle.source < 0) {
      return [];
    }

    var mappings = [];

    var index = this._findMapping(needle,
                                  this._originalMappings,
                                  "originalLine",
                                  "originalColumn",
                                  util$1.compareByOriginalPositions,
                                  binarySearch.LEAST_UPPER_BOUND);
    if (index >= 0) {
      var mapping = this._originalMappings[index];

      if (aArgs.column === undefined) {
        var originalLine = mapping.originalLine;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we found. Since
        // mappings are sorted, this is guaranteed to find all mappings for
        // the line we found.
        while (mapping && mapping.originalLine === originalLine) {
          mappings.push({
            line: util$1.getArg(mapping, 'generatedLine', null),
            column: util$1.getArg(mapping, 'generatedColumn', null),
            lastColumn: util$1.getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[++index];
        }
      } else {
        var originalColumn = mapping.originalColumn;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we were searching for.
        // Since mappings are sorted, this is guaranteed to find all mappings for
        // the line we are searching for.
        while (mapping &&
               mapping.originalLine === line &&
               mapping.originalColumn == originalColumn) {
          mappings.push({
            line: util$1.getArg(mapping, 'generatedLine', null),
            column: util$1.getArg(mapping, 'generatedColumn', null),
            lastColumn: util$1.getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[++index];
        }
      }
    }

    return mappings;
  };

sourceMapConsumer.SourceMapConsumer = SourceMapConsumer$1;

/**
 * A BasicSourceMapConsumer instance represents a parsed source map which we can
 * query for information about the original file positions by giving it a file
 * position in the generated source.
 *
 * The first parameter is the raw source map (either as a JSON string, or
 * already parsed to an object). According to the spec, source maps have the
 * following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - sources: An array of URLs to the original source files.
 *   - names: An array of identifiers which can be referrenced by individual mappings.
 *   - sourceRoot: Optional. The URL root from which all sources are relative.
 *   - sourcesContent: Optional. An array of contents of the original source files.
 *   - mappings: A string of base64 VLQs which contain the actual mappings.
 *   - file: Optional. The generated file this source map is associated with.
 *
 * Here is an example source map, taken from the source map spec[0]:
 *
 *     {
 *       version : 3,
 *       file: "out.js",
 *       sourceRoot : "",
 *       sources: ["foo.js", "bar.js"],
 *       names: ["src", "maps", "are", "fun"],
 *       mappings: "AA,AB;;ABCDE;"
 *     }
 *
 * The second parameter, if given, is a string whose value is the URL
 * at which the source map was found.  This URL is used to compute the
 * sources array.
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
 */
function BasicSourceMapConsumer(aSourceMap, aSourceMapURL) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = util$1.parseSourceMapInput(aSourceMap);
  }

  var version = util$1.getArg(sourceMap, 'version');
  var sources = util$1.getArg(sourceMap, 'sources');
  // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
  // requires the array) to play nice here.
  var names = util$1.getArg(sourceMap, 'names', []);
  var sourceRoot = util$1.getArg(sourceMap, 'sourceRoot', null);
  var sourcesContent = util$1.getArg(sourceMap, 'sourcesContent', null);
  var mappings = util$1.getArg(sourceMap, 'mappings');
  var file = util$1.getArg(sourceMap, 'file', null);

  // Once again, Sass deviates from the spec and supplies the version as a
  // string rather than a number, so we use loose equality checking here.
  if (version != this._version) {
    throw new Error('Unsupported version: ' + version);
  }

  if (sourceRoot) {
    sourceRoot = util$1.normalize(sourceRoot);
  }

  sources = sources
    .map(String)
    // Some source maps produce relative source paths like "./foo.js" instead of
    // "foo.js".  Normalize these first so that future comparisons will succeed.
    // See bugzil.la/1090768.
    .map(util$1.normalize)
    // Always ensure that absolute sources are internally stored relative to
    // the source root, if the source root is absolute. Not doing this would
    // be particularly problematic when the source root is a prefix of the
    // source (valid, but why??). See github issue #199 and bugzil.la/1188982.
    .map(function (source) {
      return sourceRoot && util$1.isAbsolute(sourceRoot) && util$1.isAbsolute(source)
        ? util$1.relative(sourceRoot, source)
        : source;
    });

  // Pass `true` below to allow duplicate names and sources. While source maps
  // are intended to be compressed and deduplicated, the TypeScript compiler
  // sometimes generates source maps with duplicates in them. See Github issue
  // #72 and bugzil.la/889492.
  this._names = ArraySet.fromArray(names.map(String), true);
  this._sources = ArraySet.fromArray(sources, true);

  this._absoluteSources = this._sources.toArray().map(function (s) {
    return util$1.computeSourceURL(sourceRoot, s, aSourceMapURL);
  });

  this.sourceRoot = sourceRoot;
  this.sourcesContent = sourcesContent;
  this._mappings = mappings;
  this._sourceMapURL = aSourceMapURL;
  this.file = file;
}

BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer$1.prototype);
BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer$1;

/**
 * Utility function to find the index of a source.  Returns -1 if not
 * found.
 */
BasicSourceMapConsumer.prototype._findSourceIndex = function(aSource) {
  var relativeSource = aSource;
  if (this.sourceRoot != null) {
    relativeSource = util$1.relative(this.sourceRoot, relativeSource);
  }

  if (this._sources.has(relativeSource)) {
    return this._sources.indexOf(relativeSource);
  }

  // Maybe aSource is an absolute URL as returned by |sources|.  In
  // this case we can't simply undo the transform.
  var i;
  for (i = 0; i < this._absoluteSources.length; ++i) {
    if (this._absoluteSources[i] == aSource) {
      return i;
    }
  }

  return -1;
};

/**
 * Create a BasicSourceMapConsumer from a SourceMapGenerator.
 *
 * @param SourceMapGenerator aSourceMap
 *        The source map that will be consumed.
 * @param String aSourceMapURL
 *        The URL at which the source map can be found (optional)
 * @returns BasicSourceMapConsumer
 */
BasicSourceMapConsumer.fromSourceMap =
  function SourceMapConsumer_fromSourceMap(aSourceMap, aSourceMapURL) {
    var smc = Object.create(BasicSourceMapConsumer.prototype);

    var names = smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
    var sources = smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
    smc.sourceRoot = aSourceMap._sourceRoot;
    smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(),
                                                            smc.sourceRoot);
    smc.file = aSourceMap._file;
    smc._sourceMapURL = aSourceMapURL;
    smc._absoluteSources = smc._sources.toArray().map(function (s) {
      return util$1.computeSourceURL(smc.sourceRoot, s, aSourceMapURL);
    });

    // Because we are modifying the entries (by converting string sources and
    // names to indices into the sources and names ArraySets), we have to make
    // a copy of the entry or else bad things happen. Shared mutable state
    // strikes again! See github issue #191.

    var generatedMappings = aSourceMap._mappings.toArray().slice();
    var destGeneratedMappings = smc.__generatedMappings = [];
    var destOriginalMappings = smc.__originalMappings = [];

    for (var i = 0, length = generatedMappings.length; i < length; i++) {
      var srcMapping = generatedMappings[i];
      var destMapping = new Mapping;
      destMapping.generatedLine = srcMapping.generatedLine;
      destMapping.generatedColumn = srcMapping.generatedColumn;

      if (srcMapping.source) {
        destMapping.source = sources.indexOf(srcMapping.source);
        destMapping.originalLine = srcMapping.originalLine;
        destMapping.originalColumn = srcMapping.originalColumn;

        if (srcMapping.name) {
          destMapping.name = names.indexOf(srcMapping.name);
        }

        destOriginalMappings.push(destMapping);
      }

      destGeneratedMappings.push(destMapping);
    }

    quickSort(smc.__originalMappings, util$1.compareByOriginalPositions);

    return smc;
  };

/**
 * The version of the source mapping spec that we are consuming.
 */
BasicSourceMapConsumer.prototype._version = 3;

/**
 * The list of original sources.
 */
Object.defineProperty(BasicSourceMapConsumer.prototype, 'sources', {
  get: function () {
    return this._absoluteSources.slice();
  }
});

/**
 * Provide the JIT with a nice shape / hidden class.
 */
function Mapping() {
  this.generatedLine = 0;
  this.generatedColumn = 0;
  this.source = null;
  this.originalLine = null;
  this.originalColumn = null;
  this.name = null;
}

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
BasicSourceMapConsumer.prototype._parseMappings =
  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    var generatedLine = 1;
    var previousGeneratedColumn = 0;
    var previousOriginalLine = 0;
    var previousOriginalColumn = 0;
    var previousSource = 0;
    var previousName = 0;
    var length = aStr.length;
    var index = 0;
    var cachedSegments = {};
    var temp = {};
    var originalMappings = [];
    var generatedMappings = [];
    var mapping, str, segment, end, value;

    while (index < length) {
      if (aStr.charAt(index) === ';') {
        generatedLine++;
        index++;
        previousGeneratedColumn = 0;
      }
      else if (aStr.charAt(index) === ',') {
        index++;
      }
      else {
        mapping = new Mapping();
        mapping.generatedLine = generatedLine;

        // Because each offset is encoded relative to the previous one,
        // many segments often have the same encoding. We can exploit this
        // fact by caching the parsed variable length fields of each segment,
        // allowing us to avoid a second parse if we encounter the same
        // segment again.
        for (end = index; end < length; end++) {
          if (this._charIsMappingSeparator(aStr, end)) {
            break;
          }
        }
        str = aStr.slice(index, end);

        segment = cachedSegments[str];
        if (segment) {
          index += str.length;
        } else {
          segment = [];
          while (index < end) {
            base64VLQ.decode(aStr, index, temp);
            value = temp.value;
            index = temp.rest;
            segment.push(value);
          }

          if (segment.length === 2) {
            throw new Error('Found a source, but no line and column');
          }

          if (segment.length === 3) {
            throw new Error('Found a source and line, but no column');
          }

          cachedSegments[str] = segment;
        }

        // Generated column.
        mapping.generatedColumn = previousGeneratedColumn + segment[0];
        previousGeneratedColumn = mapping.generatedColumn;

        if (segment.length > 1) {
          // Original source.
          mapping.source = previousSource + segment[1];
          previousSource += segment[1];

          // Original line.
          mapping.originalLine = previousOriginalLine + segment[2];
          previousOriginalLine = mapping.originalLine;
          // Lines are stored 0-based
          mapping.originalLine += 1;

          // Original column.
          mapping.originalColumn = previousOriginalColumn + segment[3];
          previousOriginalColumn = mapping.originalColumn;

          if (segment.length > 4) {
            // Original name.
            mapping.name = previousName + segment[4];
            previousName += segment[4];
          }
        }

        generatedMappings.push(mapping);
        if (typeof mapping.originalLine === 'number') {
          originalMappings.push(mapping);
        }
      }
    }

    quickSort(generatedMappings, util$1.compareByGeneratedPositionsDeflated);
    this.__generatedMappings = generatedMappings;

    quickSort(originalMappings, util$1.compareByOriginalPositions);
    this.__originalMappings = originalMappings;
  };

/**
 * Find the mapping that best matches the hypothetical "needle" mapping that
 * we are searching for in the given "haystack" of mappings.
 */
BasicSourceMapConsumer.prototype._findMapping =
  function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName,
                                         aColumnName, aComparator, aBias) {
    // To return the position we are searching for, we must first find the
    // mapping for the given position and then return the opposite position it
    // points to. Because the mappings are sorted, we can use binary search to
    // find the best mapping.

    if (aNeedle[aLineName] <= 0) {
      throw new TypeError('Line must be greater than or equal to 1, got '
                          + aNeedle[aLineName]);
    }
    if (aNeedle[aColumnName] < 0) {
      throw new TypeError('Column must be greater than or equal to 0, got '
                          + aNeedle[aColumnName]);
    }

    return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
  };

/**
 * Compute the last column for each generated mapping. The last column is
 * inclusive.
 */
BasicSourceMapConsumer.prototype.computeColumnSpans =
  function SourceMapConsumer_computeColumnSpans() {
    for (var index = 0; index < this._generatedMappings.length; ++index) {
      var mapping = this._generatedMappings[index];

      // Mappings do not contain a field for the last generated columnt. We
      // can come up with an optimistic estimate, however, by assuming that
      // mappings are contiguous (i.e. given two consecutive mappings, the
      // first mapping ends where the second one starts).
      if (index + 1 < this._generatedMappings.length) {
        var nextMapping = this._generatedMappings[index + 1];

        if (mapping.generatedLine === nextMapping.generatedLine) {
          mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
          continue;
        }
      }

      // The last mapping for each line spans the entire line.
      mapping.lastGeneratedColumn = Infinity;
    }
  };

/**
 * Returns the original source, line, and column information for the generated
 * source's line and column positions provided. The only argument is an object
 * with the following properties:
 *
 *   - line: The line number in the generated source.  The line number
 *     is 1-based.
 *   - column: The column number in the generated source.  The column
 *     number is 0-based.
 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
 *
 * and an object is returned with the following properties:
 *
 *   - source: The original source file, or null.
 *   - line: The line number in the original source, or null.  The
 *     line number is 1-based.
 *   - column: The column number in the original source, or null.  The
 *     column number is 0-based.
 *   - name: The original identifier, or null.
 */
BasicSourceMapConsumer.prototype.originalPositionFor =
  function SourceMapConsumer_originalPositionFor(aArgs) {
    var needle = {
      generatedLine: util$1.getArg(aArgs, 'line'),
      generatedColumn: util$1.getArg(aArgs, 'column')
    };

    var index = this._findMapping(
      needle,
      this._generatedMappings,
      "generatedLine",
      "generatedColumn",
      util$1.compareByGeneratedPositionsDeflated,
      util$1.getArg(aArgs, 'bias', SourceMapConsumer$1.GREATEST_LOWER_BOUND)
    );

    if (index >= 0) {
      var mapping = this._generatedMappings[index];

      if (mapping.generatedLine === needle.generatedLine) {
        var source = util$1.getArg(mapping, 'source', null);
        if (source !== null) {
          source = this._sources.at(source);
          source = util$1.computeSourceURL(this.sourceRoot, source, this._sourceMapURL);
        }
        var name = util$1.getArg(mapping, 'name', null);
        if (name !== null) {
          name = this._names.at(name);
        }
        return {
          source: source,
          line: util$1.getArg(mapping, 'originalLine', null),
          column: util$1.getArg(mapping, 'originalColumn', null),
          name: name
        };
      }
    }

    return {
      source: null,
      line: null,
      column: null,
      name: null
    };
  };

/**
 * Return true if we have the source content for every source in the source
 * map, false otherwise.
 */
BasicSourceMapConsumer.prototype.hasContentsOfAllSources =
  function BasicSourceMapConsumer_hasContentsOfAllSources() {
    if (!this.sourcesContent) {
      return false;
    }
    return this.sourcesContent.length >= this._sources.size() &&
      !this.sourcesContent.some(function (sc) { return sc == null; });
  };

/**
 * Returns the original source content. The only argument is the url of the
 * original source file. Returns null if no original source content is
 * available.
 */
BasicSourceMapConsumer.prototype.sourceContentFor =
  function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    if (!this.sourcesContent) {
      return null;
    }

    var index = this._findSourceIndex(aSource);
    if (index >= 0) {
      return this.sourcesContent[index];
    }

    var relativeSource = aSource;
    if (this.sourceRoot != null) {
      relativeSource = util$1.relative(this.sourceRoot, relativeSource);
    }

    var url;
    if (this.sourceRoot != null
        && (url = util$1.urlParse(this.sourceRoot))) {
      // XXX: file:// URIs and absolute paths lead to unexpected behavior for
      // many users. We can help them out when they expect file:// URIs to
      // behave like it would if they were running a local HTTP server. See
      // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
      var fileUriAbsPath = relativeSource.replace(/^file:\/\//, "");
      if (url.scheme == "file"
          && this._sources.has(fileUriAbsPath)) {
        return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)]
      }

      if ((!url.path || url.path == "/")
          && this._sources.has("/" + relativeSource)) {
        return this.sourcesContent[this._sources.indexOf("/" + relativeSource)];
      }
    }

    // This function is used recursively from
    // IndexedSourceMapConsumer.prototype.sourceContentFor. In that case, we
    // don't want to throw if we can't find the source - we just want to
    // return null, so we provide a flag to exit gracefully.
    if (nullOnMissing) {
      return null;
    }
    else {
      throw new Error('"' + relativeSource + '" is not in the SourceMap.');
    }
  };

/**
 * Returns the generated line and column information for the original source,
 * line, and column positions provided. The only argument is an object with
 * the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.  The line number
 *     is 1-based.
 *   - column: The column number in the original source.  The column
 *     number is 0-based.
 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
 *
 * and an object is returned with the following properties:
 *
 *   - line: The line number in the generated source, or null.  The
 *     line number is 1-based.
 *   - column: The column number in the generated source, or null.
 *     The column number is 0-based.
 */
BasicSourceMapConsumer.prototype.generatedPositionFor =
  function SourceMapConsumer_generatedPositionFor(aArgs) {
    var source = util$1.getArg(aArgs, 'source');
    source = this._findSourceIndex(source);
    if (source < 0) {
      return {
        line: null,
        column: null,
        lastColumn: null
      };
    }

    var needle = {
      source: source,
      originalLine: util$1.getArg(aArgs, 'line'),
      originalColumn: util$1.getArg(aArgs, 'column')
    };

    var index = this._findMapping(
      needle,
      this._originalMappings,
      "originalLine",
      "originalColumn",
      util$1.compareByOriginalPositions,
      util$1.getArg(aArgs, 'bias', SourceMapConsumer$1.GREATEST_LOWER_BOUND)
    );

    if (index >= 0) {
      var mapping = this._originalMappings[index];

      if (mapping.source === needle.source) {
        return {
          line: util$1.getArg(mapping, 'generatedLine', null),
          column: util$1.getArg(mapping, 'generatedColumn', null),
          lastColumn: util$1.getArg(mapping, 'lastGeneratedColumn', null)
        };
      }
    }

    return {
      line: null,
      column: null,
      lastColumn: null
    };
  };

sourceMapConsumer.BasicSourceMapConsumer = BasicSourceMapConsumer;

/**
 * An IndexedSourceMapConsumer instance represents a parsed source map which
 * we can query for information. It differs from BasicSourceMapConsumer in
 * that it takes "indexed" source maps (i.e. ones with a "sections" field) as
 * input.
 *
 * The first parameter is a raw source map (either as a JSON string, or already
 * parsed to an object). According to the spec for indexed source maps, they
 * have the following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - file: Optional. The generated file this source map is associated with.
 *   - sections: A list of section definitions.
 *
 * Each value under the "sections" field has two fields:
 *   - offset: The offset into the original specified at which this section
 *       begins to apply, defined as an object with a "line" and "column"
 *       field.
 *   - map: A source map definition. This source map could also be indexed,
 *       but doesn't have to be.
 *
 * Instead of the "map" field, it's also possible to have a "url" field
 * specifying a URL to retrieve a source map from, but that's currently
 * unsupported.
 *
 * Here's an example source map, taken from the source map spec[0], but
 * modified to omit a section which uses the "url" field.
 *
 *  {
 *    version : 3,
 *    file: "app.js",
 *    sections: [{
 *      offset: {line:100, column:10},
 *      map: {
 *        version : 3,
 *        file: "section.js",
 *        sources: ["foo.js", "bar.js"],
 *        names: ["src", "maps", "are", "fun"],
 *        mappings: "AAAA,E;;ABCDE;"
 *      }
 *    }],
 *  }
 *
 * The second parameter, if given, is a string whose value is the URL
 * at which the source map was found.  This URL is used to compute the
 * sources array.
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.535es3xeprgt
 */
function IndexedSourceMapConsumer(aSourceMap, aSourceMapURL) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = util$1.parseSourceMapInput(aSourceMap);
  }

  var version = util$1.getArg(sourceMap, 'version');
  var sections = util$1.getArg(sourceMap, 'sections');

  if (version != this._version) {
    throw new Error('Unsupported version: ' + version);
  }

  this._sources = new ArraySet();
  this._names = new ArraySet();

  var lastOffset = {
    line: -1,
    column: 0
  };
  this._sections = sections.map(function (s) {
    if (s.url) {
      // The url field will require support for asynchronicity.
      // See https://github.com/mozilla/source-map/issues/16
      throw new Error('Support for url field in sections not implemented.');
    }
    var offset = util$1.getArg(s, 'offset');
    var offsetLine = util$1.getArg(offset, 'line');
    var offsetColumn = util$1.getArg(offset, 'column');

    if (offsetLine < lastOffset.line ||
        (offsetLine === lastOffset.line && offsetColumn < lastOffset.column)) {
      throw new Error('Section offsets must be ordered and non-overlapping.');
    }
    lastOffset = offset;

    return {
      generatedOffset: {
        // The offset fields are 0-based, but we use 1-based indices when
        // encoding/decoding from VLQ.
        generatedLine: offsetLine + 1,
        generatedColumn: offsetColumn + 1
      },
      consumer: new SourceMapConsumer$1(util$1.getArg(s, 'map'), aSourceMapURL)
    }
  });
}

IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer$1.prototype);
IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer$1;

/**
 * The version of the source mapping spec that we are consuming.
 */
IndexedSourceMapConsumer.prototype._version = 3;

/**
 * The list of original sources.
 */
Object.defineProperty(IndexedSourceMapConsumer.prototype, 'sources', {
  get: function () {
    var sources = [];
    for (var i = 0; i < this._sections.length; i++) {
      for (var j = 0; j < this._sections[i].consumer.sources.length; j++) {
        sources.push(this._sections[i].consumer.sources[j]);
      }
    }
    return sources;
  }
});

/**
 * Returns the original source, line, and column information for the generated
 * source's line and column positions provided. The only argument is an object
 * with the following properties:
 *
 *   - line: The line number in the generated source.  The line number
 *     is 1-based.
 *   - column: The column number in the generated source.  The column
 *     number is 0-based.
 *
 * and an object is returned with the following properties:
 *
 *   - source: The original source file, or null.
 *   - line: The line number in the original source, or null.  The
 *     line number is 1-based.
 *   - column: The column number in the original source, or null.  The
 *     column number is 0-based.
 *   - name: The original identifier, or null.
 */
IndexedSourceMapConsumer.prototype.originalPositionFor =
  function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
    var needle = {
      generatedLine: util$1.getArg(aArgs, 'line'),
      generatedColumn: util$1.getArg(aArgs, 'column')
    };

    // Find the section containing the generated position we're trying to map
    // to an original position.
    var sectionIndex = binarySearch.search(needle, this._sections,
      function(needle, section) {
        var cmp = needle.generatedLine - section.generatedOffset.generatedLine;
        if (cmp) {
          return cmp;
        }

        return (needle.generatedColumn -
                section.generatedOffset.generatedColumn);
      });
    var section = this._sections[sectionIndex];

    if (!section) {
      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    }

    return section.consumer.originalPositionFor({
      line: needle.generatedLine -
        (section.generatedOffset.generatedLine - 1),
      column: needle.generatedColumn -
        (section.generatedOffset.generatedLine === needle.generatedLine
         ? section.generatedOffset.generatedColumn - 1
         : 0),
      bias: aArgs.bias
    });
  };

/**
 * Return true if we have the source content for every source in the source
 * map, false otherwise.
 */
IndexedSourceMapConsumer.prototype.hasContentsOfAllSources =
  function IndexedSourceMapConsumer_hasContentsOfAllSources() {
    return this._sections.every(function (s) {
      return s.consumer.hasContentsOfAllSources();
    });
  };

/**
 * Returns the original source content. The only argument is the url of the
 * original source file. Returns null if no original source content is
 * available.
 */
IndexedSourceMapConsumer.prototype.sourceContentFor =
  function IndexedSourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];

      var content = section.consumer.sourceContentFor(aSource, true);
      if (content) {
        return content;
      }
    }
    if (nullOnMissing) {
      return null;
    }
    else {
      throw new Error('"' + aSource + '" is not in the SourceMap.');
    }
  };

/**
 * Returns the generated line and column information for the original source,
 * line, and column positions provided. The only argument is an object with
 * the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.  The line number
 *     is 1-based.
 *   - column: The column number in the original source.  The column
 *     number is 0-based.
 *
 * and an object is returned with the following properties:
 *
 *   - line: The line number in the generated source, or null.  The
 *     line number is 1-based. 
 *   - column: The column number in the generated source, or null.
 *     The column number is 0-based.
 */
IndexedSourceMapConsumer.prototype.generatedPositionFor =
  function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];

      // Only consider this section if the requested source is in the list of
      // sources of the consumer.
      if (section.consumer._findSourceIndex(util$1.getArg(aArgs, 'source')) === -1) {
        continue;
      }
      var generatedPosition = section.consumer.generatedPositionFor(aArgs);
      if (generatedPosition) {
        var ret = {
          line: generatedPosition.line +
            (section.generatedOffset.generatedLine - 1),
          column: generatedPosition.column +
            (section.generatedOffset.generatedLine === generatedPosition.line
             ? section.generatedOffset.generatedColumn - 1
             : 0)
        };
        return ret;
      }
    }

    return {
      line: null,
      column: null
    };
  };

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
IndexedSourceMapConsumer.prototype._parseMappings =
  function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    this.__generatedMappings = [];
    this.__originalMappings = [];
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];
      var sectionMappings = section.consumer._generatedMappings;
      for (var j = 0; j < sectionMappings.length; j++) {
        var mapping = sectionMappings[j];

        var source = section.consumer._sources.at(mapping.source);
        source = util$1.computeSourceURL(section.consumer.sourceRoot, source, this._sourceMapURL);
        this._sources.add(source);
        source = this._sources.indexOf(source);

        var name = null;
        if (mapping.name) {
          name = section.consumer._names.at(mapping.name);
          this._names.add(name);
          name = this._names.indexOf(name);
        }

        // The mappings coming from the consumer for the section have
        // generated positions relative to the start of the section, so we
        // need to offset them to be relative to the start of the concatenated
        // generated file.
        var adjustedMapping = {
          source: source,
          generatedLine: mapping.generatedLine +
            (section.generatedOffset.generatedLine - 1),
          generatedColumn: mapping.generatedColumn +
            (section.generatedOffset.generatedLine === mapping.generatedLine
            ? section.generatedOffset.generatedColumn - 1
            : 0),
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name: name
        };

        this.__generatedMappings.push(adjustedMapping);
        if (typeof adjustedMapping.originalLine === 'number') {
          this.__originalMappings.push(adjustedMapping);
        }
      }
    }

    quickSort(this.__generatedMappings, util$1.compareByGeneratedPositionsDeflated);
    quickSort(this.__originalMappings, util$1.compareByOriginalPositions);
  };

sourceMapConsumer.IndexedSourceMapConsumer = IndexedSourceMapConsumer;

/* -*- Mode: js; js-indent-level: 2; -*- */

/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var SourceMapGenerator = sourceMapGenerator.SourceMapGenerator;
var util = util$5;

// Matches a Windows-style `\r\n` newline or a `\n` newline used by all other
// operating systems these days (capturing the result).
var REGEX_NEWLINE = /(\r?\n)/;

// Newline character code for charCodeAt() comparisons
var NEWLINE_CODE = 10;

// Private symbol for identifying `SourceNode`s when multiple versions of
// the source-map library are loaded. This MUST NOT CHANGE across
// versions!
var isSourceNode = "$$$isSourceNode$$$";

/**
 * SourceNodes provide a way to abstract over interpolating/concatenating
 * snippets of generated JavaScript source code while maintaining the line and
 * column information associated with the original source code.
 *
 * @param aLine The original line number.
 * @param aColumn The original column number.
 * @param aSource The original source's filename.
 * @param aChunks Optional. An array of strings which are snippets of
 *        generated JS, or other SourceNodes.
 * @param aName The original identifier.
 */
function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
  this.children = [];
  this.sourceContents = {};
  this.line = aLine == null ? null : aLine;
  this.column = aColumn == null ? null : aColumn;
  this.source = aSource == null ? null : aSource;
  this.name = aName == null ? null : aName;
  this[isSourceNode] = true;
  if (aChunks != null) this.add(aChunks);
}

/**
 * Creates a SourceNode from generated code and a SourceMapConsumer.
 *
 * @param aGeneratedCode The generated code
 * @param aSourceMapConsumer The SourceMap for the generated code
 * @param aRelativePath Optional. The path that relative sources in the
 *        SourceMapConsumer should be relative to.
 */
SourceNode.fromStringWithSourceMap =
  function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer, aRelativePath) {
    // The SourceNode we want to fill with the generated code
    // and the SourceMap
    var node = new SourceNode();

    // All even indices of this array are one line of the generated code,
    // while all odd indices are the newlines between two adjacent lines
    // (since `REGEX_NEWLINE` captures its match).
    // Processed fragments are accessed by calling `shiftNextLine`.
    var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
    var remainingLinesIndex = 0;
    var shiftNextLine = function() {
      var lineContents = getNextLine();
      // The last line of a file might not have a newline.
      var newLine = getNextLine() || "";
      return lineContents + newLine;

      function getNextLine() {
        return remainingLinesIndex < remainingLines.length ?
            remainingLines[remainingLinesIndex++] : undefined;
      }
    };

    // We need to remember the position of "remainingLines"
    var lastGeneratedLine = 1, lastGeneratedColumn = 0;

    // The generate SourceNodes we need a code range.
    // To extract it current and last mapping is used.
    // Here we store the last mapping.
    var lastMapping = null;

    aSourceMapConsumer.eachMapping(function (mapping) {
      if (lastMapping !== null) {
        // We add the code from "lastMapping" to "mapping":
        // First check if there is a new line in between.
        if (lastGeneratedLine < mapping.generatedLine) {
          // Associate first line with "lastMapping"
          addMappingWithCode(lastMapping, shiftNextLine());
          lastGeneratedLine++;
          lastGeneratedColumn = 0;
          // The remaining code is added without mapping
        } else {
          // There is no new line in between.
          // Associate the code between "lastGeneratedColumn" and
          // "mapping.generatedColumn" with "lastMapping"
          var nextLine = remainingLines[remainingLinesIndex] || '';
          var code = nextLine.substr(0, mapping.generatedColumn -
                                        lastGeneratedColumn);
          remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn -
                                              lastGeneratedColumn);
          lastGeneratedColumn = mapping.generatedColumn;
          addMappingWithCode(lastMapping, code);
          // No more remaining code, continue
          lastMapping = mapping;
          return;
        }
      }
      // We add the generated code until the first mapping
      // to the SourceNode without any mapping.
      // Each line is added as separate string.
      while (lastGeneratedLine < mapping.generatedLine) {
        node.add(shiftNextLine());
        lastGeneratedLine++;
      }
      if (lastGeneratedColumn < mapping.generatedColumn) {
        var nextLine = remainingLines[remainingLinesIndex] || '';
        node.add(nextLine.substr(0, mapping.generatedColumn));
        remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn);
        lastGeneratedColumn = mapping.generatedColumn;
      }
      lastMapping = mapping;
    }, this);
    // We have processed all mappings.
    if (remainingLinesIndex < remainingLines.length) {
      if (lastMapping) {
        // Associate the remaining code in the current line with "lastMapping"
        addMappingWithCode(lastMapping, shiftNextLine());
      }
      // and add the remaining lines without any mapping
      node.add(remainingLines.splice(remainingLinesIndex).join(""));
    }

    // Copy sourcesContent into SourceNode
    aSourceMapConsumer.sources.forEach(function (sourceFile) {
      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        if (aRelativePath != null) {
          sourceFile = util.join(aRelativePath, sourceFile);
        }
        node.setSourceContent(sourceFile, content);
      }
    });

    return node;

    function addMappingWithCode(mapping, code) {
      if (mapping === null || mapping.source === undefined) {
        node.add(code);
      } else {
        var source = aRelativePath
          ? util.join(aRelativePath, mapping.source)
          : mapping.source;
        node.add(new SourceNode(mapping.originalLine,
                                mapping.originalColumn,
                                source,
                                code,
                                mapping.name));
      }
    }
  };

/**
 * Add a chunk of generated JS to this source node.
 *
 * @param aChunk A string snippet of generated JS code, another instance of
 *        SourceNode, or an array where each member is one of those things.
 */
SourceNode.prototype.add = function SourceNode_add(aChunk) {
  if (Array.isArray(aChunk)) {
    aChunk.forEach(function (chunk) {
      this.add(chunk);
    }, this);
  }
  else if (aChunk[isSourceNode] || typeof aChunk === "string") {
    if (aChunk) {
      this.children.push(aChunk);
    }
  }
  else {
    throw new TypeError(
      "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
    );
  }
  return this;
};

/**
 * Add a chunk of generated JS to the beginning of this source node.
 *
 * @param aChunk A string snippet of generated JS code, another instance of
 *        SourceNode, or an array where each member is one of those things.
 */
SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
  if (Array.isArray(aChunk)) {
    for (var i = aChunk.length-1; i >= 0; i--) {
      this.prepend(aChunk[i]);
    }
  }
  else if (aChunk[isSourceNode] || typeof aChunk === "string") {
    this.children.unshift(aChunk);
  }
  else {
    throw new TypeError(
      "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
    );
  }
  return this;
};

/**
 * Walk over the tree of JS snippets in this node and its children. The
 * walking function is called once for each snippet of JS and is passed that
 * snippet and the its original associated source's line/column location.
 *
 * @param aFn The traversal function.
 */
SourceNode.prototype.walk = function SourceNode_walk(aFn) {
  var chunk;
  for (var i = 0, len = this.children.length; i < len; i++) {
    chunk = this.children[i];
    if (chunk[isSourceNode]) {
      chunk.walk(aFn);
    }
    else {
      if (chunk !== '') {
        aFn(chunk, { source: this.source,
                     line: this.line,
                     column: this.column,
                     name: this.name });
      }
    }
  }
};

/**
 * Like `String.prototype.join` except for SourceNodes. Inserts `aStr` between
 * each of `this.children`.
 *
 * @param aSep The separator.
 */
SourceNode.prototype.join = function SourceNode_join(aSep) {
  var newChildren;
  var i;
  var len = this.children.length;
  if (len > 0) {
    newChildren = [];
    for (i = 0; i < len-1; i++) {
      newChildren.push(this.children[i]);
      newChildren.push(aSep);
    }
    newChildren.push(this.children[i]);
    this.children = newChildren;
  }
  return this;
};

/**
 * Call String.prototype.replace on the very right-most source snippet. Useful
 * for trimming whitespace from the end of a source node, etc.
 *
 * @param aPattern The pattern to replace.
 * @param aReplacement The thing to replace the pattern with.
 */
SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
  var lastChild = this.children[this.children.length - 1];
  if (lastChild[isSourceNode]) {
    lastChild.replaceRight(aPattern, aReplacement);
  }
  else if (typeof lastChild === 'string') {
    this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
  }
  else {
    this.children.push(''.replace(aPattern, aReplacement));
  }
  return this;
};

/**
 * Set the source content for a source file. This will be added to the SourceMapGenerator
 * in the sourcesContent field.
 *
 * @param aSourceFile The filename of the source file
 * @param aSourceContent The content of the source file
 */
SourceNode.prototype.setSourceContent =
  function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
    this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
  };

/**
 * Walk over the tree of SourceNodes. The walking function is called for each
 * source file content and is passed the filename and source content.
 *
 * @param aFn The traversal function.
 */
SourceNode.prototype.walkSourceContents =
  function SourceNode_walkSourceContents(aFn) {
    for (var i = 0, len = this.children.length; i < len; i++) {
      if (this.children[i][isSourceNode]) {
        this.children[i].walkSourceContents(aFn);
      }
    }

    var sources = Object.keys(this.sourceContents);
    for (var i = 0, len = sources.length; i < len; i++) {
      aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
    }
  };

/**
 * Return the string representation of this source node. Walks over the tree
 * and concatenates all the various snippets together to one string.
 */
SourceNode.prototype.toString = function SourceNode_toString() {
  var str = "";
  this.walk(function (chunk) {
    str += chunk;
  });
  return str;
};

/**
 * Returns the string representation of this source node along with a source
 * map.
 */
SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
  var generated = {
    code: "",
    line: 1,
    column: 0
  };
  var map = new SourceMapGenerator(aArgs);
  var sourceMappingActive = false;
  var lastOriginalSource = null;
  var lastOriginalLine = null;
  var lastOriginalColumn = null;
  var lastOriginalName = null;
  this.walk(function (chunk, original) {
    generated.code += chunk;
    if (original.source !== null
        && original.line !== null
        && original.column !== null) {
      if(lastOriginalSource !== original.source
         || lastOriginalLine !== original.line
         || lastOriginalColumn !== original.column
         || lastOriginalName !== original.name) {
        map.addMapping({
          source: original.source,
          original: {
            line: original.line,
            column: original.column
          },
          generated: {
            line: generated.line,
            column: generated.column
          },
          name: original.name
        });
      }
      lastOriginalSource = original.source;
      lastOriginalLine = original.line;
      lastOriginalColumn = original.column;
      lastOriginalName = original.name;
      sourceMappingActive = true;
    } else if (sourceMappingActive) {
      map.addMapping({
        generated: {
          line: generated.line,
          column: generated.column
        }
      });
      lastOriginalSource = null;
      sourceMappingActive = false;
    }
    for (var idx = 0, length = chunk.length; idx < length; idx++) {
      if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
        generated.line++;
        generated.column = 0;
        // Mappings end at eol
        if (idx + 1 === length) {
          lastOriginalSource = null;
          sourceMappingActive = false;
        } else if (sourceMappingActive) {
          map.addMapping({
            source: original.source,
            original: {
              line: original.line,
              column: original.column
            },
            generated: {
              line: generated.line,
              column: generated.column
            },
            name: original.name
          });
        }
      } else {
        generated.column++;
      }
    }
  });
  this.walkSourceContents(function (sourceFile, sourceContent) {
    map.setSourceContent(sourceFile, sourceContent);
  });

  return { code: generated.code, map: map };
};

/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
var SourceMapConsumer = sourceMapConsumer.SourceMapConsumer;

class ErrorMapper {
    static get consumer() {
        if (this._consumer == null) {
            this._consumer = new SourceMapConsumer(require("main.js.map"));
        }
        return this._consumer;
    }
    /**
     * Generates a stack trace using a source map generate original symbol names.
     *
     * WARNING - EXTREMELY high CPU cost for first call after reset - >30 CPU! Use sparingly!
     * (Consecutive calls after a reset are more reasonable, ~0.1 CPU/ea)
     *
     * @param {Error | string} error The error or original stack trace
     * @returns {string} The source-mapped stack trace
     */
    static sourceMappedStackTrace(error) {
        const stack = error instanceof Error ? error.stack : error;
        if (Object.prototype.hasOwnProperty.call(this.cache, stack)) {
            return this.cache[stack];
        }
        // eslint-disable-next-line no-useless-escape
        const re = /^\s+at\s+(.+?\s+)?\(?([0-z._\-\\\/]+):(\d+):(\d+)\)?$/gm;
        let match;
        let outStack = error.toString();
        while ((match = re.exec(stack))) {
            if (match[2] === "main") {
                const pos = this.consumer.originalPositionFor({
                    column: parseInt(match[4], 10),
                    line: parseInt(match[3], 10)
                });
                if (pos.line != null) {
                    if (pos.name) {
                        outStack += `\n    at ${pos.name} (${pos.source}:${pos.line}:${pos.column})`;
                    }
                    else {
                        if (match[1]) {
                            // no original source file name known - use file name from given trace
                            outStack += `\n    at ${match[1]} (${pos.source}:${pos.line}:${pos.column})`;
                        }
                        else {
                            // no original source file name known or in given trace - omit name
                            outStack += `\n    at ${pos.source}:${pos.line}:${pos.column}`;
                        }
                    }
                }
                else {
                    // no known position
                    break;
                }
            }
            else {
                // no more parseable lines
                break;
            }
        }
        this.cache[stack] = outStack;
        return outStack;
    }
    static wrapLoop(loop) {
        return () => {
            try {
                loop();
            }
            catch (e) {
                console.log(e);
                if (e instanceof Error) {
                    console.log(`<span style='color:red'>${_.escape(e.stack)}</span>`);
                    if ("sim" in Game.rooms) ;
                    else {
                        console.log(`<span style='color:red'>${_.escape(this.sourceMappedStackTrace(e))}</span>`);
                        console.log(`<span style='color:red'>${_.escape(e.stack)}</span>`);
                    }
                }
                else {
                    // can't handle it
                    throw e;
                }
            }
        };
    }
}
// Cache previously mapped traces to improve performance
ErrorMapper.cache = {};

const roomConfig = {
    "W5N8": {
        builderCount: 1,
        upgraderCount: 1,
        workerCount: 1,
        wallbuilderCount: 1,
        remoteMinerPerSource: 1,
        sendMiner: true,
        buildRoads: true,
        buildBase: true,
        sendClaimer: false,
        sendRemoteMiner: false,
    },
    "W4N8": {
        builderCount: 0,
        upgraderCount: 0,
        workerCount: 0,
        wallbuilderCount: 0,
        remoteMinerPerSource: 2,
        sendMiner: false,
        buildRoads: false,
        buildBase: false,
        sendClaimer: true,
        sendRemoteMiner: true,
        spawnRoom: "W5N8"
    },
    "W5N9": {
        builderCount: 0,
        upgraderCount: 0,
        workerCount: 0,
        wallbuilderCount: 0,
        remoteMinerPerSource: 1.5,
        sendMiner: false,
        buildRoads: false,
        buildBase: false,
        sendClaimer: true,
        sendRemoteMiner: true,
        spawnRoom: "W5N8"
    },
    "W6N8": {
        builderCount: 0,
        upgraderCount: 0,
        workerCount: 0,
        wallbuilderCount: 0,
        remoteMinerPerSource: 1,
        sendMiner: false,
        buildRoads: false,
        buildBase: false,
        sendClaimer: true,
        sendRemoteMiner: true,
        spawnRoom: "W5N8"
    },
    "W5N7": {
        builderCount: 0,
        upgraderCount: 0,
        workerCount: 0,
        wallbuilderCount: 0,
        remoteMinerPerSource: 2,
        sendMiner: false,
        buildRoads: false,
        buildBase: false,
        sendClaimer: true,
        sendRemoteMiner: true,
        spawnRoom: "W5N8"
    }
};

class MovementProfiler {
    static startMeasurement(operation) {
        return Game.cpu.getUsed();
    }
    static endMeasurement(operation, startCpu) {
        const cpuUsed = Game.cpu.getUsed() - startCpu;
        if (!this.measurements[operation]) {
            this.measurements[operation] = [];
        }
        this.measurements[operation].push(cpuUsed);
        // Automatisches Logging alle X Ticks
        if (Game.time - this.lastStatsOutput >= this.statsInterval) {
            this.outputStats();
            this.lastStatsOutput = Game.time;
            // Reset arrays nach Ausgabe
            this.measurements = {};
        }
    }
    static outputStats() {
        console.log('=== Movement CPU Stats (Tick ' + Game.time + ') ===');
        let totalAvg = 0;
        let totalCalls = 0;
        for (const [operation, measurements] of Object.entries(this.measurements)) {
            if (measurements.length > 0) {
                const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
                const max = Math.max(...measurements);
                const min = Math.min(...measurements);
                console.log(`${operation}: avg=${avg.toFixed(4)}, max=${max.toFixed(4)}, min=${min.toFixed(4)}, calls=${measurements.length}`);
                totalAvg += avg * measurements.length;
                totalCalls += measurements.length;
            }
        }
        if (totalCalls > 0) {
            console.log(`TOTAL Movement CPU: ${(totalAvg / totalCalls).toFixed(4)} avg per call, ${totalCalls} total calls`);
        }
    }
    static getStats() {
        this.outputStats();
    }
    static setInterval(ticks) {
        this.statsInterval = ticks;
    }
}
MovementProfiler.measurements = {};
MovementProfiler.lastStatsOutput = 0;
MovementProfiler.statsInterval = 50; // Alle 50 Ticks

// Shared CostMatrix cache — rebuilt per tick on demand (not stored in Memory)
const costMatrixCache = new Map();
let cacheTickStamp = -1;
class PathingManager {
    /** Clear per-tick cache at start of each tick */
    static clearTickCache() {
        if (Game.time !== cacheTickStamp) {
            costMatrixCache.clear();
            cacheTickStamp = Game.time;
        }
    }
    /** Get or build a CostMatrix for the given room */
    static getCostMatrix(roomName) {
        this.clearTickCache();
        const cached = costMatrixCache.get(roomName);
        if (cached)
            return cached;
        const matrix = new PathFinder.CostMatrix();
        const room = Game.rooms[roomName];
        if (room) {
            const roads = room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_ROAD
            });
            for (const road of roads) {
                matrix.set(road.pos.x, road.pos.y, 1);
            }
            const blockers = room.find(FIND_STRUCTURES, {
                filter: s => s.structureType !== STRUCTURE_CONTAINER &&
                    s.structureType !== STRUCTURE_ROAD &&
                    s.structureType !== STRUCTURE_RAMPART
            });
            for (const s of blockers) {
                matrix.set(s.pos.x, s.pos.y, 255);
            }
            // Own ramparts are walkable; hostile ramparts block
            const ramparts = room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_RAMPART
            });
            for (const r of ramparts) {
                if (!r.my)
                    matrix.set(r.pos.x, r.pos.y, 255);
            }
        }
        costMatrixCache.set(roomName, matrix);
        return matrix;
    }
    /**
     * Find a path using PathFinder.search with shared CostMatrix.
     * Replaces the old findPathTo-based calculateNewPath.
     */
    static findPath(from, to, range, ignoreCreeps = true) {
        return PathFinder.search(from, { pos: to, range }, {
            plainCost: 2,
            swampCost: 10,
            roomCallback: (roomName) => {
                const matrix = this.getCostMatrix(roomName).clone();
                if (!ignoreCreeps) {
                    const room = Game.rooms[roomName];
                    if (room) {
                        for (const creep of room.find(FIND_CREEPS)) {
                            matrix.set(creep.pos.x, creep.pos.y, 255);
                        }
                    }
                }
                return matrix;
            },
        });
    }
    /** Serialize a PathFinder path to a string for memory storage */
    static serialize(path) {
        return Room.serializePath(path.map(p => ({
            x: p.x,
            y: p.y,
            dx: 0,
            dy: 0,
            direction: TOP
        })));
    }
}

class Movement {
    static getTargetPos(creep) {
        if (!creep.memory.targetPos) {
            return null;
        }
        return new RoomPosition(creep.memory.targetPos.x, creep.memory.targetPos.y, creep.memory.targetPos.roomName);
    }
    /**
     * Erweiterte Bewegungsfunktion mit Pfad-Caching und Stuck-Detection
     */
    static moveByMemory(creep, target, range) {
        var _a;
        const startCpu = MovementProfiler.startMeasurement('moveByMemory');
        const targetPos = target instanceof RoomPosition ? target : target.pos;
        // Ziel erreicht?
        if (creep.pos.inRangeTo(targetPos, range)) {
            this.clearMovementMemory(creep);
            MovementProfiler.endMeasurement('moveByMemory', startCpu);
            return false;
        }
        // Stuck-Detection: Wenn zu oft nicht bewegt, neuen Pfad mit ignoreCreeps: false
        if ((creep.memory.dontMove || 0) > 3) {
            console.log(`${creep.name}: Stuck detected, recalculating path`);
            this.calculateNewPath(creep, targetPos, false); // ignoreCreeps: false
            creep.memory.dontMove = 0;
            MovementProfiler.endMeasurement('moveByMemory', startCpu);
            return true;
        }
        // Prüfen ob cached Pfad noch gültig ist
        let serializedPath;
        if (this.isPathValid(creep, targetPos)) {
            serializedPath = creep.memory.path;
        }
        else {
            // Neuen Pfad berechnen
            this.calculateNewPath(creep, targetPos, false); // ignoreCreeps: true
            serializedPath = creep.memory.path;
        }
        // Pfad visualisieren (optional)
        if ((_a = Memory.debug) === null || _a === void 0 ? void 0 : _a.visuals) {
            this.visualizePath(creep, serializedPath);
        }
        // Bewegung ausführen
        const moveResult = creep.moveByPath(serializedPath);
        // Bewegungsresultat verarbeiten
        this.handleMoveResult(creep, moveResult);
        MovementProfiler.endMeasurement('moveByMemory', startCpu);
        return true;
    }
    static isPathValid(creep, targetPos) {
        if (!creep.memory.path || !creep.memory.targetPos) {
            return false;
        }
        // Prüfe ob der gecachte Pfad noch für das aktuelle Ziel gültig ist
        return creep.memory.targetPos.x === targetPos.x &&
            creep.memory.targetPos.y === targetPos.y &&
            creep.memory.targetPos.roomName === targetPos.roomName;
    }
    static calculateNewPath(creep, targetPos, ignoreCreeps) {
        const result = PathingManager.findPath(creep.pos, targetPos, 1, ignoreCreeps);
        const serialized = result.path.length > 0
            ? Room.serializePath(result.path.map(p => ({
                x: p.x, y: p.y,
                dx: 0, dy: 0,
                direction: TOP
            })))
            : '';
        creep.memory.path = serialized;
        creep.memory.targetPos = {
            x: targetPos.x,
            y: targetPos.y,
            roomName: targetPos.roomName
        };
    }
    static visualizePath(creep, serializedPath) {
        const path = Room.deserializePath(serializedPath);
        const currentPos = creep.pos;
        // Finde aktuelle Position im Pfad
        const currentIndex = path.findIndex(pos => pos.x === currentPos.x && pos.y === currentPos.y);
        if (currentIndex >= 0) {
            const visual = new RoomVisual(creep.room.name);
            // Zeige verbleibenden Pfad
            for (let i = currentIndex + 1; i < path.length; i++) {
                visual.circle(path[i].x, path[i].y, {
                    fill: 'transparent',
                    radius: 0.25,
                    stroke: 'red'
                });
            }
        }
    }
    static handleMoveResult(creep, moveResult) {
        switch (moveResult) {
            case OK:
            case ERR_TIRED:
                // Prüfe ob Creep sich bewegt hat (Stuck-Detection)
                if (creep.memory.lastPos &&
                    creep.memory.lastPos.x === creep.pos.x &&
                    creep.memory.lastPos.y === creep.pos.y) {
                    creep.memory.dontMove = (creep.memory.dontMove || 0) + 1;
                }
                else {
                    creep.memory.lastPos = {
                        x: creep.pos.x,
                        y: creep.pos.y
                    };
                    creep.memory.dontMove = 0;
                }
                break;
            case ERR_NOT_FOUND:
            case ERR_INVALID_ARGS:
            case ERR_NO_BODYPART:
                console.log(`${creep.name}: Move error ${moveResult}, clearing path`);
                this.clearMovementMemory(creep);
                break;
        }
    }
    static clearMovementMemory(creep) {
        delete creep.memory.path;
        delete creep.memory.dontMove;
        delete creep.memory.lastPos;
        creep.memory.moving = false;
        creep.memory.targetPos = undefined;
    }
    static shouldContinueMoving(creep) {
        const startCpu = MovementProfiler.startMeasurement('shouldContinueMoving');
        if (!creep.memory.moving || !creep.memory.targetPos) {
            MovementProfiler.endMeasurement('shouldContinueMoving', startCpu);
            return false;
        }
        const targetPos = this.getTargetPos(creep);
        if (!targetPos) {
            MovementProfiler.endMeasurement('shouldContinueMoving', startCpu);
            return false;
        }
        if (creep.pos.isNearTo(targetPos)) {
            this.clearMovementMemory(creep);
            MovementProfiler.endMeasurement('shouldContinueMoving', startCpu);
            return false;
        }
        MovementProfiler.endMeasurement('shouldContinueMoving', startCpu);
        return true;
    }
    static continueMoving(creep) {
        const startCpu = MovementProfiler.startMeasurement('continueMoving');
        const targetPos = this.getTargetPos(creep);
        if (!targetPos) {
            MovementProfiler.endMeasurement('continueMoving', startCpu);
            return ERR_INVALID_TARGET;
        }
        // Verwende moveByMemory für bessere Performance
        const isMoving = this.moveByMemory(creep, targetPos, 1);
        MovementProfiler.endMeasurement('continueMoving', startCpu);
        return isMoving ? OK : ERR_INVALID_TARGET;
    }
    static moveToRoom(creep, targetRoomName) {
        const startCpu = MovementProfiler.startMeasurement('moveToRoom');
        // Wenn wir schon im Zielraum sind, nichts tun
        if (creep.room.name === targetRoomName) {
            MovementProfiler.endMeasurement('moveToRoom', startCpu);
            return OK;
        }
        if (!creep.memory.moving || !creep.memory.targetPos) {
            const route = Game.map.findRoute(creep.room.name, targetRoomName);
            if (route === ERR_NO_PATH || !route.length)
                return ERR_NO_PATH;
            const nextRoom = route[0].room;
            const exitDir = creep.room.findExitTo(nextRoom);
            if (exitDir != ERR_NO_PATH && exitDir != ERR_INVALID_ARGS) {
                const exitPos = creep.pos.findClosestByPath(exitDir);
                if (!exitPos)
                    return ERR_NO_PATH;
                creep.memory.targetPos = {
                    x: exitPos.x,
                    y: exitPos.y,
                    roomName: exitPos.roomName
                };
            }
        }
        // Bewegung ausführen
        this.moveByMemory(creep, this.getTargetPos(creep), 0);
        MovementProfiler.endMeasurement('moveToRoom', startCpu);
        return OK;
    }
}

class CreepStorage {
    constructor() {
        this.creepCache = new Map();
        this.CACHE_TTL = 5;
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new CreepStorage();
        }
        return this.instance;
    }
    onCreepSpawning(job, workRoom) {
        this.invalidateCache(`job_${job}`);
        this.invalidateCache(`room_${workRoom}`);
        this.invalidateCache(`${job}_${workRoom}`);
    }
    onCreepSpawned(creep) {
        this.invalidateCache(`job_${creep.memory.job}`);
        this.invalidateCache(`room_${creep.memory.workRoom}`);
        this.invalidateCache(`${creep.memory.job}_${creep.memory.workRoom}`);
    }
    onCreepDied(creepMemory) {
        this.invalidateCache(`job_${creepMemory.job}`);
        this.invalidateCache(`room_${creepMemory.workRoom}`);
        this.invalidateCache(`${creepMemory.job}_${creepMemory.workRoom}`);
    }
    getCreepCountByJobAndRoom(job, workRoom) {
        return this.getCreepsByJobAndRoom(job, workRoom).length;
    }
    getCreepsByJobAndRoom(job, workRoom) {
        const key = `${job}_${workRoom}`;
        const roomKey = `room_${workRoom}`;
        const roomCache = this.creepCache.get(roomKey);
        if (roomCache && (Game.time - roomCache.lastUpdate) < this.CACHE_TTL) {
            return this.getCachedCreeps(key, () => _.filter(roomCache.creeps, c => c.memory.job === job));
        }
        return this.getCachedCreeps(key, () => _.filter(Game.creeps, (c) => c.memory.job === job &&
            c.memory.workRoom === workRoom));
    }
    getCreepsByRoom(roomName) {
        const key = `room_${roomName}`;
        return this.getCachedCreeps(key, () => _.filter(Game.creeps, c => c.memory.workRoom === roomName));
    }
    getCreepCountByRoom(roomName) {
        return this.getCreepsByRoom(roomName).length;
    }
    // Invalidiert Cache für spezifische Bereiche
    invalidateCache(pattern) {
        if (!pattern) {
            this.creepCache.clear();
            return;
        }
        const keysToDelete = Array.from(this.creepCache.keys())
            .filter(key => key.includes(pattern));
        keysToDelete.forEach(key => this.creepCache.delete(key));
    }
    // Cache-Statistiken
    getCacheStats() {
        return {
            size: this.creepCache.size,
            keys: Array.from(this.creepCache.keys())
        };
    }
    // Bereinigung alter Cache-Einträge (optional, bei 2 Ticks TTL weniger kritisch)
    cleanupCache() {
        const currentTime = Game.time;
        const keysToDelete = [];
        this.creepCache.forEach((value, key) => {
            if (currentTime - value.lastUpdate >= this.CACHE_TTL) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.creepCache.delete(key));
    }
    getCachedCreeps(key, filterFunction) {
        const cached = this.creepCache.get(key);
        if (cached && (Game.time - cached.lastUpdate) < this.CACHE_TTL) {
            // console.log(`Cache hit for ${key}`);
            return cached.creeps;
        }
        const creeps = filterFunction();
        this.creepCache.set(key, {
            creeps,
            lastUpdate: Game.time
        });
        return creeps;
    }
}

class Ant {
    constructor(creep) {
        this.creep = creep;
    }
    get memory() {
        return this.creep.memory;
    }
    set memory(value) {
        this.creep.memory = value;
    }
    checkHarvest() {
        if (this.memory.state !== 0 /* eJobState.harvest */ && this.creep.store.getUsedCapacity() === 0) {
            this.memory.state = 0 /* eJobState.harvest */;
        }
        if (this.memory.state === 0 /* eJobState.harvest */ && this.creep.store.getFreeCapacity() === 0) {
            this.memory.state = 1 /* eJobState.work */;
        }
    }
    spawn(spawnRoom, workroom) {
        const max = this.getMaxCreeps(workroom);
        const job = this.getJob();
        const creepStorage = CreepStorage.getInstance();
        const countOfAnts = creepStorage.getCreepCountByJobAndRoom(job, workroom);
        if (countOfAnts >= max) {
            return false;
        }
        if (!this.shouldSpawn(workroom)) {
            return false;
        }
        const dynamicPriority = SpawnManager.getSpawnPriority(job, workroom);
        SpawnManager.addToJobQueue(job, spawnRoom, workroom, this.getProfil(spawnRoom), dynamicPriority);
        return false;
    }
    createSpawnMemory(spawn, workroom) {
        const job = this.getJob();
        return {
            job: job,
            state: 0 /* eJobState.harvest */,
            spawn: spawn.name,
            workRoom: workroom,
            spawnRoom: spawn.room.name,
            roundRobin: 1,
            roundRobinOffset: 0,
            moving: false,
        };
    }
    moveTo(target, range = 1) {
        return Movement.moveByMemory(this.creep, target, range);
    }
    moveToRoomMiddle(workroom) {
        const middlePos = new RoomPosition(25, 25, workroom);
        return this.creep.moveTo(middlePos);
    }
}

class HarvesterAnt extends Ant {
    createSpawnMemory(spawn, workroom) {
        const base = super.createSpawnMemory(spawn, workroom);
        return {
            ...base,
        };
    }
    doJob() {
        var _a;
        if (Movement.shouldContinueMoving(this.creep)) {
            Movement.continueMoving(this.creep);
            return true;
        }
        this.checkHarvest();
        if (this.memory.state == 0 /* eJobState.harvest */) {
            if (this.creep.memory.workRoom) {
                let room = Game.rooms[this.creep.memory.workRoom];
                if (room && room.memory.spawnPrioBlock && room.storage) {
                    this.memory.harvestStorageId = (_a = room.storage) === null || _a === void 0 ? void 0 : _a.id;
                    if (this.harvestRoomStorage(RESOURCE_ENERGY)) {
                        return true;
                    }
                }
            }
            this.doHarvest(RESOURCE_ENERGY);
            return true;
        }
        else if (this.creep.memory.workRoom) {
            let room = Game.rooms[this.creep.memory.workRoom];
            if (room && room.memory.spawnPrioBlock) {
                this.creep.say('🚩🚩🚩');
                const target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: s => (s.structureType === STRUCTURE_SPAWN ||
                        s.structureType === STRUCTURE_EXTENSION) &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
                if (target) {
                    let state = this.creep.transfer(target, RESOURCE_ENERGY);
                    switch (state) {
                        case ERR_NOT_IN_RANGE:
                            return this.moveTo(target);
                        case ERR_FULL:
                            return true;
                    }
                }
                return true;
            }
        }
        return false;
    }
    hasHarvestTarget() {
        return !!(this.memory.harvestContainerId ||
            this.memory.harvestStorageId ||
            this.memory.havestSourceId ||
            this.memory.havestLinkId ||
            this.memory.harvestTombstoneId ||
            this.memory.harvestDroppedId);
    }
    doHarvest(resource) {
        var _a;
        if (this.harvestRoomDrop(resource)) {
            return;
        }
        if (this.harvestRoomTombstone(resource)) {
            return;
        }
        if ((_a = this.creep.room.controller) === null || _a === void 0 ? void 0 : _a.my) {
            if (this.harvestRoomStorage(resource)) {
                return;
            }
        }
        if (this.harvestRoomContainer(resource)) {
            return;
        }
        if (resource == RESOURCE_ENERGY) {
            this.harvestEnergySource();
        }
    }
    harvestRoomStorage(resourceType) {
        var _a;
        let storage;
        if (this.memory.harvestStorageId) {
            storage = Game.getObjectById(this.memory.harvestStorageId);
            if (!storage)
                this.memory.harvestStorageId = undefined;
        }
        else if (!this.hasHarvestTarget()) {
            storage = this.creep.room.storage;
        }
        if (!storage) {
            this.memory.harvestStorageId = undefined;
            return false;
        }
        if (((_a = storage.store) === null || _a === void 0 ? void 0 : _a.getUsedCapacity(resourceType)) > this.creep.store.getCapacity() * 0.5) {
            this.memory.harvestStorageId = storage.id;
            let state = this.creep.withdraw(storage, resourceType);
            switch (state) {
                case ERR_NOT_IN_RANGE:
                    return this.moveTo(storage);
                case OK:
                    this.memory.harvestStorageId = undefined;
                    return true;
                default: {
                    console.log("🚩 harvestRoomStorage unhandled state: " + state + " for creep: " + this.creep.name + " in room: " + this.creep.room.name + "");
                    return false;
                }
            }
        }
        this.memory.harvestStorageId = undefined;
        return false;
    }
    harvestRoomContainer(resourceType) {
        let container;
        if (this.memory.harvestContainerId) {
            container = Game.getObjectById(this.memory.harvestContainerId);
            if (!container)
                this.memory.harvestContainerId = undefined;
        }
        else if (!this.hasHarvestTarget()) {
            container = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (structure) => {
                    return structure.structureType === STRUCTURE_CONTAINER &&
                        structure.store[resourceType] > 0;
                }
            });
            this.memory.harvestContainerId = container === null || container === void 0 ? void 0 : container.id;
        }
        if (!container) {
            this.memory.harvestContainerId = undefined;
            return false;
        }
        let state = this.creep.withdraw(container, resourceType);
        switch (state) {
            case ERR_NOT_IN_RANGE:
                if (container.store[resourceType] > this.creep.store.getCapacity() * 0.5) {
                    return this.moveTo(container);
                }
                else {
                    this.memory.harvestContainerId = undefined;
                }
                break;
            case OK:
                this.memory.harvestContainerId = undefined;
                return true;
            default: {
                console.log("🚩 harvestRoomContainer unhandled state: " + state + " for creep: " + this.creep.name + " in room: " + this.creep.room.name + "");
                return false;
            }
        }
        return false;
    }
    harvestRoomDrop(resourceType) {
        let drop;
        if (this.memory.harvestDroppedId) {
            drop = Game.getObjectById(this.memory.harvestDroppedId);
            if (!drop)
                this.memory.harvestDroppedId = undefined;
        }
        else if (!this.hasHarvestTarget()) {
            drop = this.creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
                filter: (resource) => {
                    return resource.resourceType == resourceType && resource.amount > 50;
                }
            });
        }
        if (!drop) {
            this.memory.harvestDroppedId = undefined;
            return false;
        }
        if (drop.resourceType == resourceType) {
            this.memory.harvestDroppedId = drop.id;
            let state = this.creep.pickup(drop);
            switch (state) {
                case ERR_NOT_IN_RANGE:
                    if (drop.amount > 50) {
                        return this.moveTo(drop);
                    }
                    this.memory.harvestDroppedId = undefined;
                    break;
                case OK:
                    this.memory.harvestDroppedId = undefined;
                    return true;
                default: {
                    console.log("🚩 harvestRoomDrop unhandled state: " + state + " for creep: " + this.creep.name + " in room: " + this.creep.room.name + "");
                    return false;
                }
            }
        }
        return false;
    }
    harvestRoomTombstone(resourceType) {
        let tombstone;
        if (this.memory.harvestTombstoneId) {
            tombstone = Game.getObjectById(this.memory.harvestTombstoneId);
            if (!tombstone)
                this.memory.harvestTombstoneId = undefined;
        }
        else if (!this.hasHarvestTarget()) {
            tombstone = this.creep.pos.findClosestByRange(FIND_TOMBSTONES, {
                filter: (tombstone) => {
                    return tombstone.store.getUsedCapacity(resourceType) > 50;
                }
            });
            this.memory.harvestTombstoneId = tombstone === null || tombstone === void 0 ? void 0 : tombstone.id;
        }
        if (!tombstone) {
            this.memory.harvestTombstoneId = undefined;
            return false;
        }
        let state = this.creep.withdraw(tombstone, resourceType);
        switch (state) {
            case ERR_NOT_IN_RANGE:
                if (tombstone.store.getUsedCapacity(resourceType) > 50) {
                    return this.moveTo(tombstone);
                }
                this.memory.harvestTombstoneId = undefined;
                break;
            case OK:
            case ERR_NOT_ENOUGH_ENERGY:
                this.memory.harvestTombstoneId = undefined;
                return true;
            default: {
                console.warn("🚩 harvestRoomTombstone unhandled state: " + state + " for creep: " + this.creep.name + " in room: " + this.creep.room.name + "");
                return false;
            }
        }
        return false;
    }
    harvestEnergySource() {
        let source;
        if (this.memory.havestSourceId) {
            source = Game.getObjectById(this.memory.havestSourceId);
            if (!source)
                this.memory.havestSourceId = undefined;
        }
        else {
            source = this.creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE);
        }
        if (source) {
            let state = this.creep.harvest(source);
            switch (state) {
                case ERR_TIRED:
                case ERR_NOT_ENOUGH_ENERGY: {
                    this.creep.say('😴');
                    return true;
                }
                case ERR_NOT_IN_RANGE:
                    return this.moveTo(source);
                case OK:
                    return true;
                default: {
                    console.log("🚩 harvestEnergySource unhandled state: " + state + " for creep: " + this.creep.name + " in room: " + this.creep.room.name + "");
                    return false;
                }
            }
        }
        return true;
    }
}

class LinkStorage {
    constructor() {
        this.linkCache = new Map();
        this.linkCountCache = new Map();
        this.CACHE_TTL = 250;
        this.QUICK_CHECK_TTL = 500;
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new LinkStorage();
        }
        return this.instance;
    }
    hasLinks(roomName) {
        const room = Game.rooms[roomName];
        if (!room)
            return false;
        const cached = this.linkCountCache.get(roomName);
        const currentTick = Game.time;
        if (cached && (currentTick - cached.lastCheck) < this.QUICK_CHECK_TTL) {
            return cached.count > 0;
        }
        const count = room.find(FIND_MY_STRUCTURES, {
            filter: { structureType: STRUCTURE_LINK }
        }).length;
        this.linkCountCache.set(roomName, {
            count,
            lastCheck: currentTick
        });
        return count > 0;
    }
    scanAndCacheLinks(roomName) {
        const room = Game.rooms[roomName];
        if (!room) {
            return { sourceLinks: [], upgraderLink: undefined, storageLink: undefined, remoteLinks: [] };
        }
        const links = room.find(FIND_MY_STRUCTURES, {
            filter: { structureType: STRUCTURE_LINK }
        });
        this.linkCountCache.set(roomName, {
            count: links.length,
            lastCheck: Game.time
        });
        if (links.length === 0) {
            return { sourceLinks: [], upgraderLink: undefined, storageLink: undefined, remoteLinks: [] };
        }
        const controller = room.controller;
        const storage = room.storage;
        const sources = room.find(FIND_SOURCES);
        const categories = {
            sourceLinks: [],
            upgraderLink: undefined,
            storageLink: undefined,
            remoteLinks: []
        };
        for (let link of links) {
            let categorized = false;
            if (!categorized) {
                for (const source of sources) {
                    if (this.isInRange(link.pos, source.pos, 2)) {
                        categories.sourceLinks.push({
                            linkId: link.id,
                            priority: 8,
                            type: 'source'
                        });
                        categorized = true;
                        break;
                    }
                }
            }
            if (!categorized && controller && this.isInRange(link.pos, controller.pos, 3)) {
                categories.upgraderLink = {
                    linkId: link.id,
                    priority: 10,
                    type: 'upgrader'
                };
                categorized = true;
            }
            if (!categorized && storage && this.isInRange(link.pos, storage.pos, 2)) {
                categories.storageLink = {
                    linkId: link.id,
                    priority: 5,
                    type: 'storage'
                };
                categorized = true;
            }
            if (!categorized) {
                categories.remoteLinks.push({
                    linkId: link.id,
                    priority: 1,
                    type: 'remote'
                });
            }
        }
        return categories;
    }
    isInRange(pos1, pos2, range) {
        const dx = Math.abs(pos1.x - pos2.x);
        const dy = Math.abs(pos1.y - pos2.y);
        return Math.max(dx, dy) <= range;
    }
    getLinkCategories(roomName) {
        const cached = this.linkCache.get(roomName);
        const currentTick = Game.time;
        if (cached && (currentTick - cached.lastUpdate) < this.CACHE_TTL) {
            return cached.categories;
        }
        const categories = this.scanAndCacheLinks(roomName);
        this.linkCache.set(roomName, {
            categories,
            lastUpdate: currentTick
        });
        return categories;
    }
    getLinksByType(roomName, type) {
        const categories = this.getLinkCategories(roomName);
        switch (type) {
            case 'source':
                return categories.sourceLinks;
            case 'upgrader':
                return categories.upgraderLink ? [categories.upgraderLink] : [];
            case 'storage':
                return categories.storageLink ? [categories.storageLink] : [];
            case 'remote':
                return categories.remoteLinks;
            default:
                return [];
        }
    }
    invalidateRoomCache(roomName) {
        this.linkCache.delete(roomName);
        this.linkCountCache.delete(roomName);
    }
}

class TransporterAnt extends HarvesterAnt {
    doJob() {
        var _a;
        if (super.doJob()) {
            return true;
        }
        let target;
        if (this.memory.targetId) {
            target = Game.getObjectById(this.memory.targetId);
            if (!target)
                this.memory.targetId = undefined;
        }
        if (!target) {
            if (this.creep.room.memory.spawnPrioBlock || //Wenn Prioblock
                (this.creep.room.storage && this.creep.room.storage.store[RESOURCE_ENERGY] < 3000)) { //oder wenn Storage keine Energie hat, Filler unterstützen
                target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: s => (s.structureType === STRUCTURE_SPAWN ||
                        s.structureType === STRUCTURE_EXTENSION) &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
            }
            if (!target) {
                //Wenn kein Storage existiert tower befüllen & Filler unterstützen
                if (this.creep.room.storage == null) {
                    target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: s => (s.structureType === STRUCTURE_SPAWN ||
                            s.structureType === STRUCTURE_EXTENSION ||
                            (s.structureType === STRUCTURE_TOWER && s.store[RESOURCE_ENERGY] < 900)) &&
                            s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                    });
                }
                else { //ansonsten nur Tower befüllen
                    target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: s => s.structureType === STRUCTURE_TOWER &&
                            s.store[RESOURCE_ENERGY] < 900
                    });
                }
            }
            if (!target) { //ansonsten Energie einlagern
                const roomStorage = this.creep.room.getOrFindRoomStorage();
                if (roomStorage) {
                    const allStructures = [
                        ...(roomStorage.storageId ? [Game.getObjectById(roomStorage.storageId)] : []),
                        ...(((_a = roomStorage.storageContainerId) === null || _a === void 0 ? void 0 : _a.map(id => Game.getObjectById(id))) || [])
                    ].filter(structure => structure && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
                    // Erst nach halb leeren Containern suchen
                    const halfEmptyContainers = allStructures.filter(structure => structure.structureType === STRUCTURE_CONTAINER &&
                        (structure.store.getFreeCapacity(RESOURCE_ENERGY) > this.creep.store[RESOURCE_ENERGY]));
                    if (halfEmptyContainers.length > 0) {
                        target = this.creep.pos.findClosestByRange(halfEmptyContainers);
                    }
                    else {
                        target = this.creep.pos.findClosestByRange(allStructures);
                    }
                }
            }
        }
        if (target) {
            let state = this.creep.transfer(target, RESOURCE_ENERGY);
            switch (state) {
                case ERR_NOT_IN_RANGE: {
                    this.memory.targetId = target.id;
                    this.moveTo(target);
                    break;
                }
                case ERR_FULL:
                case OK: {
                    this.memory.targetId = undefined;
                    break;
                }
            }
        }
        return true;
    }
    doHarvest(resource) {
        if (this.harvestRoomDrop(resource)) {
            return;
        }
        if (this.harvestRoomTombstone(resource)) {
            return;
        }
        let container;
        let sources = this.creep.room.getOrFindEnergieSource();
        if (!this.memory.harvestContainerId && sources.length > 0) {
            sources.forEach(source => {
                if (source.containerId) {
                    if (!container) {
                        container = Game.getObjectById(source.containerId);
                    }
                    else {
                        let newContainer = Game.getObjectById(source.containerId);
                        if (newContainer && container.store[RESOURCE_ENERGY] < newContainer.store[RESOURCE_ENERGY]) {
                            container = newContainer;
                        }
                    }
                }
            });
            this.memory.harvestContainerId = container === null || container === void 0 ? void 0 : container.id;
        }
        if (!container) {
            if (this.memory.harvestContainerId) {
                container = Game.getObjectById(this.memory.harvestContainerId);
                if (!container)
                    this.memory.harvestContainerId = undefined;
            }
            else {
                container = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return structure.structureType === STRUCTURE_CONTAINER &&
                            structure.store[RESOURCE_ENERGY] > 0;
                    }
                });
            }
        }
        if (container) {
            if (container.store[RESOURCE_ENERGY] > this.creep.store.getCapacity() * 0.5) {
                this.memory.harvestContainerId = container.id;
                let state = this.creep.withdraw(container, RESOURCE_ENERGY);
                switch (state) {
                    case ERR_NOT_IN_RANGE:
                        this.moveTo(container);
                        return;
                    case ERR_NOT_ENOUGH_RESOURCES:
                    case ERR_NOT_ENOUGH_ENERGY:
                    case OK:
                        this.memory.harvestContainerId = undefined;
                        return;
                }
            }
            else {
                this.memory.harvestContainerId = undefined;
            }
        }
    }
    getProfil(workroom) {
        if (workroom.memory.state < 3 /* eRoomState.phase3 */) {
            return [CARRY, CARRY, MOVE];
        }
        const availableEnergy = workroom.getMaxAvailableEnergy();
        const setCost = BODYPART_COST[CARRY] + BODYPART_COST[MOVE];
        const maxSets = Math.floor(availableEnergy / setCost);
        const numberOfSets = Math.min(25, maxSets);
        const body = [];
        for (let i = 0; i < numberOfSets; i++) {
            body.push(CARRY);
            body.push(MOVE);
        }
        return body;
    }
    createSpawnMemory(spawn, roomname) {
        const base = super.createSpawnMemory(spawn, roomname);
        return {
            ...base,
            targetId: undefined,
        };
    }
    getJob() {
        return "Transporter" /* eJobType.transporter */;
    }
    getMaxCreeps(workroom) {
        const room = Game.rooms[workroom];
        if (!room) {
            return 0;
        }
        const countOfSources = room.getOrFindEnergieSource().length || 0;
        const links = LinkStorage.getInstance();
        const countOfSourcesLinks = links.getLinksByType(workroom, "source").length || 0;
        const result = countOfSources - countOfSourcesLinks;
        return result > 0 ? result : 0;
    }
    shouldSpawn(workroom) {
        if (roomConfig[workroom].spawnRoom != undefined) {
            return false;
        }
        const roomstate = Memory.rooms[workroom].state;
        if (roomstate > 1 /* eRoomState.phase1 */ && roomstate < 5 /* eRoomState.phase5 */) {
            return true;
        }
        const room = Game.rooms[workroom];
        if (!room) {
            return false;
        }
        const countOfSources = room.getOrFindEnergieSource().length || 0;
        const links = LinkStorage.getInstance();
        const countOfSourcesLinks = links.getLinksByType(workroom, "source").length || 0;
        return countOfSources > countOfSourcesLinks;
    }
}

class StationaryAnt extends Ant {
    goToFinalPos(range = 0) {
        const finalPos = this.memory.finalLocation;
        if (finalPos) {
            if (this.creep.room.name === this.memory.workRoom &&
                new RoomPosition(finalPos.x, finalPos.y, this.memory.workRoom).inRangeTo(this.creep.pos, range)) {
                this.memory.onPosition = true;
                this.memory.moving = false;
                this.memory.targetPos = undefined;
                return true;
            }
            this.moveTo(new RoomPosition(finalPos.x, finalPos.y, this.memory.workRoom), range);
            return true;
        }
        return false;
    }
    isOnPosition() {
        return this.memory.onPosition;
    }
}

class MinerAnt extends StationaryAnt {
    doJob() {
        if (!this.isOnPosition()) {
            if (!this.goToFinalPos()) {
                return true;
            }
            this.creep.say('🚌');
            return true;
        }
        let container;
        let constructionSite;
        let link;
        let source;
        if (this.memory.energySourceId) {
            source = Game.getObjectById(this.memory.energySourceId);
            if (!source) {
                this.memory.energySourceId = undefined;
            }
        }
        else {
            this.creep.say('🚩');
            return false;
        }
        if (this.creep.room.memory.state >= 5 /* eRoomState.phase5 */) {
            if (this.memory.linkId) {
                link = Game.getObjectById(this.memory.linkId);
                if (!link)
                    this.memory.linkId = undefined;
            }
            else {
                link = this.creep.pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: { structureType: STRUCTURE_LINK }
                })[0];
                this.memory.linkId = link === null || link === void 0 ? void 0 : link.id;
            }
        }
        if (this.memory.containerId) {
            container = Game.getObjectById(this.memory.containerId);
            if (!container)
                this.memory.containerId = undefined;
        }
        if (!this.memory.containerId && this.memory.containerConstructionId) {
            constructionSite = Game.getObjectById(this.memory.containerConstructionId);
            if (!constructionSite)
                this.memory.containerConstructionId = undefined;
        }
        if (!container && !constructionSite && source) {
            let container = source.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: { structureType: STRUCTURE_CONTAINER }
            })[0];
            if (container) {
                this.memory.containerId = container.id;
            }
            else {
                let build = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                    filter: { structureType: STRUCTURE_CONTAINER }
                })[0];
                if (build) {
                    this.memory.containerConstructionId = build.id;
                }
                else {
                    this.creep.say("🚩");
                }
            }
        }
        const energyStore = this.creep.store[RESOURCE_ENERGY];
        if (energyStore > 0) {
            if (constructionSite) {
                this.creep.say('🪚');
                this.creep.build(constructionSite);
                return true;
            }
            if (container && container.hits < (container.hitsMax * 0.8)) {
                this.creep.repair(container);
                this.creep.say('🛠️');
                return true;
            }
            if (energyStore >= this.creep.store.getCapacity(RESOURCE_ENERGY)) {
                if (link) {
                    let state = this.creep.transfer(link, RESOURCE_ENERGY);
                    switch (state) {
                        case ERR_NOT_IN_RANGE: {
                            this.memory.linkId = undefined;
                            break;
                        }
                    }
                    return true;
                }
                if (container) {
                    if (container.store.getFreeCapacity() == 0) {
                        if (container.hits < container.hitsMax) {
                            this.creep.repair(container);
                            this.creep.say('🚯🛠️');
                            return true;
                        }
                        this.creep.say('🚯');
                        return true;
                    }
                }
            }
        }
        if (source) {
            switch (this.creep.harvest(source)) {
                case ERR_TIRED:
                case ERR_NOT_ENOUGH_ENERGY: {
                    this.creep.say('😴');
                    if (container) {
                        this.creep.withdraw(container, RESOURCE_ENERGY);
                    }
                    break;
                }
                case OK: {
                    return true;
                }
            }
        }
        return true;
    }
    getProfil(workroom) {
        if (workroom.memory.state < 3 /* eRoomState.phase3 */) {
            return [WORK, CARRY, MOVE];
        }
        const availableEnergy = workroom.getMaxAvailableEnergy();
        const setCost = BODYPART_COST[WORK];
        const moveCost = 3 * BODYPART_COST[MOVE] + BODYPART_COST[CARRY];
        const maxSets = Math.floor((availableEnergy - moveCost) / setCost);
        const numberOfSets = Math.min(25, maxSets); // Limit auf 8 Sets
        const body = [MOVE, MOVE, MOVE, CARRY];
        for (let i = 0; i < numberOfSets; i++) {
            body.push(WORK);
        }
        return body;
    }
    createSpawnMemory(spawn, roomname) {
        const workroom = Game.rooms[roomname];
        const job = this.getJob();
        const sources = workroom.getOrFindEnergieSource();
        const creepStorage = CreepStorage.getInstance();
        const creeps = creepStorage.getCreepsByJobAndRoom(job, roomname);
        let sourceId = undefined;
        let containerId = undefined;
        let linkId = undefined;
        let finalLocation = undefined;
        let buildId = undefined;
        for (let s of sources) {
            let found = false;
            for (let creep of creeps) {
                const minerMemory = creep.memory;
                if (minerMemory.energySourceId === s.sourceId) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                sourceId = s.sourceId;
                if (s.containerId) {
                    let check = Game.getObjectById(s.containerId);
                    if (check) {
                        containerId = s.containerId;
                    }
                    else {
                        for (let id in workroom.memory.energySources) {
                            if (workroom.memory.energySources[id].sourceId == s.sourceId) {
                                workroom.memory.energySources[id].containerId = undefined;
                            }
                        }
                    }
                }
                if (s.linkId) {
                    let check = Game.getObjectById(s.linkId);
                    if (check) {
                        linkId = s.linkId;
                    }
                    else {
                        for (let id in workroom.memory.energySources) {
                            if (workroom.memory.energySources[id].sourceId == s.sourceId) {
                                workroom.memory.energySources[id].linkId = undefined;
                            }
                        }
                    }
                }
                break;
            }
        }
        if (containerId) {
            let container = Game.getObjectById(containerId);
            finalLocation = container === null || container === void 0 ? void 0 : container.pos;
        }
        if (!finalLocation && sourceId) {
            let sourceObj = Game.getObjectById(sourceId);
            finalLocation = sourceObj === null || sourceObj === void 0 ? void 0 : sourceObj.pos;
            if (sourceObj) {
                let container = sourceObj.pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: { structureType: STRUCTURE_CONTAINER }
                })[0];
                if (container) {
                    finalLocation = container.pos;
                    if (container.structureType == STRUCTURE_CONTAINER) {
                        containerId = container.id;
                        for (let id in workroom.memory.energySources) {
                            if (workroom.memory.energySources[id].sourceId == sourceId) {
                                workroom.memory.energySources[id].containerId = containerId;
                            }
                        }
                    }
                }
                else {
                    containerId = undefined;
                    let build = sourceObj.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                        filter: { structureType: STRUCTURE_CONTAINER }
                    })[0];
                    if (build) {
                        finalLocation = build.pos;
                        if (build.id) {
                            buildId = build.id;
                        }
                    }
                    else {
                        const sourcePos = sourceObj.pos;
                        let adjacentSpots = [];
                        for (let xOffset = -1; xOffset <= 1; xOffset++) {
                            for (let yOffset = -1; yOffset <= 1; yOffset++) {
                                if (xOffset === 0 && yOffset === 0) {
                                    continue;
                                }
                                let x = sourcePos.x + xOffset;
                                let y = sourcePos.y + yOffset;
                                adjacentSpots.push(new RoomPosition(x, y, workroom.name));
                            }
                        }
                        for (let spot of adjacentSpots) {
                            if (spot.createConstructionSite(STRUCTURE_CONTAINER) === OK) {
                                finalLocation = spot;
                                break;
                            }
                        }
                        let build = sourceObj.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                            filter: { structureType: STRUCTURE_CONTAINER }
                        })[0];
                        if (build) {
                            finalLocation = build.pos;
                            if (build.id) {
                                buildId = build.id;
                            }
                        }
                    }
                }
            }
        }
        return {
            job: job,
            ticksToPos: 1,
            spawn: spawn.name,
            state: 0 /* eJobState.harvest */,
            workRoom: workroom.name,
            energySourceId: sourceId,
            containerId: containerId,
            linkId: linkId,
            containerConstructionId: buildId,
            onPosition: false,
            finalLocation: finalLocation,
            roundRobin: 1,
            roundRobinOffset: undefined,
            moving: false,
        };
    }
    getJob() {
        return "Miner" /* eJobType.miner */;
    }
    getMaxCreeps(workroom) {
        const room = Game.rooms[workroom];
        if (!room) {
            return 0;
        }
        return room.getOrFindEnergieSource().length || 0;
    }
    shouldSpawn(workroom) {
        if (!roomConfig[workroom].sendMiner || roomConfig[workroom].spawnRoom != undefined) {
            return false;
        }
        let room = Game.rooms[workroom];
        let max = 0;
        if (room) {
            max = room.getOrFindEnergieSource().length;
        }
        else {
            max = Memory.rooms[workroom].energySources.length;
        }
        const job = this.getJob();
        const creepStorage = CreepStorage.getInstance();
        const countOfCreeps = creepStorage.getCreepCountByJobAndRoom(job, workroom);
        return max > countOfCreeps;
    }
}

class UpgraderAnt extends HarvesterAnt {
    doJob() {
        if (super.doJob()) {
            return true;
        }
        const controller = this.creep.room.controller;
        if (controller) {
            if (this.creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                this.moveTo(controller);
            }
            controller.room.setRoomState(controller);
        }
        return true;
    }
    doHarvest(resource) {
        var _a;
        if (this.creep.room.memory.state >= 4 /* eRoomState.phase4 */) {
            let link;
            if (this.memory.havestLinkId) {
                link = Game.getObjectById(this.memory.havestLinkId);
                if (!link)
                    this.memory.havestLinkId = undefined;
            }
            else {
                let links = LinkStorage.getInstance().getLinksByType(this.creep.room.name, "upgrader");
                if (links.length > 0) {
                    this.memory.havestLinkId = links[0].linkId;
                }
            }
            if (link && link.store[RESOURCE_ENERGY] > 0) {
                let state = this.creep.withdraw(link, RESOURCE_ENERGY);
                switch (state) {
                    case ERR_NOT_IN_RANGE:
                        this.moveTo(link);
                        return;
                    case OK:
                        return;
                }
            }
        }
        if (this.harvestRoomContainer(resource)) {
            return;
        }
        if (this.harvestRoomDrop(resource)) {
            return;
        }
        if (this.harvestRoomTombstone(resource)) {
            return;
        }
        if ((_a = this.creep.room.controller) === null || _a === void 0 ? void 0 : _a.my) {
            if (this.harvestRoomStorage(resource)) {
                return;
            }
        }
        if (resource == RESOURCE_ENERGY) {
            this.harvestEnergySource();
        }
    }
    createSpawnMemory(spawn, workroom) {
        let base = super.createSpawnMemory(spawn, workroom);
        return {
            ...base,
        };
    }
    getProfil(workroom) {
        if (workroom.memory.state < 3 /* eRoomState.phase3 */) {
            return [WORK, CARRY, MOVE];
        }
        const availableEnergy = workroom.getMaxAvailableEnergy();
        const workPerSet = 3;
        const carryPerSet = 1;
        const movePerSet = 1;
        const setCost = workPerSet * BODYPART_COST[WORK] + carryPerSet * BODYPART_COST[CARRY] + movePerSet * BODYPART_COST[MOVE];
        const maxSets = Math.floor(availableEnergy / setCost);
        const numberOfSets = Math.min(7, maxSets);
        const body = [];
        for (let i = 0; i < numberOfSets; i++) {
            body.push(...Array(workPerSet).fill(WORK));
            body.push(...Array(carryPerSet).fill(CARRY));
            body.push(...Array(movePerSet).fill(MOVE));
        }
        return body;
    }
    getJob() {
        return "Upgrader" /* eJobType.upgrader */;
    }
    getMaxCreeps(workroom) {
        const room = Game.rooms[workroom];
        let max = roomConfig[workroom].upgraderCount || 0;
        if (room && room.storage) {
            if (room.memory.state == 8 /* eRoomState.phase8 */) {
                return 1;
            }
            if (room.memory.state < 8 /* eRoomState.phase8 */ && room.memory.state > 4 /* eRoomState.phase4 */) {
                if (room.storage.store[RESOURCE_ENERGY] > 50000) {
                    max++;
                }
                if (room.storage.store[RESOURCE_ENERGY] > 75000) {
                    max++;
                }
            }
            if (room.storage.store[RESOURCE_ENERGY] < 10000) {
                max = 1;
            }
        }
        return max;
    }
    shouldSpawn(workroom) {
        if (roomConfig[workroom].spawnRoom != undefined) {
            return false;
        }
        const linkStorage = LinkStorage.getInstance();
        const links = linkStorage.getLinksByType(workroom, "upgrader");
        if (links.length > 0) {
            return false;
        }
        const job = this.getJob();
        const creepStorage = CreepStorage.getInstance();
        const countOfCreeps = creepStorage.getCreepCountByJobAndRoom(job, workroom);
        return this.getMaxCreeps(workroom) > countOfCreeps;
    }
}

class WorkerAnt extends HarvesterAnt {
    doJob() {
        if (super.doJob()) {
            return true;
        }
        const target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: s => (s.structureType === STRUCTURE_SPAWN ||
                s.structureType === STRUCTURE_EXTENSION) &&
                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });
        if (target) {
            let state = this.creep.transfer(target, RESOURCE_ENERGY);
            switch (state) {
                case ERR_NOT_IN_RANGE: {
                    this.moveTo(target);
                    return true;
                }
            }
        }
        if (!target) {
            const todo = this.creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES, {
                filter: (site) => {
                    return site.structureType !== STRUCTURE_RAMPART;
                }
            });
            if (todo) {
                if (this.creep.build(todo) === ERR_NOT_IN_RANGE) {
                    this.moveTo(todo);
                }
                return true;
            }
            else {
                const controller = this.creep.room.controller;
                if (controller && this.creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                    this.moveTo(controller);
                    return true;
                }
            }
        }
        return true;
    }
    doHarvest(resource) {
        var _a;
        if (this.harvestRoomDrop(resource)) {
            return;
        }
        if (this.harvestRoomTombstone(resource)) {
            return;
        }
        if ((_a = this.creep.room.controller) === null || _a === void 0 ? void 0 : _a.my) {
            if (this.harvestRoomStorage(resource)) {
                return;
            }
        }
        if (this.harvestRoomContainer(resource)) {
            return;
        }
        if (this.harvestLinks(resource)) {
            return;
        }
        if (resource == RESOURCE_ENERGY) {
            this.harvestEnergySource();
        }
    }
    createSpawnMemory(spawn, workroom) {
        const base = super.createSpawnMemory(spawn, workroom);
        return {
            ...base
        };
    }
    getProfil(workroom) {
        return [WORK, CARRY, MOVE];
    }
    getJob() {
        return "Worker" /* eJobType.worker */;
    }
    getMaxCreeps(workroom) {
        return roomConfig[workroom].workerCount || 0;
    }
    shouldSpawn(workroom) {
        if (roomConfig[workroom].spawnRoom != undefined) {
            return false;
        }
        return Memory.rooms[workroom].state <= 1 /* eRoomState.phase1 */;
    }
    hasHarvestTarget() {
        return !!(this.memory.harvestContainerId ||
            this.memory.harvestStorageId ||
            this.memory.havestSourceId ||
            this.memory.havestLinkId ||
            this.memory.harvestDroppedId ||
            this.memory.harvestTombstoneId);
    }
    harvestLinks(resource) {
        let link;
        if (this.memory.harvestLinkId) {
            link = Game.getObjectById(this.memory.harvestLinkId);
            if (!link)
                this.memory.harvestLinkId = undefined;
        }
        else if (!this.hasHarvestTarget()) {
            link = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: s => s.structureType == STRUCTURE_LINK && s.store[resource] > 0
            });
        }
        if (!link) {
            this.memory.harvestLinkId = undefined;
            return false;
        }
        if (link.store[resource] > 0) {
            this.memory.harvestLinkId = link.id;
            let state = this.creep.withdraw(link, resource);
            switch (state) {
                case ERR_NOT_IN_RANGE:
                    this.moveTo(link);
                    return true;
                case OK:
                    this.memory.harvestLinkId = undefined;
                    return true;
            }
        }
        this.memory.harvestLinkId = undefined;
        return false;
    }
}

class BuilderAnt extends HarvesterAnt {
    doJob() {
        if (super.doJob()) {
            return true;
        }
        let buildId = this.memory.constructionId;
        if (!buildId) {
            const todos = this.creep.room.find(FIND_CONSTRUCTION_SITES, {
                filter: (site) => {
                    return site.structureType !== STRUCTURE_RAMPART;
                }
            });
            if (todos.length > 0) {
                // Sortiere nach Priorität: Container zuerst, dann Rest
                todos.sort((a, b) => {
                    const priorityA = a.structureType === STRUCTURE_CONTAINER ? 0 : 1;
                    const priorityB = b.structureType === STRUCTURE_CONTAINER ? 0 : 1;
                    return priorityA - priorityB;
                });
                buildId = todos[0].id;
                this.memory.constructionId = buildId;
            }
        }
        if (buildId) {
            const build = Game.getObjectById(buildId);
            if (build) {
                this.creep.say('🪚');
                if (this.creep.build(build) === ERR_NOT_IN_RANGE) {
                    this.moveTo(build);
                }
                return true;
            }
            this.memory.constructionId = undefined;
        }
        if (this.creep.room.find(FIND_CONSTRUCTION_SITES, {
            filter: (site) => {
                return site.structureType !== STRUCTURE_RAMPART;
            }
        }).length == 0) {
            const controller = this.creep.room.controller;
            if (controller && this.creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                this.moveTo(controller);
                return true;
            }
        }
        return true;
    }
    createSpawnMemory(spawn, workroom) {
        let base = super.createSpawnMemory(spawn, workroom);
        return {
            ...base,
            constructionId: undefined,
        };
    }
    getProfil(workroom) {
        if (workroom.memory.state < 3 /* eRoomState.phase3 */) {
            return [WORK, CARRY, MOVE];
        }
        const availableEnergy = workroom.getMaxAvailableEnergy();
        const workPerSet = 3;
        const carryPerSet = 2;
        const movePerSet = 2;
        const setCost = workPerSet * BODYPART_COST[WORK] + carryPerSet * BODYPART_COST[CARRY] + movePerSet * BODYPART_COST[MOVE];
        const maxSets = Math.floor(availableEnergy / setCost);
        const numberOfSets = Math.min(7, maxSets);
        const body = [];
        for (let i = 0; i < numberOfSets; i++) {
            body.push(...Array(workPerSet).fill(WORK));
            body.push(...Array(carryPerSet).fill(CARRY));
            body.push(...Array(movePerSet).fill(MOVE));
        }
        return body;
    }
    getJob() {
        return "Builder" /* eJobType.builder */;
    }
    getMaxCreeps(workroom) {
        return roomConfig[workroom].builderCount || 0;
    }
    shouldSpawn(workroom) {
        if (roomConfig[workroom].spawnRoom != undefined) {
            return false;
        }
        const job = this.getJob();
        const creepStorage = CreepStorage.getInstance();
        const countOfAnts = creepStorage.getCreepCountByJobAndRoom(job, workroom);
        if (countOfAnts >= this.getMaxCreeps(workroom)) {
            return false;
        }
        const room = Game.rooms[workroom];
        if (!room) {
            return false;
        }
        const todos = room.find(FIND_CONSTRUCTION_SITES, {
            filter: s => s.structureType != STRUCTURE_RAMPART
        });
        return todos.length > 0;
    }
}

class ScoutAnt extends Ant {
    doJob() {
        if (!this.memory.scoutRoom) {
            this.assignNextTarget();
            return true;
        }
        if (this.creep.room.name == this.memory.scoutRoom) {
            this.scoutCurrentRoom();
            this.assignNextTarget();
            return true;
        }
        else {
            Movement.moveToRoom(this.creep, this.memory.scoutRoom);
            return true;
        }
    }
    getProfil(workroom) {
        return [MOVE];
    }
    createSpawnMemory(spawn, roomname) {
        let base = super.createSpawnMemory(spawn, roomname);
        return {
            ...base,
        };
    }
    getJob() {
        return "Scout" /* eJobType.scout */;
    }
    getMaxCreeps(workroom) {
        return 1;
    }
    shouldSpawn(workroom) {
        var _a, _b;
        if (roomConfig[workroom].spawnRoom != undefined) {
            return false;
        }
        const roomState = (_a = Memory.rooms[workroom]) === null || _a === void 0 ? void 0 : _a.state;
        const scoutState = (_b = Memory.rooms[workroom]) === null || _b === void 0 ? void 0 : _b.scoutState;
        if (!roomState || roomState < 2 /* eRoomState.phase2 */) {
            return false; // Erst ab Phase 1
        }
        //somit startet einmalig eine suche, wenn  der status sich ändert :) 
        if (scoutState && scoutState >= roomState) {
            return false;
        }
        const scoutRadius = this.getScoutRadius(roomState);
        const unexploredRooms = this.findUnexploredRooms(workroom, scoutRadius);
        if (unexploredRooms.length == 0) {
            Memory.rooms[workroom].scoutState = roomState;
        }
        return unexploredRooms.length > 0;
    }
    assignNextTarget() {
        var _a;
        const workroom = Game.rooms[this.memory.workRoom];
        if (!workroom)
            return;
        const roomState = (_a = Memory.rooms[workroom.name]) === null || _a === void 0 ? void 0 : _a.state;
        if (!roomState)
            return;
        const scoutRadius = this.getScoutRadius(roomState);
        const unexploredRooms = this.findUnexploredRooms(workroom.name, scoutRadius);
        if (unexploredRooms.length > 0) {
            this.memory.scoutRoom = unexploredRooms[0];
            console.log(`Scout ${this.creep.name} erkundet jetzt ${this.memory.scoutRoom}`);
        }
        else {
            this.creep.suicide();
        }
    }
    scoutCurrentRoom() {
        var _a, _b;
        const room = Game.rooms[this.creep.room.name];
        if (!room)
            return;
        Memory.rooms[room.name] = {
            energySources: [],
            mineralSources: [],
            storage: undefined,
            state: 0 /* eRoomState.neutral */,
            invaderCore: false,
            needDefence: false,
            towers: [],
            repairTarget: undefined,
        };
        if (room.controller) {
            Memory.rooms[room.name].controllerData = {
                x: room.controller.pos.x,
                y: room.controller.pos.y,
                id: room.controller.id,
            };
        }
        if (((_b = (_a = room.controller) === null || _a === void 0 ? void 0 : _a.owner) === null || _b === void 0 ? void 0 : _b.username) == "Invader") {
            room.memory.state = 10 /* eRoomState.invader */;
        }
        else {
            room.memory.state = 9 /* eRoomState.otherPlayer */;
        }
        const source = room.find(FIND_SOURCES);
        for (let s of source) {
            room.memory.energySources.push(new EnergieSourceData(s.id));
        }
        const mineral = room.find(FIND_MINERALS);
        for (let m of mineral) {
            room.memory.mineralSources.push(new MineralSourceData(m.id, m.mineralType));
        }
    }
    getScoutRadius(roomState) {
        if (roomState >= 7 /* eRoomState.phase7 */)
            return 3;
        if (roomState >= 3 /* eRoomState.phase3 */)
            return 2; // Ab Phase 3: Radius 2
        if (roomState >= 1 /* eRoomState.phase1 */)
            return 1; // Ab Phase 1: Radius 1 (Nachbarn)
        return 0;
    }
    findUnexploredRooms(startRoom, radius) {
        const unexplored = [];
        const visited = new Set();
        this.exploreRadius(startRoom, radius, 0, visited, unexplored);
        return unexplored;
    }
    exploreRadius(currentRoom, maxRadius, currentDepth, visited, unexplored) {
        if (currentDepth > maxRadius || visited.has(currentRoom)) {
            return;
        }
        visited.add(currentRoom);
        if (currentDepth > 0 && !Memory.rooms[currentRoom]) {
            unexplored.push(currentRoom);
        }
        if (currentDepth < maxRadius) {
            const exits = Game.map.describeExits(currentRoom);
            if (exits) {
                for (const direction in exits) {
                    const neighborRoom = exits[direction];
                    if (neighborRoom) {
                        this.exploreRadius(neighborRoom, maxRadius, currentDepth + 1, visited, unexplored);
                    }
                }
            }
        }
    }
}

class WallBuilderAnt extends HarvesterAnt {
    doJob() {
        if (super.doJob()) {
            if (this.memory.state == 0 /* eJobState.harvest */) {
                this.memory.repairId = undefined;
                this.memory.constructionId = undefined;
            }
            return true;
        }
        let Repair;
        let ConstructionSite;
        if (this.memory.repairId) {
            Repair = Game.getObjectById(this.memory.repairId);
            if (!Repair)
                this.memory.repairId = undefined;
        }
        if (!Repair) {
            if (this.memory.constructionId) {
                ConstructionSite = Game.getObjectById(this.memory.constructionId);
                if (!ConstructionSite)
                    this.memory.constructionId = undefined;
            }
            if (!ConstructionSite) {
                ConstructionSite = this.findBuildTarget();
                this.memory.constructionId = ConstructionSite === null || ConstructionSite === void 0 ? void 0 : ConstructionSite.id;
            }
            if (!ConstructionSite) {
                Repair = this.findRepairTarget();
                this.memory.repairId = Repair === null || Repair === void 0 ? void 0 : Repair.id;
            }
        }
        if (ConstructionSite) {
            this.creep.say('🪚');
            let status = this.creep.build(ConstructionSite);
            switch (status) {
                case ERR_NOT_IN_RANGE: {
                    this.moveTo(ConstructionSite);
                    break;
                }
                case OK: {
                    const found = this.creep.pos.findInRange(FIND_STRUCTURES, 3, {
                        filter: (structure) => {
                            return structure.structureType === STRUCTURE_RAMPART && structure.hits < 100;
                        }
                    });
                    if (found.length > 0) {
                        this.memory.repairId = found[0].id;
                        this.memory.constructionId = undefined;
                    }
                }
            }
            return true;
        }
        if (Repair) {
            if (this.creep.repair(Repair) === ERR_NOT_IN_RANGE) {
                this.moveTo(Repair);
            }
            return true;
        }
        return true;
    }
    findBuildTarget() {
        const todos = this.creep.room.find(FIND_CONSTRUCTION_SITES, {
            filter: (site) => {
                return site.structureType === STRUCTURE_RAMPART;
            }
        });
        return todos.length > 0 ? todos[0] : null;
    }
    findRepairTarget() {
        const structures = this.creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType === STRUCTURE_WALL ||
                    structure.structureType === STRUCTURE_RAMPART) &&
                    structure.hits < structure.hitsMax;
            }
        });
        if (structures.length === 0) {
            return undefined;
        }
        // Teile in zwei Gruppen: Ramparts unter 100 HP und alle anderen
        const criticalRamparts = [];
        const otherStructures = [];
        for (const structure of structures) {
            if (structure.structureType === STRUCTURE_RAMPART && structure.hits < 100) {
                criticalRamparts.push(structure);
            }
            else {
                otherStructures.push(structure);
            }
        }
        if (criticalRamparts.length > 0) {
            criticalRamparts.sort((a, b) => a.hits - b.hits);
            return criticalRamparts[0];
        }
        // Alle anderen Strukturen nach HP sortieren
        otherStructures.sort((a, b) => a.hits - b.hits);
        return otherStructures[0];
    }
    createSpawnMemory(spawn, workroom) {
        let base = super.createSpawnMemory(spawn, workroom);
        return {
            ...base,
            constructionId: undefined,
        };
    }
    getProfil(workroom) {
        if (workroom.memory.state < 3 /* eRoomState.phase3 */) {
            return [WORK, CARRY, MOVE];
        }
        const availableEnergy = workroom.getMaxAvailableEnergy();
        const workPerSet = 3;
        const carryPerSet = 2;
        const movePerSet = 2;
        const setCost = workPerSet * BODYPART_COST[WORK] + carryPerSet * BODYPART_COST[CARRY] + movePerSet * BODYPART_COST[MOVE];
        const maxSets = Math.floor((availableEnergy - BODYPART_COST[MOVE]) / setCost);
        const numberOfSets = Math.min(7, maxSets);
        const body = [MOVE];
        for (let i = 0; i < numberOfSets; i++) {
            body.push(...Array(workPerSet).fill(WORK));
            body.push(...Array(carryPerSet).fill(CARRY));
            body.push(...Array(movePerSet).fill(MOVE));
        }
        return body;
    }
    getJob() {
        return "WallBuilder" /* eJobType.wallBuilder */;
    }
    getMaxCreeps(workroom) {
        let max = roomConfig[workroom].wallbuilderCount || 0;
        const room = Game.rooms[workroom];
        if (room && room.storage) {
            if (room.memory.state < 8 /* eRoomState.phase8 */ && room.memory.state > 4 /* eRoomState.phase4 */) {
                if (room.storage.store[RESOURCE_ENERGY] > 500000) {
                    max++;
                }
                if (room.storage.store[RESOURCE_ENERGY] > 750000) {
                    max++;
                }
            }
            if (room.storage.store[RESOURCE_ENERGY] < 1000) {
                max = 0;
            }
        }
        return max;
    }
    shouldSpawn(workroom) {
        if (roomConfig[workroom].spawnRoom != undefined) {
            return false;
        }
        const room = Game.rooms[workroom];
        if (!room) {
            return false;
        }
        const todos = room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType === STRUCTURE_RAMPART ||
                    structure.structureType === STRUCTURE_WALL) &&
                    structure.hits < structure.hitsMax;
            }
        });
        return todos.length > 0;
    }
}

class FillerAnt extends Ant {
    doJob() {
        var _a;
        if (Movement.shouldContinueMoving(this.creep)) {
            Movement.continueMoving(this.creep);
            return true;
        }
        this.checkHarvest();
        if (this.memory.state == 0 /* eJobState.harvest */) {
            if ((_a = this.creep.room.controller) === null || _a === void 0 ? void 0 : _a.my) {
                if (this.creep.room.memory.state >= 4 /* eRoomState.phase4 */) {
                    let link;
                    if (this.memory.harvestLinkId) {
                        link = Game.getObjectById(this.memory.harvestLinkId);
                        if (!link)
                            this.memory.harvestLinkId = undefined;
                    }
                    else {
                        let links = LinkStorage.getInstance().getLinksByType(this.creep.room.name, "storage");
                        if (links.length > 0) {
                            this.memory.harvestLinkId = links[0].linkId;
                        }
                    }
                    if (link && link.store[RESOURCE_ENERGY] > 0) {
                        let state = this.creep.withdraw(link, RESOURCE_ENERGY);
                        switch (state) {
                            case ERR_NOT_IN_RANGE:
                                this.moveTo(link);
                                return true;
                            case OK:
                                this.memory.harvestFromLink = true;
                                return true;
                        }
                    }
                }
                let storage;
                if (this.memory.harvestStorageId) {
                    storage = Game.getObjectById(this.memory.harvestStorageId);
                    if (!storage)
                        this.memory.harvestStorageId = undefined;
                }
                else {
                    storage = this.creep.room.storage;
                }
                if (!storage) {
                    this.memory.harvestStorageId = undefined;
                    return false;
                }
                if (storage.store[RESOURCE_ENERGY] > 100) {
                    this.memory.harvestStorageId = storage.id;
                    let state = this.creep.withdraw(storage, RESOURCE_ENERGY);
                    switch (state) {
                        case ERR_NOT_IN_RANGE:
                            this.moveTo(storage);
                            return true;
                        case OK:
                            this.memory.harvestStorageId = undefined;
                            return true;
                    }
                }
                this.memory.harvestStorageId = undefined;
            }
            let container;
            if (this.memory.harvestContainerId) {
                container = Game.getObjectById(this.memory.harvestContainerId);
                if (!container)
                    this.memory.harvestContainerId = undefined;
            }
            else {
                let containers = this.creep.room.findAllContainersNearSpawns();
                if (containers.length == 1) {
                    container = containers[0];
                }
                else {
                    container = this.creep.pos.findClosestByPath(containers, {
                        filter: c => c.store[RESOURCE_ENERGY] > 0
                    });
                }
            }
            if (container && container.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                let state = this.creep.withdraw(container, RESOURCE_ENERGY);
                switch (state) {
                    case ERR_NOT_IN_RANGE:
                        this.moveTo(container);
                        return true;
                    case OK:
                        this.memory.harvestContainerId = undefined;
                        return true;
                }
            }
            if (this.creep.store[RESOURCE_ENERGY] > 100) {
                this.memory.state = 1 /* eJobState.work */;
            }
            return true;
        }
        let target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: s => (s.structureType === STRUCTURE_SPAWN ||
                s.structureType === STRUCTURE_EXTENSION) &&
                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });
        if (target) {
            let state = this.creep.transfer(target, RESOURCE_ENERGY);
            switch (state) {
                case ERR_NOT_IN_RANGE:
                    this.moveTo(target);
                    return true;
                case OK:
                    this.memory.harvestFromLink = false;
                    return true;
            }
        }
        if (this.memory.harvestLinkId) {
            let link = Game.getObjectById(this.memory.harvestLinkId);
            if (!link) {
                this.memory.harvestLinkId = undefined;
            }
            else if (link.store[RESOURCE_ENERGY] > 0 && this.creep.room.storage) {
                let state = this.creep.transfer(this.creep.room.storage, RESOURCE_ENERGY);
                switch (state) {
                    case ERR_NOT_IN_RANGE:
                        this.moveTo(this.creep.room.storage);
                        return true;
                    case OK:
                        this.memory.harvestFromLink = false;
                        return true;
                }
            }
        }
        return true;
    }
    getProfil(workroom) {
        if (workroom.memory.state < 3 /* eRoomState.phase3 */) {
            return [CARRY, CARRY, MOVE];
        }
        const availableEnergy = workroom.getMaxAvailableEnergy();
        const setCost = BODYPART_COST[CARRY] + BODYPART_COST[MOVE];
        const maxSets = Math.floor(availableEnergy / setCost);
        const numberOfSets = Math.min(20, maxSets);
        const body = [];
        for (let i = 0; i < numberOfSets; i++) {
            body.push(CARRY);
            body.push(MOVE);
        }
        return body;
    }
    createSpawnMemory(spawn, roomname) {
        const base = super.createSpawnMemory(spawn, roomname);
        return {
            ...base,
            harvestContainerId: undefined,
            harvestStorageId: undefined,
            harvestLinkId: undefined,
            harvestFromLink: false
        };
    }
    getJob() {
        return "Filler" /* eJobType.filler */;
    }
    getMaxCreeps(workroom) {
        return 1;
    }
    shouldSpawn(workroom) {
        if (roomConfig[workroom].spawnRoom != undefined) {
            return false;
        }
        const room = Game.rooms[workroom];
        return room && Memory.rooms[workroom].state >= 5 /* eRoomState.phase5 */ && room.storage != null;
    }
}

class RemoteHarvester extends Ant {
    doJob() {
        this.checkHarvest();
        if (this.memory.state == 0 /* eJobState.harvest */) {
            if (this.creep.room.name !== this.memory.workRoom) {
                Movement.moveToRoom(this.creep, this.memory.workRoom);
                return true;
            }
        }
        else {
            if (this.creep.room.name !== this.memory.spawnRoom) {
                Movement.moveToRoom(this.creep, this.memory.spawnRoom);
                return true;
            }
        }
        if (Movement.shouldContinueMoving(this.creep)) {
            Movement.continueMoving(this.creep);
            return true;
        }
        if (this.memory.state == 0 /* eJobState.harvest */) {
            this.memory.targetId = undefined;
            if (this.creep.room.name != this.memory.workRoom) {
                return false;
            }
            if (this.harvestRoomDrop(RESOURCE_ENERGY)) {
                return true;
            }
            if (this.harvestRoomTombstone(RESOURCE_ENERGY)) {
                return true;
            }
            let Source;
            if (this.memory.energySourceId) {
                Source = Game.getObjectById(this.memory.energySourceId);
                if (!Source)
                    this.memory.energySourceId = undefined;
            }
            if (!this.memory.energySourceId) {
                let sources = this.creep.room.getOrFindEnergieSource();
                if (sources.length == 1) {
                    Source = Game.getObjectById(sources[0].sourceId);
                }
                else {
                    for (let source of sources) {
                        if (!Source) {
                            Source = Game.getObjectById(source.sourceId);
                        }
                        else {
                            let newSource = Game.getObjectById(source.sourceId);
                            if (newSource && newSource.energy > Source.energy) {
                                Source = newSource;
                            }
                        }
                    }
                }
                this.memory.energySourceId = Source === null || Source === void 0 ? void 0 : Source.id;
            }
            if (Source) {
                let state = this.creep.harvest(Source);
                switch (state) {
                    case ERR_TIRED:
                    case ERR_NOT_ENOUGH_ENERGY: {
                        if (this.creep.pos.isNearTo(Source)) {
                            this.creep.say('😴');
                        }
                        else {
                            return this.moveTo(Source);
                        }
                        return true;
                    }
                    case ERR_NOT_IN_RANGE:
                        return this.moveTo(Source);
                    default: {
                        return true;
                    }
                }
            }
        }
        else {
            this.memory.energySourceId = undefined;
            if (this.creep.room.name != this.memory.spawnRoom) {
                return false;
            }
            let target;
            if (this.memory.targetId) {
                target = Game.getObjectById(this.memory.targetId);
                if (!target)
                    this.memory.targetId = undefined;
            }
            if (!target) {
                if (this.creep.room.memory.spawnPrioBlock) {
                    this.creep.say('🚩🚩🚩');
                    target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: s => (s.structureType === STRUCTURE_SPAWN ||
                            s.structureType == STRUCTURE_STORAGE ||
                            s.structureType == STRUCTURE_LINK ||
                            s.structureType === STRUCTURE_EXTENSION) &&
                            s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                    });
                }
                else {
                    target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: structure => (structure.structureType === STRUCTURE_CONTAINER ||
                            structure.structureType == STRUCTURE_STORAGE ||
                            structure.structureType == STRUCTURE_LINK ||
                            structure.structureType == STRUCTURE_TOWER) &&
                            structure.store.getFreeCapacity(RESOURCE_ENERGY) >= this.creep.store[RESOURCE_ENERGY] * 0.5
                    });
                }
            }
            if (target) {
                if (target.store.getFreeCapacity(RESOURCE_ENERGY) < 100) {
                    this.memory.targetId = undefined;
                    return true;
                }
                let state = this.creep.transfer(target, RESOURCE_ENERGY);
                switch (state) {
                    case ERR_NOT_IN_RANGE: {
                        this.memory.targetId = target.id;
                        this.moveTo(target);
                        break;
                    }
                    case ERR_FULL:
                    case OK: {
                        this.memory.targetId = undefined;
                        break;
                    }
                }
            }
        }
        return true;
    }
    getJob() {
        return "RemoteHarvester" /* eJobType.remoteHarvester */;
    }
    createSpawnMemory(spawn, workroom) {
        let base = super.createSpawnMemory(spawn, workroom);
        return {
            ...base,
        };
    }
    getMaxCreeps(workroom) {
        if (!roomConfig[workroom].sendRemoteMiner) {
            return 0;
        }
        let max = Memory.rooms[workroom].energySources.length || 0;
        if (max > 0) {
            max *= roomConfig[workroom].remoteMinerPerSource;
        }
        return max;
    }
    getProfil(spawnRoom) {
        if (spawnRoom.memory.state < 3 /* eRoomState.phase3 */) {
            return [WORK, CARRY, MOVE];
        }
        const availableEnergy = spawnRoom.getMaxAvailableEnergy();
        const setCost = BODYPART_COST[WORK] + BODYPART_COST[CARRY] + 2 * BODYPART_COST[MOVE];
        const maxSets = Math.floor((availableEnergy) / setCost);
        const numberOfSets = Math.min(12, maxSets);
        const body = [];
        for (let i = 0; i < numberOfSets; i++) {
            body.push(WORK);
            body.push(CARRY);
            body.push(MOVE);
            body.push(MOVE);
        }
        return body;
    }
    shouldSpawn(workroom) {
        if (!roomConfig[workroom].sendRemoteMiner || roomConfig[workroom].remoteMinerPerSource == 0) {
            return false;
        }
        if (Memory.rooms[workroom].needDefence ||
            Memory.rooms[workroom].invaderCore) {
            return false;
        }
        let room = Game.rooms[workroom];
        let max = 0;
        if (room) {
            max = room.getOrFindEnergieSource().length;
        }
        else {
            max = Memory.rooms[workroom].energySources.length;
        }
        if (max > 0) {
            max *= roomConfig[workroom].remoteMinerPerSource;
        }
        const job = this.getJob();
        const creepStorage = CreepStorage.getInstance();
        const countOfAnts = creepStorage.getCreepCountByJobAndRoom(job, workroom);
        return max > countOfAnts;
    }
    harvestRoomDrop(resourceType) {
        let drop;
        if (this.memory.harvestDroppedId) {
            drop = Game.getObjectById(this.memory.harvestDroppedId);
            if (!drop)
                this.memory.harvestDroppedId = undefined;
        }
        else if (!this.hasHarvestTarget()) {
            drop = this.creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
                filter: (resource) => {
                    return resource.resourceType == resourceType && resource.amount > 100;
                }
            });
        }
        if (!drop) {
            this.memory.harvestDroppedId = undefined;
            return false;
        }
        if (drop.resourceType == resourceType) {
            this.memory.harvestDroppedId = drop.id;
            let state = this.creep.pickup(drop);
            switch (state) {
                case ERR_NOT_IN_RANGE:
                    if (drop.amount > 100) {
                        return this.moveTo(drop);
                    }
                    this.memory.harvestDroppedId = undefined;
                    break;
                case OK:
                    this.memory.harvestDroppedId = undefined;
                    return true;
            }
        }
        return false;
    }
    harvestRoomTombstone(resourceType) {
        let tombstone;
        if (this.memory.harvestTombstoneId) {
            tombstone = Game.getObjectById(this.memory.harvestTombstoneId);
            if (!tombstone)
                this.memory.harvestTombstoneId = undefined;
        }
        else if (!this.hasHarvestTarget()) {
            tombstone = this.creep.pos.findClosestByRange(FIND_TOMBSTONES, {
                filter: (tombstone) => {
                    return tombstone.store.getUsedCapacity(resourceType) > 100;
                }
            });
            this.memory.harvestTombstoneId = tombstone === null || tombstone === void 0 ? void 0 : tombstone.id;
        }
        if (!tombstone) {
            this.memory.harvestTombstoneId = undefined;
            return false;
        }
        let state = this.creep.withdraw(tombstone, resourceType);
        switch (state) {
            case ERR_NOT_IN_RANGE:
                if (tombstone.store.getUsedCapacity(resourceType) > 100) {
                    return this.moveTo(tombstone);
                }
                this.memory.harvestTombstoneId = undefined;
                break;
            case OK:
                this.memory.harvestTombstoneId = undefined;
                return true;
        }
        return false;
    }
    hasHarvestTarget() {
        return !!(this.memory.harvestDroppedId ||
            this.memory.harvestTombstoneId);
    }
}

class ClaimerAnt extends StationaryAnt {
    getJob() {
        return "Claimer" /* eJobType.claimer */;
    }
    doJob() {
        var _a, _b, _c, _d, _e;
        const creep = this.creep;
        if (!this.isOnPosition()) {
            if (!this.goToFinalPos(1)) {
                return true;
            }
            if (creep.room.name == this.memory.workRoom) {
                if (((_a = this.memory.finalLocation) === null || _a === void 0 ? void 0 : _a.x) == 25 && ((_b = this.memory.finalLocation) === null || _b === void 0 ? void 0 : _b.y) == 25) {
                    if ((_c = creep.room.controller) === null || _c === void 0 ? void 0 : _c.pos) {
                        this.memory.finalLocation = (_d = creep.room.controller) === null || _d === void 0 ? void 0 : _d.pos;
                        Memory.rooms[creep.room.name].controllerData = {
                            x: creep.room.controller.pos.x,
                            y: creep.room.controller.pos.y,
                            id: creep.room.controller.id
                        };
                    }
                }
            }
            creep.say('🚌');
            return true;
        }
        if (creep.room.controller) {
            if (this.memory.targetClaim) {
                const s = this.creep.claimController(creep.room.controller);
                switch (s) {
                    case ERR_NOT_IN_RANGE:
                        this.moveTo(creep.room.controller);
                        return true;
                    case OK:
                        Memory.rooms[this.creep.room.name].state = 11 /* eRoomState.claimed */;
                        return true;
                    default:
                        return true;
                }
            }
            const s = this.creep.reserveController(creep.room.controller);
            switch (s) {
                case ERR_NOT_IN_RANGE:
                    this.moveTo(creep.room.controller);
                    return true;
                case ERR_INVALID_TARGET:
                    this.creep.say('🪓');
                    this.creep.attackController(creep.room.controller);
                    return true;
                case OK: {
                    if (((_e = creep.room.controller.sign) === null || _e === void 0 ? void 0 : _e.username) != this.creep.owner.username) {
                        this.creep.signController(creep.room.controller, '⚔');
                    }
                }
            }
        }
        return true;
    }
    getProfil(workroom) {
        return [CLAIM, CLAIM, MOVE, MOVE];
    }
    createSpawnMemory(spawn, workroom) {
        var _a, _b;
        const job = this.getJob();
        let finalLocation = undefined;
        const roomdata = Memory.rooms[workroom].controllerData;
        if (roomdata) {
            finalLocation = new RoomPosition(roomdata.x, roomdata.y, workroom);
        }
        else {
            finalLocation = (_b = (_a = Game.rooms[workroom]) === null || _a === void 0 ? void 0 : _a.controller) === null || _b === void 0 ? void 0 : _b.pos;
        }
        if (!finalLocation) {
            finalLocation = new RoomPosition(25, 25, workroom);
        }
        return {
            job: job,
            ticksToPos: 1,
            spawn: spawn.name,
            state: 1 /* eJobState.work */,
            workRoom: workroom,
            onPosition: false,
            finalLocation: finalLocation,
            roundRobin: 1,
            roundRobinOffset: undefined,
            moving: false,
        };
    }
    getMaxCreeps(workroom) {
        return 1; // nur ein Claimer pro Raum
    }
    shouldSpawn(workroom) {
        var _a;
        if (roomConfig[workroom].spawnRoom == undefined) {
            return false;
        }
        if (!roomConfig[workroom].sendClaimer) {
            return false;
        }
        const roomState = (_a = Memory.rooms[workroom]) === null || _a === void 0 ? void 0 : _a.state;
        if (!roomState ||
            (roomState !== 0 /* eRoomState.neutral */ &&
                roomState !== 11 /* eRoomState.claimed */ &&
                roomState !== 10 /* eRoomState.invader */ &&
                roomState !== 9 /* eRoomState.otherPlayer */)) {
            return false; // nur Räume mit neutral, claimed oder invader zulassen
        }
        const room = Game.rooms[workroom];
        if (room && room.controller && room.controller.reservation && room.controller.reservation.ticksToEnd > 3000)
            return false;
        const count = _.filter(Game.creeps, c => c.memory.job === this.getJob() && c.memory.workRoom === workroom).length;
        return count < this.getMaxCreeps(workroom);
    }
}

class RemoteMinerAnt extends StationaryAnt {
    doJob() {
        if (!this.isOnPosition()) {
            if (!this.goToFinalPos()) {
                return true;
            }
            this.creep.say('🚌');
            return true;
        }
        let container;
        let constructionSite;
        let source;
        if (this.memory.energySourceId) {
            source = Game.getObjectById(this.memory.energySourceId);
            if (!source) {
                this.memory.energySourceId = undefined;
            }
        }
        else {
            this.creep.say('🚩');
            return false;
        }
        if (this.memory.containerId) {
            container = Game.getObjectById(this.memory.containerId);
            if (!container)
                this.memory.containerId = undefined;
        }
        if (!this.memory.containerId && this.memory.containerConstructionId) {
            constructionSite = Game.getObjectById(this.memory.containerConstructionId);
            if (!constructionSite)
                this.memory.containerConstructionId = undefined;
        }
        if (!container && !constructionSite && source) {
            let container = source.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: { structureType: STRUCTURE_CONTAINER }
            })[0];
            if (container) {
                this.memory.containerId = container.id;
            }
            else {
                let build = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                    filter: { structureType: STRUCTURE_CONTAINER }
                })[0];
                if (build) {
                    this.memory.containerConstructionId = build.id;
                }
                else {
                    this.creep.say("🚩");
                }
            }
        }
        const energyStore = this.creep.store[RESOURCE_ENERGY];
        if (energyStore > 0) {
            if (constructionSite) {
                this.creep.say('🪚');
                this.creep.build(constructionSite);
                return true;
            }
            if (container && container.hits < (container.hitsMax * 0.8)) {
                this.creep.repair(container);
                this.creep.say('🛠️');
                return true;
            }
            if (energyStore >= this.creep.store.getCapacity(RESOURCE_ENERGY)) {
                if (container) {
                    if (container.store.getFreeCapacity() == 0) {
                        if (container.hits < container.hitsMax) {
                            this.creep.repair(container);
                            this.creep.say('🚯🛠️');
                            return true;
                        }
                        this.creep.say('🚯');
                        return true;
                    }
                }
            }
        }
        if (source) {
            switch (this.creep.harvest(source)) {
                case ERR_TIRED:
                case ERR_NOT_ENOUGH_ENERGY: {
                    this.creep.say('😴');
                    if (container) {
                        this.creep.withdraw(container, RESOURCE_ENERGY);
                    }
                    break;
                }
                case OK: {
                    return true;
                }
            }
        }
        return true;
    }
    getProfil(workroom) {
        if (workroom.memory.state < 3 /* eRoomState.phase3 */) {
            return [WORK, CARRY, MOVE];
        }
        const availableEnergy = workroom.getMaxAvailableEnergy();
        const workCost = BODYPART_COST[WORK];
        const carryCost = BODYPART_COST[CARRY];
        const moveCost = BODYPART_COST[MOVE];
        // Berechne maximale Anzahl WORK unter Berücksichtigung von 1 CARRY und benötigten MOVE
        let maxWork = Math.floor((availableEnergy - carryCost) / (workCost + moveCost / 2));
        maxWork = Math.min(maxWork, 20); // Optional: Limit auf 20 WORK
        const body = [];
        // WORK-Teile hinzufügen
        for (let i = 0; i < maxWork; i++) {
            body.push(WORK);
        }
        // MOVE: 1 MOVE pro 2 WORK, aufrunden
        const moveCount = Math.ceil(maxWork / 2);
        for (let i = 0; i < moveCount; i++) {
            body.push(MOVE);
        }
        // Ein einziges CARRY
        body.push(CARRY);
        return body;
    }
    createSpawnMemory(spawn, roomname) {
        const workroom = Game.rooms[roomname];
        const job = this.getJob();
        const sources = workroom.getOrFindEnergieSource();
        const creepStorage = CreepStorage.getInstance();
        const creeps = creepStorage.getCreepsByJobAndRoom(job, roomname);
        let sourceId = undefined;
        let containerId = undefined;
        let finalLocation = undefined;
        let buildId = undefined;
        for (let s of sources) {
            let found = false;
            for (let creep of creeps) {
                const minerMemory = creep.memory;
                if (minerMemory.energySourceId === s.sourceId) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                sourceId = s.sourceId;
                if (s.containerId) {
                    let check = Game.getObjectById(s.containerId);
                    if (check) {
                        containerId = s.containerId;
                    }
                    else {
                        for (let id in workroom.memory.energySources) {
                            if (workroom.memory.energySources[id].sourceId == s.sourceId) {
                                workroom.memory.energySources[id].containerId = undefined;
                            }
                        }
                    }
                }
                break;
            }
        }
        if (containerId) {
            let container = Game.getObjectById(containerId);
            finalLocation = container === null || container === void 0 ? void 0 : container.pos;
        }
        if (!finalLocation && sourceId) {
            let sourceObj = Game.getObjectById(sourceId);
            finalLocation = sourceObj === null || sourceObj === void 0 ? void 0 : sourceObj.pos;
            if (sourceObj) {
                let container = sourceObj.pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: { structureType: STRUCTURE_CONTAINER }
                })[0];
                if (container) {
                    finalLocation = container.pos;
                    if (container.structureType == STRUCTURE_CONTAINER) {
                        containerId = container.id;
                        for (let id in workroom.memory.energySources) {
                            if (workroom.memory.energySources[id].sourceId == sourceId) {
                                workroom.memory.energySources[id].containerId = containerId;
                            }
                        }
                    }
                }
                else {
                    containerId = undefined;
                    let build = sourceObj.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                        filter: { structureType: STRUCTURE_CONTAINER }
                    })[0];
                    if (build) {
                        finalLocation = build.pos;
                        if (build.id) {
                            buildId = build.id;
                        }
                    }
                    else {
                        const sourcePos = sourceObj.pos;
                        let adjacentSpots = [];
                        for (let xOffset = -1; xOffset <= 1; xOffset++) {
                            for (let yOffset = -1; yOffset <= 1; yOffset++) {
                                if (xOffset === 0 && yOffset === 0) {
                                    continue;
                                }
                                let x = sourcePos.x + xOffset;
                                let y = sourcePos.y + yOffset;
                                adjacentSpots.push(new RoomPosition(x, y, workroom.name));
                            }
                        }
                        for (let spot of adjacentSpots) {
                            if (spot.createConstructionSite(STRUCTURE_CONTAINER) === OK) {
                                finalLocation = spot;
                                break;
                            }
                        }
                        let build = sourceObj.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                            filter: { structureType: STRUCTURE_CONTAINER }
                        })[0];
                        if (build) {
                            finalLocation = build.pos;
                            if (build.id) {
                                buildId = build.id;
                            }
                        }
                    }
                }
            }
        }
        return {
            job: job,
            ticksToPos: 1,
            spawn: spawn.name,
            state: 0 /* eJobState.harvest */,
            workRoom: workroom.name,
            energySourceId: sourceId,
            containerId: containerId,
            containerConstructionId: buildId,
            onPosition: false,
            finalLocation: finalLocation,
            roundRobin: 1,
            roundRobinOffset: undefined,
            moving: false,
        };
    }
    getJob() {
        return "RemoteMiner" /* eJobType.remoteMiner */;
    }
    getMaxCreeps(workroom) {
        const room = Game.rooms[workroom];
        if (!room) {
            return 0;
        }
        return room.getOrFindEnergieSource().length || 0;
    }
    shouldSpawn(workroom) {
        if (!roomConfig[workroom].sendMiner || roomConfig[workroom].spawnRoom == undefined) {
            return false;
        }
        let room = Game.rooms[workroom];
        let max = 0;
        if (room) {
            max = room.getOrFindEnergieSource().length;
        }
        else {
            max = Memory.rooms[workroom].energySources.length;
        }
        const job = this.getJob();
        const creepStorage = CreepStorage.getInstance();
        const countOfCreeps = creepStorage.getCreepCountByJobAndRoom(job, workroom);
        return max > countOfCreeps;
    }
}

/**
 * Centralized body part formulas per plan 09 and plan 10.
 * All body builders use exact formulas from the throughput reference.
 */
class BodyBuilder {
    static emergencyWorker() {
        return [WORK, CARRY, MOVE];
    }
    static bootstrapWorker(maxEnergy) {
        if (maxEnergy >= 400)
            return [WORK, WORK, CARRY, MOVE];
        return [WORK, CARRY, MOVE];
    }
    /**
     * Stationary miner body.
     * owned/reserved source: 5 WORK + optional CARRY + 1 MOVE
     * unreserved remote: 3 WORK + CARRY + 1 MOVE
     */
    static miner(ownedOrReserved, withCarry = false) {
        if (ownedOrReserved) {
            const body = [WORK, WORK, WORK, WORK, WORK, MOVE];
            if (withCarry)
                body.splice(5, 0, CARRY);
            return body;
        }
        return [WORK, WORK, WORK, CARRY, MOVE];
    }
    /**
     * Hauler body sized to route.
     * CARRY = ceil(energyPerTick * roundTripTicks / 50)
     * MOVE = ceil(CARRY / 2) on roads, CARRY on plains
     */
    static hauler(energyPerTick, roundTripTicks, onRoad = true) {
        const carry = Math.ceil(energyPerTick * roundTripTicks / 50);
        const move = onRoad ? Math.ceil(carry / 2) : carry;
        const body = [];
        for (let i = 0; i < carry; i++)
            body.push(CARRY);
        for (let i = 0; i < move; i++)
            body.push(MOVE);
        // Enforce 50-part cap
        return this.cap50(body);
    }
    /** Filler: short-route CARRY+MOVE pairs */
    static filler(pairs = 2) {
        const body = [];
        for (let i = 0; i < pairs; i++) {
            body.push(CARRY);
            body.push(MOVE);
        }
        return body;
    }
    /**
     * Upgrader body scaled by storage energy surplus.
     * workParts = floor((storageEnergy - 20000) / 10000), capped at 15
     */
    static upgrader(storageEnergy, rcl8, linkFed = false) {
        let workParts = Math.max(1, Math.floor((storageEnergy - 20000) / 10000));
        if (rcl8)
            workParts = Math.min(workParts, 15);
        workParts = Math.min(workParts, 25); // global cap before 50-part rule
        const body = [];
        for (let i = 0; i < workParts; i++)
            body.push(WORK);
        if (linkFed) {
            body.push(CARRY);
            body.push(MOVE);
        }
        else {
            const carry = Math.ceil(workParts / 2);
            const move = Math.ceil(workParts / 2);
            for (let i = 0; i < carry; i++)
                body.push(CARRY);
            for (let i = 0; i < move; i++)
                body.push(MOVE);
        }
        return this.cap50(body);
    }
    /** Builder/Repairer body: WORK+CARRY+MOVE triplets */
    static builder(maxEnergy) {
        const triplets = Math.min(Math.floor(maxEnergy / 200), 10);
        const body = [];
        for (let i = 0; i < Math.max(1, triplets); i++) {
            body.push(WORK);
            body.push(CARRY);
            body.push(MOVE);
        }
        return this.cap50(body);
    }
    /** Remote miner body */
    static remoteMiner(reserved) {
        if (reserved)
            return [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE];
        return [WORK, WORK, WORK, CARRY, MOVE, MOVE];
    }
    /** Reserver body: CLAIM + MOVE pairs */
    static reserver(highROI = false) {
        if (highROI)
            return [CLAIM, CLAIM, MOVE, MOVE];
        return [CLAIM, MOVE];
    }
    /** Claimer: single CLAIM + MOVE */
    static claimer() {
        return [CLAIM, MOVE];
    }
    /** Basic NPC-defense melee */
    static defenseMelee() {
        return [TOUGH, ATTACK, ATTACK, MOVE, MOVE, MOVE];
    }
    /** Endgame upgrader: 15 WORK link-fed, stationary */
    static endgameUpgrader(maxEnergy) {
        const work = Math.min(15, Math.floor((maxEnergy - 50) / 100));
        const body = [];
        for (let i = 0; i < Math.max(1, work); i++)
            body.push(WORK);
        body.push(CARRY);
        body.push(MOVE);
        return this.cap50(body);
    }
    static bodyCost(body) {
        return body.reduce((sum, part) => sum + BODYPART_COST[part], 0);
    }
    static cap50(body) {
        return body.slice(0, 50);
    }
}

const DANGER_COOLDOWN_TICKS = 500;
const REMOTE_DANGER_COOLDOWN = 500;
class PassivePolicy {
    static isRoomSafeToMine(roomName) {
        var _a;
        const intel = (_a = Memory.intel) === null || _a === void 0 ? void 0 : _a[roomName];
        if (!intel)
            return false;
        if (intel.owner !== null)
            return false;
        if (intel.reservation !== null)
            return false;
        if (intel.status === 'highway' || intel.status === 'sk')
            return false;
        if (intel.invaderCore && intel.coreExpires > Game.time)
            return false;
        if (intel.threat === 'player' && intel.threatExpires > Game.time)
            return false;
        if (Game.time - intel.lastPlayerActivity < DANGER_COOLDOWN_TICKS)
            return false;
        return true;
    }
    static shouldFleeRemote(roomName) {
        var _a, _b;
        const intel = (_a = Memory.intel) === null || _a === void 0 ? void 0 : _a[roomName];
        const remote = (_b = Memory.remoteIntel) === null || _b === void 0 ? void 0 : _b[roomName];
        if ((remote === null || remote === void 0 ? void 0 : remote.state) === 'danger')
            return true;
        if ((intel === null || intel === void 0 ? void 0 : intel.threat) === 'player' && intel.threatExpires > Game.time)
            return true;
        return false;
    }
    static markRemoteDanger(roomName) {
        if (!Memory.remoteIntel)
            Memory.remoteIntel = {};
        const entry = Memory.remoteIntel[roomName];
        if (entry) {
            entry.state = 'danger';
            entry.dangerCooldownUntil = Game.time + REMOTE_DANGER_COOLDOWN;
        }
    }
    static isExpansionTargetSafe(roomName) {
        var _a, _b;
        const intel = (_a = Memory.intel) === null || _a === void 0 ? void 0 : _a[roomName];
        if (!intel)
            return false;
        if (intel.owner !== null)
            return false;
        if (intel.reservation !== null)
            return false;
        if (intel.status === 'highway' || intel.status === 'sk')
            return false;
        if (intel.status === 'closed')
            return false;
        if (intel.threat === 'player' && intel.threatExpires > Game.time)
            return false;
        const exits = Game.map.describeExits(roomName);
        for (const dir in exits) {
            const neighbor = exits[dir];
            if (!neighbor)
                continue;
            const neighborIntel = (_b = Memory.intel) === null || _b === void 0 ? void 0 : _b[neighbor];
            if ((neighborIntel === null || neighborIntel === void 0 ? void 0 : neighborIntel.owner) !== null && (neighborIntel === null || neighborIntel === void 0 ? void 0 : neighborIntel.owner) !== undefined)
                return false;
        }
        return true;
    }
    static logViolation(message) {
        if (!Memory.debug)
            Memory.debug = {};
        if (!Memory.debug.policyViolations)
            Memory.debug.policyViolations = [];
        const entry = `[${Game.time}] ${message}`;
        Memory.debug.policyViolations.push(entry);
        if (Memory.debug.policyViolations.length > 50) {
            Memory.debug.policyViolations.shift();
        }
    }
    static handlePlayerPresenceInRemote(roomName, creeps) {
        this.markRemoteDanger(roomName);
        for (const creep of creeps) {
            if (creep.store.getUsedCapacity() > 0) {
                const homeRoom = creep.memory.spawnRoom;
                creep.memory.targetPos = undefined;
                creep.memory.path = undefined;
                creep.memory.workRoom = homeRoom;
            }
        }
    }
}

class ReserverAnt extends HarvesterAnt {
    getJob() {
        return "Reserver" /* eJobType.reserver */;
    }
    doJob() {
        var _a, _b;
        const ctrl = (_a = Game.rooms[this.memory.workRoom]) === null || _a === void 0 ? void 0 : _a.controller;
        if (!ctrl) {
            this.moveTo(new RoomPosition(25, 25, this.memory.workRoom), 20);
            return true;
        }
        if (!this.creep.pos.inRangeTo(ctrl, 1)) {
            this.moveTo(ctrl);
            return true;
        }
        if (ctrl.owner) {
            // owned by another player — do not attack
            if (!ctrl.my)
                return true;
        }
        if (((_b = ctrl.reservation) === null || _b === void 0 ? void 0 : _b.username) !== this.creep.owner.username) {
            this.creep.attackController(ctrl);
        }
        else {
            this.creep.reserveController(ctrl);
        }
        return true;
    }
    getProfil(workroom) {
        var _a;
        const route = Game.map.findRoute(workroom.name, (_a = this.memory.workRoom) !== null && _a !== void 0 ? _a : workroom.name);
        const distance = route !== ERR_NO_PATH ? route.length : 1;
        return BodyBuilder.reserver(distance <= 3);
    }
    getMaxCreeps(workroom) {
        return 1;
    }
    shouldSpawn(workroom) {
        var _a, _b;
        if (!PassivePolicy.isRoomSafeToMine(workroom))
            return false;
        const remote = (_a = Memory.remoteIntel) === null || _a === void 0 ? void 0 : _a[workroom];
        if (!remote)
            return false;
        if (remote.state === 'danger' || remote.state === 'blocked' || remote.state === 'disabled')
            return false;
        const ctrl = (_b = Game.rooms[workroom]) === null || _b === void 0 ? void 0 : _b.controller;
        if ((ctrl === null || ctrl === void 0 ? void 0 : ctrl.reservation) && ctrl.reservation.ticksToEnd > 3500)
            return false;
        return true;
    }
}

class RemoteHaulerAnt extends HarvesterAnt {
    getJob() {
        return "RemoteHauler" /* eJobType.remoteHauler */;
    }
    doJob() {
        this.checkHarvest();
        if (this.memory.state === 0 /* eJobState.harvest */) {
            // Flee if danger
            if (PassivePolicy.shouldFleeRemote(this.memory.workRoom)) {
                this.moveTo(new RoomPosition(25, 25, this.memory.spawnRoom), 20);
                return true;
            }
            // Go to work room and pick up from container
            if (this.creep.room.name !== this.memory.workRoom) {
                this.moveTo(new RoomPosition(25, 25, this.memory.workRoom), 22);
                return true;
            }
            if (this.harvestRoomContainer(RESOURCE_ENERGY))
                return true;
            if (this.harvestRoomDrop(RESOURCE_ENERGY))
                return true;
            return true;
        }
        // Deliver to home room storage
        const homeRoom = Game.rooms[this.memory.spawnRoom];
        if (!homeRoom) {
            this.moveTo(new RoomPosition(25, 25, this.memory.spawnRoom), 22);
            return true;
        }
        const storage = homeRoom.storage;
        if (storage) {
            const result = this.creep.transfer(storage, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE)
                this.moveTo(storage);
            return true;
        }
        // Fallback: deliver to spawn
        const spawn = homeRoom.find(FIND_MY_SPAWNS)[0];
        if (spawn) {
            const result = this.creep.transfer(spawn, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE)
                this.moveTo(spawn);
        }
        return true;
    }
    getProfil(workroom) {
        var _a, _b;
        const remote = (_a = Memory.remoteIntel) === null || _a === void 0 ? void 0 : _a[workroom.name];
        const ept = (remote === null || remote === void 0 ? void 0 : remote.reserved) ? 10 : 5;
        // Use observed route distance if available, else estimate
        const routeLen = (_b = remote === null || remote === void 0 ? void 0 : remote.routeDistance) !== null && _b !== void 0 ? _b : 5;
        const roundTrip = routeLen * 3; // rough ticks per hop
        return BodyBuilder.hauler(ept, roundTrip, true);
    }
    getMaxCreeps(workroom) {
        return 1;
    }
    shouldSpawn(workroom) {
        var _a;
        if (!PassivePolicy.isRoomSafeToMine(workroom))
            return false;
        const remote = (_a = Memory.remoteIntel) === null || _a === void 0 ? void 0 : _a[workroom];
        if (!remote)
            return false;
        if (remote.state !== 'mining' && remote.state !== 'candidate')
            return false;
        return true;
    }
}

class EndgameUpgraderAnt extends StationaryAnt {
    doJob() {
        var _a;
        if (!this.isOnPosition()) {
            this.goToFinalPos(3);
            this.creep.say('🚌');
            return true;
        }
        const ctrl = (_a = Game.rooms[this.memory.workRoom]) === null || _a === void 0 ? void 0 : _a.controller;
        if (!ctrl)
            return true;
        // Withdraw from link first, then container
        const energy = this.creep.store.energy;
        const cap = this.creep.store.getCapacity(RESOURCE_ENERGY);
        if (energy < cap * 0.25) {
            // Need energy
            if (this.memory.linkId) {
                const link = Game.getObjectById(this.memory.linkId);
                if (link && link.store.energy > 0) {
                    const result = this.creep.withdraw(link, RESOURCE_ENERGY);
                    if (result === ERR_NOT_IN_RANGE)
                        this.moveTo(link, 1);
                    return true;
                }
            }
            if (this.memory.containerId) {
                const container = Game.getObjectById(this.memory.containerId);
                if (container && container.store.energy > 0) {
                    const result = this.creep.withdraw(container, RESOURCE_ENERGY);
                    if (result === ERR_NOT_IN_RANGE)
                        this.moveTo(container, 1);
                    return true;
                }
            }
        }
        if (energy > 0) {
            const result = this.creep.upgradeController(ctrl);
            if (result === ERR_NOT_IN_RANGE)
                this.moveTo(ctrl, 3);
        }
        return true;
    }
    createSpawnMemory(spawn, workroom) {
        var _a;
        const room = Game.rooms[workroom];
        const ctrl = room === null || room === void 0 ? void 0 : room.controller;
        // Find controller container or link
        let containerId;
        let linkId;
        let finalLocation = (_a = ctrl === null || ctrl === void 0 ? void 0 : ctrl.pos) !== null && _a !== void 0 ? _a : new RoomPosition(25, 25, workroom);
        if (ctrl) {
            const containers = ctrl.pos.findInRange(FIND_STRUCTURES, 3, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            });
            if (containers.length > 0) {
                containerId = containers[0].id;
                finalLocation = containers[0].pos;
            }
            const links = ctrl.pos.findInRange(FIND_MY_STRUCTURES, 3, {
                filter: s => s.structureType === STRUCTURE_LINK
            });
            if (links.length > 0)
                linkId = links[0].id;
        }
        return {
            job: this.getJob(),
            ticksToPos: 1,
            spawn: spawn.name,
            state: 1 /* eJobState.work */,
            workRoom: workroom,
            spawnRoom: spawn.room.name,
            onPosition: false,
            finalLocation,
            roundRobin: 1,
            roundRobinOffset: 0,
            moving: false,
            containerId,
            linkId,
        };
    }
    getProfil(workroom) {
        var _a;
        const storage = workroom.storage;
        (_a = storage === null || storage === void 0 ? void 0 : storage.store.energy) !== null && _a !== void 0 ? _a : 0;
        return BodyBuilder.endgameUpgrader(workroom.getMaxAvailableEnergy());
    }
    getJob() {
        return "EndgameUpgrader" /* eJobType.endgameUpgrader */;
    }
    getMaxCreeps(workroom) {
        return 1;
    }
    shouldSpawn(workroom) {
        var _a, _b;
        const room = Memory.rooms[workroom];
        if (!room)
            return false;
        if (room.state < 5 /* eRoomState.phase5 */)
            return false;
        const gameRoom = Game.rooms[workroom];
        if (!gameRoom)
            return false;
        // Skip if storage is low
        const storageEnergy = (_b = (_a = gameRoom.storage) === null || _a === void 0 ? void 0 : _a.store.energy) !== null && _b !== void 0 ? _b : 0;
        if (storageEnergy < 20000)
            return false;
        // RCL8: skip if controller timer is very healthy and storage almost full
        if (room.state === 8 /* eRoomState.phase8 */ &&
            gameRoom.controller &&
            gameRoom.controller.ticksToDowngrade > 100000 &&
            storageEnergy < 250000) {
            return false;
        }
        const job = this.getJob();
        const creepStorage = CreepStorage.getInstance();
        const count = creepStorage.getCreepCountByJobAndRoom(job, workroom);
        return count < this.getMaxCreeps(workroom);
    }
}

class Jobs {
    static createAnt(jobType, creep) {
        const jobDef = this.jobs[jobType];
        if (!jobDef) {
            console.log(`Unknown job: ${jobType}`);
            return null;
        }
        return new jobDef.antClass(creep);
    }
    static getJobNames() {
        return Object.keys(this.jobs);
    }
    static getJobDef(jobName) {
        return this.jobs[jobName];
    }
}
Jobs.jobs = {
    Miner: { antClass: MinerAnt, jobPrio: 11, spawnPrio: 15 },
    Transporter: { antClass: TransporterAnt, jobPrio: 30, spawnPrio: 14 },
    Filler: { antClass: FillerAnt, jobPrio: 30, spawnPrio: 13 },
    Worker: { antClass: WorkerAnt, jobPrio: 11, spawnPrio: 12 },
    Upgrader: { antClass: UpgraderAnt, jobPrio: 11, spawnPrio: 11 },
    Builder: { antClass: BuilderAnt, jobPrio: 11, spawnPrio: 10 },
    RemoteHarvester: { antClass: RemoteHarvester, jobPrio: 1, spawnPrio: 4 },
    RemoteMiner: { antClass: RemoteMinerAnt, jobPrio: 1, spawnPrio: 4 },
    RemoteHauler: { antClass: RemoteHaulerAnt, jobPrio: 1, spawnPrio: 4 },
    Reserver: { antClass: ReserverAnt, jobPrio: 1, spawnPrio: 3 },
    WallBuilder: { antClass: WallBuilderAnt, jobPrio: 1, spawnPrio: 3 },
    Claimer: { antClass: ClaimerAnt, jobPrio: 1, spawnPrio: 2 },
    Scout: { antClass: ScoutAnt, jobPrio: 1, spawnPrio: 1 },
    EndgameUpgrader: { antClass: EndgameUpgraderAnt, jobPrio: 5, spawnPrio: 9 },
};

class AntFactory {
    /**
     * Gibt eine Ant-Instanz für den Bedarfs-Check (Spawn-Check) zurück.
     * Nutzt Caching, um redundante Instanziierungen pro Tick zu vermeiden.
     */
    static getAntForSpawnCheck(jobType, spawnRoom, workRoomName) {
        const cacheKey = `spawn_${jobType}_${spawnRoom.name}_${workRoomName}`;
        if (this.instanceCache.has(cacheKey)) {
            return this.instanceCache.get(cacheKey);
        }
        const def = Jobs.jobs[jobType];
        if (!def)
            return null;
        // Mock-Creep für die Instanziierung
        const mockCreep = {
            memory: { job: jobType, workRoom: workRoomName, spawnRoom: spawnRoom.name },
            room: spawnRoom
        };
        const ant = new def.antClass(mockCreep);
        this.instanceCache.set(cacheKey, ant);
        return ant;
    }
    /**
     * Erstellt eine frische Ant-Instanz für einen existierenden Creep.
     * Diese wird i.d.R. im JobsManager pro Creep pro Tick aufgerufen.
     */
    static createAntForCreep(creep) {
        return Jobs.createAnt(creep.memory.job, creep);
    }
    /**
     * Bereinigt den Cache. Sollte am Anfang jedes Ticks aufgerufen werden.
     */
    static clearCache() {
        this.instanceCache.clear();
    }
}
AntFactory.instanceCache = new Map();

class SpawnManager {
    static get queue() {
        if (!Memory.spawnQueue)
            Memory.spawnQueue = [];
        return Memory.spawnQueue;
    }
    static set queue(value) {
        Memory.spawnQueue = value;
    }
    static queueCreep(jobKey, spawnRoom, workRoom, bodyParts, priority) {
        const def = Jobs.jobs[jobKey];
        if (!def)
            return -1;
        // Prüfe ob bereits ein Request für diesen Job/Raum in der Queue existiert
        const existingIndex = this.queue.findIndex(r => r.jobKey === jobKey &&
            r.workroom === workRoom);
        const actualPriority = priority !== undefined ? priority :
            this.getSpawnPriority(jobKey, workRoom);
        if (existingIndex !== -1) {
            if (this.queue[existingIndex].priority < actualPriority) {
                console.log(`🔄 Priorität für ${jobKey} in ${spawnRoom.name} aktualisiert: ${this.queue[existingIndex].priority} → ${actualPriority}`);
                this.updatePriority(existingIndex, actualPriority);
            }
            return existingIndex; // Kein neuer Request, bestehender bleibt
        }
        // Nur wenn noch kein Request existiert, einen neuen erstellen
        const request = {
            jobKey,
            workroom: workRoom,
            spawnRoom: spawnRoom.name,
            bodyParts: bodyParts,
            priority: actualPriority,
            timestamp: Game.time
        };
        this.queue.push(request);
        this.sortQueue();
        console.log(`➕ Neuer Spawn-Request: ${jobKey} für ${workRoom} in ${spawnRoom.name} (Priorität: ${actualPriority})`);
        return this.queue.length - 1;
    }
    static addToJobQueue(jobType, spawnRoom, workRoom, bodyParts, priority) {
        this.queueCreep(jobType, spawnRoom, workRoom, bodyParts, priority);
    }
    static updatePriority(index, priority) {
        if (index >= 0 && index < this.queue.length) {
            this.queue[index].priority = priority;
            this.sortQueue();
            return true;
        }
        return false;
    }
    static findNeededCreeps() {
        for (const name in roomConfig) {
            let spawnRoom;
            if (roomConfig[name].spawnRoom != undefined) {
                spawnRoom = Game.rooms[roomConfig[name].spawnRoom];
            }
            else {
                spawnRoom = Game.rooms[name];
            }
            if (!spawnRoom)
                continue;
            for (let jobName in Jobs.jobs) {
                const jobType = jobName;
                // Nutze Factory für Bedarfs-Check
                const ant = AntFactory.getAntForSpawnCheck(jobType, spawnRoom, name);
                if (ant) {
                    ant.spawn(spawnRoom, name);
                }
            }
        }
    }
    static processSpawns() {
        this.cleanupQueue();
        this.sortQueue();
        if (this.queue.length === 0)
            return;
        const availableSpawns = [];
        for (const spawnName in Game.spawns) {
            const spawn = Game.spawns[spawnName];
            if (!spawn.spawning) {
                availableSpawns.push(spawn);
            }
            else if (spawn.spawning.remainingTime == 1) {
                const creepStorage = CreepStorage.getInstance();
                const newCreep = Game.creeps[spawn.spawning.name];
                if (newCreep) {
                    creepStorage.onCreepSpawned(newCreep);
                }
            }
        }
        if (availableSpawns.length === 0)
            return;
        const validCombinations = [];
        for (let spawnIdx = 0; spawnIdx < availableSpawns.length; spawnIdx++) {
            const spawn = availableSpawns[spawnIdx];
            let hasPrio = false;
            for (let reqIdx = 0; reqIdx < this.queue.length; reqIdx++) {
                const req = this.queue[reqIdx];
                if (req.spawnRoom !== spawn.room.name)
                    continue;
                if (hasPrio) {
                    continue;
                }
                if (req.priority > 900) {
                    hasPrio = true;
                }
                const cost = _.sum(req.bodyParts, part => BODYPART_COST[part]);
                if (spawn.room.energyAvailable < cost) {
                    if (req.priority > 900) {
                        console.log(`🚩 Spawn PrioBlock für ${req.jobKey} kosten: ${spawn.room.energyAvailable}/${cost}`);
                        spawn.room.memory.spawnPrioBlock = true;
                    }
                    continue;
                }
                spawn.room.memory.spawnPrioBlock = false;
                validCombinations.push({
                    spawnIdx,
                    reqIdx,
                    score: req.priority
                });
            }
        }
        const usedSpawns = new Set();
        const usedRequests = new Set();
        let spawnedCount = 0;
        for (const combo of validCombinations) {
            if (usedSpawns.has(combo.spawnIdx) || usedRequests.has(combo.reqIdx)) {
                continue;
            }
            const spawn = availableSpawns[combo.spawnIdx];
            const req = this.queue[combo.reqIdx];
            if (this.spawnCreep(spawn, req)) {
                usedSpawns.add(combo.spawnIdx);
                usedRequests.add(combo.reqIdx);
                spawnedCount++;
            }
        }
        this.queue = this.queue.filter((_, index) => !usedRequests.has(index));
        if (spawnedCount > 0) {
            console.log(`🛠️ Es wurden ${spawnedCount} Creeps in diesem Tick gespawnt.`);
        }
    }
    static getSpawnPriority(jobType, workRoom) {
        const creepStorage = CreepStorage.getInstance();
        if (jobType === "Miner" /* eJobType.miner */) {
            const countOfAnts = creepStorage.getCreepCountByJobAndRoom(jobType, workRoom);
            if (countOfAnts === 0) {
                return 998;
            }
        }
        if (jobType === "Transporter" /* eJobType.transporter */ && Memory.rooms[workRoom].state < 7 /* eRoomState.phase7 */) {
            const countOfAnts = creepStorage.getCreepCountByJobAndRoom(jobType, workRoom);
            if (countOfAnts === 0) {
                return 997;
            }
        }
        let room = Game.rooms[workRoom];
        if (room) {
            if (jobType === "Filler" /* eJobType.filler */ && room.memory.state >= 5 /* eRoomState.phase5 */ && room.storage != null) {
                const countOfAnts = creepStorage.getCreepCountByJobAndRoom(jobType, workRoom);
                if (countOfAnts === 0) {
                    return 996;
                }
            }
        }
        return Jobs.jobs[jobType].spawnPrio;
    }
    static processEmergencySpawns() {
        for (const roomName in roomConfig) {
            if (roomConfig[roomName].spawnRoom != undefined)
                continue;
            const room = Game.rooms[roomName];
            if (!room)
                continue;
            const creepStorage = CreepStorage.getInstance();
            const countOfCreeps = creepStorage.getCreepCountByRoom(roomName);
            let max = room.memory.state >= 5 /* eRoomState.phase5 */ ? 4 : 2;
            if (countOfCreeps < max) {
                this.queueCreep("Worker" /* eJobType.worker */, room, room.name, [WORK, CARRY, CARRY, MOVE, MOVE], 999);
                return true;
            }
        }
        return false;
    }
    static sortQueue() {
        this.queue.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            return a.timestamp - b.timestamp;
        });
    }
    static cleanupQueue() {
        const seen = new Set();
        this.queue = this.queue.filter(req => {
            if (!Jobs.jobs[req.jobKey]) {
                console.log(`⚠️ Ungültigen Job aus Queue entfernt: ${req.jobKey}`);
                return false;
            }
            if (!Game.rooms[req.spawnRoom]) {
                console.log(`⚠️ Spawn-Request für nicht verfügbaren Raum entfernt: ${req.spawnRoom}`);
                return false;
            }
            else {
                let maxEnergy = Game.rooms[req.spawnRoom].getMaxAvailableEnergy();
                let cost = req.bodyParts.reduce((totalCost, part) => {
                    return totalCost + BODYPART_COST[part];
                }, 0);
                if (cost > maxEnergy) {
                    console.log(`⚠️ zu teurerer Spawn-Request entfernt: ${req.jobKey}`);
                    return false;
                }
            }
            if (req.bodyParts.length == 0) {
                console.log(`⚠️ Spawn-Request ohne Body entfernt: ${req.jobKey}`);
                return false;
            }
            // Prüfe ob der Request noch benötigt wird - aber nur basierend auf Queue-Duplikaten
            const key = `${req.jobKey}|${req.workroom}`;
            if (seen.has(key)) {
                console.log(`⚠️ Doppelter Spawn-Request entfernt: ${key}`);
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    static spawnCreep(spawn, request) {
        const def = Jobs.jobs[request.jobKey];
        if (!def)
            return false;
        const cost = _.sum(request.bodyParts, part => BODYPART_COST[part]);
        if (spawn.room.energyAvailable < cost)
            return false;
        const ant = AntFactory.getAntForSpawnCheck(request.jobKey, spawn.room, request.workroom);
        if (!ant)
            return false;
        const name = this.getName(request);
        const memory = ant.createSpawnMemory(spawn, request.workroom);
        if (!memory)
            return false;
        if (spawn.spawnCreep(request.bodyParts, name, { dryRun: true }) === OK) {
            if (spawn.spawnCreep(request.bodyParts, name, { memory: memory }) === OK) {
                console.log(`✅ Gespawned ${name} in ${spawn.room.name} → ${request.workroom} (Priorität: ${request.priority})`);
                const creepStorage = CreepStorage.getInstance();
                creepStorage.onCreepSpawning(memory.job, memory.workRoom);
                return true;
            }
        }
        return false;
    }
    static getName(request) {
        let count = 0;
        let roomName = request.workroom;
        let name = `${request.jobKey}@${roomName}#${count}`;
        while (Game.creeps[name]) {
            count++;
            name = `${request.jobKey}@${roomName}#${count}`;
            if (count > 999) {
                name = `${request.jobKey}@${roomName}#${Game.time}`;
                break;
            }
        }
        return name;
    }
}

class CleanUpManager {
    static addToCleanupQueue(creepName) {
        if (!Memory.cleanupQueue)
            Memory.cleanupQueue = [];
        if (!Memory.cleanupQueue.includes(creepName)) {
            Memory.cleanupQueue.push(creepName);
            console.log(`🗑️ Added ${creepName} to cleanup queue`);
        }
    }
    static processCleanupQueue() {
        if (!Memory.cleanupQueue || Memory.cleanupQueue.length === 0)
            return;
        const toProcess = Memory.cleanupQueue.splice(0, 1);
        for (const name of toProcess) {
            const creep = Game.creeps[name];
            if (!creep) {
                continue;
            }
            if (!this.cleanCreep(creep)) {
                Memory.cleanupQueue.unshift(name);
            }
        }
    }
    static cleanMemory() {
        const creepStorage = CreepStorage.getInstance();
        Object.keys(Memory.creeps).forEach(creepName => {
            if (!Game.creeps[creepName]) {
                const deadCreepMemory = Memory.creeps[creepName];
                creepStorage.onCreepDied(deadCreepMemory);
                delete Memory.creeps[creepName];
            }
        });
    }
    static cleanupJobMemory() {
        if (Game.time % 1500 !== 0)
            return;
        let cleanedJobs = 0;
        // Cleanup Job Offsets von toten Creeps
        if (Memory.jobOffsets) {
            Object.keys(Memory.jobOffsets).forEach(key => {
                const creepName = key.split('_')[0];
                if (!Game.creeps[creepName]) {
                    delete Memory.jobOffsets[key];
                    cleanedJobs++;
                }
            });
        }
        console.log(`🧹 Job Memory cleanup completed - ${cleanedJobs} jobs cleaned (Tick ${Game.time})`);
    }
    static runAllCleanup() {
        this.cleanMemory();
        this.processCleanupQueue();
        this.cleanupJobMemory();
        this.cleanUpManagers();
    }
    static cleanUpManagers() {
        if (Game.time % 50 !== 0) {
            return;
        }
        const creepStorage = CreepStorage.getInstance();
        creepStorage.cleanupCache();
    }
    static cleanCreep(creep) {
        const resourceType = Object.keys(creep.store)[0];
        if (creep.store[resourceType] > 0) {
            const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: structure => {
                    return (structure.structureType === STRUCTURE_CONTAINER ||
                        structure.structureType === STRUCTURE_STORAGE) &&
                        structure.store.getFreeCapacity() > creep.store[resourceType];
                }
            });
            if (target) {
                const transferResult = creep.transfer(target, resourceType);
                if (transferResult === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ff0000' } });
                    return false;
                }
                else if (transferResult === OK) {
                    console.log(`📦 ${creep.name} dropped off ${resourceType} to ${target.structureType}`);
                    return creep.store[resourceType] == 0;
                }
            }
            for (const resourceType in creep.store) {
                creep.drop(resourceType);
            }
        }
        console.log(`🗑️ Removing invalid creep ${creep.name}`);
        if (Memory.jobOffsets) {
            Object.keys(Memory.jobOffsets).forEach(key => {
                if (key.startsWith(creep.name + '_')) {
                    if (Memory.jobOffsets && Memory.jobOffsets[key] != undefined) {
                        delete Memory.jobOffsets[key];
                    }
                }
            });
        }
        creep.suicide();
        delete Memory.creeps[creep.name];
        return true;
    }
}

class JobsManager {
    static initializeMemory() {
        if (!Memory.jobOffsets)
            Memory.jobOffsets = {};
    }
    static getDynamicPriority(jobType, room) {
        const baseConfig = Jobs.jobs[jobType];
        if (!baseConfig)
            return 11;
        switch (jobType) {
            case "Miner" /* eJobType.miner */:
                return room.energyAvailable < 300
                    ? 30 : 15;
            case "Upgrader" /* eJobType.upgrader */:
                return room.controller != null
                    ? room.controller.ticksToDowngrade < 5000
                        ? 25
                        : 10
                    : 10;
            default:
                return baseConfig.jobPrio;
        }
    }
    static getJobOffset(creep, jobType) {
        if (!Memory.jobOffsets)
            Memory.jobOffsets = {};
        const key = `${creep.name}_${jobType}`;
        const max = creep.memory.roundRobin || 1;
        if (!Memory.jobOffsets[key]) {
            let hash = 0;
            for (let i = 0; i < key.length; i += 2) {
                hash = (hash << 5) + key.charCodeAt(i);
            }
            const seed = Math.abs(hash);
            Memory.jobOffsets[key] = (seed % max) + 1;
        }
        return Memory.jobOffsets[key];
    }
    static assignRoundRobin(creep, room) {
        if (creep.memory.job == "Miner" /* eJobType.miner */) {
            creep.memory.roundRobin = room.getOrFindEnergieSource().length || 0;
        }
        if (creep.memory.roundRobinOffset === undefined) {
            creep.memory.roundRobinOffset = this.getJobOffset(creep, creep.memory.job);
        }
    }
    static shouldExecuteCreep(creep) {
        if (creep.memory.roundRobin === 1)
            return true;
        if (creep.memory.moving)
            return true;
        return (Game.time + (creep.memory.roundRobinOffset || 0)) % creep.memory.roundRobin === 0;
    }
    static doJobs() {
        for (const ant of this.bucketNorm) {
            ant.doJob();
        }
    }
    static doLowJobs() {
        for (const ant of this.bucketLow) {
            ant.doJob();
        }
    }
    static doCriticalJobs() {
        for (const ant of this.bucketCritical) {
            ant.doJob();
        }
    }
    static shouldSkipCreep(creep) {
        if (creep.spawning)
            return true;
        if (creep.fatigue > 0)
            return true;
        return creep.ticksToLive !== undefined && creep.ticksToLive < 3;
    }
    static doPrioJobs() {
        this.initializeMemory();
        this.bucketNorm.length = 0;
        this.bucketLow.length = 0;
        this.bucketCritical.length = 0;
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            if (this.shouldSkipCreep(creep))
                continue;
            const def = Jobs.jobs[creep.memory.job];
            if (!def) {
                CleanUpManager.addToCleanupQueue(name);
                continue;
            }
            if (Game.time % 10 === 0 || creep.memory.roundRobin === undefined) {
                this.assignRoundRobin(creep, creep.room);
            }
            if (!this.shouldExecuteCreep(creep)) {
                continue;
            }
            const ant = AntFactory.createAntForCreep(creep);
            if (!ant) {
                CleanUpManager.addToCleanupQueue(name);
                continue;
            }
            const priority = this.getDynamicPriority(creep.memory.job, creep.room);
            if (priority >= 25) {
                this.bucketCritical.push(ant);
            }
            else if (priority >= 15) {
                this.bucketNorm.push(ant);
            }
            else if (priority > 0) {
                this.bucketLow.push(ant);
            }
        }
    }
    static getJobStats() {
        const stats = {};
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            const jobType = creep.memory.job;
            if (!stats[jobType]) {
                stats[jobType] = {
                    count: 0,
                    priority: this.getDynamicPriority(jobType, creep.room)
                };
            }
            stats[jobType].count++;
        }
        return stats;
    }
    static getPerformanceMetrics() {
        return {
            totalCreeps: Object.keys(Game.creeps).length,
            bucketsSize: {
                critical: this.bucketCritical.length,
                normal: this.bucketNorm.length,
                low: this.bucketLow.length
            },
            cpuUsage: Game.cpu.getUsed(),
            cpuLimit: Game.cpu.limit,
        };
    }
    static logJobDistribution() {
        if (Game.time % 100 !== 0)
            return;
        const stats = this.getJobStats();
        const metrics = this.getPerformanceMetrics();
        console.log(`📊 Jobs T${Game.time}: ${metrics.totalCreeps} creeps, CPU: ${(metrics.cpuUsage / metrics.cpuLimit * 100).toFixed(1)}%`);
        Object.entries(stats).forEach(([jobType, data]) => {
            console.log(`  ${jobType}: ${data.count} (P:${data.priority})`);
        });
    }
}
JobsManager.bucketNorm = [];
JobsManager.bucketLow = [];
JobsManager.bucketCritical = [];

class CPUManager {
    static getAdaptiveCPUBudget() {
        if (!Memory.cpuHistory)
            Memory.cpuHistory = [];
        const avgCPU = Memory.cpuHistory.length > 0
            ? Memory.cpuHistory.reduce((a, b) => a + b, 0) / Memory.cpuHistory.length
            : Game.cpu.getUsed();
        const maxCPU = Game.cpu.limit;
        const bucket = Game.cpu.bucket;
        const isLowCPULimit = maxCPU <= 20;
        if (bucket > 9000)
            return maxCPU * 0.95;
        if (bucket > 7000)
            return maxCPU * (isLowCPULimit ? 0.7 : 0.8);
        if (bucket < 2000)
            return maxCPU * (isLowCPULimit ? 0.2 : 0.3);
        if (avgCPU < maxCPU * 0.3)
            return maxCPU * (isLowCPULimit ? 0.7 : 0.8);
        if (avgCPU > maxCPU * 0.7)
            return maxCPU * (isLowCPULimit ? 0.3 : 0.4);
        return maxCPU * (isLowCPULimit ? 0.5 : 0.6);
    }
    static canRunTier(tier) {
        const budget = this.getAdaptiveCPUBudget();
        const used = Game.cpu.getUsed();
        if (tier === 'normal')
            return used < budget * 0.6;
        return used < budget;
    }
    static shouldContinue(phase) {
        return this.canRunTier(phase);
    }
    static getStatus() {
        var _a;
        const used = Game.cpu.getUsed();
        const bucket = Game.cpu.bucket;
        if ((_a = Memory.debug) === null || _a === void 0 ? void 0 : _a.visuals) {
            console.log(`CPU: ${used.toFixed(1)}/${Game.cpu.limit} Bucket: ${bucket}`);
        }
    }
    /** Returns true once per `interval` ticks for the given key, staggered by offset */
    static shouldRunEvery(key, interval, offset = 0) {
        return (Game.time + offset) % interval === 0;
    }
    /** Wrap a function, record its CPU cost under a manager name */
    static measure(name, fn) {
        var _a;
        const start = Game.cpu.getUsed();
        const result = fn();
        const cost = Game.cpu.getUsed() - start;
        if (!Memory.cpuStats) {
            Memory.cpuStats = { perRoom: {}, baseOverhead: 0, total: 0, manager: {} };
        }
        const prev = (_a = Memory.cpuStats.manager[name]) !== null && _a !== void 0 ? _a : cost;
        Memory.cpuStats.manager[name] = prev * 0.9 + cost * 0.1;
        return result;
    }
    /** Measure CPU consumed by a single room's processing and update rolling average */
    static measureRoom(roomName, fn) {
        var _a;
        const start = Game.cpu.getUsed();
        fn();
        const cost = Game.cpu.getUsed() - start;
        if (!Memory.cpuStats) {
            Memory.cpuStats = { perRoom: {}, baseOverhead: 0, total: 0, manager: {} };
        }
        const prev = (_a = Memory.cpuStats.perRoom[roomName]) !== null && _a !== void 0 ? _a : cost;
        Memory.cpuStats.perRoom[roomName] = prev * (1 - 1 / this.PER_ROOM_AVG_WINDOW) + cost * (1 / this.PER_ROOM_AVG_WINDOW);
    }
    /** Returns true if expanding to a new room is within the CPU budget */
    static canExpandToNewRoom() {
        const stats = Memory.cpuStats;
        if (!stats)
            return false;
        const roomCosts = Object.values(stats.perRoom);
        if (roomCosts.length === 0)
            return false;
        const avgRoomCost = roomCosts.reduce((a, b) => a + b, 0) / roomCosts.length;
        const currentTotal = roomCosts.reduce((a, b) => a + b, 0) + stats.baseOverhead;
        const projected = currentTotal + avgRoomCost;
        return projected + this.CPU_SAFETY_BUFFER < this.TOTAL_CPU_LIMIT;
    }
    static updateHistory() {
        var _a;
        if (!Memory.cpuHistory)
            Memory.cpuHistory = [];
        if (!Memory.lastTickCpu)
            return;
        Memory.cpuHistory.push(Memory.lastTickCpu);
        if (Memory.cpuHistory.length > this.HISTORY_SIZE) {
            Memory.cpuHistory.shift();
        }
        // Track total CPU in stats
        if (!Memory.cpuStats) {
            Memory.cpuStats = { perRoom: {}, baseOverhead: 0, total: 0, manager: {} };
        }
        Memory.cpuStats.total = Memory.lastTickCpu;
        // Pixels only when explicitly enabled
        if (((_a = Memory.config) === null || _a === void 0 ? void 0 : _a.enablePixels) && Game.cpu.bucket === 10000 && Game.cpu.generatePixel) {
            Game.cpu.generatePixel();
        }
        // Log CPU summary every 500 ticks
        if (Game.time % 500 === 0) {
            const stats = Memory.cpuStats;
            const roomCount = Object.keys(stats.perRoom).length;
            const totalRoomCpu = Object.values(stats.perRoom).reduce((a, b) => a + b, 0);
            console.log(`[CPU] tick=${Game.time} total=${Memory.lastTickCpu.toFixed(1)} rooms=${roomCount} roomCpu=${totalRoomCpu.toFixed(2)} bucket=${Game.cpu.bucket}`);
        }
    }
}
CPUManager.HISTORY_SIZE = 10;
CPUManager.PER_ROOM_AVG_WINDOW = 100;
CPUManager.CPU_SAFETY_BUFFER = 3;
CPUManager.TOTAL_CPU_LIMIT = 20;
CPUManager.staggerCounters = {};
CPUManager.managerStartCpu = {};

const MAX_SITES_PER_ROOM = 5;
const MAX_GLOBAL_SITES = 80;
class LayoutBuilder {
    constructor(roomName, layout) {
        this.maxConstructionSites = MAX_SITES_PER_ROOM;
        this.roomName = roomName;
        this.layout = layout;
    }
    /**
     * Überprüft, ob eine Struktur für das aktuelle RCL gebaut werden kann
     */
    canBuildAtRCL(structureType, room) {
        var _a;
        const rcl = ((_a = room.controller) === null || _a === void 0 ? void 0 : _a.level) || 0;
        // @ts-ignore
        const rclRequirements = {
            [STRUCTURE_SPAWN]: 1,
            [STRUCTURE_EXTENSION]: 2,
            [STRUCTURE_ROAD]: 1,
            [STRUCTURE_WALL]: 2,
            [STRUCTURE_RAMPART]: 2,
            [STRUCTURE_CONTAINER]: 1,
            [STRUCTURE_TOWER]: 3,
            [STRUCTURE_STORAGE]: 4,
            [STRUCTURE_LINK]: 5,
            [STRUCTURE_EXTRACTOR]: 6,
            [STRUCTURE_LAB]: 6,
            [STRUCTURE_TERMINAL]: 6,
            [STRUCTURE_FACTORY]: 7
        };
        return rcl >= (rclRequirements[structureType] || 8);
    }
    /**
     * Gibt die maximale Anzahl einer Struktur für das aktuelle RCL zurück
     */
    getMaxStructuresAtRCL(structureType, room) {
        var _a;
        const rcl = ((_a = room.controller) === null || _a === void 0 ? void 0 : _a.level) || 0;
        // Strukturen mit RCL-abhängigen Limits
        // @ts-ignore
        const structureLimits = {
            [STRUCTURE_SPAWN]: {
                1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 2, 8: 3
            },
            [STRUCTURE_EXTENSION]: {
                1: 0, 2: 5, 3: 10, 4: 20, 5: 30, 6: 40, 7: 50, 8: 60
            },
            [STRUCTURE_TOWER]: {
                1: 0, 2: 0, 3: 1, 4: 1, 5: 2, 6: 2, 7: 3, 8: 6
            },
            [STRUCTURE_LINK]: {
                1: 0, 2: 0, 3: 0, 4: 0, 5: 2, 6: 3, 7: 4, 8: 6
            },
            [STRUCTURE_LAB]: {
                1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 3, 7: 6, 8: 10
            },
            [STRUCTURE_CONTAINER]: {
                1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5, 8: 5
            },
        };
        // Strukturen mit festem Limit (1 pro Raum)
        const singleStructures = [
            STRUCTURE_STORAGE, STRUCTURE_TERMINAL, STRUCTURE_OBSERVER,
            STRUCTURE_POWER_SPAWN, STRUCTURE_NUKER, STRUCTURE_FACTORY, STRUCTURE_EXTRACTOR
        ];
        // Strukturen ohne Limit
        const unlimitedStructures = [STRUCTURE_ROAD, STRUCTURE_WALL, STRUCTURE_RAMPART];
        if (structureLimits[structureType]) {
            return structureLimits[structureType][rcl] || 0;
        }
        if (singleStructures.includes(structureType)) {
            return this.canBuildAtRCL(structureType, room) ? 1 : 0;
        }
        if (unlimitedStructures.includes(structureType)) {
            return this.canBuildAtRCL(structureType, room) ? Infinity : 0;
        }
        return 0;
    }
    /**
     * Zählt existierende Strukturen eines bestimmten Typs im Raum
     */
    countExistingStructures(structureType, room) {
        const structures = room.find(FIND_STRUCTURES, {
            filter: (s) => s.structureType === structureType
        });
        const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES, {
            filter: (s) => s.structureType === structureType
        });
        return structures.length + constructionSites.length;
    }
    /**
     * Überprüft, ob noch eine weitere Struktur dieses Typs gebaut werden kann
     */
    canBuildMoreStructures(structureType, room) {
        const maxAllowed = this.getMaxStructuresAtRCL(structureType, room);
        const currentCount = this.countExistingStructures(structureType, room);
        return currentCount < maxAllowed;
    }
    /**
     * Zählt aktuelle Baustellen im Raum
     */
    getConstructionSiteCount(room) {
        return room.find(FIND_MY_CONSTRUCTION_SITES).length;
    }
    /**
     * Überprüft, ob bereits eine Struktur des gewünschten Typs an der Position existiert
     */
    structureExistsAtPosition(x, y, structureType, room) {
        const structures = room.lookForAt(LOOK_STRUCTURES, x, y);
        return structures.some(s => s.structureType === structureType);
    }
    /**
     * Entfernt störende Strukturen (hauptsächlich Roads) an einer Position
     */
    removeBlockingStructures(x, y, targetStructureType, room) {
        const structures = room.lookForAt(LOOK_STRUCTURES, x, y);
        for (const structure of structures) {
            // Roads können mit Ramparts koexistieren
            if (targetStructureType === STRUCTURE_RAMPART && structure.structureType === STRUCTURE_ROAD) {
                continue;
            }
            // Wenn wir eine Road bauen wollen, entfernen wir keine anderen Strukturen
            if (targetStructureType === STRUCTURE_ROAD) {
                continue;
            }
            // Entferne Roads für andere Strukturen
            if (structure.structureType === STRUCTURE_ROAD) {
                const result = structure.destroy();
                if (result === OK) {
                    console.log(`Road at (${x},${y}) entfernt für ${targetStructureType}`);
                    return true;
                }
                else {
                    console.log(`Fehler beim Entfernen der Road at (${x},${y}): ${result}`);
                }
            }
        }
        return false;
    }
    /**
     * Überprüft, ob eine Position für eine Struktur gültig ist
     */
    isValidPosition(x, y, structureType, room) {
        if (x < 0 || x > 49 || y < 0 || y > 49) {
            return false;
        }
        // Prüfe RCL-Anforderungen
        if (!this.canBuildAtRCL(structureType, room)) {
            return false;
        }
        // Prüfe Struktur-Limits für aktuelles RCL
        if (!this.canBuildMoreStructures(structureType, room)) {
            return false;
        }
        // Prüfe, ob die Struktur bereits existiert
        if (this.structureExistsAtPosition(x, y, structureType, room)) {
            return false;
        }
        // Prüfe Terrain (Wände können nicht bebaut werden, außer bei Roads)
        const terrain = new Room.Terrain(this.roomName);
        const terrainType = terrain.get(x, y);
        if ((terrainType & TERRAIN_MASK_WALL) && structureType !== STRUCTURE_ROAD && structureType !== STRUCTURE_EXTRACTOR) {
            return false;
        }
        // Prüfe bereits existierende Baustellen
        const existingSites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
        if (existingSites.some(s => s.structureType === structureType)) {
            return false;
        }
        // Prüfe bereits existierende Strukturen
        const existingStructures = room.lookForAt(LOOK_STRUCTURES, x, y);
        // Roads können mit anderen Strukturen koexistieren
        if (structureType === STRUCTURE_ROAD) {
            return !existingStructures.some(s => s.structureType === STRUCTURE_ROAD) &&
                !existingSites.some(s => s.structureType === STRUCTURE_ROAD);
        }
        // Ramparts können auf Roads gebaut werden
        if (structureType === STRUCTURE_RAMPART) {
            const nonRoadStructures = existingStructures.filter(s => s.structureType !== STRUCTURE_ROAD);
            const nonRoadSites = existingSites.filter(s => s.structureType !== STRUCTURE_ROAD);
            return nonRoadStructures.length === 0 && nonRoadSites.length === 0;
        }
        // Andere Strukturen brauchen freie Plätze (außer Roads können entfernt werden)
        const blockingStructures = existingStructures.filter(s => s.structureType !== STRUCTURE_ROAD);
        const blockingSites = existingSites.filter(s => s.structureType !== STRUCTURE_ROAD);
        return blockingStructures.length === 0 && blockingSites.length === 0;
    }
    /**
     * Baut eine einzelne Struktur
     */
    buildStructure(x, y, structureType) {
        const room = Game.rooms[this.roomName];
        if (!room) {
            return ERR_INVALID_TARGET;
        }
        // Prüfe Baustellen-Limit
        if (this.getConstructionSiteCount(room) >= this.maxConstructionSites) {
            return ERR_FULL;
        }
        // Validierung
        if (!this.isValidPosition(x, y, structureType, room)) {
            return ERR_INVALID_TARGET;
        }
        // Entferne störende Strukturen falls nötig
        this.removeBlockingStructures(x, y, structureType, room);
        // Baustelle erstellen
        return room.createConstructionSite(x, y, structureType);
    }
    /**
     * Baut alle Strukturen eines bestimmten Typs
     */
    buildStructureType(structureType, positions, maxNewSites = this.maxConstructionSites) {
        let success = 0;
        const room = Game.rooms[this.roomName];
        if (!room) {
            return success;
        }
        if (!structureType) {
            return success;
        }
        const sortedPositions = this.sortPositionsByPriority(positions, structureType);
        let cSides = this.getConstructionSiteCount(room);
        for (const pos of sortedPositions) {
            if ((cSides + success) >= this.maxConstructionSites || success >= maxNewSites) {
                break;
            }
            const buildResult = this.buildStructure(pos.x, pos.y, structureType);
            if (buildResult === OK) {
                success++;
            }
            else if (buildResult === ERR_FULL) {
                break;
            }
        }
        return success;
    }
    /**
     * Sortiert Positionen nach Build-Priorität
     */
    sortPositionsByPriority(positions, structureType) {
        if (structureType == STRUCTURE_EXTENSION) { // Extensions: Nähe zu Spawns priorisieren
            return positions.sort((a, b) => {
                const room = Game.rooms[this.roomName];
                if (!room)
                    return 0;
                const spawns = room.find(FIND_MY_SPAWNS);
                if (spawns.length === 0)
                    return 0;
                // Finde nächsten Spawn für beide Positionen
                const distanceA = Math.min(...spawns.map(spawn => Math.max(Math.abs(a.x - spawn.pos.x), Math.abs(a.y - spawn.pos.y))));
                const distanceB = Math.min(...spawns.map(spawn => Math.max(Math.abs(b.x - spawn.pos.x), Math.abs(b.y - spawn.pos.y))));
                // Nähere Extensions haben Priorität
                return distanceA - distanceB;
            });
        }
        if (structureType == STRUCTURE_LINK) {
            return positions.sort((a, b) => {
                const room = Game.rooms[this.roomName];
                if (!room)
                    return 0;
                const spawn = room.find(FIND_MY_SPAWNS)[0];
                const storage = room.storage;
                const controller = room.controller;
                const sources = room.find(FIND_SOURCES);
                // Prioritätswerte bestimmen (niedriger = höhere Priorität)
                const getPriority = (pos) => {
                    // 1. Storage/Spawn Link (höchste Priorität)
                    if (storage) {
                        const storageDistance = Math.max(Math.abs(pos.x - storage.pos.x), Math.abs(pos.y - storage.pos.y));
                        if (storageDistance <= 2)
                            return 1;
                    }
                    if (spawn) {
                        const spawnDistance = Math.max(Math.abs(pos.x - spawn.pos.x), Math.abs(pos.y - spawn.pos.y));
                        if (spawnDistance <= 2)
                            return 1;
                    }
                    // 2. Source Links
                    const nearSource = sources.some(source => Math.max(Math.abs(pos.x - source.pos.x), Math.abs(pos.y - source.pos.y)) <= 2);
                    if (nearSource)
                        return 2;
                    // 3. Controller/Upgrader Link
                    if (controller) {
                        const controllerDistance = Math.max(Math.abs(pos.x - controller.pos.x), Math.abs(pos.y - controller.pos.y));
                        if (controllerDistance <= 3)
                            return 3; // Etwas größerer Radius für Upgrader-Bereich
                    }
                    // 4. Remote Links (alle anderen)
                    return 4;
                };
                const priorityA = getPriority(a);
                const priorityB = getPriority(b);
                // Bei gleicher Priorität: näher zum Spawn bevorzugen
                if (priorityA === priorityB && spawn) {
                    const distanceA = Math.max(Math.abs(a.x - spawn.pos.x), Math.abs(a.y - spawn.pos.y));
                    const distanceB = Math.max(Math.abs(b.x - spawn.pos.x), Math.abs(b.y - spawn.pos.y));
                    return distanceA - distanceB;
                }
                return priorityA - priorityB;
            });
        }
        return positions;
    }
    /**
     * Baut alle Strukturen aus dem Layout (mit RCL-Filterung)
     */
    buildAll(maxNewSites = this.maxConstructionSites) {
        var _a;
        let success = 0;
        const room = Game.rooms[this.roomName];
        if (!room) {
            return success;
        }
        const rcl = ((_a = room.controller) === null || _a === void 0 ? void 0 : _a.level) || 0;
        console.log(`Starte Layout-Build für Raum ${this.roomName} (RCL ${rcl})`);
        // Baue in sinnvoller Reihenfolge: Roads zuerst, dann wichtige Strukturen
        const buildOrder = [STRUCTURE_ROAD, STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_CONTAINER, STRUCTURE_TOWER, STRUCTURE_STORAGE, STRUCTURE_LINK,
            STRUCTURE_TERMINAL, STRUCTURE_EXTRACTOR, STRUCTURE_LAB, STRUCTURE_FACTORY, STRUCTURE_OBSERVER, STRUCTURE_POWER_SPAWN,
            STRUCTURE_NUKER, STRUCTURE_WALL, STRUCTURE_RAMPART];
        let constSides = this.getConstructionSiteCount(room);
        if (constSides >= this.maxConstructionSites) {
            return success;
        }
        for (const structureType of buildOrder) {
            const positions = this.layout.buildings[structureType];
            if (positions && positions.length > 0) {
                const result = this.buildStructureType(structureType, positions, maxNewSites - success);
                success += result;
                if ((constSides + success) >= this.maxConstructionSites || success >= maxNewSites) {
                    break;
                }
            }
        }
        return success;
    }
    /**
     * Gibt Informationen über das Layout für das aktuelle RCL zurück
     */
    getLayoutInfo() {
        var _a;
        const room = Game.rooms[this.roomName];
        const rcl = ((_a = room === null || room === void 0 ? void 0 : room.controller) === null || _a === void 0 ? void 0 : _a.level) || 0;
        let totalStructures = 0;
        let totalBuilding = 0;
        let buildableAtCurrentRCL = 0;
        const structureBreakdown = {};
        for (const [type, positions] of Object.entries(this.layout.buildings)) {
            if (positions && positions.length > 0) {
                let structureType = this.getStructureTypeMapping(type);
                const total = positions.length;
                totalStructures += total;
                let buildable = 0;
                let existing = 0;
                let maxAllowed = 0;
                if (structureType && room) {
                    maxAllowed = this.getMaxStructuresAtRCL(structureType, room);
                    let maxPlanned = this.layout.buildings[structureType].length;
                    if (maxAllowed > maxPlanned) {
                        maxAllowed = maxPlanned;
                    }
                    existing = this.countExistingStructures(structureType, room);
                    totalBuilding += this.getConstructionSiteCount(room);
                    if (this.canBuildAtRCL(structureType, room)) {
                        // Berechne wie viele noch gebaut werden können
                        const remainingSlots = Math.max(0, maxAllowed - existing);
                        buildable = Math.min(total, remainingSlots);
                        buildableAtCurrentRCL += buildable;
                    }
                }
                structureBreakdown[type] = {
                    total,
                    buildable,
                    existing,
                    maxAllowed: maxAllowed === Infinity ? -1 : maxAllowed // -1 bedeutet unbegrenzt
                };
            }
        }
        return {
            totalStructures,
            buildableAtCurrentRCL,
            currentRCL: rcl,
            totalBuilding,
            structureBreakdown
        };
    }
    /**
     * Zeigt eine detaillierte Übersicht über den aktuellen Build-Status
     */
    printBuildStatus() {
        const info = this.getLayoutInfo();
        const room = Game.rooms[this.roomName];
        console.log(`\n=== Build Status für ${this.roomName} (RCL ${info.currentRCL}) ===`);
        console.log(`Gesamt im Layout: ${info.totalStructures}`);
        console.log(`Baubar bei RCL ${info.currentRCL}: ${info.buildableAtCurrentRCL}`);
        console.log(`Aktuelle Baustellen: ${room ? this.getConstructionSiteCount(room) : 0}/${this.maxConstructionSites}`);
        console.log('\nStruktur-Details:');
        for (const [typeName, details] of Object.entries(info.structureBreakdown)) {
            const maxStr = details.maxAllowed === -1 ? '∞' : details.maxAllowed.toString();
            const status = details.buildable > 0 ? '✓' :
                details.existing >= details.maxAllowed && details.maxAllowed !== -1 ? '✓ (Max erreicht)' :
                    '✗ (RCL zu niedrig)';
            console.log(`  ${typeName}: ${details.existing}/${maxStr} (${details.buildable} baubar) ${status}`);
        }
        console.log('');
    }
    /**
     * Visualisiert das komplette Layout mit nicht gebauten Strukturen
     */
    visualizeUnbuiltLayout() {
        const room = Game.rooms[this.roomName];
        if (!room) {
            console.log(`Raum ${this.roomName} nicht verfügbar`);
            return;
        }
        const visual = room.visual;
        // Farben und Symbole für verschiedene Strukturtypen
        const visualConfig = {
            'spawn': { color: '#ffaa00', symbol: 'S', size: 0.8 },
            'extension': { color: '#ffdd00', symbol: 'E', size: 0.6 },
            'road': { color: '#666666', symbol: '·', size: 0.4 },
            'constructedWall': { color: '#000000', symbol: 'W', size: 0.4 },
            'rampart': { color: '#00ff00', symbol: 'R', size: 0.6 },
            'link': { color: '#0066ff', symbol: 'L', size: 0.6 },
            'storage': { color: '#ffff00', symbol: 'St', size: 0.5 },
            'tower': { color: '#ff0000', symbol: 'T', size: 0.7 },
            'observer': { color: '#ff00ff', symbol: 'O', size: 0.6 },
            'powerSpawn': { color: '#ff0080', symbol: 'P', size: 0.6 },
            'extractor': { color: '#8080ff', symbol: 'X', size: 0.7 },
            'lab': { color: '#00ffff', symbol: 'Lab', size: 0.4 },
            'terminal': { color: '#80ff80', symbol: 'Te', size: 0.5 },
            'container': { color: '#ffff80', symbol: 'C', size: 0.6 },
            'nuker': { color: '#ff8000', symbol: 'N', size: 0.6 },
            'factory': { color: '#8000ff', symbol: 'F', size: 0.6 }
        };
        // Durchlaufe alle Strukturtypen im Layout
        for (const [type, positions] of Object.entries(this.layout.buildings)) {
            if (!positions || positions.length === 0)
                continue;
            let structureType = this.getStructureTypeMapping(type);
            if (!structureType)
                continue;
            const config = visualConfig[structureType];
            if (!config)
                continue;
            // Prüfe jede Position
            for (const pos of positions) {
                const isBuilt = this.structureExistsAtPosition(pos.x, pos.y, structureType, room);
                const hasConstructionSite = room.lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y)
                    .some(site => site.structureType === structureType);
                // Visualisiere nur ungebaute Strukturen
                if (!isBuilt && !hasConstructionSite) {
                    // Prüfe ob für aktuelles RCL baubar
                    const canBuild = this.canBuildAtRCL(structureType, room) &&
                        this.canBuildMoreStructures(structureType, room);
                    const visualColor = canBuild ? config.color : '#666666';
                    const alpha = canBuild ? 0.8 : 0.4;
                    // Zeichne Struktur-Symbol
                    visual.text(config.symbol, pos.x, pos.y, {
                        color: visualColor,
                        opacity: alpha,
                        font: (config.size || 0.6) + ' Arial',
                        align: 'center'
                    });
                    // Zeichne Hintergrund-Kreis für bessere Sichtbarkeit
                    visual.circle(pos.x, pos.y, {
                        radius: 0.35,
                        fill: visualColor,
                        opacity: alpha * 0.3,
                        stroke: visualColor,
                        strokeWidth: 0.1
                    });
                }
            }
        }
    }
    getStructureTypeMapping(type) {
        switch (type) {
            case 'spawn':
                return STRUCTURE_SPAWN;
            case 'extension':
                return STRUCTURE_EXTENSION;
            case 'road':
                return STRUCTURE_ROAD;
            case 'constructedWall':
                return STRUCTURE_WALL;
            case 'rampart':
                return STRUCTURE_RAMPART;
            case 'link':
                return STRUCTURE_LINK;
            case 'storage':
                return STRUCTURE_STORAGE;
            case 'tower':
                return STRUCTURE_TOWER;
            case 'observer':
                return STRUCTURE_OBSERVER;
            case 'powerSpawn':
                return STRUCTURE_POWER_SPAWN;
            case 'extractor':
                return STRUCTURE_EXTRACTOR;
            case 'lab':
                return STRUCTURE_LAB;
            case 'terminal':
                return STRUCTURE_TERMINAL;
            case 'container':
                return STRUCTURE_CONTAINER;
            case 'nuker':
                return STRUCTURE_NUKER;
            case 'factory':
                return STRUCTURE_FACTORY;
        }
        return undefined;
    }
}

const W5N8 = {
    "buildings": {
        "container": [
            { "x": 37, "y": 11 },
            { "x": 12, "y": 29 },
            { "x": 40, "y": 33 },
            { "x": 10, "y": 24 },
            { "x": 14, "y": 14 }
        ],
        "road": [
            { "x": 27, "y": 12 },
            { "x": 19, "y": 20 },
            { "x": 38, "y": 14 },
            { "x": 28, "y": 22 },
            { "x": 38, "y": 10 },
            { "x": 33, "y": 8 },
            { "x": 37, "y": 7 },
            { "x": 26, "y": 44 },
            { "x": 16, "y": 24 },
            { "x": 30, "y": 16 },
            { "x": 38, "y": 32 },
            { "x": 17, "y": 25 },
            { "x": 39, "y": 11 },
            { "x": 15, "y": 15 },
            { "x": 14, "y": 24 },
            { "x": 32, "y": 7 },
            { "x": 12, "y": 24 },
            { "x": 37, "y": 4 },
            { "x": 21, "y": 22 },
            { "x": 37, "y": 5 },
            { "x": 25, "y": 18 },
            { "x": 37, "y": 6 },
            { "x": 32, "y": 26 },
            { "x": 40, "y": 9 },
            { "x": 35, "y": 10 },
            { "x": 28, "y": 17 },
            { "x": 14, "y": 15 },
            { "x": 36, "y": 12 },
            { "x": 23, "y": 23 },
            { "x": 21, "y": 7 },
            { "x": 15, "y": 24 },
            { "x": 32, "y": 11 },
            { "x": 22, "y": 7 },
            { "x": 35, "y": 29 },
            { "x": 16, "y": 17 },
            { "x": 39, "y": 14 },
            { "x": 23, "y": 8 },
            { "x": 30, "y": 15 },
            { "x": 2, "y": 22 },
            { "x": 34, "y": 12 },
            { "x": 29, "y": 17 },
            { "x": 36, "y": 30 },
            { "x": 15, "y": 6 },
            { "x": 6, "y": 22 },
            { "x": 20, "y": 21 },
            { "x": 33, "y": 27 },
            { "x": 17, "y": 24 },
            { "x": 4, "y": 22 },
            { "x": 28, "y": 13 },
            { "x": 11, "y": 22 },
            { "x": 31, "y": 15 },
            { "x": 37, "y": 15 },
            { "x": 33, "y": 13 },
            { "x": 26, "y": 11 },
            { "x": 24, "y": 9 },
            { "x": 34, "y": 15 },
            { "x": 25, "y": 10 },
            { "x": 28, "y": 18 },
            { "x": 35, "y": 11 },
            { "x": 20, "y": 23 },
            { "x": 39, "y": 33 },
            { "x": 32, "y": 14 },
            { "x": 27, "y": 16 },
            { "x": 27, "y": 19 },
            { "x": 39, "y": 10 },
            { "x": 37, "y": 31 },
            { "x": 29, "y": 23 },
            { "x": 30, "y": 24 },
            { "x": 3, "y": 22 },
            { "x": 1, "y": 22 },
            { "x": 18, "y": 19 },
            { "x": 31, "y": 25 },
            { "x": 25, "y": 21 },
            { "x": 11, "y": 24 },
            { "x": 8, "y": 22 },
            { "x": 35, "y": 13 },
            { "x": 37, "y": 12 },
            { "x": 16, "y": 26 },
            { "x": 24, "y": 22 },
            { "x": 27, "y": 21 },
            { "x": 37, "y": 9 },
            { "x": 26, "y": 17 },
            { "x": 35, "y": 14 },
            { "x": 41, "y": 12 },
            { "x": 26, "y": 20 },
            { "x": 35, "y": 30 },
            { "x": 37, "y": 13 },
            { "x": 9, "y": 1 },
            { "x": 10, "y": 2 },
            { "x": 39, "y": 13 },
            { "x": 12, "y": 4 },
            { "x": 13, "y": 5 },
            { "x": 14, "y": 6 },
            { "x": 19, "y": 6 },
            { "x": 20, "y": 7 },
            { "x": 40, "y": 12 },
            { "x": 37, "y": 10 },
            { "x": 34, "y": 9 },
            { "x": 12, "y": 23 },
            { "x": 21, "y": 23 },
            { "x": 9, "y": 22 },
            { "x": 18, "y": 6 },
            { "x": 36, "y": 10 },
            { "x": 10, "y": 22 },
            { "x": 17, "y": 6 },
            { "x": 41, "y": 8 },
            { "x": 15, "y": 27 },
            { "x": 33, "y": 12 },
            { "x": 24, "y": 19 },
            { "x": 37, "y": 16 },
            { "x": 11, "y": 3 },
            { "x": 38, "y": 12 },
            { "x": 35, "y": 33 },
            { "x": 14, "y": 28 },
            { "x": 36, "y": 14 },
            { "x": 16, "y": 6 },
            { "x": 35, "y": 31 },
            { "x": 35, "y": 32 },
            { "x": 33, "y": 16 },
            { "x": 5, "y": 22 },
            { "x": 37, "y": 8 },
            { "x": 13, "y": 24 },
            { "x": 17, "y": 18 },
            { "x": 25, "y": 20 },
            { "x": 13, "y": 29 },
            { "x": 35, "y": 34 },
            { "x": 15, "y": 16 },
            { "x": 22, "y": 23 },
            { "x": 18, "y": 24 },
            { "x": 7, "y": 22 },
            { "x": 41, "y": 16 },
            { "x": 34, "y": 28 },
            { "x": 40, "y": 15 },
            { "x": 19, "y": 23 },
            { "x": 34, "y": 35 },
            { "x": 42, "y": 17 },
            { "x": 29, "y": 14 },
            { "x": 42, "y": 7 },
            { "x": 23, "y": 48 },
            { "x": 23, "y": 47 },
            { "x": 24, "y": 46 },
            { "x": 25, "y": 45 },
            { "x": 27, "y": 43 },
            { "x": 28, "y": 42 },
            { "x": 29, "y": 41 },
            { "x": 33, "y": 36 },
            { "x": 33, "y": 37 },
            { "x": 32, "y": 38 },
            { "x": 31, "y": 39 },
            { "x": 30, "y": 40 },
            { "x": 38, "y": 16 },
            { "x": 39, "y": 17 },
            { "x": 40, "y": 18 },
            { "x": 41, "y": 19 },
            { "x": 42, "y": 20 },
            { "x": 43, "y": 21 },
            { "x": 44, "y": 22 },
            { "x": 45, "y": 22 },
            { "x": 46, "y": 22 },
            { "x": 47, "y": 22 }
        ],
        "constructedWall": [
            { "x": 36, "y": 35 },
            { "x": 11, "y": 13 },
            { "x": 10, "y": 14 },
            { "x": 32, "y": 35 },
            { "x": 7, "y": 24 },
            { "x": 7, "y": 20 },
            { "x": 7, "y": 23 },
            { "x": 15, "y": 7 },
            { "x": 12, "y": 12 },
            { "x": 10, "y": 15 },
            { "x": 11, "y": 14 },
            { "x": 30, "y": 35 },
            { "x": 43, "y": 34 },
            { "x": 9, "y": 15 },
            { "x": 45, "y": 24 },
            { "x": 15, "y": 4 },
            { "x": 19, "y": 32 },
            { "x": 22, "y": 32 },
            { "x": 35, "y": 35 },
            { "x": 46, "y": 24 },
            { "x": 46, "y": 23 },
            { "x": 15, "y": 8 },
            { "x": 47, "y": 23 },
            { "x": 43, "y": 35 },
            { "x": 43, "y": 33 },
            { "x": 31, "y": 35 },
            { "x": 21, "y": 32 },
            { "x": 20, "y": 32 },
            { "x": 18, "y": 32 },
            { "x": 17, "y": 32 },
            { "x": 15, "y": 9 },
            { "x": 15, "y": 10 },
            { "x": 47, "y": 20 },
            { "x": 47, "y": 21 },
            { "x": 48, "y": 20 },
            { "x": 12, "y": 13 },
            { "x": 43, "y": 32 },
            { "x": 43, "y": 31 },
        ],
        "extension": [
            { "x": 34, "y": 13 },
            { "x": 36, "y": 9 },
            { "x": 35, "y": 16 },
            { "x": 32, "y": 6 },
            { "x": 31, "y": 8 },
            { "x": 31, "y": 6 },
            { "x": 33, "y": 6 },
            { "x": 41, "y": 10 },
            { "x": 39, "y": 16 },
            { "x": 41, "y": 6 },
            { "x": 40, "y": 16 },
            { "x": 41, "y": 15 },
            { "x": 33, "y": 7 },
            { "x": 32, "y": 8 },
            { "x": 32, "y": 9 },
            { "x": 32, "y": 15 },
            { "x": 35, "y": 15 },
            { "x": 38, "y": 15 },
            { "x": 40, "y": 13 },
            { "x": 36, "y": 15 },
            { "x": 40, "y": 7 },
            { "x": 40, "y": 14 },
            { "x": 34, "y": 7 },
            { "x": 40, "y": 11 },
            { "x": 40, "y": 8 },
            { "x": 33, "y": 15 },
            { "x": 40, "y": 10 },
            { "x": 39, "y": 15 },
            { "x": 34, "y": 14 },
            { "x": 39, "y": 9 },
            { "x": 39, "y": 8 },
            { "x": 34, "y": 8 },
            { "x": 35, "y": 8 },
            { "x": 34, "y": 11 },
            { "x": 34, "y": 10 },
            { "x": 38, "y": 9 },
            { "x": 35, "y": 9 },
            { "x": 33, "y": 14 },
            { "x": 33, "y": 9 },
            { "x": 33, "y": 10 },
            { "x": 32, "y": 16 },
            { "x": 34, "y": 16 },
            { "x": 34, "y": 17 },
            { "x": 41, "y": 9 },
            { "x": 42, "y": 9 },
            { "x": 42, "y": 8 },
            { "x": 41, "y": 7 },
            { "x": 43, "y": 7 },
            { "x": 42, "y": 6 },
            { "x": 42, "y": 16 },
            { "x": 41, "y": 17 },
            { "x": 42, "y": 15 },
            { "x": 41, "y": 14 },
            { "x": 43, "y": 16 },
            { "x": 43, "y": 6 },
            { "x": 41, "y": 18 },
            { "x": 43, "y": 17 },
            { "x": 42, "y": 18 },
            { "x": 43, "y": 18 },
            { "x": 40, "y": 17 }
        ],
        "link": [
            { "x": 41, "y": 33 },
            { "x": 10, "y": 23 },
            { "x": 38, "y": 13 },
            { "x": 13, "y": 14 }
        ],
        "terminal": [
            { "x": 11, "y": 29 }
        ],
        "lab": [
            { "x": 25, "y": 17 },
            { "x": 24, "y": 18 },
            { "x": 24, "y": 17 },
            { "x": 25, "y": 16 },
            { "x": 26, "y": 16 },
            { "x": 27, "y": 17 },
            { "x": 27, "y": 18 },
            { "x": 26, "y": 18 },
            { "x": 26, "y": 19 },
            { "x": 25, "y": 19 }
        ],
        "storage": [
            { "x": 36, "y": 13 }
        ],
        "rampart": [
            { "x": 15, "y": 5 },
            { "x": 7, "y": 22 },
            { "x": 33, "y": 35 },
            { "x": 15, "y": 6 },
            { "x": 7, "y": 21 },
            { "x": 34, "y": 35 },
            { "x": 47, "y": 22 }
        ],
        "extractor": [
            { "x": 12, "y": 30 }
        ],
        "tower": [
            { "x": 42, "y": 12 },
            { "x": 37, "y": 17 },
            { "x": 32, "y": 12 },
            { "x": 11, "y": 23 },
            { "x": 15, "y": 14 },
            { "x": 41, "y": 34 }
        ],
        "spawn": [
            { "x": 36, "y": 11 },
            { "x": 38, "y": 11 },
            { "x": 33, "y": 11 }
        ],
        "factory": [
            { "x": 28, "y": 16 }
        ],
        "observer": [
            { "x": 48, "y": 7 }
        ],
        "powerSpawn": [
            { "x": 32, "y": 10 }
        ],
        "nuker": [
            { "x": 37, "y": 3 }
        ]
    }
};

const LAYOUT_INTERVAL = 50;
class LayoutManager {
    static getLayout(name) {
        switch (name) {
            case "W5N8":
                return W5N8;
        }
        return undefined;
    }
    static run() {
        var _a;
        const globalUsed = Object.keys(Game.constructionSites).length;
        if (globalUsed >= MAX_GLOBAL_SITES)
            return; // global budget exhausted
        const ownedRooms = Object.keys(roomConfig).filter(name => {
            var _a;
            const room = Game.rooms[name];
            return ((_a = room === null || room === void 0 ? void 0 : room.controller) === null || _a === void 0 ? void 0 : _a.my) && roomConfig[name].buildBase;
        });
        for (let i = 0; i < ownedRooms.length; i++) {
            const name = ownedRooms[i];
            if (!CPUManager.shouldRunEvery(`layout_${name}`, LAYOUT_INTERVAL, i))
                continue;
            const room = Game.rooms[name];
            if (!room)
                continue;
            // Skip phase 1 and phase 8 rooms entirely
            if (room.memory.state < 2 /* eRoomState.phase2 */ || room.memory.state === 8 /* eRoomState.phase8 */)
                continue;
            // Per-room site count check
            const roomSites = room.find(FIND_CONSTRUCTION_SITES).length;
            if (roomSites >= MAX_SITES_PER_ROOM)
                continue;
            const layout = this.getLayout(name);
            if (!layout)
                continue;
            const builder = new LayoutBuilder(name, layout);
            if ((_a = Memory.debug) === null || _a === void 0 ? void 0 : _a.visuals) {
                builder.visualizeUnbuiltLayout();
            }
            const info = builder.getLayoutInfo();
            if (info.buildableAtCurrentRCL === 0)
                continue;
            // Respect per-room limit and global limit
            const maxNewSites = Math.min(MAX_SITES_PER_ROOM - roomSites, MAX_GLOBAL_SITES - globalUsed);
            if (maxNewSites <= 0)
                continue;
            const count = builder.buildAll(maxNewSites);
            if (count > 0) {
                console.log(`[Layout] ${name}: placed ${count} sites`);
            }
            // Only process one room per call to spread CPU
            break;
        }
    }
}

const NUKE_SCAN_INTERVAL = 50;
const NUKE_ACTIVE_INTERVAL = 10;
class DefenseManager {
    /** Single hostile scan for all owned rooms — critical tier, always runs */
    static runCritical(ownedRooms) {
        var _a;
        for (const roomName of ownedRooms) {
            const room = Game.rooms[roomName];
            if (!((_a = room === null || room === void 0 ? void 0 : room.controller) === null || _a === void 0 ? void 0 : _a.my))
                continue;
            const info = this.getHostileInfo(room);
            this.publishThreat(room, info);
        }
    }
    static getHostileInfo(room) {
        const cached = this.hostilesCache.get(room.name);
        if (cached && Game.time - cached.tick < this.CACHE_TTL)
            return cached.info;
        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        let threat = 'none';
        let expires = 0;
        if (hostiles.length > 0) {
            const isPlayer = hostiles.some(h => h.owner.username !== 'Invader');
            threat = isPlayer ? 'player' : 'npc';
            expires = Game.time + Math.max(...hostiles.map(h => { var _a; return (_a = h.ticksToLive) !== null && _a !== void 0 ? _a : 0; }));
        }
        const info = { threat, hostiles, expires };
        this.hostilesCache.set(room.name, { info, tick: Game.time });
        return info;
    }
    static publishThreat(room, info) {
        var _a, _b;
        room.memory.needDefence = info.hostiles.length > 0;
        room.memory.threat = info.threat;
        if (info.threat !== 'none') {
            room.memory.threatExpires = info.expires;
            room.memory.needDefenceEndTick = info.expires;
        }
        else if (((_a = room.memory.threatExpires) !== null && _a !== void 0 ? _a : 0) <= Game.time) {
            room.memory.threat = 'none';
            room.memory.needDefence = false;
        }
        // Check invader cores
        if (CPUManager.shouldRunEvery(`core_${room.name}`, 20, 0)) {
            const cores = room.find(FIND_HOSTILE_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_INVADER_CORE
            });
            room.memory.invaderCore = cores.length > 0;
            if (cores.length > 0) {
                const maxTicks = Math.max(...cores.map(c => {
                    var _a;
                    const eff = (_a = c.effects) !== null && _a !== void 0 ? _a : [];
                    return eff.length > 0 ? Math.max(...eff.map(e => e.ticksRemaining)) : 0;
                }));
                room.memory.invaderCoreEndTick = Game.time + maxTicks;
            }
            else {
                room.memory.invaderCore = false;
            }
        }
        else if (((_b = room.memory.invaderCoreEndTick) !== null && _b !== void 0 ? _b : 0) <= Game.time) {
            room.memory.invaderCore = false;
        }
    }
    /** Choose best tower target by killability scoring */
    static chooseTowerTarget(room, hostiles) {
        if (hostiles.length === 0)
            return null;
        // Score each hostile: prefer easily killable, deprioritize well-healed
        let bestScore = -Infinity;
        let bestTarget = null;
        for (const hostile of hostiles) {
            let score = 0;
            const body = hostile.body;
            const healParts = body.filter(p => p.type === HEAL && p.hits > 0).length;
            const toughParts = body.filter(p => p.type === TOUGH && p.hits > 0).length;
            // Dismantlers near structures are high priority
            const dismantleParts = body.filter(p => p.type === WORK && p.hits > 0).length;
            if (dismantleParts > 0)
                score += 30;
            // Healers first — stop regeneration chain
            if (healParts > 0 && hostiles.length > 1)
                score += 20;
            // High heal = hard to kill, deprioritize
            score -= healParts * 5;
            score -= toughParts * 2;
            // Prefer closer targets to controller
            const range = room.controller.pos.getRangeTo(hostile);
            score -= range;
            if (score > bestScore) {
                bestScore = score;
                bestTarget = hostile;
            }
        }
        return bestTarget;
    }
    /** Scan nukes in owned rooms (staggered) */
    static scanNukesStaggered(ownedRooms) {
        var _a, _b, _c, _d, _e;
        for (let i = 0; i < ownedRooms.length; i++) {
            const roomName = ownedRooms[i];
            const hasActivePlan = (_b = (_a = Memory.rooms[roomName]) === null || _a === void 0 ? void 0 : _a.nukePlan) === null || _b === void 0 ? void 0 : _b.active;
            const interval = hasActivePlan ? NUKE_ACTIVE_INTERVAL : NUKE_SCAN_INTERVAL;
            if (!CPUManager.shouldRunEvery(`nuke_${roomName}`, interval, i))
                continue;
            const room = Game.rooms[roomName];
            if (!((_c = room === null || room === void 0 ? void 0 : room.controller) === null || _c === void 0 ? void 0 : _c.my))
                continue;
            const nukes = room.find(FIND_NUKES);
            if (nukes.length > 0) {
                for (const nuke of nukes) {
                    const key = `${roomName}_${nuke.pos.x}_${nuke.pos.y}`;
                    if (!Memory.debug)
                        Memory.debug = {};
                    if (!Memory.debug.policyViolations)
                        Memory.debug.policyViolations = [];
                    const alreadyNotified = Memory.debug.policyViolations.some(v => v.includes(key));
                    if (!alreadyNotified) {
                        Game.notify(`[Nuke] Incoming nuke at ${roomName} (${nuke.pos.x},${nuke.pos.y}) lands at tick ~${nuke.timeToLand + Game.time}`, 60);
                        PassivePolicy.logViolation(`NUKE: ${key} lands ~${nuke.timeToLand + Game.time}`);
                    }
                    if (!((_d = room.memory.nukePlan) === null || _d === void 0 ? void 0 : _d.active)) {
                        room.memory.nukePlan = {
                            active: true,
                            detectedAt: Game.time,
                            landAt: Game.time + nuke.timeToLand,
                            nukes: nukes.map(n => ({ x: n.pos.x, y: n.pos.y, roomName, landAt: Game.time + n.timeToLand })),
                            phase: 'scan',
                            affectedStructureIds: [],
                            safePlan: [],
                            resourceEvacuationDone: false,
                        };
                    }
                }
            }
            else if (((_e = room.memory.nukePlan) === null || _e === void 0 ? void 0 : _e.active) && room.memory.nukePlan.landAt <= Game.time) {
                room.memory.nukePlan.active = false;
                room.memory.nukePlan.phase = 'recover';
            }
        }
    }
    /** Get cached hostiles for a room (used by TowerManager) */
    static getHostiles(room) {
        return this.getHostileInfo(room).hostiles;
    }
}
DefenseManager.hostilesCache = new Map();
DefenseManager.CACHE_TTL = 3;

class TowerManager {
    static runTowers() {
        var _a, _b;
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if (!((_a = room.controller) === null || _a === void 0 ? void 0 : _a.my))
                continue;
            const roomMemory = room.memory;
            if (!roomMemory.towers || roomMemory.towers.length === 0) {
                roomMemory.towers = room.find(FIND_MY_STRUCTURES, {
                    filter: (s) => s.structureType === STRUCTURE_TOWER
                }).map(t => t.id);
                if (roomMemory.towers.length === 0)
                    continue;
            }
            {
                // Use DefenseManager as single hostile scan source
                const hostiles = DefenseManager.getHostiles(room);
                if (hostiles.length > 0) {
                    const target = (_b = DefenseManager.chooseTowerTarget(room, hostiles)) !== null && _b !== void 0 ? _b : hostiles.reduce((closest, current) => room.controller.pos.getRangeTo(current) < room.controller.pos.getRangeTo(closest)
                        ? current : closest);
                    for (let i = roomMemory.towers.length - 1; i >= 0; i--) {
                        const towerId = roomMemory.towers[i];
                        const tower = Game.getObjectById(towerId);
                        if (!tower) {
                            roomMemory.towers.splice(i, 1);
                            continue;
                        }
                        if (tower.store.energy > 0)
                            tower.attack(target);
                    }
                    continue;
                }
            }
            if (roomMemory.repairTarget) {
                const target = Game.getObjectById(roomMemory.repairTarget);
                if (!target || target.hits >= target.hitsMax) {
                    roomMemory.repairTarget = undefined;
                    continue;
                }
                let bestTower = null;
                let maxEnergy = TOWER_CAPACITY * 0.7;
                for (let i = roomMemory.towers.length - 1; i >= 0; i--) {
                    const towerId = roomMemory.towers[i];
                    const tower = Game.getObjectById(towerId);
                    if (!tower) {
                        roomMemory.towers.splice(i, 1);
                        continue;
                    }
                    if (tower.store.energy > maxEnergy) {
                        maxEnergy = tower.store.energy;
                        bestTower = tower;
                    }
                }
                if (bestTower) {
                    bestTower.repair(target);
                }
            }
            else {
                roomMemory.repairTarget = this.findBestRepairTarget(room);
            }
        }
    }
    /** @deprecated Use DefenseManager.getHostiles instead */
    static getHostiles(room) {
        return DefenseManager.getHostiles(room);
    }
    static findBestRepairTarget(room) {
        const structures = room.find(FIND_STRUCTURES, {
            filter: (s) => {
                const type = s.structureType;
                return (type === STRUCTURE_CONTAINER ||
                    type === STRUCTURE_ROAD) &&
                    s.hits < (s.hitsMax * 0.9);
            }
        });
        if (structures.length === 0)
            return undefined;
        const mostDamaged = structures.reduce((worst, current) => {
            const currentDamage = (current.hitsMax - current.hits) / current.hitsMax;
            const worstDamage = (worst.hitsMax - worst.hits) / worst.hitsMax;
            if (Math.abs(currentDamage - worstDamage) < 0.01) {
                return room.controller.pos.getRangeTo(current) < room.controller.pos.getRangeTo(worst)
                    ? current : worst;
            }
            return currentDamage > worstDamage ? current : worst;
        });
        return mostDamaged.id;
    }
}

class LinkManager {
    constructor(roomName) {
        this.roomName = roomName;
        this.linkStorage = LinkStorage.getInstance();
    }
    run() {
        if (!this.linkStorage.hasLinks(this.roomName)) {
            return;
        }
        this.manageEnergyTransfers(this.roomName);
    }
    manageEnergyTransfers(roomName) {
        const senders = this.getReadySenders(roomName);
        if (senders.length === 0)
            return 0;
        const targets = this.getPriorityTargets(roomName);
        if (targets.length === 0)
            return 0;
        let targetIndex = 0;
        for (const sender of senders) {
            if (targetIndex >= targets.length)
                break;
            const target = targets[targetIndex];
            // Verhindere Selbst-Transfer
            if (sender.id === target.id) {
                targetIndex++;
                continue;
            }
            const freeSpace = 800 - target.store[RESOURCE_ENERGY];
            const senderEnergy = sender.store[RESOURCE_ENERGY];
            if (freeSpace >= senderEnergy) {
                sender.transferEnergy(target);
            }
            targetIndex++;
        }
        return;
    }
    /**
     * CPU-effiziente Sender-Ermittlung
     */
    getReadySenders(roomName, minEnergy = 600) {
        if (!this.linkStorage.hasLinks(roomName))
            return [];
        const categories = this.linkStorage.getLinkCategories(roomName);
        const senders = [];
        for (const sourceLink of categories.sourceLinks) {
            let link = Game.getObjectById(sourceLink.linkId);
            if (!link) {
                this.linkStorage.invalidateRoomCache(roomName);
                continue;
            }
            if (link.store[RESOURCE_ENERGY] >= minEnergy &&
                link.cooldown === 0) {
                senders.push(link);
            }
        }
        for (const remoteLink of categories.remoteLinks) {
            let link = Game.getObjectById(remoteLink.linkId);
            if (!link) {
                this.linkStorage.invalidateRoomCache(roomName);
                continue;
            }
            if (link.store[RESOURCE_ENERGY] >= minEnergy &&
                link.cooldown === 0) {
                senders.push(link);
            }
        }
        return senders;
    }
    /**
     * CPU-effiziente Target-Ermittlung mit Prioritäten
     */
    getPriorityTargets(roomName) {
        var _a;
        if (!this.linkStorage.hasLinks(roomName))
            return [];
        const categories = this.linkStorage.getLinkCategories(roomName);
        const targets = [];
        const room = Game.rooms[roomName];
        // Upgrader Links - dynamische Priorität
        if (categories.upgraderLink) {
            let link = Game.getObjectById(categories.upgraderLink.linkId);
            if (!link) {
                this.linkStorage.invalidateRoomCache(roomName);
            }
            else if (link.store[RESOURCE_ENERGY] < 100) {
                targets.push({ prio: ((_a = room === null || room === void 0 ? void 0 : room.controller) === null || _a === void 0 ? void 0 : _a.level) === 8 ? 3 : 1, link });
            }
        }
        // Storage Links
        if (categories.storageLink) {
            let link = Game.getObjectById(categories.storageLink.linkId);
            if (!link) {
                this.linkStorage.invalidateRoomCache(roomName);
            }
            else if (link.store[RESOURCE_ENERGY] < 100) {
                targets.push({ prio: 2, link: link });
            }
        }
        // Sortiere nach Priorität (niedrigere Zahl = höhere Priorität)
        return targets.sort((a, b) => a.prio - b.prio).map(target => target.link);
    }
}

class RoomManager {
    static run() {
        var _a;
        const time = Game.time;
        for (let name in roomConfig) {
            const room = Game.rooms[name];
            if (room && ((_a = room.controller) === null || _a === void 0 ? void 0 : _a.my)) {
                if (Memory.rooms[name] && Memory.rooms[name].state >= 5 /* eRoomState.phase5 */ && Memory.rooms[name].state <= 8 /* eRoomState.phase8 */) {
                    new LinkManager(name).run();
                }
            }
            this.checkRoom(name, time);
        }
    }
    static checkRoom(name, time) {
        if (!Memory.rooms[name]) {
            Memory.rooms[name] = {
                energySources: [],
                mineralSources: [],
                storage: undefined,
                state: 0 /* eRoomState.neutral */,
                invaderCore: false,
                needDefence: false,
                towers: [],
                repairTarget: undefined,
            };
        }
        if ((time + 10) > (Memory.rooms[name].invaderCoreEndTick || 0)) {
            Memory.rooms[name].invaderCore = false;
        }
        if ((time + 10) > (Memory.rooms[name].needDefenceEndTick || 0)) {
            Memory.rooms[name].needDefence = false;
        }
        const room = Game.rooms[name];
        if (!room)
            return;
        // Threat data is maintained by DefenseManager.runCritical; just refresh towers here
        DefenseManager.getHostileInfo(room);
    }
}

const PHASE_UPDATE_INTERVAL = 10;
const PHASE_UPDATE_INTERVAL_LOW = 20;
class RoomPhaseManager {
    /** Update one owned room's phase profile per call (staggered by room index) */
    static updateStaggered(ownedRooms) {
        var _a;
        for (let i = 0; i < ownedRooms.length; i++) {
            const roomName = ownedRooms[i];
            const interval = Game.cpu.bucket < 3000 ? PHASE_UPDATE_INTERVAL_LOW : PHASE_UPDATE_INTERVAL;
            if (!CPUManager.shouldRunEvery(`phase_${roomName}`, interval, i))
                continue;
            const room = Game.rooms[roomName];
            if (!((_a = room === null || room === void 0 ? void 0 : room.controller) === null || _a === void 0 ? void 0 : _a.my))
                continue;
            if (room.memory.state === 8 /* eRoomState.phase8 */)
                continue; // final phase, skip forever
            this.updateRoom(room);
        }
    }
    static updateRoom(room) {
        const phase = room.memory.state;
        const profile = this.buildProfile(room, phase);
        room.memory.phaseProfile = profile;
        const next = this.getNextPhase(room, phase, profile);
        if (next !== null && next !== phase) {
            console.log(`[Phase] ${room.name}: ${phase} -> ${next}`);
            room.memory.state = next;
            room.memory.phaseTransitionTick = Game.time;
            room.memory.energySources = [];
            room.memory.storage = undefined;
            room.memory.targetLinkIds = undefined;
        }
    }
    static getProfile(roomName) {
        var _a;
        return (_a = Memory.rooms[roomName]) === null || _a === void 0 ? void 0 : _a.phaseProfile;
    }
    static buildProfile(room, phase) {
        var _a, _b, _c;
        const storage = room.storage;
        const storageEnergy = (_a = storage === null || storage === void 0 ? void 0 : storage.store.energy) !== null && _a !== void 0 ? _a : 0;
        const hasStorage = storage !== undefined;
        const hasLinks = ((_c = (_b = room.memory.targetLinkIds) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0) > 0;
        const passiveSafe = PassivePolicy.isExpansionTargetSafe(room.name);
        const fastGrowthActive = hasStorage && storageEnergy > 20000;
        const cpuTier = Game.cpu.bucket < 2000 ? 'critical'
            : Game.cpu.bucket < 5000 ? 'normal'
                : 'low';
        return {
            phase,
            canUseStaticMining: phase >= 2 /* eRoomState.phase2 */,
            canUseStorageLogistics: phase >= 4 /* eRoomState.phase4 */ && hasStorage,
            canUseLinks: phase >= 5 /* eRoomState.phase5 */ && hasLinks,
            canUseRemoteMining: phase >= 5 /* eRoomState.phase5 */ && passiveSafe && storageEnergy > 50000,
            canUseIndustry: phase >= 6 /* eRoomState.phase6 */,
            canUseEndgame: phase >= 8 /* eRoomState.phase8 */,
            cpuTier,
            fastGrowthActive,
            passiveSafe,
        };
    }
    /** Returns the next phase if exit criteria are met, or null if staying */
    static getNextPhase(room, phase, profile) {
        var _a, _b, _c;
        const rcl = (_b = (_a = room.controller) === null || _a === void 0 ? void 0 : _a.level) !== null && _b !== void 0 ? _b : 0;
        const storage = room.storage;
        const storageEnergy = (_c = storage === null || storage === void 0 ? void 0 : storage.store.energy) !== null && _c !== void 0 ? _c : 0;
        switch (phase) {
            case 1 /* eRoomState.phase1 */: {
                if (rcl >= 2) {
                    const containers = room.find(FIND_STRUCTURES, {
                        filter: s => s.structureType === STRUCTURE_CONTAINER
                    });
                    if (containers.length >= 1)
                        return 2 /* eRoomState.phase2 */;
                }
                break;
            }
            case 2 /* eRoomState.phase2 */: {
                const sources = room.find(FIND_SOURCES);
                const containers = room.find(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER
                });
                const towers = room.find(FIND_MY_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_TOWER
                });
                if (containers.length >= sources.length && towers.length >= 1) {
                    return 3 /* eRoomState.phase3 */;
                }
                break;
            }
            case 3 /* eRoomState.phase3 */: {
                if (storage) {
                    if (rcl >= 4)
                        return 4 /* eRoomState.phase4 */;
                }
                break;
            }
            case 4 /* eRoomState.phase4 */: {
                if (storageEnergy >= 50000) {
                    const spawns = room.find(FIND_MY_SPAWNS);
                    const spawningNow = spawns.some(s => s.spawning !== null);
                    const noThreat = !room.memory.needDefence;
                    if (noThreat && !spawningNow)
                        return 5 /* eRoomState.phase5 */;
                }
                break;
            }
            case 5 /* eRoomState.phase5 */: {
                const terminal = room.terminal;
                const extractor = room.find(FIND_MY_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_EXTRACTOR
                });
                if (terminal && extractor.length > 0 && storageEnergy >= 100000) {
                    return 6 /* eRoomState.phase6 */;
                }
                break;
            }
            case 6 /* eRoomState.phase6 */: {
                if (rcl >= 7)
                    return 7 /* eRoomState.phase7 */;
                break;
            }
            case 7 /* eRoomState.phase7 */: {
                if (rcl >= 8)
                    return 8 /* eRoomState.phase8 */;
                break;
            }
        }
        return null;
    }
}

const OWNED_SCAN_INTERVAL = 20;
const REMOTE_SCAN_INTERVAL = 30;
class IntelManager {
    /** Scan staggered: one owned room per tick (index-offset), one remote room per tick */
    static scanStaggered(ownedRooms) {
        if (Game.cpu.bucket < 3000)
            return;
        for (let i = 0; i < ownedRooms.length; i++) {
            if (!CPUManager.shouldRunEvery(`intel_owned_${ownedRooms[i]}`, OWNED_SCAN_INTERVAL, i))
                continue;
            const room = Game.rooms[ownedRooms[i]];
            if (room)
                this.scanRoom(room, true);
        }
        if (!Memory.remoteIntel)
            return;
        const remoteRooms = Object.keys(Memory.remoteIntel);
        for (let i = 0; i < remoteRooms.length; i++) {
            const roomName = remoteRooms[i];
            if (!CPUManager.shouldRunEvery(`intel_remote_${roomName}`, REMOTE_SCAN_INTERVAL, i + ownedRooms.length))
                continue;
            const room = Game.rooms[roomName];
            if (room)
                this.scanRoom(room, false);
        }
    }
    static scanRoom(room, isOwned) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (!Memory.intel)
            Memory.intel = {};
        const ctrl = room.controller;
        const sources = room.find(FIND_SOURCES);
        const links = room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_LINK });
        const cores = room.find(FIND_HOSTILE_STRUCTURES, { filter: s => s.structureType === STRUCTURE_INVADER_CORE });
        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        let threat = 'none';
        let threatExpires = 0;
        let lastPlayerActivity = (_b = (_a = Memory.intel[room.name]) === null || _a === void 0 ? void 0 : _a.lastPlayerActivity) !== null && _b !== void 0 ? _b : 0;
        if (hostiles.length > 0) {
            const hasPlayer = hostiles.some(h => h.owner.username !== 'Invader');
            threat = hasPlayer ? 'player' : 'npc';
            threatExpires = Game.time + Math.max(...hostiles.map(h => { var _a; return (_a = h.ticksToLive) !== null && _a !== void 0 ? _a : 0; }));
            if (hasPlayer)
                lastPlayerActivity = Game.time;
        }
        let status = 'normal';
        const roomStatus = Game.map.getRoomStatus(room.name);
        if (roomStatus.status === 'closed')
            status = 'closed';
        else if (roomStatus.status === 'novice')
            status = 'novice';
        else if (roomStatus.status === 'respawn')
            status = 'respawn';
        const nearest = this.findNearestOwnedDistance(room.name);
        const coreExpires = cores.length > 0
            ? Math.max(...cores.map(c => {
                var _a;
                const eff = (_a = c.effects) !== null && _a !== void 0 ? _a : [];
                const ticks = eff.length > 0 ? Math.max(...eff.map(e => e.ticksRemaining)) : 0;
                return Game.time + ticks;
            }))
            : 0;
        Memory.intel[room.name] = {
            scannedAt: Game.time,
            owner: (_d = (_c = ctrl === null || ctrl === void 0 ? void 0 : ctrl.owner) === null || _c === void 0 ? void 0 : _c.username) !== null && _d !== void 0 ? _d : null,
            reservation: (_f = (_e = ctrl === null || ctrl === void 0 ? void 0 : ctrl.reservation) === null || _e === void 0 ? void 0 : _e.username) !== null && _f !== void 0 ? _f : null,
            sourceIds: sources.map(s => s.id),
            sourceCount: sources.length,
            sourceSlots: sources.map(s => this.countFreeSlots(s)),
            controllerPos: ctrl ? { x: ctrl.pos.x, y: ctrl.pos.y } : undefined,
            storageId: (_h = (_g = room.storage) === null || _g === void 0 ? void 0 : _g.id) !== null && _h !== void 0 ? _h : null,
            linkIds: links.map(l => l.id),
            invaderCore: cores.length > 0,
            coreExpires,
            threat,
            threatExpires,
            status,
            routeDistance: nearest,
            lastPlayerActivity,
        };
    }
    static countFreeSlots(source) {
        const terrain = source.room.getTerrain();
        let free = 0;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0)
                    continue;
                if (terrain.get(source.pos.x + dx, source.pos.y + dy) !== TERRAIN_MASK_WALL) {
                    free++;
                }
            }
        }
        return free;
    }
    static findNearestOwnedDistance(roomName) {
        var _a;
        let min = 999;
        for (const name in Game.rooms) {
            const r = Game.rooms[name];
            if (!((_a = r.controller) === null || _a === void 0 ? void 0 : _a.my))
                continue;
            const route = Game.map.findRoute(roomName, name);
            if (route !== ERR_NO_PATH)
                min = Math.min(min, route.length);
        }
        return min;
    }
    static getIntel(roomName) {
        var _a;
        return (_a = Memory.intel) === null || _a === void 0 ? void 0 : _a[roomName];
    }
}

const SCAN_INTERVAL_NORMAL = 3;
const SCAN_INTERVAL_LOW = 5;
class SpawnDemandManager {
    /** Run demand checks for all owned rooms, staggered */
    static run(ownedRooms) {
        var _a, _b;
        const interval = Game.cpu.bucket < 3000 ? SCAN_INTERVAL_LOW : SCAN_INTERVAL_NORMAL;
        for (let i = 0; i < ownedRooms.length; i++) {
            const roomName = ownedRooms[i];
            if (!CPUManager.shouldRunEvery(`demand_${roomName}`, interval, i))
                continue;
            const room = Game.rooms[roomName];
            if (!((_a = room === null || room === void 0 ? void 0 : room.controller) === null || _a === void 0 ? void 0 : _a.my))
                continue;
            // Skip demand recalc if stable and recently calculated
            const lastCalc = (_b = room.memory.lastSpawnDemandTick) !== null && _b !== void 0 ? _b : 0;
            const timeSince = Game.time - lastCalc;
            if (timeSince < interval)
                continue;
            this.computeDemands(room);
            room.memory.lastSpawnDemandTick = Game.time;
        }
    }
    /** Returns true when a creep should be pre-spawned (replacement timing) */
    static needsReplacement(creep, bodyLength, travelTicks = 0) {
        var _a;
        const ticks = (_a = creep.ticksToLive) !== null && _a !== void 0 ? _a : 1500;
        return ticks < bodyLength * 3 + travelTicks + 10;
    }
    static computeDemands(room) {
        var _a, _b, _c, _d, _e;
        const phase = room.memory.state;
        const spawnRoom = room;
        const maxEnergy = room.getMaxAvailableEnergy();
        const storageEnergy = (_b = (_a = room.storage) === null || _a === void 0 ? void 0 : _a.store.energy) !== null && _b !== void 0 ? _b : 0;
        const rcl8 = ((_c = room.controller) === null || _c === void 0 ? void 0 : _c.level) === 8;
        const rcl = (_e = (_d = room.controller) === null || _d === void 0 ? void 0 : _d.level) !== null && _e !== void 0 ? _e : 0;
        // Phase 8: skip bootstrap/phase checks (endgame skip list per plan 11)
        if (phase === 8 /* eRoomState.phase8 */) {
            this.demandEndgame(room, spawnRoom, maxEnergy, storageEnergy);
            return;
        }
        // Phase 1 (RCL1): 2 workers only — no construction, only harvest+upgrade
        if (phase <= 1 /* eRoomState.phase1 */ || rcl < 2) {
            this.demandBootstrap(room, spawnRoom, maxEnergy);
            return;
        }
        // Phase 2 (RCL2-3): add containers and static miners
        this.demandMiners(room, spawnRoom, maxEnergy);
        if (phase >= 2 /* eRoomState.phase2 */) {
            // Only add haulers if no link network
            this.demandHaulers(room, spawnRoom, maxEnergy);
            this.demandFiller(room, spawnRoom, maxEnergy);
        }
        // Upgrader: scale by storage energy surplus
        this.demandUpgrader(room, spawnRoom, maxEnergy, storageEnergy, rcl8);
        // Builder: only when useful construction sites exist (plan 12: not during RCL1)
        if (phase >= 2 /* eRoomState.phase2 */) {
            this.demandBuilder(room, spawnRoom, maxEnergy);
        }
        // Phase 5+: remotes (only after phase4 exit criteria met: storage > 50k)
        if (phase >= 5 /* eRoomState.phase5 */ && storageEnergy >= 50000) {
            this.demandRemotes(room, spawnRoom, maxEnergy);
        }
    }
    static demandBootstrap(room, spawnRoom, maxEnergy) {
        const workers = Object.values(Game.creeps).filter(c => c.memory.workRoom === room.name);
        if (workers.length < 2) {
            SpawnManager.queueCreep("Worker" /* eJobType.worker */, spawnRoom, room.name, BodyBuilder.bootstrapWorker(maxEnergy), 999);
        }
    }
    static demandMiners(room, spawnRoom, maxEnergy) {
        const sources = room.getOrFindEnergieSource();
        const minerBody = BodyBuilder.miner(true);
        const minerCost = BodyBuilder.bodyCost(minerBody);
        if (minerCost > maxEnergy)
            return;
        for (const src of sources) {
            if (!src.sourceId)
                continue;
            const existingMiner = Object.values(Game.creeps).find(c => c.memory.workRoom === room.name &&
                c.memory.job === "Miner" /* eJobType.miner */ &&
                c.memory.energySourceId === src.sourceId);
            if (!existingMiner || this.needsReplacement(existingMiner, minerBody.length)) {
                SpawnManager.queueCreep("Miner" /* eJobType.miner */, spawnRoom, room.name, minerBody, 998);
            }
        }
    }
    static demandHaulers(room, spawnRoom, maxEnergy) {
        var _a, _b;
        // If links are active in phase5+, skip haulers
        if (room.memory.state >= 5 /* eRoomState.phase5 */ && ((_b = (_a = room.memory.targetLinkIds) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) > 0)
            return;
        const sources = room.getOrFindEnergieSource();
        const haulerCount = Object.values(Game.creeps).filter(c => c.memory.workRoom === room.name && c.memory.job === "Transporter" /* eJobType.transporter */).length;
        if (haulerCount < sources.length) {
            const body = BodyBuilder.hauler(10, 20, true);
            if (BodyBuilder.bodyCost(body) <= maxEnergy) {
                SpawnManager.queueCreep("Transporter" /* eJobType.transporter */, spawnRoom, room.name, body, 997);
            }
        }
    }
    static demandFiller(room, spawnRoom, maxEnergy) {
        const fillers = Object.values(Game.creeps).filter(c => c.memory.workRoom === room.name && c.memory.job === "Filler" /* eJobType.filler */);
        if (fillers.length < 1) {
            const body = BodyBuilder.filler(2);
            SpawnManager.queueCreep("Filler" /* eJobType.filler */, spawnRoom, room.name, body, 996);
        }
    }
    static demandUpgrader(room, spawnRoom, maxEnergy, storageEnergy, rcl8) {
        var _a, _b;
        const upgraders = Object.values(Game.creeps).filter(c => c.memory.workRoom === room.name && c.memory.job === "Upgrader" /* eJobType.upgrader */);
        if (upgraders.length < 1) {
            const linkFed = ((_b = (_a = room.memory.targetLinkIds) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) > 0;
            const body = BodyBuilder.upgrader(storageEnergy, rcl8, linkFed);
            if (BodyBuilder.bodyCost(body) <= maxEnergy) {
                SpawnManager.queueCreep("Upgrader" /* eJobType.upgrader */, spawnRoom, room.name, body, 11);
            }
        }
    }
    static demandBuilder(room, spawnRoom, maxEnergy) {
        const sites = room.find(FIND_CONSTRUCTION_SITES);
        if (sites.length === 0)
            return;
        const builders = Object.values(Game.creeps).filter(c => c.memory.workRoom === room.name && c.memory.job === "Builder" /* eJobType.builder */);
        if (builders.length < 1) {
            const body = BodyBuilder.builder(maxEnergy);
            SpawnManager.queueCreep("Builder" /* eJobType.builder */, spawnRoom, room.name, body, 10);
        }
    }
    static demandEndgame(room, spawnRoom, maxEnergy, storageEnergy) {
        // 4-creep endgame profile
        const miners = Object.values(Game.creeps).filter(c => c.memory.workRoom === room.name && c.memory.job === "Miner" /* eJobType.miner */);
        const sources = room.getOrFindEnergieSource();
        if (miners.length < sources.length) {
            SpawnManager.queueCreep("Miner" /* eJobType.miner */, spawnRoom, room.name, BodyBuilder.miner(true), 998);
        }
        const fillers = Object.values(Game.creeps).filter(c => c.memory.workRoom === room.name && c.memory.job === "Filler" /* eJobType.filler */);
        if (fillers.length < 1) {
            SpawnManager.queueCreep("Filler" /* eJobType.filler */, spawnRoom, room.name, BodyBuilder.filler(3), 996);
        }
        const endgameUpgraders = Object.values(Game.creeps).filter(c => c.memory.workRoom === room.name && c.memory.job === "EndgameUpgrader" /* eJobType.endgameUpgrader */);
        if (endgameUpgraders.length < 1 && storageEnergy > 20000) {
            const body = BodyBuilder.endgameUpgrader(maxEnergy);
            SpawnManager.queueCreep("EndgameUpgrader" /* eJobType.endgameUpgrader */, spawnRoom, room.name, body, 9);
        }
    }
    static demandRemotes(room, spawnRoom, maxEnergy) {
        if (!Memory.remoteIntel)
            return;
        const passiveSafe = PassivePolicy.isExpansionTargetSafe(room.name);
        if (!passiveSafe)
            return;
        for (const [remoteName, remote] of Object.entries(Memory.remoteIntel)) {
            if (remote.homeRoom !== room.name)
                continue;
            if (remote.state !== 'mining' && remote.state !== 'candidate')
                continue;
            if (remote.netIncome < 3)
                continue;
            const hasRemoteMiner = Object.values(Game.creeps).some(c => c.memory.workRoom === remoteName && c.memory.job === "RemoteMiner" /* eJobType.remoteMiner */);
            if (!hasRemoteMiner) {
                SpawnManager.queueCreep("RemoteMiner" /* eJobType.remoteMiner */, spawnRoom, remoteName, BodyBuilder.remoteMiner(remote.reserved), 4);
            }
            const hasHauler = Object.values(Game.creeps).some(c => c.memory.workRoom === remoteName && c.memory.job === "RemoteHauler" /* eJobType.remoteHauler */);
            if (!hasHauler) {
                const body = BodyBuilder.hauler(remote.reserved ? 10 : 5, remote.routeDistance * 3, true);
                SpawnManager.queueCreep("RemoteHauler" /* eJobType.remoteHauler */, spawnRoom, remoteName, BodyBuilder.cap50(body), 4);
            }
        }
    }
}

const SCAN_INTERVAL = 200;
const BLOCKED_TTL = 2000;
class RemotePlanner {
    /** Evaluate one remote room per tick, staggered by owned-room index */
    static runStaggered(ownedRooms) {
        if (Game.cpu.bucket < 3000)
            return;
        for (let i = 0; i < ownedRooms.length; i++) {
            if (!CPUManager.shouldRunEvery(`remotePlan_${ownedRooms[i]}`, SCAN_INTERVAL, i))
                continue;
            this.evaluateRemotesForRoom(ownedRooms[i]);
        }
        // Expire danger cooldowns
        this.expireDangerCooldowns();
    }
    static evaluateRemotesForRoom(homeRoom) {
        var _a, _b, _c, _d, _e, _f;
        if (!Memory.remoteIntel)
            Memory.remoteIntel = {};
        const home = Game.rooms[homeRoom];
        if (!((_a = home === null || home === void 0 ? void 0 : home.controller) === null || _a === void 0 ? void 0 : _a.my))
            return;
        if (((_c = (_b = home.storage) === null || _b === void 0 ? void 0 : _b.store.energy) !== null && _c !== void 0 ? _c : 0) < 50000)
            return; // not ready for remotes
        const exits = Game.map.describeExits(homeRoom);
        for (const dir in exits) {
            const roomName = exits[dir];
            if (!roomName)
                continue;
            const existing = Memory.remoteIntel[roomName];
            const intel = (_d = Memory.intel) === null || _d === void 0 ? void 0 : _d[roomName];
            // Skip if blocked and not yet time to recheck
            if ((existing === null || existing === void 0 ? void 0 : existing.state) === 'blocked' &&
                Game.time - ((_e = existing.scannedAt) !== null && _e !== void 0 ? _e : 0) < BLOCKED_TTL)
                continue;
            // Skip if danger and cooldown not expired
            if ((existing === null || existing === void 0 ? void 0 : existing.state) === 'danger' &&
                Game.time < ((_f = existing.dangerCooldownUntil) !== null && _f !== void 0 ? _f : 0))
                continue;
            // Skip if recent fresh candidate
            if ((existing === null || existing === void 0 ? void 0 : existing.state) === 'mining' || (existing === null || existing === void 0 ? void 0 : existing.state) === 'candidate')
                continue;
            if (!intel) {
                // Mark as unknown — needs scouting
                Memory.remoteIntel[roomName] = {
                    roomName,
                    state: 'unknown',
                    homeRoom,
                    scannedAt: 0,
                    sourceCount: 0,
                    reserved: false,
                    reservationExpires: 0,
                    netIncome: 0,
                    routeDistance: 1,
                    dangerCooldownUntil: 0,
                    invaderCoreExpires: 0,
                };
                continue;
            }
            // Hard filters
            if (intel.owner !== null || intel.status === 'highway' || intel.status === 'sk') {
                Memory.remoteIntel[roomName] = { ...this.baseEntry(roomName, homeRoom), state: 'blocked' };
                continue;
            }
            if (intel.invaderCore && intel.coreExpires > Game.time) {
                Memory.remoteIntel[roomName] = { ...this.baseEntry(roomName, homeRoom), state: 'danger', dangerCooldownUntil: intel.coreExpires };
                continue;
            }
            if (intel.threat === 'player' && intel.threatExpires > Game.time) {
                Memory.remoteIntel[roomName] = { ...this.baseEntry(roomName, homeRoom), state: 'danger', dangerCooldownUntil: intel.threatExpires };
                continue;
            }
            // Calculate ROI
            const sourceCount = intel.sourceCount;
            const reserved = intel.reservation === this.getOwnUsername();
            const gross = sourceCount * (reserved ? 10 : 5);
            const routeDistance = intel.routeDistance;
            const roundTrip = routeDistance * 6;
            const minerBody = BodyBuilder.remoteMiner(reserved);
            const haulerBody = BodyBuilder.hauler(reserved ? 10 : 5, roundTrip, true);
            const reserverBody = BodyBuilder.reserver(false);
            const minerCost = BodyBuilder.bodyCost(minerBody) / 1500 * sourceCount;
            const haulerCost = BodyBuilder.bodyCost(haulerBody) / 1500 * sourceCount;
            const reserverCost = reserved ? BodyBuilder.bodyCost(reserverBody) / 600 : 0;
            const containerMaint = reserved ? 0.1 * sourceCount : 0.5 * sourceCount;
            const roadMaint = routeDistance * 10 * 0.001;
            const net = gross - minerCost - haulerCost - reserverCost - containerMaint - roadMaint;
            const state = net >= 3 ? 'candidate' : 'blocked';
            Memory.remoteIntel[roomName] = {
                roomName,
                state,
                homeRoom,
                scannedAt: Game.time,
                sourceCount,
                reserved,
                reservationExpires: intel.reservation ? Game.time + 5000 : 0,
                netIncome: net,
                routeDistance,
                dangerCooldownUntil: 0,
                invaderCoreExpires: intel.coreExpires,
            };
        }
    }
    static expireDangerCooldowns() {
        if (!Memory.remoteIntel)
            return;
        for (const [roomName, remote] of Object.entries(Memory.remoteIntel)) {
            if (remote.state === 'danger' && Game.time >= remote.dangerCooldownUntil) {
                remote.state = 'candidate';
            }
        }
    }
    static baseEntry(roomName, homeRoom) {
        return {
            roomName,
            state: 'unknown',
            homeRoom,
            scannedAt: Game.time,
            sourceCount: 0,
            reserved: false,
            reservationExpires: 0,
            netIncome: 0,
            routeDistance: 1,
            dangerCooldownUntil: 0,
            invaderCoreExpires: 0,
        };
    }
    static getOwnUsername() {
        for (const name in Game.spawns) {
            return Game.spawns[name].owner.username;
        }
        return '';
    }
    /** Activate a candidate remote as mining once all conditions are met */
    static activateCandidate(roomName) {
        var _a;
        const entry = (_a = Memory.remoteIntel) === null || _a === void 0 ? void 0 : _a[roomName];
        if (!entry || entry.state !== 'candidate')
            return;
        entry.state = 'mining';
    }
}

const DISCOVER_INTERVAL = 500;
const CANDIDATE_REFRESH = 1000;
const MAX_DEPTH = 6;
const MIN_SETTLEMENT_SCORE = 75;
const BOOTSTRAP_RESERVE = 50000;
const EXPANSION_BUCKET_MIN = 5000;
class ScoutPlanner {
    static get memory() {
        if (!Memory.scoutPlanner) {
            Memory.scoutPlanner = { queue: [], candidates: [] };
        }
        return Memory.scoutPlanner;
    }
    static get scoutQueue() {
        return this.memory.queue;
    }
    static set scoutQueue(value) {
        this.memory.queue = value;
    }
    static get candidates() {
        return this.memory.candidates;
    }
    static set candidates(value) {
        this.memory.candidates = value;
    }
    /** Discover new rooms via BFS from owned rooms */
    static discoverFrontier(ownedRooms) {
        var _a;
        if (!CPUManager.shouldRunEvery('scout_discover', DISCOVER_INTERVAL, 0))
            return;
        if (Game.cpu.bucket < 5000)
            return;
        const visited = new Set(ownedRooms);
        const queue = ownedRooms.map(r => ({ room: r, depth: 0 }));
        while (queue.length > 0) {
            const { room, depth } = queue.shift();
            if (depth >= MAX_DEPTH)
                continue;
            const exits = Game.map.describeExits(room);
            for (const dir in exits) {
                const neighbor = exits[dir];
                if (!neighbor || visited.has(neighbor))
                    continue;
                visited.add(neighbor);
                const status = Game.map.getRoomStatus(neighbor);
                if (status.status === 'closed')
                    continue;
                const intel = (_a = Memory.intel) === null || _a === void 0 ? void 0 : _a[neighbor];
                if (!intel || Game.time - intel.scannedAt > 2000) {
                    if (!this.scoutQueue.includes(neighbor)) {
                        this.scoutQueue.push(neighbor);
                    }
                }
                else if (!this.candidates.find(c => c.roomName === neighbor)) {
                    this.scoreCandidate(neighbor);
                }
                queue.push({ room: neighbor, depth: depth + 1 });
            }
        }
        // Trim queue to reasonable size
        this.scoutQueue = this.scoutQueue.slice(0, 30);
    }
    /** Get next scout target (for ScoutAnt) */
    static getNextScoutTarget() {
        return this.scoutQueue[0];
    }
    /** Mark a room as scouted and score it */
    static onRoomScouted(roomName) {
        this.scoutQueue = this.scoutQueue.filter(r => r !== roomName);
        this.scoreCandidate(roomName);
    }
    static scoreCandidate(roomName) {
        var _a;
        const intel = (_a = Memory.intel) === null || _a === void 0 ? void 0 : _a[roomName];
        if (!intel)
            return;
        // Hard filters
        if (!this.passesHardFilters(roomName, intel))
            return;
        const score = this.computeScore(roomName, intel);
        const existing = this.candidates.find(c => c.roomName === roomName);
        if (existing) {
            existing.score = score;
            existing.lastScored = Game.time;
            existing.state = score >= MIN_SETTLEMENT_SCORE ? 'shortlisted' : 'scored';
        }
        else {
            this.candidates.push({
                roomName,
                score,
                lastScored: Game.time,
                state: score >= MIN_SETTLEMENT_SCORE ? 'shortlisted' : 'scored',
            });
        }
    }
    static passesHardFilters(roomName, intel) {
        var _a, _b;
        if (intel.sourceCount !== 2)
            return false;
        if (!intel.controllerPos)
            return false;
        if (intel.owner !== null)
            return false;
        if (intel.reservation !== null && intel.reservation !== this.getOwnUsername())
            return false;
        if (intel.status === 'closed')
            return false;
        if (intel.status === 'highway' || intel.status === 'sk')
            return false;
        // Not adjacent to any used (owned/reserved) room
        const exits = Game.map.describeExits(roomName);
        for (const dir in exits) {
            const neighbor = exits[dir];
            if (!neighbor)
                continue;
            const room = Game.rooms[neighbor];
            if ((_a = room === null || room === void 0 ? void 0 : room.controller) === null || _a === void 0 ? void 0 : _a.my)
                return false; // adjacent to owned room
            const neighborIntel = (_b = Memory.intel) === null || _b === void 0 ? void 0 : _b[neighbor];
            if ((neighborIntel === null || neighborIntel === void 0 ? void 0 : neighborIntel.owner) !== null && (neighborIntel === null || neighborIntel === void 0 ? void 0 : neighborIntel.owner) !== undefined)
                return false;
        }
        return true;
    }
    static computeScore(roomName, intel) {
        var _a;
        let score = 0;
        // Logistics distance (10% weight)
        if (intel.routeDistance <= 3)
            score += 10;
        else if (intel.routeDistance <= 4)
            score += 7;
        else if (intel.routeDistance <= 6)
            score += 3;
        else
            return 0; // too far
        // Economy: 2 sources close to anchor (25% weight)
        score += 15; // basic: 2 sources exist (hard filter already checked)
        if (intel.sourceSlots.every(s => s >= 3))
            score += 10;
        // Remote potential (15% weight)
        const exits = Game.map.describeExits(roomName);
        let remoteCount = 0;
        for (const dir in exits) {
            const neighbor = exits[dir];
            if (!neighbor)
                continue;
            const nIntel = (_a = Memory.intel) === null || _a === void 0 ? void 0 : _a[neighbor];
            if (nIntel && nIntel.owner === null && nIntel.sourceCount > 0)
                remoteCount++;
        }
        if (remoteCount >= 2)
            score += 15;
        else if (remoteCount >= 1)
            score += 8;
        // Defense: exit count estimate (35% weight)
        const exitCount = Object.keys(exits).filter(d => exits[d]).length;
        if (exitCount <= 2)
            score += 35;
        else if (exitCount <= 3)
            score += 20;
        else
            score += 5;
        // Mineral (15% weight) — any mineral is ok
        score += 10; // basic bonus for having a mineral (would check type with full intel)
        return Math.min(score, 100);
    }
    /** Return the best expansion target if criteria are met */
    static getBestExpansionTarget(ownedRooms) {
        var _a;
        if (Game.cpu.bucket < EXPANSION_BUCKET_MIN)
            return undefined;
        const supportRoom = ownedRooms.find(r => {
            var _a, _b;
            const room = Game.rooms[r];
            return ((_b = (_a = room === null || room === void 0 ? void 0 : room.storage) === null || _a === void 0 ? void 0 : _a.store.energy) !== null && _b !== void 0 ? _b : 0) >= BOOTSTRAP_RESERVE;
        });
        if (!supportRoom)
            return undefined;
        const shortlisted = this.candidates
            .filter(c => c.state === 'shortlisted' && c.score >= MIN_SETTLEMENT_SCORE)
            .sort((a, b) => b.score - a.score);
        return (_a = shortlisted[0]) === null || _a === void 0 ? void 0 : _a.roomName;
    }
    static getOwnUsername() {
        for (const name in Game.spawns) {
            return Game.spawns[name].owner.username;
        }
        return '';
    }
    /** Refresh stale shortlisted candidates */
    static refreshShortlisted() {
        if (!CPUManager.shouldRunEvery('scout_refresh', CANDIDATE_REFRESH, 0))
            return;
        for (const c of this.candidates) {
            if (c.state === 'shortlisted' && Game.time - c.lastScored > CANDIDATE_REFRESH) {
                this.scoutQueue.unshift(c.roomName); // re-scout for fresh intel
            }
        }
    }
}

const MAX_NUKE_SITES_PER_ROOM = 3;
const URGENCY_MEDIUM = 10000;
const URGENCY_HIGH = 3000;
class NukeMitigationManager {
    static runStaggered(ownedRooms) {
        var _a;
        if (Game.cpu.bucket < 5000)
            return;
        for (let i = 0; i < ownedRooms.length; i++) {
            if (!CPUManager.shouldRunEvery(`nuke_mit_${ownedRooms[i]}`, 50, i))
                continue;
            const room = Game.rooms[ownedRooms[i]];
            if (!((_a = room === null || room === void 0 ? void 0 : room.controller) === null || _a === void 0 ? void 0 : _a.my))
                continue;
            const plan = room.memory.nukePlan;
            if (!(plan === null || plan === void 0 ? void 0 : plan.active))
                continue;
            this.runPlan(room, plan);
        }
    }
    static runPlan(room, plan) {
        const ticksToLand = plan.landAt - Game.time;
        if (ticksToLand <= 0) {
            plan.phase = 'recover';
            plan.active = false;
            return;
        }
        switch (plan.phase) {
            case 'scan':
                this.scanAffected(room, plan);
                plan.phase = 'evacuate';
                break;
            case 'evacuate':
                this.planEvacuation(room, plan, ticksToLand);
                break;
            case 'rebuild':
                this.placeSafeReplacements(room, plan, ticksToLand);
                break;
            case 'survive':
                // Nothing to do — just let economy run
                break;
            case 'recover':
                this.clearInvalidIds(room, plan);
                plan.phase = 'done';
                plan.active = false;
                break;
        }
    }
    static scanAffected(room, plan) {
        const affected = [];
        for (const nuke of plan.nukes) {
            const structures = room.find(FIND_STRUCTURES);
            for (const s of structures) {
                if (s.pos.getRangeTo(nuke.x, nuke.y) <= 2) {
                    if (!affected.includes(s.id))
                        affected.push(s.id);
                }
            }
        }
        plan.affectedStructureIds = affected;
        // Build safe plan: find positions outside nuke range
        plan.safePlan = this.buildSafePlan(room, plan);
        plan.phase = 'evacuate';
    }
    static buildSafePlan(room, plan) {
        const safePlan = [];
        const nukePositions = plan.nukes.map(n => ({ x: n.x, y: n.y }));
        // For each threatened critical structure, find a safe relocation
        const criticalTypes = [
            STRUCTURE_SPAWN, STRUCTURE_TOWER, STRUCTURE_STORAGE, STRUCTURE_EXTENSION, STRUCTURE_LINK
        ];
        for (const id of plan.affectedStructureIds) {
            const s = Game.getObjectById(id);
            if (!s)
                continue;
            if (!criticalTypes.includes(s.structureType))
                continue;
            // Find a safe position (range >= 3 from all nukes)
            for (let x = 5; x < 45; x++) {
                for (let y = 5; y < 45; y++) {
                    const isSafe = nukePositions.every(n => Math.max(Math.abs(n.x - x), Math.abs(n.y - y)) >= 3);
                    if (!isSafe)
                        continue;
                    const terrain = room.getTerrain().get(x, y);
                    if (terrain === TERRAIN_MASK_WALL)
                        continue;
                    // Check no existing structure at pos
                    if (room.lookForAt(LOOK_STRUCTURES, x, y).length > 0)
                        continue;
                    safePlan.push({
                        type: s.structureType,
                        x, y,
                        priority: criticalTypes.indexOf(s.structureType) + 1,
                    });
                    break;
                }
                if (safePlan.find(sp => sp.type === s.structureType))
                    break;
            }
        }
        return safePlan.sort((a, b) => a.priority - b.priority);
    }
    static planEvacuation(room, plan, ticksToLand) {
        if (plan.resourceEvacuationDone) {
            plan.phase = 'rebuild';
            return;
        }
        // If no terminal or storage at risk, skip evacuation
        const atRisk = plan.affectedStructureIds.some(id => {
            const s = Game.getObjectById(id);
            return s && (s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_TERMINAL);
        });
        if (!atRisk || ticksToLand > URGENCY_MEDIUM) {
            plan.phase = 'rebuild';
            return;
        }
        plan.resourceEvacuationDone = true;
        plan.phase = 'rebuild';
    }
    static placeSafeReplacements(room, plan, ticksToLand) {
        if (Game.cpu.bucket < 5000)
            return;
        const globalUsed = Object.keys(Game.constructionSites).length;
        if (globalUsed >= MAX_GLOBAL_SITES - 10)
            return; // reserve 10 slots for emergency
        const roomSites = room.find(FIND_CONSTRUCTION_SITES).length;
        const canPlace = Math.min(MAX_NUKE_SITES_PER_ROOM - roomSites, MAX_GLOBAL_SITES - 10 - globalUsed);
        if (canPlace <= 0)
            return;
        let placed = 0;
        for (const sp of plan.safePlan) {
            if (placed >= canPlace)
                break;
            // Check if already placed
            const existing = room.lookForAt(LOOK_CONSTRUCTION_SITES, sp.x, sp.y).length > 0 ||
                room.lookForAt(LOOK_STRUCTURES, sp.x, sp.y).some(s => s.structureType === sp.type);
            if (existing)
                continue;
            const result = room.createConstructionSite(sp.x, sp.y, sp.type);
            if (result === OK)
                placed++;
        }
        if (ticksToLand <= URGENCY_HIGH) {
            plan.phase = 'survive';
        }
    }
    static clearInvalidIds(room, plan) {
        plan.affectedStructureIds = plan.affectedStructureIds.filter(id => Game.getObjectById(id) !== null);
    }
}

loadExtensions();
const loop = ErrorMapper.wrapLoop(() => {
    var _a;
    // --- CRITICAL (always runs) ---
    CPUManager.updateHistory();
    AntFactory.clearCache();
    // Collect owned rooms once per tick for stagger indexing
    const ownedRooms = [];
    for (const name in Game.rooms) {
        const room = Game.rooms[name];
        if ((_a = room.controller) === null || _a === void 0 ? void 0 : _a.my) {
            ownedRooms.push(name);
            if (room.memory.roomIndex === undefined) {
                room.memory.roomIndex = ownedRooms.length - 1;
            }
        }
    }
    DefenseManager.runCritical(ownedRooms);
    SpawnManager.processEmergencySpawns();
    SpawnManager.processSpawns();
    SpawnManager.findNeededCreeps();
    JobsManager.doPrioJobs();
    JobsManager.doCriticalJobs();
    TowerManager.runTowers();
    // --- NORMAL (skip when CPU is low) ---
    if (!CPUManager.canRunTier('normal')) {
        CPUManager.getStatus();
        Memory.lastTickCpu = Game.cpu.getUsed();
        return;
    }
    RoomPhaseManager.updateStaggered(ownedRooms);
    SpawnDemandManager.run(ownedRooms);
    CPUManager.measure('roomManager', () => RoomManager.run());
    JobsManager.doJobs();
    // --- LOW (first to be dropped under pressure) ---
    if (!CPUManager.canRunTier('low')) {
        CPUManager.getStatus();
        Memory.lastTickCpu = Game.cpu.getUsed();
        return;
    }
    CleanUpManager.runAllCleanup();
    JobsManager.doLowJobs();
    if (!CPUManager.canRunTier('low')) {
        CPUManager.getStatus();
        Memory.lastTickCpu = Game.cpu.getUsed();
        return;
    }
    IntelManager.scanStaggered(ownedRooms);
    RemotePlanner.runStaggered(ownedRooms);
    ScoutPlanner.discoverFrontier(ownedRooms);
    ScoutPlanner.refreshShortlisted();
    if (Game.cpu.bucket >= 3000) {
        DefenseManager.scanNukesStaggered(ownedRooms);
        NukeMitigationManager.runStaggered(ownedRooms);
    }
    // Skip LayoutManager when bucket is critically low
    if (Game.cpu.bucket >= 3000) {
        CPUManager.measure('layout', () => LayoutManager.run());
    }
    Memory.lastTickCpu = Game.cpu.getUsed();
});

exports.loop = loop;
//# sourceMappingURL=main.js.map
