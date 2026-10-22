// PrimeVue InputNumber with one decimal convention for every browser locale.
//
// Plain InputNumber formats and parses with the browser locale. Under de-DE or
// es-ES the '.' is the grouping separator, so '3.3' typed into a 3.3 kW field
// silently became 33 kW (ABT #1513). Here the number is always shown with a
// '.' and no grouping, and both '.' and ',' typed or pasted are read as the
// decimal sign. A pasted value that still does not parse (e.g. '1,234.5') is
// rejected by InputNumber rather than guessed.
//
// A field that must hold a number (allowEmpty false) used to turn into '0' the
// moment its last digit was deleted, with the caret left of the 0, so deleting
// '5' and typing '2' gave '20'. Here the emptied field stays empty while the
// user types; if it is left empty (blur or Enter), the last committed value is
// shown again and nothing is written, since an empty field is not a value.
import InputNumber from 'primevue/inputnumber';

export default {
    name: 'DecimalInputNumber',
    extends: InputNumber,
    props: {
        locale: {
            type: String,
            default: 'en-US',
        },
        useGrouping: {
            type: Boolean,
            default: false,
        },
    },
    methods: {
        isDecimalSign(char) {
            return char === '.' || char === ',';
        },
        insert(event, text, sign) {
            const decimalText = sign?.isDecimalSign && text === ',' ? '.' : text;
            return InputNumber.methods.insert.call(this, event, decimalText, sign);
        },
        updateValue(event, valueStr, insertedValueStr, operation) {
            if (!this.allowEmpty && valueStr != null && this.parseValue(valueStr) == null) {
                const input = this.$refs.input.$el;
                input.value = valueStr;
                input.setSelectionRange(valueStr.length, valueStr.length);
                return;
            }
            return InputNumber.methods.updateValue.call(this, event, valueStr, insertedValueStr, operation);
        },
        updateModel(event, value) {
            if (!this.allowEmpty && value == null) {
                const input = this.$refs.input.$el;
                input.value = this.formatValue(this.d_value);
                input.setAttribute('aria-valuenow', this.d_value);
                return;
            }
            return InputNumber.methods.updateModel.call(this, event, value);
        },
        parseValue(text) {
            return InputNumber.methods.parseValue.call(this, typeof text === 'string' ? text.replace(/,/g, '.') : text);
        },
    },
};
