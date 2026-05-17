const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.message}`);
  
  // If the error has a status code, use it. Otherwise, default to 500
  const statusCode = err.statusCode || 500;
  
  // Format the response securely
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // Only send stack trace if in development mode
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = { errorHandler };
