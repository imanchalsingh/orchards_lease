import config from '../config/index.js';
import logger from '../config/logger.js';

/**
 * Email service implementation.
 *
 * In `console` mode (default) emails are logged instead of sent.
 * Swap the `send` implementation for Nodemailer / SES / SendGrid later;
 * call sites stay unchanged.
 */
const send = async ({ to, subject, html, text }) => {
  if (config.email?.provider === 'console' || !config.email?.provider) {
    logger.info(`[email:placeholder] -> ${to} | ${subject}`);
    logger.debug(`[email:body] ${text || html}`);
    return { queued: true, provider: 'console' };
  }

  // TODO: wire real transport (Nodemailer/SES/SendGrid) using config.email.smtp
  logger.warn(`[email] provider "${config.email.provider}" not implemented — message logged`);
  return { queued: false, provider: config.email.provider };
};

/* ----------------------- Auth Email Helpers ----------------------- */

export const sendWelcomeEmail = (user) =>
  send({
    to: user.email,
    subject: 'Welcome to OrchardLease 🌳',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
        <h2 style="color: #2f5d3a;">Welcome to OrchardLease, ${user.name}! 🌳</h2>
        <p>Thank you for joining our community. You can now explore, list, and lease premium fruit orchards nationwide.</p>
        <a href="${config.clientUrl}/explore" style="display: inline-block; background-color: #2f5d3a; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">Explore Orchards</a>
      </div>
    `,
    text: `Hi ${user.name}, welcome to OrchardLease! Start exploring orchards now at ${config.clientUrl}/explore`,
  });

export const sendVerificationEmail = (user, token) => {
  const url = `${config.clientUrl}/verify-email?token=${token}`;
  return send({
    to: user.email,
    subject: 'Verify your OrchardLease email',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0;">
        <h2 style="color: #2f5d3a;">Verify Your Account</h2>
        <p>Hi ${user.name}, please click the button below to verify your email address:</p>
        <a href="${url}" style="display: inline-block; background-color: #2f5d3a; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Verify Email</a>
        <p style="margin-top: 15px; font-size: 12px; color: #64748b;">Or copy this link: ${url}</p>
      </div>
    `,
    text: `Hi ${user.name}, verify your email by visiting: ${url}`,
  });
};

export const sendPasswordResetEmail = (user, token) => {
  const url = `${config.clientUrl}/reset-password?token=${token}`;
  return send({
    to: user.email,
    subject: 'Reset your OrchardLease password',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0;">
        <h2 style="color: #2f5d3a;">Password Reset Request</h2>
        <p>Hi ${user.name}, you requested a password reset. Click the button below to set a new password:</p>
        <a href="${url}" style="display: inline-block; background-color: #a05a45; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reset Password</a>
        <p style="margin-top: 15px; font-size: 12px; color: #64748b;">Link valid for ${config.jwt?.passwordResetExpiresIn || '1 hour'}. Copy link: ${url}</p>
      </div>
    `,
    text: `Reset your password using this link: ${url}`,
  });
};

/* --------------------- Booking & Lease Emails --------------------- */

export const sendBookingConfirmationEmail = (user, bookingDetails) => {
  return send({
    to: user.email,
    subject: `Booking Request Submitted — ${bookingDetails.gardenName || 'Orchard Lease'}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0;">
        <h2 style="color: #2f5d3a;">Booking Request Received 🧺</h2>
        <p>Hi ${user.name}, your lease request for <strong>${bookingDetails.gardenName}</strong> has been sent to the owner.</p>
        <p><strong>Total Amount:</strong> ₹${bookingDetails.amount}</p>
        <a href="${config.clientUrl}/bookings/${bookingDetails.id}" style="display: inline-block; background-color: #2f5d3a; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">View Booking Details</a>
      </div>
    `,
    text: `Hi ${user.name}, your lease request for ${bookingDetails.gardenName} has been submitted. Check details at ${config.clientUrl}/bookings/${bookingDetails.id}`,
  });
};

export const sendLeaseApprovalEmail = (user, bookingDetails) => {
  return send({
    to: user.email,
    subject: `Lease Request Approved! 🎉 — ${bookingDetails.gardenName || 'Orchard'}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0;">
        <h2 style="color: #2f5d3a;">Your Lease is Approved! 🎉</h2>
        <p>Great news, ${user.name}! The orchard owner has approved your lease request for <strong>${bookingDetails.gardenName}</strong>.</p>
        <a href="${config.clientUrl}/bookings/${bookingDetails.id}" style="display: inline-block; background-color: #2f5d3a; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">View Lease Agreement</a>
      </div>
    `,
    text: `Hi ${user.name}, your lease for ${bookingDetails.gardenName} was approved! View it here: ${config.clientUrl}/bookings/${bookingDetails.id}`,
  });
};

export const sendLeaseRejectionEmail = (user, bookingDetails) => {
  return send({
    to: user.email,
    subject: `Lease Request Update — ${bookingDetails.gardenName || 'Orchard'}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0;">
        <h2 style="color: #a05a45;">Lease Request Update</h2>
        <p>Hi ${user.name}, your lease request for <strong>${bookingDetails.gardenName}</strong> could not be accepted at this time.</p>
        ${bookingDetails.reason ? `<p><strong>Reason provided:</strong> ${bookingDetails.reason}</p>` : ''}
        <a href="${config.clientUrl}/explore" style="display: inline-block; background-color: #2f5d3a; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">Browse Other Orchards</a>
      </div>
    `,
    text: `Hi ${user.name}, your lease request for ${bookingDetails.gardenName} was declined. Reason: ${bookingDetails.reason || 'N/A'}`,
  });
};

export const sendPaymentConfirmationEmail = (user, paymentDetails) => {
  return send({
    to: user.email,
    subject: `Payment Confirmed — Receipt #${paymentDetails.receiptId || paymentDetails.id}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0;">
        <h2 style="color: #2f5d3a;">Payment Successful 💳</h2>
        <p>Hi ${user.name}, we received your payment of <strong>₹${paymentDetails.amount}</strong> for <strong>${paymentDetails.gardenName}</strong>.</p>
        <p style="font-size: 13px; color: #64748b;">Transaction ID: ${paymentDetails.transactionId || paymentDetails.id}</p>
      </div>
    `,
    text: `Hi ${user.name}, payment of ₹${paymentDetails.amount} for ${paymentDetails.gardenName} received successfully. Transaction ID: ${paymentDetails.transactionId || paymentDetails.id}`,
  });
};

export const sendBookingNotificationEmail = (user, { subject, body }) =>
  send({
    to: user.email,
    subject,
    html: `<div style="font-family: sans-serif; padding: 20px;"><p>${body}</p></div>`,
    text: body,
  });

export default {
  send,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendBookingConfirmationEmail,
  sendLeaseApprovalEmail,
  sendLeaseRejectionEmail,
  sendPaymentConfirmationEmail,
  sendBookingNotificationEmail,
};
