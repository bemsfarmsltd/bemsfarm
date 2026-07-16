const fs = require('fs');

const file = 'c:\\Users\\Dell\\Desktop\\Bemsfarm\\bemsfarm\\Bems-Farms-Admin-Front-end\\src\\pages\\deliveries\\DeliveryMap.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Import api
content = content.replace("import { useState, useEffect } from 'react'", "import { useState, useEffect } from 'react'\nimport api from '../../lib/api'");

// 2. Remove DELIVERIES const block entirely
const regexDeliveries = /const DELIVERIES = \[\s*\{[\s\S]*?\s*\]\s*\n/;
content = content.replace(regexDeliveries, '');

// 3. Inside the component, add dbDeliveries state and useEffect to fetch
const componentStart = "export default function DeliveryMap() {\n";
const stateCode = `  const [dbDeliveries, setDbDeliveries] = useState([])\n
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/admin/deliveries/active')
        const items = res.data.deliveries || []
        const colors = ['#3b82f6', '#06b6d4', '#f97316', '#8b5cf6', '#10b981']
        const mapped = items.map((d, i) => {
          const latJitter = (i * 0.015) % 0.05
          const lngJitter = (i * 0.02) % 0.05
          const driverPos = [6.4553 + latJitter, 3.3862 + lngJitter]
          const customerPos = [6.5000 + latJitter, 3.3500 + lngJitter]
          let st = d.status
          if (st === 'out_for_delivery') st = 'shipped'
          let itemsStr = 'Various Items'
          if (Array.isArray(d.items)) {
            itemsStr = d.items.map(it => it.name + ' x' + it.qty).join(', ')
          }
          return {
            id: d.delivery_ref || d.id, orderId: 'ORD-' + d.order_id, status: st,
            driver: { name: d.driver_name || 'Unassigned', phone: d.driver_phone || '--', bike: d.driver_plate || '--', color: colors[i % colors.length] },
            customer: { name: d.customer_name || 'Customer', phone: d.customer_phone || '--', address: d.delivery_address || 'Address not provided' },
            driverPos, customerPos, zone: d.zone || 'Local', eta: d.eta_minutes ? '~' + d.eta_minutes + ' min' : '—',
            total: d.order_total || 0, attempts: d.attempts || 0, items: itemsStr
          }
        })
        setDbDeliveries(mapped)
      } catch(e) {}
    }
    load()
  }, [])\n\n`;

content = content.replace(componentStart, componentStart + stateCode);

// 4. Change map target from DELIVERIES to dbDeliveries
content = content.replace("const deliveries = DELIVERIES.map(d => {", "const deliveries = dbDeliveries.map(d => {");

fs.writeFileSync(file, content, 'utf8');
console.log("Updated DeliveryMap.jsx");
