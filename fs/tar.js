// utils
const lookup = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
    'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
    'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
    'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f',
    'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
    'o', 'p', 'q', 'r', 's', 't', 'u', 'v',
    'w', 'x', 'y', 'z', '0', '1', '2', '3',
    '4', '5', '6', '7', '8', '9', '+', '/'
];
function clean(length) {
    let i;
    const buffer = new Uint8Array(length);
    for (i = 0; i < length; i += 1) {
        buffer[i] = 0;
    }
    return buffer;
}

function extend(orig, length, addLength, multipleOf) {
const newSize = length + addLength, buffer = clean((parseInt(newSize / multipleOf) + 1) * multipleOf);

buffer.set(orig);

return buffer;
}

function pad(num, bytes, base) {
num = num.toString(base || 8);
return "000000000000".substr(num.length + 12 - bytes) + num;
}

function stringToUint8 (input, out, offset) {
let i, length;

out = out || clean(input.length);

offset = offset || 0;
for (i = 0, length = input.length; i < length; i += 1) {
    out[offset] = input.charCodeAt(i);
    offset += 1;
}

return out;
}

function uint8ToBase64(uint8) {
    let i;

    const // if we have 1 byte left, pad 2 bytes
    extraBytes = uint8.length % 3;

    let output = "";
    let temp;
    let length;

    function tripletToBase64 (num) {
        return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
    }

    // go through the array every three bytes, we'll deal with trailing stuff later
    for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
        temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
        output += tripletToBase64(temp);
    }

    // this prevents an ERR_INVALID_URL in Chrome (Firefox okay)
    switch (output.length % 4) {
        case 1:
            output += '=';
            break;
        case 2:
            output += '==';
            break;
        default:
            break;
    }

    return output;
}


const utils = {
    clean,
    pad,
    extend,
    stringToUint8,
    uint8ToBase64,
}

// header

/*
struct posix_header {             // byte offset
	char name[100];               //   0
	char mode[8];                 // 100
	char uid[8];                  // 108
	char gid[8];                  // 116
	char size[12];                // 124
	char mtime[12];               // 136
	char chksum[8];               // 148
	char typeflag;                // 156
	char linkname[100];           // 157
	char magic[6];                // 257
	char version[2];              // 263
	char uname[32];               // 265
	char gname[32];               // 297
	char devmajor[8];             // 329
	char devminor[8];             // 337
	char prefix[155];             // 345
                                  // 500
};
*/
const headerFormat = [
{'field': 'fileName', 'length': 100},
{'field': 'fileMode','length': 8},
{'field': 'uid','length': 8},
{'field': 'gid','length': 8},
{'field': 'fileSize','length': 12},
{'field': 'mtime','length': 12},
{'field': 'checksum','length': 8},
{'field': 'type','length': 1},
{'field': 'linkName','length': 100},
{'field': 'ustar','length': 8},
{'field': 'owner','length': 32},
{'field': 'group','length': 32},
{'field': 'majorNumber','length': 8},
{'field': 'minorNumber','length': 8},
{'field': 'filenamePrefix','length': 155},
{'field': 'padding','length': 12}
];

function formatHeader(data, cb) {
    const buffer = utils.clean(512);
    let offset = 0;

    headerFormat.forEach(value => {
        const str = data[value.field] || "";
        let i;
        let length;

        for (i = 0, length = str.length; i < length; i += 1) {
            buffer[offset] = str.charCodeAt(i);
            offset += 1;
        }

        offset += value.length - i; // space it out with nulls
    });

    if (typeof cb === 'function') {
        return cb(buffer, offset);
    }
    return buffer;
}

const header = {
    structure: headerFormat,
    format: formatHeader,
}

const recordSize = 512

// new Tar().append(filepath, content, [opts], [callback])
export class Tar {
    constructor(recordsPerBlock) {
        this.written = 0;
        this.blockSize = (recordsPerBlock || 20) * recordSize;
        this.out = utils.clean(this.blockSize);
    }

    append(filepath, input, opts, callback) {
        let data, checksum, mode, mtime, uid, gid, headerArr;

        if (typeof input === 'string') {
            input = utils.stringToUint8(input);
        } else if (input.constructor !== Uint8Array.prototype.constructor) {
            throw `Invalid input type. You gave me: ${input.constructor.toString().match(/function\s*([$A-Za-z_][0-9A-Za-z_]*)\s*\(/)[1]}`;
        }

        if (typeof opts === 'function') {
            callback = opts;
            opts = {};
        }

        opts = opts || {};

        mode = opts.mode || parseInt('777', 8) & 0xfff;
        mtime = opts.mtime || Math.floor(+new Date() / 1000);
        uid = opts.uid || 0;
        gid = opts.gid || 0;

        data = {
            fileName: filepath,
            fileMode: utils.pad(mode, 7),
            uid: utils.pad(uid, 7),
            gid: utils.pad(gid, 7),
            fileSize: utils.pad(input.length, 11),
            mtime: utils.pad(mtime, 11),
            checksum: '        ',
            type: '0', // just a file
            ustar: 'ustar  ',
            owner: opts.owner || '',
            group: opts.group || ''
        };

        // calculate the checksum
        checksum = 0;
        Object.keys(data).forEach(key => {
            let i;
            const value = data[key];
            let length;

            for (i = 0, length = value.length; i < length; i += 1) {
                checksum += value.charCodeAt(i);
            }
        });

        data.checksum = `${utils.pad(checksum, 6)}\u0000 `;

        headerArr = header.format(data);

        let i, offset, length;

        this.out.set(headerArr, this.written);

        this.written += headerArr.length;

        // If there is not enough space in this.out, we need to expand it to
        // fit the new input.
        if (this.written + input.length > this.out.length) {
            this.out = utils.extend(this.out, this.written, input.length, this.blockSize);
        }

        this.out.set(input, this.written);

        // to the nearest multiple of recordSize
        this.written += input.length + (recordSize - (input.length % recordSize || recordSize));

        // make sure there's at least 2 empty records worth of extra space
        if (this.out.length - this.written < recordSize * 2) {
            this.out = utils.extend(this.out, this.written, recordSize * 2, this.blockSize);
        }

        if (typeof callback === 'function') {
            callback(this.out);
        }

        return this.out;
    }

    clear() {
        this.written = 0;
        this.out = utils.clean(this.blockSize);
    }
}
