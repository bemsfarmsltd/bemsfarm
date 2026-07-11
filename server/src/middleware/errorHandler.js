const { AppError } = require('../utils/errors');

function errorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error stack trace if it is not an operational/expected API error
  if (!err.isOperational) {
    console.error('💥 SYSTEM ERROR:', err);
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
