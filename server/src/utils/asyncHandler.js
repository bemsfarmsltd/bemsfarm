// Wraps an async route handler so a thrown/rejected error is forwarded to
// the centralized errorHandler (app.use(errorHandler) in index.js) via
// next(err), instead of the route needing its own try/catch that responds
// directly and leaks raw internals in production.
//
// Usage: router.get("/x", asyncHandler(async (req, res) => { ... }))
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;