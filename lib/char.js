"use strict";

const iconv = require("iconv-lite");
const charTable = require("./char_table");

const charCode = {
    hiragana: 0x30,
    katakana: 0x31,
    mosaic_a: 0x32,
    mosaic_b: 0x33,
    mosaic_c: 0x34,
    mosaic_d: 0x35,
    prop_ascii: 0x36,
    prop_hiragana: 0x37,
    prop_katakana: 0x38,
    jis_kanji_1: 0x39,
    jis_kanji_2: 0x3A,
    symbol: 0x3B,
    kanji: 0x42,
    ascii: 0x4A,
    jis_x0201_katakana: 0x49
};

const charMode = {
    graphic: 1,
    drcs: 2,
    other: 3
};

class TsChar {
    constructor(buffer) {
        this.buffer = buffer;
        this.position = 0;

        this.graphic = [charCode.kanji, charCode.ascii, charCode.hiragana, charCode.katakana];
        this.graphicMode = [charMode.graphic, charMode.graphic, charMode.graphic, charMode.graphic];
        this.graphicByte = [2, 1, 1, 1];
        this.graphicLR = [0, 2];
        this.graphicNormal = false;

        this.sjis = [];
    }

    decode() {
        while (this.position < this.buffer.length) {
            let byte = this.buffer[this.position];

            if (byte <= 0x20) {
                // C0
                this.readC0();
            } else if (byte <= 0x7E) {
                // GL
                this.readGL();
            } else if (byte <= 0xA0) {
                // C1
                this.readC1();
            } else if (byte !== 0xFF) {
                // GR
                this.readGR();
            }

        }

        return iconv.decode(new Buffer(this.sjis), "shift-jis");
    }

    readC0() {
        switch (this.buffer[this.position++]) {
            case 0x20:
                // SP
                if (this.graphicNormal) {
                    this.sjis.push(0x81, 0x40);
                } else {
                    this.sjis.push(0x20);
                }

                break;

            case 0x0D:
                // APR
                this.sjis.push(0x0D, 0x0A);

                break;

            case 0x0E:
                // LS1
                this.graphicLR[0] = 1;

                break;

            case 0x0F:
                // LS0
                this.graphicLR[0] = 0;

                break;

            case 0x19:
                // SS2
                this.readSS2();

                break;

            case 0x1D:
                // SS3
                this.readSS3();

                break;

            case 0x1B:
                // ESC
                this.readESC();

                break;

            case 0x16 :
                //PAPF
                this.position += 1;

                break;

            case 0x1C:
                // APS
                this.position += 2;

                break;
        }
    }

    readC1() {
        switch (this.buffer[this.position++]) {
            case 0x89:
                // MSZ
                this.graphicNormal = false;

                break;

            case 0x8A:
                // NSZ
                this.graphicNormal = true;

                break;

            case 0x88:
                // SSZ
                this.graphicNormal = false;

                break;

            case 0x8B:
                // SZX
                this.graphicNormal = this.buffer[this.position++] !== 0x60;

                break;

            case 0x90:
                // COL
                if (this.buffer[this.position++] === 0x20) {
                    this.position += 1;
                }

                break;

            case 0x91:
                // FLC
                this.position += 1;

                break;

            case 0x93:
                // POL
                this.position += 1;

                break;

            case 0x94:
                // WMM
                this.position += 1;

                break;

            case 0x95:
                // MACRO
                while (this.buffer[this.position] !== 0x4F) {
                    this.position++;
                }

                break;

            case 0x97:
                // HLC
                this.position += 1;

                break;

            case 0x98:
                // RPC
                this.position += 1;

                break;

            case 0x9D:
                // TIME
                if (this.buffer[this.position++] === 0x20) {
                    this.position += 1;
                } else {
                    while (this.buffer[this.position] < 0x40 && this.buffer[this.position] > 0x43) {
                        this.position++;
                    }
                }

                break;

            case 0x9B:
                // CSI
                this.readCSI();

                break;
        }
    }

    readGL() {
        switch (this.graphicMode[this.graphicLR[0]]) {
            case charMode.graphic:
                switch (this.graphic[this.graphicLR[0]]) {
                    case charCode.prop_ascii:
                    case charCode.ascii:
                    case charCode.jis_x0201_katakana:    // ascii
                        if (this.graphicNormal) {
                            this.sjis.push(...charTable.ascii[this.buffer[this.position++]]);
                        } else {
                            this.sjis.push(this.buffer[this.position++]);
                        }

                        break;

                    case charCode.hiragana:
                    case charCode.prop_hiragana:
                        this.sjis.push(...charTable.hiragana[this.buffer[this.position++]]);

                        break;

                    case charCode.katakana:
                    case charCode.prop_katakana:
                        this.sjis.push(...charTable.katakana[this.buffer[this.position++]]);

                        break;

                    case charCode.jis_kanji_1:
                    case charCode.jis_kanji_2:
                    case charCode.symbol:
                    case charCode.kanji:
                        this.sjis.push(...this.getSjis(this.buffer[this.position++],
                                                       this.buffer[this.position++]));

                        break;
                }
                break;

            default:
                this.position += this.graphicByte[this.graphicLR[0]];
        }
    }

