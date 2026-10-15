// Bems-Farms-Admin-Front-end/src/pages/deliveries/FleetCommand.jsx
import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../lib/api'
import { useRealtimeEvent } from '../../context/RealtimeContext'

function timeSince(ts) {
  if (!ts) return 'Never'
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export default function FleetCommand() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const orderParam = searchParams.get('order')

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ drivers: [], kpis: {}, zones: [], orders: [] })
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState(0)
  const [orderTab, setOrderTab] = useState('all') // 'all' | 'pending' | 'assigned' | 'in_transit' | 'completed'
  const [lastRefreshed, setLastRefreshed] = useState(Date.now())

  const loadFleetData = async () => {
    try {
      const res = await api.get('/admin/deliveries/fleet-command')
      if (res.data?.success) {
        setData(res.data)
      }
    } catch (err) {
      console.error('Failed to load fleet command data:', err)
    } finally {
      setLoading(false)
      setLastRefreshed(Date.now())
    }
  }

  useEffect(() => {
    loadFleetData()
    const timer = setInterval(loadFleetData, 8000)
    return () => clearInterval(timer)
  }, [])

  useRealtimeEvent('deliveries:updated', loadFleetData)
  useRealtimeEvent('delivery:location', loadFleetData)

  // Real database drivers & vehicles
  const vehicles = useMemo(() => {
    const rawDrivers = data?.drivers || []
    return rawDrivers.map((d) => {
      const vType = (d.vehicle_type || 'motorcycle').toLowerCase()
      let image = '/assets/fleet/fleet_moto.jpg'
      let model = 'Express Produce Motorcycle'
      let capacityKg = '65kg'

      if (vType.includes('truck')) {
        image = '/assets/fleet/fleet_truck.jpg'
        model = 'Refrigerated Produce Truck'
        capacityKg = '750kg'
      } else if (vType.includes('van') || vType.includes('car') || vType.includes('sprinter')) {
        image = '/assets/fleet/fleet_van.jpg'
        model = 'Commercial Cold-Box Vehicle'
        capacityKg = '420kg'
      }

      const hasActiveDelivery = d.delivery_id && ['assigned', 'awaiting_pickup', 'accepted', 'picked_up', 'in_transit', 'out_for_delivery', 'en_route'].includes(d.delivery_status)
      const isInTransit = ['in_transit', 'out_for_delivery', 'picked_up', 'en_route'].includes(d.delivery_status)

      let statusLabel = 'Standby / Available'
      let statusType = 'available'
      if (isInTransit) {
        statusLabel = 'In Transit'
        statusType = 'in_transit'
      } else if (hasActiveDelivery) {
        statusLabel = 'Assigned'
        statusType = 'assigned'
      } else if (d.driver_status === 'off_duty') {
        statusLabel = 'Off Duty'
        statusType = 'off_duty'
      }

      return {
        id: d.id,
        code: d.vehicle_plate || `BF-${d.vehicle_type?.slice(0, 3)?.toUpperCase() || 'VEH'}-${d.id}`,
        type: d.vehicle_type ? d.vehicle_type.toUpperCase() : 'COURIER',
        model,
        capacityKg,
        image,
        status: statusLabel,
        statusType,
        rating: Number(d.rating) || 5.0,
        completedCount: Number(d.completed_deliveries_count) || 0,
        walletBalance: Number(d.wallet_balance) || 0,
        driver: {
          id: d.id,
          name: d.name || `Courier #${d.id}`,
          phone: d.phone,
          email: d.email,
          status: d.driver_status,
        },
        location: {
          lat: d.driver_lat,
          lng: d.driver_lng,
          speed: Number(d.driver_speed) || 0,
          heading: d.driver_heading || 0,
          lastPing: d.driver_last_ping,
          isGpsLive: Boolean(d.is_gps_live),
        },
        mission: hasActiveDelivery ? {
          hasMission: true,
          order_id: d.order_ref || d.order_id,
          delivery_ref: d.delivery_ref,
          origin: 'Bems Farm Central Hub, Umuahia',
          destination: d.delivery_address || 'Customer Delivery Address',
          customer_name: d.customer_name || 'Customer',
          customer_phone: d.customer_phone,
          eta: d.eta_minutes ? `${d.eta_minutes} mins` : 'In Delivery',
          order_total: d.order_total ? Number(d.order_total) : null,
          progress: isInTransit ? 65 : 20,
        } : {
          hasMission: false,
          origin: 'Bems Farm Produce Hub, Umuahia',
          destination: 'No active delivery task assigned',
          eta: 'Standby at Hub',
          progress: 0,
        }
      }
    })
  }, [data?.drivers])

  const activeVehicle = vehicles[selectedVehicleIndex] || vehicles[0]

  // When orderParam is passed, find matching driver/order and auto-select
  useEffect(() => {
    if (!orderParam || !data?.drivers?.length) return
    const driverIdx = data.drivers.findIndex(d => 
      String(d.order_id) === String(orderParam) || 
      String(d.order_ref) === String(orderParam)
    )
    if (driverIdx >= 0) {
      setSelectedVehicleIndex(driverIdx)
    } else {
      const ord = (data.orders || []).find(o => String(o.order_id) === String(orderParam) || String(o.order_ref) === String(orderParam))
      if (ord?.driver_id) {
        const dIdx = data.drivers.findIndex(d => d.id === ord.driver_id)
        if (dIdx >= 0) setSelectedVehicleIndex(dIdx)
      }
    }
  }, [orderParam, data?.drivers, data?.orders])

  // Real orders from database
  const orders = data?.orders || []

  const filteredOrders = useMemo(() => {
    if (orderTab === 'all') return orders
    if (orderTab === 'pending') return orders.filter(o => o.status === 'pending' || !o.driver_name)
    if (orderTab === 'assigned') return orders.filter(o => o.status === 'assigned' || o.delivery_status === 'assigned')
    if (orderTab === 'in_transit') return orders.filter(o => ['in_transit', 'out_for_delivery', 'picked_up'].includes(o.status) || ['in_transit', 'out_for_delivery', 'picked_up'].includes(o.delivery_status))
    if (orderTab === 'completed') return orders.filter(o => o.status === 'delivered' || o.delivery_status === 'delivered')
    return orders
  }, [orders, orderTab])

  // Real database KPIs
  const kpis = {
    totalShipments: Number(data?.kpis?.total_shipments) || orders.length,
    activeInTransit: Number(data?.kpis?.active_in_transit) || vehicles.filter(v => v.statusType === 'in_transit').length,
    assignedPending: Number(data?.kpis?.assigned_pending) || 0,
    deliveredCount: Number(data?.kpis?.delivered_count) || orders.filter(o => o.status === 'delivered').length,
    totalRevenue: Number(data?.kpis?.total_revenue) || orders.reduce((sum, o) => sum + (o.status === 'delivered' ? Number(o.total || 0) : 0), 0),
  }

  // Real delivery zones from database
  const zones = data?.zones || []

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F3F4F6',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: '#0F172A',
      padding: '24px 32px 48px',
      boxSizing: 'border-box',
    }}>
      {/* ── Top Bar / Header ── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        {/* Brand & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: 22,
            fontWeight: 800,
            boxShadow: '0 6px 16px rgba(5, 150, 105, 0.25)',
          }}>
            🌱
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em', color: '#0F172A' }}>
                Bems Fleet Command
              </h1>
              <span style={{
                background: '#ECFDF5',
                color: '#065F46',
                border: '1px solid #A7F3D0',
                padding: '2px 8px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                REAL-TIME DATABASE STREAM
              </span>
              {orderParam && (
                <span style={{
                  background: '#FEF3C7',
                  color: '#92400E',
                  border: '1px solid #FCD34D',
                  padding: '2px 8px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}>
                  📦 Order #{orderParam}
                </span>
              )}
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>
              Live courier telemetry, active produce delivery tracking & multi-zone fleet operations
            </p>
          </div>
        </div>

        {/* Navigation Switcher Pills */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid #E2E8F0',
          padding: 4,
          borderRadius: 14,
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}>
          <Link
            to="/orders"
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              background: '#F0FDF4',
              color: '#15803D',
              border: '1px solid #BBF7D0',
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>← Back to Orders</span>
          </Link>
          <Link
            to="/deliveries/fleet"
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              background: '#0F172A',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>🎛️ Command Hub</span>
          </Link>
          <Link
            to="/deliveries/map"
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              background: 'transparent',
              color: '#475569',
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>🗺️ Live GPS Map</span>
          </Link>
          <Link
            to="/customers/messages?tab=drivers"
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              background: 'transparent',
              color: '#475569',
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>💬 Courier Chat</span>
          </Link>
          <Link
            to="/deliveries/active"
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              background: 'transparent',
              color: '#475569',
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>📦 Active Deliveries</span>
          </Link>
          <button
            type="button"
            onClick={loadFleetData}
            title="Refresh Real Fleet Telemetry"
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: 10,
              padding: '8px 12px',
              cursor: 'pointer',
              color: '#475569',
              fontWeight: 700,
              fontSize: 12,
              marginLeft: 4,
            }}
          >
            🔄
          </button>
        </div>
      </header>

      {/* If no drivers registered in the database */}
      {vehicles.length === 0 && !loading && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: 20,
          padding: 48,
          textAlign: 'center',
          color: '#64748B',
          border: '1px solid #E2E8F0',
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🛵</div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>No Couriers Registered in Fleet Yet</h3>
          <p style={{ margin: '8px 0 20px', fontSize: 13 }}>
            Add drivers in Courier Management to begin live GPS fleet tracking and produce dispatch.
          </p>
          <Link
            to="/deliveries/drivers"
            style={{
              background: '#059669',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: 10,
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: 13,
            }}
          >
            + Register New Courier
          </Link>
        </div>
      )}

      {/* ── Main Hero Section (Moveon Inspired 3-Column Visualizer with Real Data) ── */}
      {activeVehicle && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: 24,
          padding: '24px 28px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '320px 1fr 340px',
            gap: 28,
            alignItems: 'center',
          }}>
            {/* ── Left Floating Mission Card ── */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.98)',
              border: '1px solid #E2E8F0',
              borderRadius: 20,
              padding: '20px 22px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}>
              {/* Vehicle ID & Real Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
                    Vehicle Plate
                  </span>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.01em' }}>
                    {activeVehicle.code}
                  </div>
                </div>
                <span style={{
                  background: activeVehicle.statusType === 'in_transit' ? '#ECFDF5' : (activeVehicle.statusType === 'assigned' ? '#FEF3C7' : '#F1F5F9'),
                  color: activeVehicle.statusType === 'in_transit' ? '#065F46' : (activeVehicle.statusType === 'assigned' ? '#92400E' : '#475569'),
                  border: `1px solid ${activeVehicle.statusType === 'in_transit' ? '#A7F3D0' : (activeVehicle.statusType === 'assigned' ? '#FDE68A' : '#E2E8F0')}`,
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}>
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: activeVehicle.statusType === 'in_transit' ? '#10B981' : (activeVehicle.statusType === 'assigned' ? '#F59E0B' : '#94A3B8'),
                    display: 'inline-block',
                  }} />
                  {activeVehicle.status}
                </span>
              </div>

              {/* Route Timeline Slider Bar */}
              <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 14, border: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 8 }}>
                  <span>{activeVehicle.mission.hasMission ? `Task: #${activeVehicle.mission.order_id}` : 'Mission Standby'}</span>
                  <span style={{ color: activeVehicle.statusType === 'in_transit' ? '#059669' : '#64748B' }}>
                    {activeVehicle.mission.eta}
                  </span>
                </div>

                {/* Progress bar line */}
                <div style={{ position: 'relative', height: 6, background: '#E2E8F0', borderRadius: 10, margin: '8px 0' }}>
                  <div style={{
                    width: `${activeVehicle.mission.progress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
                    borderRadius: 10,
                  }} />
                  {activeVehicle.mission.hasMission && (
                    <div style={{
                      position: 'absolute',
                      top: -5,
                      left: `calc(${activeVehicle.mission.progress}% - 8px)`,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: '#0F172A',
                      border: '2px solid #FFFFFF',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 8,
                      color: '#fff',
                    }}>
                      ▶
                    </div>
                  )}
                </div>

                {/* Endpoints */}
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#64748B' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#94A3B8', flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {activeVehicle.mission.origin}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: '#0F172A' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {activeVehicle.mission.destination}
                    </span>
                  </div>
                </div>
              </div>

              {/* Courier Performance & History */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>Completed Shipments</span>
                  <span style={{ fontSize: 11, color: '#059669', fontWeight: 800 }}>
                    {activeVehicle.completedCount} Deliveries Total
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', padding: '8px 12px', borderRadius: 10 }}>
                  <span style={{ fontSize: 11, color: '#64748B' }}>Courier Rating:</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#F59E0B' }}>
                    ⭐ {activeVehicle.rating} / 5.0
                  </span>
                </div>
              </div>

              {/* Driver Profile & Action Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 14,
                borderTop: '1px solid #F1F5F9',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: '#059669',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {activeVehicle.driver.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                      {activeVehicle.driver.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>
                      {activeVehicle.type} Courier
                    </div>
                  </div>
                </div>

                {/* 1-Click Action Buttons */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {activeVehicle.driver.phone && (
                    <a
                      href={`tel:${activeVehicle.driver.phone}`}
                      title={`Call ${activeVehicle.driver.name} (${activeVehicle.driver.phone})`}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textDecoration: 'none',
                        fontSize: 13,
                      }}
                    >
                      📞
                    </a>
                  )}
                  <Link
                    to={`/customers/messages?driver=${activeVehicle.driver.id}&tab=drivers`}
                    title="Open Dispatch Chat (with Order Reference)"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      fontSize: 13,
                    }}
                  >
                    💬
                  </Link>
                </div>
              </div>
            </div>

            {/* ── Center 3D Vehicle Showcase ── */}
            <div style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 380,
            }}>
              {/* Floating Top Model Pill */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(8px)',
                border: '1px solid #E2E8F0',
                padding: '6px 14px',
                borderRadius: 30,
                fontSize: 12,
                fontWeight: 800,
                color: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
                marginBottom: 12,
                zIndex: 5,
              }}>
                <span style={{ fontSize: 14 }}>🚛</span>
                <span>{activeVehicle.model} ({activeVehicle.capacityKg})</span>
                <span style={{ color: '#059669', fontSize: 11, fontWeight: 700 }}>
                  • {activeVehicle.location.isGpsLive ? 'GPS Live Connected' : `Last ping: ${timeSince(activeVehicle.location.lastPing)}`}
                </span>
              </div>

              {/* Vehicle Graphic Container */}
              <div style={{
                width: '100%',
                maxWidth: 580,
                height: 320,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}>
                <img
                  src={activeVehicle.image}
                  alt={activeVehicle.model}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 20px 30px rgba(0, 0, 0, 0.12))',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />

                {/* Ambient ground reflection shadow */}
                <div style={{
                  position: 'absolute',
                  bottom: 10,
                  width: '85%',
                  height: 18,
                  borderRadius: '50%',
                  background: 'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.18) 0%, rgba(255, 255, 255, 0) 75%)',
                  zIndex: -1,
                }} />
              </div>

              {/* Cargo / Mission Footer */}
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#64748B',
                marginTop: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span>📦 Courier Task Status:</span>
                <strong style={{ color: '#0F172A' }}>
                  {activeVehicle.mission.hasMission ? `Active on Order #${activeVehicle.mission.order_id}` : 'Available for Next Produce Dispatch'}
                </strong>
              </div>
            </div>

            {/* ── Right Telemetry Panels (Real Database Telemetry) ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Widget 1 & 2 Row: GPS Status + Speed Gauge */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Card 1: GPS Live Telemetry Connection */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 18,
                  padding: '16px 14px',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 130,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>📍</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#065F46' }}>GPS TRACKING</span>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                      {activeVehicle.location.lat ? `${Number(activeVehicle.location.lat).toFixed(4)}, ${Number(activeVehicle.location.lng).toFixed(4)}` : 'No GPS Fix'}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: activeVehicle.location.isGpsLive ? '#059669' : '#64748B', marginTop: 2 }}>
                      {activeVehicle.location.isGpsLive ? '● Live Telemetry Signal' : `Ping: ${timeSince(activeVehicle.location.lastPing)}`}
                    </div>
                  </div>

                  <Link
                    to="/deliveries/map"
                    style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textDecoration: 'none', marginTop: 6 }}
                  >
                    View on Map →
                  </Link>
                </div>

                {/* Card 2: Recorded Speed Gauge */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 18,
                  padding: '16px 14px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 130,
                }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#0F172A' }}>Courier Speed</div>
                    <div style={{ fontSize: 9, color: '#94A3B8' }}>GPS speed sensor</div>
                  </div>

                  {/* Speed arc */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '4px 0' }}>
                    <svg width="84" height="46" viewBox="0 0 100 55">
                      <path
                        d="M 10 50 A 40 40 0 0 1 90 50"
                        fill="none"
                        stroke="#F1F5F9"
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 10 50 A 40 40 0 0 1 65 24"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div style={{ fontSize: 17, fontWeight: 900, color: '#0F172A', marginTop: -6 }}>
                      {activeVehicle.location.speed} km/h
                    </div>
                  </div>

                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textAlign: 'center' }}>
                    Heading: {activeVehicle.location.heading}°
                  </div>
                </div>
              </div>

              {/* Widget 3: Courier Wallet & Earnings */}
              <div style={{
                background: 'linear-gradient(145deg, #FFFFFF 0%, #F8FAFC 100%)',
                border: '1px solid #E2E8F0',
                borderRadius: 18,
                padding: '16px 18px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>Courier Wallet Balance</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', marginTop: 2 }}>
                      ₦{activeVehicle.walletBalance.toLocaleString()}
                    </div>
                  </div>
                  <Link
                    to="/deliveries/wallets"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: '#ECFDF5',
                      color: '#065F46',
                      textDecoration: 'none',
                    }}
                  >
                    Manage →
                  </Link>
                </div>

                <div style={{ marginTop: 10, fontSize: 11, color: '#64748B' }}>
                  Total Lifetime Completed: <strong style={{ color: '#0F172A' }}>{activeVehicle.completedCount} Deliveries</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Vehicle Carousel Selector Bar (Strictly Real Database Drivers) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.max(1, vehicles.length)}, minmax(180px, 1fr))`,
        gap: 14,
        marginBottom: 24,
      }}>
        {vehicles.map((v, idx) => {
          const isSelected = selectedVehicleIndex === idx
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelectedVehicleIndex(idx)}
              style={{
                background: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                border: isSelected ? '2px solid #0F172A' : '1px solid #E2E8F0',
                borderRadius: 16,
                padding: '12px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: isSelected ? '0 10px 25px rgba(0,0,0,0.06)' : 'none',
                transform: isSelected ? 'translateY(-2px)' : 'none',
                transition: 'all 0.18s ease',
              }}
            >
              {/* Miniature thumbnail */}
              <div style={{
                width: 52,
                height: 40,
                borderRadius: 8,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}>
                <img
                  src={v.image}
                  alt={v.code}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                    {v.code}
                  </div>
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: v.statusType === 'in_transit' ? '#10B981' : (v.statusType === 'assigned' ? '#F59E0B' : '#94A3B8'),
                  }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#059669', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {v.driver.name}
                </div>
                <div style={{ fontSize: 10, color: '#64748B' }}>
                  {v.type} ({v.status})
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Bottom Section: Real Database Delivery Zones & Orders Stream ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '360px 1fr',
        gap: 20,
      }}>
        {/* Left Card: Real Database Delivery Zones */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 20,
          padding: '20px 22px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
                  Active Coverage Zones
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>Bems Farms delivery network</div>
              </div>
              <Link
                to="/deliveries/zones"
                style={{ fontSize: 11, fontWeight: 700, color: '#059669', textDecoration: 'none' }}
              >
                Manage →
              </Link>
            </div>

            {/* List of real zones from delivery_zones table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
              {zones.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
                  No delivery zones configured yet.
                </div>
              ) : (
                zones.map((z) => (
                  <div
                    key={z.zone_id}
                    style={{
                      padding: '8px 12px',
                      background: '#F8FAFC',
                      borderRadius: 10,
                      border: '1px solid #F1F5F9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {z.zone_name}
                      </div>
                      <div style={{ fontSize: 10, color: '#64748B' }}>
                        Base Fee: ₦{Number(z.delivery_fee || 0).toLocaleString()}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 6,
                      background: Number(z.active_deliveries_count) > 0 ? '#ECFDF5' : '#F1F5F9',
                      color: Number(z.active_deliveries_count) > 0 ? '#065F46' : '#64748B',
                    }}>
                      {z.active_deliveries_count || 0} Active
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom KPI Counters */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 16,
            borderTop: '1px solid #F1F5F9',
            marginTop: 14,
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>Total Deliveries</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A' }}>
                {kpis.totalShipments}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>Delivered</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#059669' }}>
                {kpis.deliveredCount}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>Active In Transit</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#2563EB' }}>
                {kpis.activeInTransit}
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Live Orders Stream from Database */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 20,
          padding: '20px 22px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Header & Filter Tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#0F172A' }}>Store Orders Queue</span>
              <span style={{
                background: '#F1F5F9',
                color: '#475569',
                fontSize: 11,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 20,
              }}>
                {orders.length}
              </span>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: 6, background: '#F8FAFC', padding: 3, borderRadius: 10, border: '1px solid #F1F5F9' }}>
              {[
                { id: 'all', label: `All (${orders.length})` },
                { id: 'pending', label: 'Pending' },
                { id: 'assigned', label: 'Assigned' },
                { id: 'in_transit', label: 'In Transit' },
                { id: 'completed', label: 'Delivered' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setOrderTab(tab.id)}
                  style={{
                    background: orderTab === tab.id ? '#0F172A' : 'transparent',
                    color: orderTab === tab.id ? '#FFFFFF' : '#64748B',
                    border: 'none',
                    borderRadius: 8,
                    padding: '5px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table (Real Orders) */}
          <div style={{ flex: 1, overflowX: 'auto' }}>
            {filteredOrders.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>No orders in this status</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>New orders will appear here automatically as customers check out.</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: '#94A3B8', borderBottom: '1px solid #F1F5F9', fontSize: 11, fontWeight: 700 }}>
                    <th style={{ padding: '8px 10px' }}>ORDER ID</th>
                    <th style={{ padding: '8px 10px' }}>CUSTOMER</th>
                    <th style={{ padding: '8px 10px' }}>COURIER</th>
                    <th style={{ padding: '8px 10px' }}>DELIVERY DESTINATION</th>
                    <th style={{ padding: '8px 10px' }}>TOTAL</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((ord, idx) => {
                    const status = ord.delivery_status || ord.status || 'pending'
                    const isFocused = orderParam && (String(ord.order_id) === String(orderParam) || String(ord.order_ref) === String(orderParam))
                    const statusPill = {
                      delivered: { bg: '#ECFDF5', text: '#065F46' },
                      in_transit: { bg: '#EFF6FF', text: '#1E40AF' },
                      picked_up: { bg: '#F5F3FF', text: '#5B21B6' },
                      processing: { bg: '#FEF3C7', text: '#92400E' },
                      assigned: { bg: '#FEF3C7', text: '#92400E' },
                      cancelled: { bg: '#FEF2F2', text: '#991B1B' },
                      pending: { bg: '#F1F5F9', text: '#475569' },
                    }[status] || { bg: '#F1F5F9', text: '#475569' }

                    return (
                      <tr
                        key={ord.order_id || idx}
                        style={{
                          borderBottom: '1px solid #F8FAFC',
                          backgroundColor: isFocused ? '#F0FDF4' : 'transparent',
                          borderLeft: isFocused ? '3px solid #16A34A' : 'none',
                          transition: 'background 0.1s ease',
                        }}
                        onMouseEnter={(e) => { if (!isFocused) e.currentTarget.style.backgroundColor = '#F8FAFC' }}
                        onMouseLeave={(e) => { if (!isFocused) e.currentTarget.style.backgroundColor = 'transparent' }}
                      >
                        <td style={{ padding: '12px 10px', fontWeight: 800, color: '#0F172A' }}>
                          <Link to={`/orders?search=${ord.order_ref || ord.order_id}`} style={{ color: '#0F172A', textDecoration: 'none' }}>
                            #{ord.order_ref || ord.order_id}
                          </Link>
                          {isFocused && (
                            <span style={{ marginLeft: 6, fontSize: 10, background: '#DCFCE7', color: '#166534', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                              Selected
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{ord.customer_name || 'Customer'}</div>
                          {ord.customer_phone && <div style={{ fontSize: 10, color: '#94A3B8' }}>{ord.customer_phone}</div>}
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          {ord.driver_name ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                              <span style={{ fontWeight: 600, color: '#0F172A' }}>{ord.driver_name}</span>
                            </div>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>Unassigned</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 10px', color: '#0F172A', fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ord.delivery_address}
                        </td>
                        <td style={{ padding: '12px 10px', fontWeight: 800, color: '#16A34A' }}>
                          ₦{Number(ord.total || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: statusPill.bg,
                            color: statusPill.text,
                            textTransform: 'uppercase',
                          }}>
                            {status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
