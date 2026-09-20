// server/src/controllers/driverOnboardingController.js
const bcrypt = require("bcryptjs");
const pool = require("../db/pool");

/**
 * Verify driver onboarding token
 * GET /api/driver/onboarding/verify?token=...
 */
exports.verifyToken = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ valid: false, message: "Onboarding token is required" });
    }

    const result = await pool.query(
      `
      SELECT
        d.id,
        d.name,
        d.email,
        d.phone,
        d.vehicle_type,
        d.vehicle_plate,
        d.primary_zone_id,
        d.onboarding_status,
        d.compliance_notes,
        d.nin_number,
        d.address,
        d.emergency_contact_name,
        d.emergency_contact_phone,
        d.emergency_contact_relationship,
        d.guarantor_name,
        d.guarantor_phone,
        d.guarantor_address,
        d.license_number,
        d.bank_name,
        d.account_number,
        d.account_name,
        d.documents,
        d.invite_expires_at
      FROM drivers d
      WHERE d.invite_token = $1
      LIMIT 1
      `,
      [token.trim()]
    );

    if (!result.rows.length) {
      return res.status(404).json({ valid: false, message: "Invalid or expired onboarding invitation link." });
    }

    const driver = result.rows[0];

    if (driver.invite_expires_at && new Date(driver.invite_expires_at) < new Date()) {
      return res.status(410).json({ valid: false, message: "This onboarding invitation link has expired. Please ask dispatch to resend your invite." });
    }

    res.json({
      valid: true,
      driver,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Submit driver onboarding details & compliance documents
 * POST /api/driver/onboarding/submit
 */
exports.submitOnboarding = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      token,
      name,
      phone,
      nin_number,
      address,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      guarantor_name,
      guarantor_phone,
      guarantor_address,
      vehicle_type,
      vehicle_plate,
      license_number,
      bank_name,
      account_number,
      account_name,
      documents = {},
      password,
    } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Onboarding token is required" });
    }

    await client.query("BEGIN");

    const driverRes = await client.query(
      "SELECT id, email, phone, name, onboarding_status, invite_expires_at FROM drivers WHERE invite_token = $1",
      [token.trim()]
    );

    if (!driverRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Invalid onboarding token" });
    }

    const driver = driverRes.rows[0];

    if (driver.invite_expires_at && new Date(driver.invite_expires_at) < new Date()) {
      await client.query("ROLLBACK");
      return res.status(410).json({ message: "This onboarding link has expired. Please contact dispatch." });
    }

    // Update driver compliance fields
    const updated = await client.query(
      `
      UPDATE drivers
      SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        nin_number = $3,
        address = $4,
        emergency_contact_name = $5,
        emergency_contact_phone = $6,
        emergency_contact_relationship = $7,
        guarantor_name = $8,
        guarantor_phone = $9,
        guarantor_address = $10,
        vehicle_type = COALESCE($11, vehicle_type),
        vehicle_plate = COALESCE($12, vehicle_plate),
        license_number = $13,
        bank_name = $14,
        account_number = $15,
        account_name = $16,
        documents = $17::jsonb,
        onboarding_status = 'documents_submitted',
        notes = 'Compliance documents submitted by driver on ' || TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
        updated_at = NOW()
      WHERE id = $18
      RETURNING *
      `,
      [
        name ? name.trim() : null,
        phone ? phone.trim() : null,
        nin_number || null,
        address || null,
        emergency_contact_name || null,
        emergency_contact_phone || null,
        emergency_contact_relationship || null,
        guarantor_name || null,
        guarantor_phone || null,
        guarantor_address || null,
        vehicle_type || null,
        vehicle_plate || null,
        license_number || null,
        bank_name || null,
        account_number || null,
        account_name || null,
        JSON.stringify(documents),
        driver.id,
      ]
    );

    // If driver set or updated their PIN/password during onboarding
    if (password && password.trim()) {
      const hashedPin = await bcrypt.hash(password.trim(), 10);
      await client.query(
        `
        INSERT INTO driver_auth (driver_id, password_hash, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (driver_id)
        DO UPDATE SET password_hash = $2, updated_at = NOW()
        `,
        [driver.id, hashedPin]
      );
    }

    await client.query("COMMIT");

    res.json({
      message: "Your compliance documents and driver profile have been submitted successfully. Operations will review your documents and you will receive an approval email shortly.",
      driver: updated.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};
