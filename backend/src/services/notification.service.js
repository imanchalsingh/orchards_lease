import Notification from '../models/Notification.js';
import User from '../models/User.js';
import logger from '../config/logger.js';
import { sendBookingNotificationEmail } from './email.service.js';
import { sendSMS } from './sms.service.js';

/**
 * Create an in-app notification and trigger optional Email/SMS dispatches.
 */
export const notify = async ({
  user,
  type,
  title,
  message,
  link,
  meta = {},
  email = false,
  sms = false,
}) => {
  try {
    const doc = await Notification.create({ user, type, title, message, link, meta });

    const recipient = (email || sms)
      ? await User.findById(user).select('email phone name notificationSettings')
      : null;

    if (email && recipient?.notificationSettings?.emailBookings) {
      await sendBookingNotificationEmail(recipient, { subject: title, body: message });
    }

    if (sms && recipient?.phone) {
      await sendSMS({
        phone: recipient.phone,
        message: `[OrchardLease] ${title}: ${message}`,
      });
    }

    return doc;
  } catch (err) {
    logger.error(`Failed to create notification: ${err.message}`);
    return null;
  }
};

export const notifyMany = async (notifications = []) =>
  Promise.all(notifications.map((n) => notify(n)));

export default { notify, notifyMany };
