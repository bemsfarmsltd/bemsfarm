const { AppError } = require('../utils/errors');
const { notifyAdmin } = require('../services/notificationService');

function errorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error stack trace if it is not an operational/expected API error
  if (!err.isOperational && err.statusCode >= 500) {
    console.error('💥 SYSTEM ERROR:', err);
    notifyAdmin({
      type: 'system_error',
      title: `🔴 Server Exception [${err.statusCode}]: ${req.method} ${req.originalUrl || req.path}`,
      message: `An unhandled error occurred: ${err.message || 'Unknown internal error'}. Path: ${req.method} ${req.originalUrl || req.path}`,
      severity: 'critical',
      link: '/god-eye',
      data: {
        error: err.message,
        method: req.method,
        path: req.originalUrl || req.path,
        ip: req.ip,
      },
      actor: req.user ? { id: req.user.id, name: req.user.name || req.user.email, role: req.user.role } : null,
    }).catch(() => {});
  } else {
    console.warn(`⚠️ API Warning [${err.statusCode}]: ${err.message}`);
  }

  if (process.env.NODE_ENV === 'production') {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }

    // Programming or other unknown error: don't leak details to client
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong on the server.',
    });
  }

  // Development details
  return res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack,
    error: err,
  });
}

module.exports = errorHandler;

