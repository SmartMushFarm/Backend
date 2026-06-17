const crypto = require('crypto');

function signPaymentRequest({ amount, cancelUrl, description, orderCode, returnUrl }) {
    const raw = [
        `amount=${amount}`,
        `cancelUrl=${cancelUrl}`,
        `description=${description}`,
        `orderCode=${orderCode}`,
        `returnUrl=${returnUrl}`,
    ].join('&');

    return crypto
        .createHmac('sha256', process.env.PAYOS_CHECKSUM_KEY)
        .update(raw)
        .digest('hex');
}

function sortObjDataByKey(object) {
    return Object.keys(object)
        .sort()
        .reduce((obj, key) => { obj[key] = object[key]; return obj; }, {});
}

function convertObjToQueryStr(object) {
    return Object.keys(object)
        .filter((key) => object[key] !== undefined)
        .map((key) => {
            let value = object[key];
            if (value && Array.isArray(value)) {
                value = JSON.stringify(value.map((item) => sortObjDataByKey(item)));
            }
            if ([null, undefined, 'undefined', 'null'].includes(value)) value = '';
            return `${key}=${value}`;
        })
        .join('&');
}

function verifyWebhookSignature(data, signature) {
    if (!data || !signature || !process.env.PAYOS_CHECKSUM_KEY) return false;
    const sortedData = sortObjDataByKey(data);
    const queryString = convertObjToQueryStr(sortedData);
    const expected = crypto
        .createHmac('sha256', process.env.PAYOS_CHECKSUM_KEY)
        .update(queryString)
        .digest('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
    } catch {
        return false;
    }
}

module.exports = { signPaymentRequest, verifyWebhookSignature };
