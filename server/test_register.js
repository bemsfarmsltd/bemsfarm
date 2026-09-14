const axios = require('axios');
require("dotenv").config();

async function testRegister() {
  try {
    const payload = {
      name: "Test User",
      email: "test.fail.reg." + Date.now() + "@example.com",
      password: "Password123!",
      phone: "+2348012345678",
      address: "123 Test St",
      city: "Lagos",
      state: "Lagos",
      latitude: 6.5244,
      longitude: 3.3792
    };
    const res = await axios.post('http://localhost:5000/api/auth/register', payload);
    console.log("Success:", res.data);
  } catch (err) {
    console.error("Failed:", err.response ? err.response.data : err.message);
  }
}

testRegister();
