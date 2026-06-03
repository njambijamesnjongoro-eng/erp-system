const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const levels = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };

class Logger {
  constructor(level = 'DEBUG') {
    this.level = levels[level] !== undefined ? levels[level] : levels.DEBUG;
    this.logFile = path.join(logDir, `app-${new Date().toISOString().slice(0, 10)}.log`);
  }

  _format(level, message, meta) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}\n`;
  }

  _write(level, message, meta) {
    if (levels[level] > this.level) return;
    const entry = this._format(level, message, meta);
    if (process.env.NODE_ENV !== 'test') {
      console.log(entry.trim());
    }
    fs.appendFile(this.logFile, entry, (err) => {
      if (err) console.error('Failed to write log:', err.message);
    });
  }

  error(message, meta) { this._write('ERROR', message, meta); }
  warn(message, meta) { this._write('WARN', message, meta); }
  info(message, meta) { this._write('INFO', message, meta); }
  debug(message, meta) { this._write('DEBUG', message, meta); }
}

module.exports = new Logger(process.env.LOG_LEVEL || 'DEBUG');
