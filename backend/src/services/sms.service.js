import config from '../config/index.js';
import logger from '../config/logger.js';

/**
 * Core SMS Dispatcher.
 *
 * In `console` mode (default), SMS messages are logged instead of sent.
 * You can easily integrate Twilio, Fast2SMS, or AWS SNS here later.
 */
export const sendSMS = async ({ phone, message }) => {
  if (!phone) {
    logger.warn('[sms] Skipping SMS dispatch: No recipient phone number provided.');
    return { queued: false, reason: 'No phone number' };
  }

  if (config.sms?.provider === 'console' || !config.sms?.provider) {
    logger.info(`[sms:console] -> ${phone} | "${message}"`);
    return { queued: true, provider: 'console' };
  }

  // TODO: Add production carrier integration (Twilio / Fast2SMS / AWS SNS)
  logger.warn(`[sms] Provider "${config.sms.provider}" not configured — message logged`);
  return { queued: false, provider: config.sms.provider };
};

/* ----------------------- SMS Alert Helpers ----------------------- */

export const sendOtpSMS = (phone, otp) => {
  const message = `[OrchardLease] Your verification code is ${otp}. Valid for 10 minutes. Do not share this OTP with anyone.`;
  return sendSMS({ phone, message });
};

export const sendBookingAlertSMS = (phone, { gardenName, bookingId }) => {
  const message = `[OrchardLease] New lease request received for "${gardenName}". View request: ${config.clientUrl}/seller/bookings/${bookingId}`;
  return sendSMS({ phone, message });
};

export const sendLeaseApprovalSMS = (phone, { gardenName, bookingId }) => {
  const message = `[OrchardLease] Great news! Your lease request for "${gardenName}" has been APPROVED. View lease: ${config.clientUrl}/bookings/${bookingId}`;
  return sendSMS({ phone, message });
};

export const sendPaymentReminderSMS = (phone, { gardenName, amount, dueDate }) => {
  const message = `[OrchardLease] Reminder: Payment of ₹${amount} for "${gardenName}" is due on ${dueDate}. Complete payment to keep your lease active.`;
  return sendSMS({ phone, message });
};

export const sendRenewalReminderSMS = (phone, { gardenName, endDate }) => {
  const message = `[OrchardLease] Your lease for "${gardenName}" expires on ${endDate}. Request a lease renewal now to retain your orchard slot.`;
  return sendSMS({ phone, message });
};

export default {
  sendSMS,
  sendOtpSMS,
  sendBookingAlertSMS,
  sendLeaseApprovalSMS,
  sendPaymentReminderSMS,
  sendRenewalReminderSMS,
};