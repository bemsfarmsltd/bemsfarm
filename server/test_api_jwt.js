require('dotenv').config({path: './.env'});
const jwt = require('jsonwebtoken');
const axios = require('axios');

async function test() {
  const token = jwt.sign({ id: 1, role: 'superadmin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  try {
    const res = await axios.get('http://localhost:5000/api/admin/orders?limit=1', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(JSON.stringify(res.data.orders[0], null, 2));
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
test();
