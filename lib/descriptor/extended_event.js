"use strict";

const TsReader = require("../reader");
const TsDescriptorBase = require("./base");

class TsDescriptorExtendedEvent extends TsDescriptorBase {
    constructor(buffer) {
        super(buffer);
    }

    decode() {
        const reader = new TsReader(this._buffer);
        const objDescriptor = {};

        objDescriptor.descriptor_tag = reader.uimsbf(8);
        objDescriptor.descriptor_length = reader.uimsbf(8);

        objDescriptor.descriptor_number = reader.uimsbf(4);
        objDescriptor.last_descriptor_number = reader.uimsbf(4);
        objDescriptor.ISO_639_language_code = reader.readBytes(3);
        objDescriptor.length_of_items = reader.uimsbf(8);
        objDescriptor.items = [];

        for (let i = 0; i < objDescriptor.length_of_items; ) {
            const item = {};

            item.item_description_length = reader.uimsbf(8);
            item.item_description = reader.readBytes(item.item_description_length);
            item.item_length = reader.uimsbf(8);
            item.item = reader.readBytes(item.item_length);

            objDescriptor.items.push(item);

            i += 2 + item.item_description_length + item.item_length;
        }

        objDescriptor.text_length = reader.uimsbf(8);
        objDescriptor.text = reader.readBytes(objDescriptor.text_length);

        return objDescriptor;
    }
}

module.exports = TsDescriptorExtendedEvent;