    readGR() {
        switch (this.graphicMode[this.graphicLR[1]]) {
            case charMode.graphic:
                switch (this.graphic[this.graphicLR[1]]) {
                    case charCode.prop_ascii:
                    case charCode.ascii:
                        if (this.graphicNormal) {
                            this.sjis.push(...charTable.ascii[(this.buffer[this.position++] & 0x7F)]);
                        } else {
                            this.sjis.push((this.buffer[this.position++] & 0x7F));
                        }

                        break;

                    case charCode.hiragana:
                    case charCode.prop_hiragana:
                        this.sjis.push(...charTable.hiragana[(this.buffer[this.position++] & 0x7F)]);

                        break;

                    case charCode.katakana:
                    case charCode.prop_katakana:
                    case charCode.jis_x0201_katakana:    // katakana
                        this.sjis.push(...charTable.katakana[(this.buffer[this.position++] & 0x7F)]);

                        break;

                    case charCode.jis_kanji_1:
                    case charCode.jis_kanji_2:
                    case charCode.symbol:
                    case charCode.kanji:
                        this.sjis.push(...this.getSjis((this.buffer[this.position++] & 0x7F),
                                                       (this.buffer[this.position++] & 0x7F)));

                        break;
                }

                break;

            default:
                this.position += this.graphicByte[this.graphicLR[1]];
        }
    }

    readESC() {
        var byte, byte2, byte3, byte4;

        byte = this.buffer[this.position++];

        if (byte === 0x24) {
            byte2 = this.buffer[this.position++];

            if (byte2 >= 0x28 && byte2 <= 0x2B) {
                byte3 = this.buffer[this.position++];

                if (byte3 === 0x20) {
                    // DRCS 2
                    byte4 = this.buffer[this.position++];

                    this.graphic[byte2 - 0x28] = byte4;
                    this.graphicMode[byte2 - 0x28] = charMode.drcs;
                    this.graphicByte[byte2 - 0x28] = 2;
                } else if (byte3 === 0x28) {
                    // Ohter 2
                    byte4 = this.buffer[this.position++];

                    this.graphic[byte2 - 0x28] = byte4;
                    this.graphicMode[byte2 - 0x28] = charMode.other;
                    this.graphicByte[byte2 - 0x28] = 2;
                } else {
                    // Graphic 2
                    this.graphic[byte2 - 0x29] = byte3;
                    this.graphicMode[byte2 - 0x29] = charMode.graphic;
                    this.graphicByte[byte2 - 0x29] = 2;
                }
            } else {
                // Graphic 2
                this.graphic[0] = byte2;
                this.graphicMode[0] = charMode.graphic;
                this.graphicByte[0] = 2;
            }
        } else if (byte >= 0x28 && byte <= 0x2B) {
            byte2 = this.buffer[this.position++];

            if (byte2 === 0x20) {
                byte3 = this.buffer[this.position++];

                this.graphic[byte - 0x28] = byte3;
                this.graphicMode[byte - 0x28] = charMode.drcs;
                this.graphicByte[byte - 0x28] = 1;
            } else {
                this.graphic[byte - 0x28] = byte2;
                this.graphicMode[byte - 0x28] = charMode.graphic;
                this.graphicByte[byte - 0x28] = 1;
            }
        } else if (byte === 0x6E) {
            this.graphicLR[0] = 2;
        } else if (byte === 0x6F) {
            this.graphicLR[0] = 3;
        } else if (byte === 0x7C) {
            this.graphicLR[1] = 3;
        } else if (byte === 0x7D) {
            this.graphicLR[1] = 2;
        } else if (byte === 0x7E) {
            this.graphicLR[1] = 1;
        }
    }

    readSS2() {
        var holdL = this.graphicLR[0];

        this.graphicLR[0] = 2;
        this.readGL();
        this.graphicLR[0] = holdL;
    }

    readSS3() {
        var holdL = this.graphicLR[0];

        this.graphicLR[0] = 3;
        this.readGL();
        this.graphicLR[0] = holdL;
    }

    readCSI() {
        // TODO
    }

    getSjis(first, second) {
        if (first >= 0x75 && second >= 0x21) {
            let ret = [];
            let code = (first << 8) | second;

            if (code >= 0x7521 && code <= 0x764B) {
                ret = charTable.gaiji_2[code];
            } else if (code >= 0x7A4D && code <= 0x7E7D) {
                ret = charTable.gaiji_1[code];
            }

            return ret;
        }

        var row = first < 0x5F ? 0x70 : 0xB0;
        var cell = first & 1 ? (second > 0x5F ? 0x20 : 0x1F) : 0x7E;

        first = (((first + 1) >> 1) + row) & 0xFF;
        second = (second + cell) & 0xFF;

        return [first, second];
    }
}

module.exports = TsChar;