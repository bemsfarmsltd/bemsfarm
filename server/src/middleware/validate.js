// Validates req.body against a Zod schema before the route handler runs.
// On success, req.body is replaced with the parsed/coerced data (so
// handlers can trust types — e.g. a numeric string becomes a real number).
// On failure, responds 400 with a readable message instead of letting a
// garbage value reach a parseFloat/parseInt or a SQL parameter.
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
        .join("; ");
      return res.status(400).json({ message });
    }
    req.body = result.data;
    next();
  };
}

module.exports = validate;