const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:bemsfarms11223355!@db.helhpaybcjrxljizblve.supabase.co:5432/postgres'
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update delivery zones for Umuahia, Abia State, Regional, Nationwide and Worldwide delivery
    await client.query('DELETE FROM delivery_zones');

    const zones = [
      {
        zone_id: 'ZONE001',
        zone_name: 'Umuahia Urban & Metro (Home Base)',
        areas_covered: 'World Bank, Ossah Rd, Bende Rd, BCA, Isi Gate, Umuwaya, Ubakala, Amakama',
        min_order_value: 3000,
        delivery_fee: 1000,
        estimated_delivery_time: '30–60 mins',
        available_channels: 'All Channels',
        coverage_areas: JSON.stringify(['World Bank Housing', 'Ossah Road', 'Bende Road', 'BCA Area', 'Isi Gate', 'Umuwaya', 'Ubakala', 'Amakama']),
        avg_delivery_mins: 45,
        status: 'active',
        notes: 'Local immediate dispatch from Bems Farms Umuahia Hub'
      },
      {
        zone_id: 'ZONE002',
        zone_name: 'Aba Commercial Hub & Suburbs',
        areas_covered: 'Faulks Rd, Ariaria, Eziukwu, Aba Owerri Rd, Ogbor Hill, Osisioma',
        min_order_value: 5000,
        delivery_fee: 2500,
        estimated_delivery_time: '1–3 hours',
        available_channels: 'All Channels',
        coverage_areas: JSON.stringify(['Ariaria International', 'Faulks Road', 'Aba Owerri Road', 'Ogbor Hill', 'Osisioma', 'Eziukwu Market']),
        avg_delivery_mins: 90,
        status: 'active',
        notes: 'Regional express dispatch from Umuahia to Aba'
      },
      {
        zone_id: 'ZONE003',
        zone_name: 'Abia State Regional (Ohafia, Arochukwu, Isuikwuato)',
        areas_covered: 'Ohafia, Abiriba, Arochukwu, Isuikwuato, Uzuakoli, Nkporo, Bende LGA',
        min_order_value: 10000,
        delivery_fee: 3500,
        estimated_delivery_time: 'Same Day (3–5 hours)',
        available_channels: 'All Channels',
        coverage_areas: JSON.stringify(['Ohafia', 'Abiriba', 'Arochukwu', 'Isuikwuato', 'Uzuakoli', 'Nkporo', 'Bende Town']),
        avg_delivery_mins: 180,
        status: 'active',
        notes: 'Same-day inter-LGA courier across Abia State'
      },
      {
        zone_id: 'ZONE004',
        zone_name: 'Southeast & South-South Express',
        areas_covered: 'Owerri (Imo), Port Harcourt (Rivers), Enugu, Asaba (Delta), Uyo (Akwa Ibom)',
        min_order_value: 15000,
        delivery_fee: 5000,
        estimated_delivery_time: 'Next Day Dispatch',
        available_channels: 'Bulk & Retail',
        coverage_areas: JSON.stringify(['Owerri', 'Port Harcourt', 'Enugu', 'Asaba', 'Uyo', 'Ikot Ekpene', 'Onitsha', 'Calabar']),
        avg_delivery_mins: 360,
        status: 'active',
        notes: 'Direct interstate express parcel logistics'
      },
      {
        zone_id: 'ZONE005',
        zone_name: 'Nationwide Delivery (Lagos, Abuja & All States)',
        areas_covered: 'Lagos, Abuja FCT, Ibadan, Kano, Kaduna, Benin City, Jos, Warri, Nationwide',
        min_order_value: 20000,
        delivery_fee: 8000,
        estimated_delivery_time: '2–3 Business Days',
        available_channels: 'All Channels',
        coverage_areas: JSON.stringify(['Lagos State', 'Abuja FCT', 'Ibadan', 'Kano', 'Kaduna', 'Benin City', 'Jos', 'Warri', 'All 36 States']),
        avg_delivery_mins: 1440,
        status: 'active',
        notes: 'Doorstep nationwide courier with cold/dry packaging options'
      },
      {
        zone_id: 'ZONE006',
        zone_name: 'Worldwide & International Air Cargo',
        areas_covered: 'United Kingdom, United States, Canada, Europe, UAE, Ghana, Global Export',
        min_order_value: 50000,
        delivery_fee: 35000,
        estimated_delivery_time: '3–5 Business Days',
        available_channels: 'Export & Bulk',
        coverage_areas: JSON.stringify(['United Kingdom (London)', 'United States (All States)', 'Canada', 'European Union', 'United Arab Emirates (Dubai)', 'Ghana (Accra)', 'Worldwide']),
        avg_delivery_mins: 4320,
        status: 'active',
        notes: 'International certified agro-produce air cargo via DHL/FedEx Express'
      }
    ];

    for (const z of zones) {
      await client.query(`
        INSERT INTO delivery_zones 
          (zone_id, zone_name, areas_covered, min_order_value, delivery_fee, estimated_delivery_time, available_channels, coverage_areas, avg_delivery_mins, status, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      `, [
        z.zone_id, z.zone_name, z.areas_covered, z.min_order_value, z.delivery_fee,
        z.estimated_delivery_time, z.available_channels, z.coverage_areas,
        z.avg_delivery_mins, z.status, z.notes
      ]);
    }

    // 2. Clear old test drivers and insert real drivers based in Umuahia / Abia State
    await client.query('DELETE FROM driver_locations');
    await client.query('DELETE FROM driver_feedback');
    await client.query('DELETE FROM drivers');

    const drivers = [
      {
        name: 'Emeka Chukwu',
        phone: '08034567890',
        email: 'emeka.chukwu@bemsfarms.com',
        vehicle_type: 'motorcycle',
        vehicle_plate: 'ABA-104-AB',
        license_number: 'AB-884920-DL',
        primary_zone_id: 'ZONE001',
        status: 'active',
        lat: 5.5260,
        lng: 7.4920
      },
      {
        name: 'Chidi Okoro',
        phone: '08051234567',
        email: 'chidi.okoro@bemsfarms.com',
        vehicle_type: 'van',
        vehicle_plate: 'UMU-218-AA',
        license_number: 'AB-774912-DL',
        primary_zone_id: 'ZONE002',
        status: 'active',
        lat: 5.5210,
        lng: 7.4980
      },
      {
        name: 'Victor Kalu',
        phone: '08123456789',
        email: 'victor.kalu@bemsfarms.com',
        vehicle_type: 'motorcycle',
        vehicle_plate: 'UMU-550-AB',
        license_number: 'AB-339102-DL',
        primary_zone_id: 'ZONE001',
        status: 'active',
        lat: 5.5295,
        lng: 7.4890
      },
      {
        name: 'Sunday Nwosu',
        phone: '08078901234',
        email: 'sunday.nwosu@bemsfarms.com',
        vehicle_type: 'van',
        vehicle_plate: 'ABJ-441-XY',
        license_number: 'AB-992318-DL',
        primary_zone_id: 'ZONE004',
        status: 'active',
        lat: 5.5180,
        lng: 7.5020
      }
    ];

    for (const d of drivers) {
      const ins = await client.query(`
        INSERT INTO drivers 
          (name, phone, email, vehicle_type, vehicle_plate, license_number, primary_zone_id, status, total_earnings, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, NOW(), NOW())
        RETURNING id
      `, [d.name, d.phone, d.email, d.vehicle_type, d.vehicle_plate, d.license_number, d.primary_zone_id, d.status]);

      const driverId = ins.rows[0].id;

      // Insert initial GPS location around Umuahia HQ
      await client.query(`
        INSERT INTO driver_locations (driver_id, latitude, longitude, heading, speed, accuracy, recorded_at)
        VALUES ($1, $2, $3, 90.0, 15.0, 5.0, NOW())
      `, [driverId, d.lat, d.lng]);
    }

    await client.query('COMMIT');
    console.log('Delivery Zones and Drivers synced successfully!');
  } catch(e) {
    await client.query('ROLLBACK');
    console.error('Error syncing delivery data:', e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
