const dns = require('node:dns');
const nodemailer = require('nodemailer');

// Some deployment environments resolve smtp.gmail.com to IPv6 first even
// though outbound IPv6 is unavailable. Prefer IPv4 to avoid ENETUNREACH.
dns.setDefaultResultOrder('ipv4first');

const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpPassword = (process.env.SMTP_PASSWORD || '').replace(/\s+/g, '');

let transporterPromise;

const createIPv4Transporter = async () => {
    const smtpHost = process.env.SMTP_HOST;
    if (!smtpHost || !process.env.SMTP_USER || !smtpPassword) {
        throw new Error('Missing SMTP_HOST, SMTP_USER or SMTP_PASSWORD');
    }

    const ipv4Addresses = await dns.promises.resolve4(smtpHost);
    if (!ipv4Addresses.length) {
        throw new Error(`No IPv4 address found for SMTP host ${smtpHost}`);
    }

    const ipv4Address = ipv4Addresses[0];
    console.log(`SMTP resolved ${smtpHost} to IPv4 ${ipv4Address}`);

    return nodemailer.createTransport({
        // Use the resolved IPv4 address so Nodemailer cannot select IPv6.
        host: ipv4Address,
        port: smtpPort,
        secure: smtpPort === 465,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: {
            // Keep certificate validation tied to the original SMTP hostname.
            servername: smtpHost,
        },
        auth: {
            user: process.env.SMTP_USER,
            pass: smtpPassword,
        },
    });
};

const getTransporter = () => {
    if (!transporterPromise) {
        transporterPromise = createIPv4Transporter().catch((error) => {
            transporterPromise = null;
            throw error;
        });
    }

    return transporterPromise;
};

const sendMail = async (mailOptions) => {
    const transporter = await getTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log('OTP email sent:', {
        to: mailOptions.to,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
    });
    return info;
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

const emailService = {
    sendRegistrationOTP: async (email, otp) => {
        const content = buildOTPContent(
            'SmartMushFarm account registration',
            'Thank you for registering a SmartMushFarm account.',
            otp
        );

        return sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: email,
            subject: '[SmartMushFarm] Registration OTP',
            ...content,
        });
    },

    sendForgotPasswordOTP: async (email, otp) => {
        const content = buildOTPContent(
            'SmartMushFarm password reset',
            'We received a request to reset the password for your SmartMushFarm account.',
            otp
        );

        return sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: email,
            subject: '[SmartMushFarm] Password reset OTP',
            ...content,
        });
    },

    sendChangePasswordOTP: async (email, otp) => {
        const content = buildOTPContent(
            'SmartMushFarm password change',
            'We received a request to change the password for your SmartMushFarm account.',
            otp
        );

        return sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: email,
            subject: '[SmartMushFarm] Password change OTP',
            ...content,
        });
    },

    testConnection: async () => {
        try {
            const transporter = await getTransporter();
            await transporter.verify();
            console.log('Email service connected successfully');
            return true;
        } catch (error) {
            console.error('Email service connection failed:', error);
            return false;
        }
    },
};

module.exports = emailService;
