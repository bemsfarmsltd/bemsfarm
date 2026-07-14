import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const FEATURES = [
  { icon:'ri-shopping-bag-3-line',    color:'#1B4332', title:'Fast Sales & Billing',    desc:'Process orders instantly at the counter or online. Apply discounts, taxes, and complete sales in seconds.' },
  { icon:'ri-archive-stack-line',     color:'#405189', title:'Inventory Control',        desc:'Track fresh produce stock levels, manage categories, and get low-stock alerts before you run out.' },
  { icon:'ri-bar-chart-grouped-line', color:'#0ab39c', title:'Reports & Analytics',      desc:'View real-time sales, profit insights, and business performance across all channels.' },
  { icon:'ri-store-2-line',           color:'#F57C00', title:'Store Management',         desc:'Manage staff roles, permissions, and multiple farm locations from one admin panel.' },
]

const SERVICES = [
  { icon:'ri-truck-line',              color:'#405189', title:'Delivery Management',    desc:'Schedule, track, and optimise every delivery. Know where your drivers are in real time.' },
  { icon:'ri-bar-chart-3-line',        color:'#1B4332', title:'Real-Time Reports',      desc:'Track sales, revenue, and performance instantly through powerful admin dashboards.' },
  { icon:'ri-archive-stack-line',      color:'#0ab39c', title:'Inventory Management',   desc:'Batch tracking, FEFO rotation, expiry alerts, and stock adjustments built for perishables.' },
  { icon:'ri-robot-line',              color:'#299cdb', title:'Chef Bems AI',           desc:'AI-powered recipe suggestions and business insights tailored to your farm produce availability.' },
  { icon:'ri-heart-3-line',            color:'#f06548', title:'Loyalty Points',         desc:'Reward customers automatically. Build retention with points, tiers, and redemption rules.' },
  { icon:'ri-user-3-line',             color:'#F57C00', title:'Customer Management',    desc:'Full customer profiles, order history, dietary preferences, and segmented marketing lists.' },
]

const FAQS = [
  { q:'Is Bems Farms Admin suitable for a farm-to-table business?',  a:"Absolutely. It was built specifically for Bems Farms — tracking fresh produce inventory with batch/expiry management, farm-to-door deliveries, and loyalty rewards for repeat customers." },
  { q:'Can staff access only their relevant modules?',                 a:'Yes. Role-based permissions let you give superadmin, manager, cashier, or delivery driver access to exactly what they need — nothing more.' },
  { q:'How does Chef Bems AI work?',                                   a:"Chef Bems AI analyses your current inventory to suggest recipes, flag what's near expiry, and surface business insights so you can make smarter purchasing and menu decisions." },
  { q:'Is there a mobile app?',                                        a:'The admin system is fully responsive and works on tablets and phones. A dedicated mobile app is on the product roadmap.' },
  { q:'When will the backend API be ready?',                           a:'The frontend is available now in demo mode. The Node.js + Express backend is being built in parallel and will plug in seamlessly.' },
]

const NAV_LINKS = [
  { href:'#home',     label:'Home'     },
  { href:'#features', label:'Features' },
  { href:'#about-us', label:'About Us' },
  { href:'#services', label:'Services' },
  { href:'#faq',      label:'FAQ'      },
  { href:'#contact',  label:'Contact'  },
]

const WHY_LIST = [
  'Perishable inventory with FEFO rotation',
  'Delivery scheduling & driver tracking',
  'Chef Bems AI recipe & insight engine',
  'Customer loyalty points & tiers',
  'Role-based staff access control',
  'Real-time dashboards & reports',
]

