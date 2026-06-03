require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const emailWorker = require('./services/emailWorker');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`ERP System server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  emailWorker.start();
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection', { error: err.message, stack: err.stack });
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => process.exit(0));
});
