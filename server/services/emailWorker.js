const nodemailer = require('nodemailer');
const { query } = require('../config/db');
const logger = require('../utils/logger');

let transporter = null;
let intervalHandle = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    logger.warn('SMTP not configured — email queue will not be processed');
    return null;
  }
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

async function processQueue() {
  const t = getTransporter();
  if (!t) return;

  try {
    const result = await query(
      `SELECT * FROM email_queue WHERE status = 'pending' AND attempts < 3
       ORDER BY created_at ASC LIMIT 10 FOR UPDATE SKIP LOCKED`
    );
    for (const email of result.rows) {
      try {
        await query('UPDATE email_queue SET status = \'sending\', attempts = attempts + 1 WHERE id = $1', [email.id]);
        await t.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: email.recipient,
          subject: email.subject,
          text: email.body,
        });
        await query('UPDATE email_queue SET status = \'sent\', sent_at = CURRENT_TIMESTAMP WHERE id = $1', [email.id]);
      } catch (err) {
        logger.error('Email send failed', { id: email.id, error: err.message });
        await query(
          'UPDATE email_queue SET status = \'failed\', error_message = $1 WHERE id = $2',
          [err.message, email.id]
        );
      }
    }
  } catch (err) {
    logger.error('Email queue processing error', { error: err.message });
  }
}

function start(intervalMs = 10000) {
  if (intervalHandle) return;
  logger.info('Email worker started');
  processQueue();
  intervalHandle = setInterval(processQueue, intervalMs);
}

function stop() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info('Email worker stopped');
  }
}

module.exports = { start, stop, processQueue };
