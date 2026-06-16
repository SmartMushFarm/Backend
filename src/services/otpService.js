// Generate random OTP code
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Calculate OTP expiry time
const getOTPExpiryTime = (minutes = 10) => {
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + minutes);
    return expiryTime;
};

// Check if OTP is expired
const isOTPExpired = (expiryTime) => {
    return new Date() > new Date(expiryTime);
};

const otpService = {
    generateOTP,
    getOTPExpiryTime,
    isOTPExpired,

    // Generate OTP for a specific type
    generateOTPData: (type = 'registration') => {
        const otp_code = generateOTP();
        const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || 10);
        const otp_expires_at = getOTPExpiryTime(expiryMinutes);

        return {
            otp_code,
            otp_expires_at,
            otp_type: type,
        };
    },

    // Verify OTP
    verifyOTP: (providedOTP, storedOTP, expiryTime) => {
        // Check if OTP matches
        if (providedOTP !== storedOTP) {
            return { valid: false, message: 'Mã OTP không chính xác' };
        }

        // Check if OTP is expired
        if (isOTPExpired(expiryTime)) {
            return { valid: false, message: 'Mã OTP đã hết hạn' };
        }

        return { valid: true, message: 'Mã OTP hợp lệ' };
    },
};

module.exports = otpService;
