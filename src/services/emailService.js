const { google } = require('googleapis');
const oauth2Client = require('../config/googleAuth');

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

const requiredEnvVars = [
    'GMAIL_CLIENT_ID',
    'GMAIL_CLIENT_SECRET',
    'GMAIL_REFRESH_TOKEN',
    'GMAIL_SENDER',
];

const validateEmailConfig = () => {
    const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

    if (missingVars.length) {
        throw new Error(`Missing Gmail OAuth2 environment variables: ${missingVars.join(', ')}`);
    }
};

const encodeBase64Url = (input) => {
    return Buffer.from(input)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

const encodeMimeWord = (value) => {
    return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
};

const getAccessToken = async () => {
    validateEmailConfig();

    const accessTokenResponse = await oauth2Client.getAccessToken();
    const accessToken = accessTokenResponse && accessTokenResponse.token
        ? accessTokenResponse.token
        : accessTokenResponse;

    if (!accessToken) {
        throw new Error('Unable to get Gmail OAuth2 access token');
    }

    return accessToken;
};

const sendMail = async (mailOptions) => {
    try {
        await getAccessToken();

        const boundary = 'boundary_' + Date.now();
        const messageParts = [
            `From: ${mailOptions.from}`,
            `To: ${mailOptions.to}`,
            `Subject: ${encodeMimeWord(mailOptions.subject)}`,
            'MIME-Version: 1.0',
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            '',
            `--${boundary}`,
            'Content-Type: text/plain; charset=UTF-8',
            '',
            mailOptions.text,
            '',
            `--${boundary}`,
            'Content-Type: text/html; charset=UTF-8',
            '',
            mailOptions.html,
            '',
            `--${boundary}--`,
        ];
        const rawMessage = messageParts.join('\n');
        const encodedMessage = encodeBase64Url(rawMessage);

        const result = await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: encodedMessage },
        });

        console.log('Email sent, message ID:', result.data.id);
        return result.data;
    } catch (error) {
        console.error('Gmail API send error:', {
            message: error.message,
            code: error.code,
            status: error.status,
            response: error.response && error.response.data,
        });
        throw error;
    }
};

const buildOTPContent = (title, description, otp) => {
    const expiryMinutes = process.env.OTP_EXPIRY_MINUTES || 10;

    return {
        text: [
            title,
            '',
            description,
            '',
            `OTP: ${otp}`,
            '',
            `This OTP will expire in ${expiryMinutes} minutes.`,
            'If you did not request this code, please ignore this email.',
        ].join('\n'),
        html: `
            <h2>${title}</h2>
            <p>${description}</p>
            <p>Your OTP code is:</p>
            <h1 style="color: #007bff; letter-spacing: 5px;">${otp}</h1>
            <p>This OTP will expire in <strong>${expiryMinutes} minutes</strong>.</p>
            <p>If you did not request this code, please ignore this email.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">This is an automated email, please do not reply.</p>
        `,
    };
};

const sendOtpEmail = async (toEmail, otpCode) => {
    const content = buildOTPContent(
        'SmartMushFarm account registration',
        'Thank you for registering a SmartMushFarm account.',
        otpCode
    );

    return sendMail({
        from: process.env.GMAIL_SENDER,
        to: toEmail,
        subject: '[SmartMushFarm] Registration OTP',
        ...content,
    });
};

const sendForgotPasswordEmail = async (toEmail, otpCode) => {
    const content = buildOTPContent(
        'SmartMushFarm password reset',
        'We received a request to reset the password for your SmartMushFarm account.',
        otpCode
    );

    return sendMail({
        from: process.env.GMAIL_SENDER,
        to: toEmail,
        subject: '[SmartMushFarm] Password reset OTP',
        ...content,
    });
};

const sendChangePasswordOTP = async (toEmail, otpCode) => {
    const content = buildOTPContent(
        'SmartMushFarm password change',
        'We received a request to change the password for your SmartMushFarm account.',
        otpCode
    );

    return sendMail({
        from: process.env.GMAIL_SENDER,
        to: toEmail,
        subject: '[SmartMushFarm] Password change OTP',
        ...content,
    });
};

const testConnection = async () => {
    try {
        await getAccessToken();
        console.log('Email service OAuth2 access token fetched successfully');
        return true;
    } catch (error) {
        console.error('Gmail API connection test failed:', {
            message: error.message,
            code: error.code,
            status: error.status,
            response: error.response && error.response.data,
        });
        return false;
    }
};

module.exports = {
    sendOtpEmail,
    sendForgotPasswordEmail,
    sendRegistrationOTP: sendOtpEmail,
    sendForgotPasswordOTP: sendForgotPasswordEmail,
    sendChangePasswordOTP,
    testConnection,
};