export default function Landing() {
  const navigate       = useNavigate()
  const [navOpen, setNavOpen]   = useState(false)
  const [openFaq, setOpenFaq]   = useState(0)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    document.body.classList.add('sidebar-hidden')
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => {
      document.body.classList.remove('sidebar-hidden')
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div style={{ fontFamily:'Nunito, sans-serif', color:'#1f2937', overflowX:'hidden' }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:1000,
        background: scrolled ? 'rgba(17,34,51,0.97)' : 'rgba(17,34,51,0.92)',
        backdropFilter:'blur(10px)',
        boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,0.25)' : 'none',
        transition:'all 0.3s',
      }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px', display:'flex', alignItems:'center', height:68 }}>

          {/* Logo */}
          <a href="#home" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
            <div style={{ width:36, height:36, borderRadius:9, background:'#1B4332', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:13, color:'#fff' }}>BF</span>
            </div>
            <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:18, color:'#fff', letterSpacing:'-0.02em' }}>Bems Farms</span>
          </a>

          {/* Desktop nav links */}
          <ul style={{ display:'flex', alignItems:'center', gap:4, listStyle:'none', margin:'0 auto', padding:0 }}>
            {NAV_LINKS.map(n => (
              <li key={n.href}>
                <a href={n.href} style={{ padding:'8px 14px', color:'rgba(255,255,255,0.8)', textDecoration:'none', fontSize:14, fontWeight:600, borderRadius:7, transition:'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color='#fff'}
                  onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.8)'}>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Sign In button */}
          <button onClick={() => navigate('/login')} style={{ padding:'9px 22px', background:'#1B4332', color:'#fff', border:'none', borderRadius:9, fontFamily:'Nunito,sans-serif', fontWeight:700, fontSize:14, cursor:'pointer', flexShrink:0, transition:'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background='#14532d'}
            onMouseLeave={e => e.currentTarget.style.background='#1B4332'}>
            Sign In
          </button>

          {/* Hamburger (mobile) */}
          <button onClick={() => setNavOpen(o => !o)} style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', fontSize:24, display:'none', padding:6, marginLeft:12 }}
            className="lp-hamburger">
            <i className={navOpen ? 'ri-close-line' : 'ri-menu-2-line'}/>
          </button>
        </div>

        {/* Mobile nav drawer */}
        {navOpen && (
          <div style={{ background:'rgba(17,34,51,0.98)', borderTop:'1px solid rgba(255,255,255,0.08)', padding:'12px 24px 20px' }}>
            {NAV_LINKS.map(n => (
              <a key={n.href} href={n.href} onClick={() => setNavOpen(false)}
                style={{ display:'block', padding:'12px 0', color:'rgba(255,255,255,0.85)', textDecoration:'none', fontSize:15, fontWeight:600, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                {n.label}
              </a>
            ))}
            <button onClick={() => navigate('/login')} style={{ marginTop:16, width:'100%', padding:'12px', background:'#1B4332', color:'#fff', border:'none', borderRadius:9, fontFamily:'Nunito,sans-serif', fontWeight:700, fontSize:14, cursor:'pointer' }}>
              Sign In
            </button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section id="home" style={{ position:'relative', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', background:'#0d1f2d' }}>
        {/* Gradient overlay */}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, rgba(27,67,50,0.92) 0%, rgba(64,81,137,0.88) 100%)', zIndex:1 }}/>

        {/* Decorative circles */}
        <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:'rgba(255,255,255,0.03)', top:'-15%', right:'-10%', zIndex:1 }}/>
        <div style={{ position:'absolute', width:350, height:350, borderRadius:'50%', background:'rgba(255,255,255,0.04)', bottom:'5%', left:'-5%', zIndex:1 }}/>
        <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%', background:'rgba(245,124,0,0.08)', top:'20%', left:'15%', zIndex:1 }}/>

        <div style={{ position:'relative', zIndex:2, textAlign:'center', padding:'120px 24px 80px', maxWidth:900, margin:'0 auto' }}>
          <div style={{ display:'inline-block', background:'rgba(27,67,50,0.6)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:50, padding:'8px 20px', fontSize:13, fontWeight:600, color:'#86efac', marginBottom:28, backdropFilter:'blur(8px)' }}>
            🌿 Farm-to-Table Management Platform
          </div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'clamp(32px, 6vw, 60px)', color:'#fff', lineHeight:1.15, marginBottom:24, letterSpacing:'-0.02em' }}>
            Run Bems Farms Smarter —{' '}
            <span style={{ color:'#F57C00' }}>From Farm to Doorstep</span>
          </h1>
          <p style={{ fontSize:17, color:'rgba(255,255,255,0.82)', lineHeight:1.75, marginBottom:40, maxWidth:640, margin:'0 auto 40px' }}>
            Manage inventory, orders, deliveries, and loyal customers from one powerful admin system.
            Built specifically for Bems Farms' farm-to-table operations.
          </p>
          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => navigate('/login')} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 32px', background:'#1B4332', color:'#fff', border:'none', borderRadius:10, fontFamily:'Nunito,sans-serif', fontWeight:700, fontSize:15, cursor:'pointer', transition:'transform 0.2s, background 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background='#14532d'; e.currentTarget.style.transform='translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background='#1B4332'; e.currentTarget.style.transform='' }}>
              Enter Admin <i className="ri-arrow-right-line"/>
            </button>
            <a href="#features" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 32px', background:'transparent', color:'#fff', border:'1.5px solid rgba(255,255,255,0.35)', borderRadius:10, fontFamily:'Nunito,sans-serif', fontWeight:700, fontSize:15, textDecoration:'none', transition:'border-color 0.2s, background 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.7)'; e.currentTarget.style.background='rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.35)'; e.currentTarget.style.background='transparent' }}>
              Explore Features
            </a>
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{ position:'absolute', bottom:32, left:'50%', transform:'translateX(-50%)', zIndex:2, color:'rgba(255,255,255,0.4)', fontSize:12, textAlign:'center', animation:'bounce 2s infinite' }}>
          <i className="ri-arrow-down-line" style={{ fontSize:20, display:'block', marginBottom:4 }}/>
          Scroll
        </div>
      </section>

      {/* ── FEATURE CARDS (overlap hero) ── */}
      <section id="features" style={{ background:'#f8fafc', paddingBottom:80 }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:24, marginTop:-56, position:'relative', zIndex:10 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ background:'#fff', borderRadius:16, padding:28, boxShadow:'0 4px 24px rgba(0,0,0,0.10)', textAlign:'center', border:'1px solid #f3f4f6', transition:'transform 0.25s, box-shadow 0.25s', cursor:'default' }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-6px)'; e.currentTarget.style.boxShadow='0 12px 40px rgba(0,0,0,0.14)' }}
                onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 24px rgba(0,0,0,0.10)' }}>
                <div style={{ width:56, height:56, borderRadius:14, background:`${f.color}18`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}>
                  <i className={f.icon} style={{ fontSize:26, color:f.color }}/>
                </div>
                <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:16, color:'#111827', marginBottom:10 }}>{f.title}</h3>
                <p style={{ fontSize:13, color:'#6b7280', lineHeight:1.7, marginBottom:16 }}>{f.desc}</p>
                <a href="#services" style={{ fontSize:13, fontWeight:700, color:f.color, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4 }}>
                  Learn More <i className="ri-arrow-right-line"/>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about-us" style={{ background:'#fff', padding:'80px 24px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:64, alignItems:'center' }}>

            {/* Icon grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
              {[
                { icon:'ri-leaf-line',              color:'#1B4332', bg:'#dcfce7', label:'Fresh Produce' },
                { icon:'ri-truck-line',             color:'#405189', bg:'#dbeafe', label:'Deliveries'    },
                { icon:'ri-shopping-bag-3-line',    color:'#F57C00', bg:'#fff7ed', label:'Orders'        },
                { icon:'ri-robot-line',             color:'#299cdb', bg:'#e0f2fe', label:'Chef Bems AI'  },
                { icon:'ri-heart-3-line',           color:'#f06548', bg:'#fee2e2', label:'Loyalty'       },
                { icon:'ri-bar-chart-grouped-line', color:'#0ab39c', bg:'#dcfce7', label:'Analytics'     },
              ].map(({ icon, color, bg, label }) => (
                <div key={label} style={{ background:bg, borderRadius:14, padding:'20px 12px', textAlign:'center' }}>
                  <i className={icon} style={{ fontSize:30, color, display:'block', marginBottom:8 }}/>
                  <div style={{ fontSize:11, fontWeight:700, color:'#374151' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Text */}
            <div>
              <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'clamp(24px, 3vw, 38px)', color:'#111827', lineHeight:1.25, marginBottom:20 }}>
                Everything You Need to Run{' '}
                <span style={{ color:'#1B4332' }}>Bems Farms Smarter</span>
              </h2>
              <p style={{ fontSize:16, color:'#6b7280', lineHeight:1.8, marginBottom:32, paddingBottom:32, borderBottom:'1px solid #f3f4f6' }}>
                Bems Farms Admin is a complete farm-to-table management system — from fast billing at the counter
                to real-time inventory tracking, Chef Bems AI-powered insights, delivery routing, and a loyalty
                programme that keeps customers coming back for more.
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
                {[
                  { stat:'100%', desc:'Perishable-aware inventory — FEFO rotation and expiry alerts built in.' },
                  { stat:'Real-time', desc:'Live order tracking, stock levels, and delivery status in one view.' },
                ].map(s => (
                  <div key={s.stat}>
                    <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:32, color:'#1B4332', marginBottom:8 }}>{s.stat}</div>
                    <p style={{ fontSize:14, color:'#6b7280', lineHeight:1.65 }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COUNTER STRIP ── */}
      <section style={{ background:'#1B4332', padding:'56px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:24 }}>
          {[
            { icon:'ri-store-2-line',       count:'1',      label:'Central Hub'      },
            { icon:'ri-shopping-bag-3-line',count:'500+',   label:'Orders / Month'   },
            { icon:'ri-user-3-line',        count:'1,200+', label:'Loyal Customers'  },
            { icon:'ri-truck-line',         count:'95%',    label:'On-Time Delivery' },
          ].map((c, i) => (
            <div key={c.label} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:18, paddingRight: i < 3 ? 24 : 0, borderRight: i < 3 ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>
              <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <i className={c.icon} style={{ fontSize:22, color:'#fff' }}/>
              </div>
              <div>
                <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:28, color:'#fff', lineHeight:1 }}>{c.count}</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.7)', marginTop:4 }}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" style={{ background:'#f8fafc', padding:'80px 24px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          {/* Section heading */}
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16, marginBottom:12 }}>
              <div style={{ height:1, width:48, background:'#e5e7eb' }}/>
              <span style={{ fontSize:12, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.1em' }}>Our Modules</span>
              <div style={{ height:1, width:48, background:'#e5e7eb' }}/>
            </div>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'clamp(24px, 3vw, 36px)', color:'#111827' }}>
              Everything Bems Farms Needs
            </h2>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:24 }}>
            {SERVICES.map(s => (
              <div key={s.title} style={{ background:'#fff', borderRadius:16, padding:28, border:'1px solid #f3f4f6', boxShadow:'0 1px 6px rgba(0,0,0,0.06)', display:'flex', gap:18, transition:'transform 0.25s, box-shadow 0.25s' }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 8px 30px rgba(0,0,0,0.10)' }}
                onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 1px 6px rgba(0,0,0,0.06)' }}>
                <div style={{ width:48, height:48, borderRadius:12, background:`${s.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <i className={s.icon} style={{ fontSize:22, color:s.color }}/>
                </div>
                <div>
                  <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'#111827', marginBottom:8 }}>{s.title}</h3>
                  <p style={{ fontSize:13, color:'#6b7280', lineHeight:1.7, margin:0 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section id="why-us" style={{ background:'#fff', padding:'80px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ background:'#f8fafc', borderRadius:20, padding:'52px 52px', display:'grid', gridTemplateColumns:'1fr auto', gap:48, alignItems:'center' }}>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#1B4332', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>Why Choose Bems Farms Admin</div>
              <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'clamp(22px, 3vw, 34px)', color:'#111827', lineHeight:1.25, marginBottom:20 }}>
                Built for Fresh Produce —<br/>Not Generic Retail
              </h2>
              <p style={{ fontSize:15, color:'#6b7280', lineHeight:1.8, marginBottom:28, maxWidth:520 }}>
                Most POS systems ignore perishables, expiry tracking, and farm-to-door logistics.
                Bems Farms Admin was designed from the ground up for a fresh food business —
                FEFO inventory, delivery zone management, Chef AI, and loyalty all in one place.
              </p>
              <button onClick={() => navigate('/login')} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'12px 28px', background:'#1B4332', color:'#fff', border:'none', borderRadius:9, fontFamily:'Nunito,sans-serif', fontWeight:700, fontSize:14, cursor:'pointer', transition:'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background='#14532d'}
                onMouseLeave={e => e.currentTarget.style.background='#1B4332'}>
                Get Started <i className="ri-arrow-right-line"/>
              </button>
            </div>

            <div style={{ background:'#fff', borderRadius:14, padding:'24px 28px', border:'1px solid #f3f4f6', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', minWidth:280 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {WHY_LIST.map(item => (
                  <div key={item} style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:26, height:26, borderRadius:'50%', background:'#dcfce7', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <i className="ri-check-line" style={{ fontSize:13, color:'#1B4332' }}/>
                    </div>
                    <span style={{ fontSize:13, color:'#374151', fontWeight:600 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ background:'#f8fafc', padding:'80px 24px' }}>
        <div style={{ maxWidth:760, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:52 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16, marginBottom:12 }}>
              <div style={{ height:1, width:48, background:'#e5e7eb' }}/>
              <span style={{ fontSize:12, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.1em' }}>FAQ</span>
              <div style={{ height:1, width:48, background:'#e5e7eb' }}/>
            </div>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'clamp(22px, 3vw, 34px)', color:'#111827' }}>
              Frequently Asked Questions
            </h2>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {FAQS.map(({ q, a }, i) => {
              const open = openFaq === i
              return (
                <div key={i} style={{ background:'#fff', borderRadius:12, border:`1px solid ${open ? '#bbf7d0' : '#e5e7eb'}`, overflow:'hidden', transition:'border-color 0.2s' }}>
                  <button onClick={() => setOpenFaq(open ? null : i)}
                    style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'18px 22px', background:'none', border:'none', cursor:'pointer', fontFamily:'Nunito,sans-serif', textAlign:'left' }}>
                    <span style={{ fontSize:15, fontWeight:700, color:'#111827', lineHeight:1.4 }}>{q}</span>
                    <div style={{ width:28, height:28, borderRadius:'50%', background: open ? '#1B4332' : '#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.2s' }}>
                      <i className={open ? 'ri-subtract-line' : 'ri-add-line'} style={{ fontSize:14, color: open ? '#fff' : '#6b7280' }}/>
                    </div>
                  </button>
                  {open && (
                    <div style={{ padding:'0 22px 20px', fontSize:14, color:'#6b7280', lineHeight:1.8 }}>{a}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="contact" style={{ background:'linear-gradient(135deg, #1B4332 0%, #405189 100%)', padding:'80px 24px', textAlign:'center' }}>
        <div style={{ maxWidth:640, margin:'0 auto' }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'clamp(26px, 4vw, 44px)', color:'#fff', marginBottom:20, letterSpacing:'-0.01em' }}>
            Ready to Manage Bems Farms?
          </h2>
          <p style={{ fontSize:16, color:'rgba(255,255,255,0.82)', lineHeight:1.75, marginBottom:40 }}>
            Sign in to the admin portal and start managing orders, inventory, and deliveries today.
          </p>
          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => navigate('/login')} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 32px', background:'#fff', color:'#1B4332', border:'none', borderRadius:10, fontFamily:'Nunito,sans-serif', fontWeight:800, fontSize:15, cursor:'pointer', transition:'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform=''}>
              <i className="ri-login-box-line"/>Sign In to Admin
            </button>
            <a href="mailto:hello@bemsfarms.com" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 32px', background:'transparent', color:'#fff', border:'1.5px solid rgba(255,255,255,0.4)', borderRadius:10, fontFamily:'Nunito,sans-serif', fontWeight:700, fontSize:15, textDecoration:'none', transition:'border-color 0.2s, background 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.8)'; e.currentTarget.style.background='rgba(255,255,255,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.4)'; e.currentTarget.style.background='transparent' }}>
              <i className="ri-mail-line"/>Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background:'#0d1f2d', padding:'24px 32px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div style={{ display:'flex', gap:24 }}>
            {[
              { href:'#home',     label:'Home'     },
              { href:'#features', label:'Features' },
              { href:'#services', label:'Services' },
              { href:'mailto:hello@bemsfarms.com', label:'Contact' },
            ].map(n => (
              <a key={n.href} href={n.href} style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.55)', textDecoration:'none', transition:'color 0.2s' }}
                onMouseEnter={e => e.target.style.color='rgba(255,255,255,0.9)'}
                onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.55)'}>
                {n.label}
              </a>
            ))}
          </div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>
            &copy; {new Date().getFullYear()} Bems Farms. All rights reserved.
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .lp-hamburger { display: flex !important; }
          nav ul { display: none !important; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }
      `}</style>
    </div>
  )
}
