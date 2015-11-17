"use strict";

const TsReader = require("../reader");

class TsDescriptorIso639Language {
    constructor(buffer) {
        this.buffer = buffer;
    }

    decode() {
        var reader = new TsReader(this.buffer);
        var objDescriptor = {};

        objDescriptor._raw = this.buffer;

        objDescriptor.descriptor_tag = reader.uimsbf(8);
        objDescriptor.descriptor_length = reader.uimsbf(8);

        objDescriptor.ISO_639_languages = [];

        while (reader.position >> 3 < 2 + objDescriptor.descriptor_length) {
            let ISO_639_language = {};

            ISO_639_language.ISO_639_language_code = reader.bslbf(24);
            ISO_639_language.audio_type = reader.bslbf(8);

            objDescriptor.ISO_639_languages.push(ISO_639_language);
        }

        return objDescriptor;
    }
}

module.exports = TsDescriptorIso639Language;