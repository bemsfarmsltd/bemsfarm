const { z } = require("zod");

// No DB constraint on customers.status, but active/inactive is the fixed
// set the admin UI (CustomersList.jsx's toggle) actually understands.
const updateStatus = z.object({
  status: z.enum(["active", "inactive"], {
    error: "status must be active or inactive",
  }),
});

module.exports = { updateStatus };
