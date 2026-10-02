const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../src/db/pool');

async function updateZones() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ZONE001: Umuahia Urban & Metro (25 km)
    await client.query(`
      UPDATE delivery_zones SET
        radius_km = 25,
        center_lat = 5.5245,
        center_lng = 7.4912,
        coverage_areas = $1::jsonb
      WHERE zone_id = 'ZONE001'
    `, [JSON.stringify([
      'Umuahia', 'Umuahia Urban', 'Umuahia Metro', 'World Bank', 'World Bank Housing',
      'Ossah', 'Ossah Road', 'Bende Road', 'BCA', 'BCA Area', 'Isi Gate', 'Umuwaya',
      'Ubakala', 'Amakama'
    ])]);

    // ZONE002: Aba Commercial Hub (35 km)
    await client.query(`
      UPDATE delivery_zones SET
        radius_km = 35,
        center_lat = 5.1065,
        center_lng = 7.3667,
        coverage_areas = $1::jsonb
      WHERE zone_id = 'ZONE002'
    `, [JSON.stringify([
      'Aba', 'Aba Urban', 'Aba Commercial Hub', 'Ariaria', 'Ariaria International',
      'Faulks Road', 'Aba Owerri Road', 'Ogbor Hill', 'Osisioma', 'Eziukwu', 'Eziukwu Market'
    ])]);

    // ZONE003: Abia State Regional (110 km)
    await client.query(`
      UPDATE delivery_zones SET
        radius_km = 110,
        center_lat = 5.6200,
        center_lng = 7.6000,
        areas_covered = 'All Abia State LGAs: Ohafia, Arochukwu, Isuikwuato, Abiriba, Bende, Uzuakoli, Ukwa, Ikwuano, Isiala Ngwa',
        coverage_areas = $1::jsonb
      WHERE zone_id = 'ZONE003'
    `, [JSON.stringify([
      'Abia State', 'Abia', 'Ohafia', 'Abiriba', 'Arochukwu', 'Isuikwuato',
      'Uzuakoli', 'Nkporo', 'Bende', 'Ukwa', 'Ukwa East', 'Ukwa West',
      'Ikwuano', 'Isiala Ngwa', 'Osisioma', 'Ugwunagbo', 'Obingwa'
    ])]);

    // ZONE004: Southeast & South-South Express (350 km)
    await client.query(`
      UPDATE delivery_zones SET
        radius_km = 350,
        center_lat = 5.4850,
        center_lng = 7.0350,
        areas_covered = 'All 11 Southeast & South-South States: Imo, Rivers, Anambra, Enugu, Ebonyi, Akwa Ibom, Cross River, Bayelsa, Delta, Edo',
        coverage_areas = $1::jsonb
      WHERE zone_id = 'ZONE004'
    `, [JSON.stringify([
      'Southeast', 'South-South', 'South East', 'South South',
      'Imo State', 'Imo', 'Owerri',
      'Rivers State', 'Rivers', 'Port Harcourt',
      'Anambra State', 'Anambra', 'Awka', 'Onitsha', 'Nnewi',
      'Enugu State', 'Enugu', 'Nsukka',
      'Ebonyi State', 'Ebonyi', 'Abakaliki',
      'Akwa Ibom State', 'Akwa Ibom', 'Uyo', 'Ikot Ekpene', 'Eket',
      'Cross River State', 'Cross River', 'Calabar', 'Ikom', 'Ogoja',
      'Bayelsa State', 'Bayelsa', 'Yenagoa',
      'Delta State', 'Delta', 'Asaba', 'Warri', 'Sapele', 'Ughelli',
      'Edo State', 'Edo', 'Benin City'
    ])]);

    // ZONE005: Nationwide Delivery (750 km)
    await client.query(`
      UPDATE delivery_zones SET
        radius_km = 750,
        center_lat = 9.0820,
        center_lng = 8.6753,
        areas_covered = 'Nationwide Delivery across all other Nigerian States (Lagos, Abuja FCT, Oyo, Kano, Kaduna, Ogun, etc.)',
        coverage_areas = $1::jsonb
      WHERE zone_id = 'ZONE005'
    `, [JSON.stringify([
      'Lagos State', 'Lagos', 'Ikeja', 'Abuja FCT', 'Abuja', 'Oyo State', 'Ibadan',
      'Kano State', 'Kano', 'Kaduna State', 'Kaduna', 'Ogun State', 'Abeokuta',
      'Plateau State', 'Jos', 'Kwara State', 'Ilorin', 'Ondo State', 'Akure',
      'Osun State', 'Osogbo', 'Ekiti State', 'Ado-Ekiti', 'Benue State', 'Makurdi',
      'Kogi State', 'Lokoja', 'Niger State', 'Minna', 'Nasarawa State', 'Lafia',
      'Bauchi', 'Gombe', 'Adamawa', 'Yobe', 'Borno', 'Taraba', 'Sokoto', 'Kebbi',
      'Zamfara', 'Katsina', 'All 36 States', 'Nigeria', 'Nationwide'
    ])]);

    // ZONE006: Worldwide & International Air Cargo (null radius / global)
    await client.query(`
      UPDATE delivery_zones SET
        radius_km = NULL,
        center_lat = NULL,
        center_lng = NULL,
        areas_covered = 'Worldwide & International Air Cargo: United Kingdom, United States, Canada, Europe, UAE, Ghana, Global Export',
        coverage_areas = $1::jsonb
      WHERE zone_id = 'ZONE006'
    `, [JSON.stringify([
      'United Kingdom', 'UK', 'London', 'United States', 'USA', 'US',
      'Canada', 'European Union', 'Europe', 'United Arab Emirates', 'UAE',
      'Dubai', 'Ghana', 'Accra', 'Worldwide', 'International', 'Global Export'
    ])]);

    await client.query('COMMIT');
    console.log('✅ Successfully updated all delivery zones with accurate radii and coverage areas!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating delivery zones:', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

updateZones();
