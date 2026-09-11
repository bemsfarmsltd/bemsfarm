import { useState } from 'react'

const AVATAR_COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316','#06b6d4']
const ini = n => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const fmtTime = s => s

const CONVOS = [
  {
    id: 'CHB-001', customer: 'Amara Obi', phone: '0801 234 5678', zone: 'Lekki Phase 1',
    status: 'resolved', aiStatus: 'success', time: '10:24 AM', date: 'Today',
    tags: ['lactose-intolerant'], responseTime: '1.2s',
    messages: [
      { role: 'customer', text: 'I am lactose intolerant. What dishes can I safely order from Bems Farms?', time: '10:22 AM' },
      { role: 'ai', text: 'Based on your dietary profile, here are great options for you:\n\n• Jollof Rice with Grilled Chicken (no butter sauce)\n• Vegetable Stir-fry (cooked in olive oil)\n• Egusi Soup with Pounded Yam (dairy-free)\n• Grilled Tilapia with Garden Salad\n\nAll of these are completely dairy-free. I\'ve flagged your account so our kitchen always prepares your orders without any dairy products. 🌿', time: '10:24 AM' },
    ]
  },
  {
    id: 'CHB-002', customer: 'Tunde Adeyemi', phone: '0802 345 6789', zone: 'Ikeja GRA',
    status: 'resolved', aiStatus: 'success', time: '9:48 AM', date: 'Today',
    tags: ['diabetic', 'low-carb'], responseTime: '0.9s',
    messages: [
      { role: 'customer', text: 'Do you have low-carb options? I have Type 2 diabetes and need to watch my sugar and carb intake.', time: '9:45 AM' },
      { role: 'ai', text: 'Absolutely! Here are our best diabetic-friendly, low-carb options:\n\n🥗 Low Glycemic Picks:\n• Grilled Tilapia with Garden Salad\n• Vegetable Pepper Soup\n• Ofada Rice (small portion) — it has a lower GI than regular rice\n• Moi Moi (steamed, no excess oil)\n\n⚠️ Please avoid: Fried Plantain, White Jollof Rice (large portions), and sweetened drinks.\n\nI can also set up a weekly meal plan tailored to your glycemic needs. Would you like that?', time: '9:48 AM' },
    ]
  },
  {
    id: 'CHB-003', customer: 'Kemi Balogun', phone: '0803 456 7890', zone: 'Surulere',
    status: 'pending', aiStatus: 'failed', time: '11:02 AM', date: 'Today',
    tags: ['vegetarian'], responseTime: null,
    messages: [
      { role: 'customer', text: 'I want a vegetarian meal plan for the entire week. I don\'t eat any meat or fish. Can you help?', time: '11:02 AM' },
      { role: 'system', text: 'n8n workflow did not return a response. No dietary rule matched "weekly meal plan" intent.', time: '11:02 AM' },
    ]
  },
  {
    id: 'CHB-004', customer: 'Chidi Okonkwo', phone: '0804 567 8901', zone: 'Victoria Island',
    status: 'escalated', aiStatus: 'escalated', time: '8:30 AM', date: 'Today',
    tags: ['nut-allergy', 'complaint'], responseTime: '1.5s',
    messages: [
      { role: 'customer', text: 'I have a severe peanut allergy. I ordered the Groundnut Soup yesterday and the packaging said no nuts but I had a reaction. This is very serious.', time: '8:28 AM' },
      { role: 'ai', text: 'I\'m very sorry to hear this happened. Your safety is our highest priority. I\'ve immediately flagged your account as a severe nut allergy case and escalated this to our kitchen manager and quality control team. A member of our team will contact you within the next 30 minutes.\n\nFor future orders, your account is now marked with a RED allergy alert that is visible to all kitchen staff before preparation begins.', time: '8:30 AM' },
      { role: 'customer', text: 'Okay, I hope someone calls soon. I am not happy at all.', time: '8:45 AM' },
      { role: 'system', text: 'AI flagged for human escalation. Reason: Safety complaint — allergen cross-contamination.', time: '8:30 AM' },
    ]
  },
  {
    id: 'CHB-005', customer: 'Ngozi Eze', phone: '0805 678 9012', zone: 'Gbagada',
    status: 'resolved', aiStatus: 'success', time: '7:55 AM', date: 'Today',
    tags: ['halal'], responseTime: '0.7s',
    messages: [
      { role: 'customer', text: 'Are all your meat products halal certified?', time: '7:52 AM' },
      { role: 'ai', text: 'Yes! All our meat products at Bems Farms are sourced from halal-certified suppliers. Our Chicken, Beef, and Goat Meat are all halal slaughtered and certified.\n\n✅ Halal Certified Items:\n• All chicken dishes\n• Beef stew and pepper soup\n• Goat meat pepper soup\n• Suya (beef)\n\nYou can filter by "Halal" on the app to see the full list. Is there anything specific you\'d like to order today?', time: '7:55 AM' },
    ]
  },
  {
    id: 'CHB-006', customer: 'Emeka Okafor', phone: '0806 789 0123', zone: 'Lekki Phase 2',
    status: 'resolved', aiStatus: 'success', time: '2:14 PM', date: 'Yesterday',
    tags: ['vegan'], responseTime: '1.1s',
    messages: [
      { role: 'customer', text: 'I just went fully vegan last month. Can Chef Bems help me find suitable options? No meat, no dairy, no eggs.', time: '2:10 PM' },
      { role: 'ai', text: 'Welcome to the plant-based life! 🌱 Bems Farms has great vegan-friendly options:\n\n🌿 Vegan Menu Picks:\n• Vegetable Jollof Rice (cooked without butter or stock cubes with animal fat)\n• Mixed Vegetable Stir-fry\n• Beans Porridge (Ewa Agoyin) — request no palm oil if preferred\n• Okra Soup with vegetables only\n• Fresh Fruit Salad\n\nI\'ve updated your profile to "Vegan" — your order page will now show a filtered vegan menu automatically. Enjoy! 🥬', time: '2:14 PM' },
    ]
  },
  {
    id: 'CHB-007', customer: 'Bisi Adeyinka', phone: '0807 890 1234', zone: 'Ajah',
    status: 'pending', aiStatus: 'low-confidence', time: '1:30 PM', date: 'Yesterday',
    tags: ['gluten-free'], responseTime: '2.1s',
    messages: [
      { role: 'customer', text: 'My doctor says I have celiac disease and I need to avoid all gluten. Does Bems Farms have gluten-free meals?', time: '1:30 PM' },
      { role: 'ai', text: 'We have some options that may be suitable, however I\'m not fully certain about cross-contamination in our kitchen. I recommend speaking with our team directly for celiac-grade assurance.', time: '1:32 PM' },
      { role: 'system', text: 'Low confidence response (61%). Consider reviewing — celiac is a medical-grade requirement.', time: '1:32 PM' },
    ]
  },
  {
    id: 'CHB-008', customer: 'Funke Adesola', phone: '0808 901 2345', zone: 'Ikorodu',
    status: 'resolved', aiStatus: 'success', time: '11:45 AM', date: 'Yesterday',
    tags: ['pregnancy'], responseTime: '1.3s',
    messages: [
      { role: 'customer', text: 'I am 6 months pregnant. What foods should I avoid from your menu and what\'s best for me and my baby?', time: '11:40 AM' },
      { role: 'ai', text: 'Congratulations! 🎉 Here\'s your safe and nourishing guide from Chef Bems:\n\n✅ Best choices during pregnancy:\n• Egusi Soup with Pounded Yam (iron & folate rich)\n• Grilled Tilapia (omega-3, fully cooked)\n• Vegetable Stir-fry (vitamins & minerals)\n• Moi Moi (protein-rich, easy to digest)\n\n⚠️ Avoid:\n• Suya (risk of undercooked meat)\n• Raw Salads (bacteria risk)\n• Excess salt in soups\n\nI\'ve added a "Pregnancy-Safe" filter to your account. Stay healthy! 💚', time: '11:45 AM' },
    ]
  },
  {
    id: 'CHB-009', customer: 'Seun Oladele', phone: '0809 012 3456', zone: 'Maryland',
    status: 'resolved', aiStatus: 'success', time: '9:00 AM', date: '26 Jun 2026',
    tags: ['high-protein'], responseTime: '0.8s',
    messages: [
      { role: 'customer', text: 'I am a bodybuilder and need high protein meals. What do you recommend for post-workout?', time: '8:57 AM' },
      { role: 'ai', text: 'Let\'s fuel those gains! 💪 Here are our highest protein options:\n\n🥩 Top Protein Picks:\n• Grilled Chicken Breast (35g protein)\n• Grilled Tilapia (28g protein)\n• Moi Moi with Eggs (22g protein)\n• Beans Porridge (18g plant protein)\n• Beef Pepper Soup (30g protein)\n\nPost-workout tip: Pair grilled chicken with brown rice or Ofada rice for optimal recovery. I can also set up a high-protein weekly meal plan — want me to?', time: '9:00 AM' },
    ]
  },
  {
    id: 'CHB-010', customer: 'Adaeze Nwosu', phone: '0810 123 4567', zone: 'Festac',
    status: 'pending', aiStatus: 'failed', time: '3:22 PM', date: '26 Jun 2026',
    tags: ['hypertension'], responseTime: null,
    messages: [
      { role: 'customer', text: 'I have high blood pressure. My nutritionist said I need to cut down on salt and processed foods. What can I eat from your menu safely?', time: '3:22 PM' },
      { role: 'system', text: 'n8n workflow timed out. No dietary rule for "hypertension" or "low sodium" found. Rule may need to be added.', time: '3:22 PM' },
    ]
  },
  {
    id: 'CHB-011', customer: 'Yusuf Ibrahim', phone: '0811 234 5678', zone: 'Yaba',
    status: 'resolved', aiStatus: 'success', time: '10:00 AM', date: '25 Jun 2026',
    tags: ['halal', 'diabetic'], responseTime: '1.4s',
    messages: [
      { role: 'customer', text: 'I need halal food that is also suitable for a diabetic diet. Any suggestions?', time: '9:58 AM' },
      { role: 'ai', text: 'We can handle both! Here are halal AND diabetic-friendly options:\n\n✅ Perfect Picks:\n• Grilled Chicken (halal certified, no sauce)\n• Vegetable Pepper Soup (halal, low GI)\n• Ofada Rice with Stew (small portion, halal)\n• Moi Moi (halal, low glycemic)\n• Catfish Pepper Soup (halal, high protein, low carb)\n\nYour profile has been updated with both filters. All orders will automatically exclude both high-carb items and non-halal products.', time: '10:00 AM' },
    ]
  },
  {
    id: 'CHB-012', customer: 'Chiamaka Obiora', phone: '0812 345 6789', zone: 'Oniru',
    status: 'resolved', aiStatus: 'success', time: '5:10 PM', date: '24 Jun 2026',
    tags: ['child', 'allergy'], responseTime: '1.0s',
    messages: [
      { role: 'customer', text: 'I am ordering for my 4-year-old son. He has an egg allergy and I want to make sure what I order is safe.', time: '5:07 PM' },
      { role: 'ai', text: 'Of course! Here are safe options for your little one:\n\n👶 Kid-safe, Egg-free Options:\n• Jollof Rice with Grilled Chicken\n• Vegetable Soup with Semo\n• Beans Porridge (smooth, easy to eat)\n• Fruit Salad (no cream)\n• Mashed Yam with Stew (egg-free)\n\nI\'ve flagged "egg allergy" on your account. Our kitchen will ensure no egg-containing products are used in your child\'s preparation. Thank you for letting us know! 💛', time: '5:10 PM' },
    ]
  },
]

const STATUS_CFG = {
  resolved:       { bg: '#dcfce7', color: '#15803d', label: 'Resolved',        icon: 'ri-checkbox-circle-line' },
  pending:        { bg: '#fef3c7', color: '#b45309', label: 'Pending',          icon: 'ri-time-line' },
  escalated:      { bg: '#fee2e2', color: '#dc2626', label: 'Escalated',        icon: 'ri-alarm-warning-line' },
}

const AI_STATUS_CFG = {
  success:        { bg: '#dcfce7', color: '#15803d', label: 'AI Responded',     icon: 'ri-robot-line' },
  failed:         { bg: '#fee2e2', color: '#dc2626', label: 'AI Failed',         icon: 'ri-close-circle-line' },
  escalated:      { bg: '#fef3c7', color: '#b45309', label: 'AI Escalated',     icon: 'ri-alarm-warning-line' },
  'low-confidence': { bg: '#fce7f3', color: '#9d174d', label: 'Low Confidence', icon: 'ri-error-warning-line' },
}

const TAG_COLORS = {
  'lactose-intolerant': ['#ede9fe','#5b21b6'], 'diabetic': ['#fce7f3','#9d174d'],
  'low-carb': ['#ecfdf5','#065f46'], 'vegetarian': ['#d1fae5','#065f46'],
  'nut-allergy': ['#fee2e2','#991b1b'], 'halal': ['#dbeafe','#1e40af'],
  'vegan': ['#dcfce7','#14532d'], 'gluten-free': ['#fef9c3','#713f12'],
  'pregnancy': ['#fce7f3','#9d174d'], 'high-protein': ['#ede9fe','#4c1d95'],
  'hypertension': ['#fee2e2','#991b1b'], 'allergy': ['#fee2e2','#991b1b'],
  'child': ['#dbeafe','#1e40af'], 'complaint': ['#fee2e2','#991b1b'],
}

export default function Conversations() {
  const [selected, setSelected]   = useState(CONVOS[0])
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('all')
  const [convos, setConvos]       = useState(CONVOS)

  const kpi = {
    total:        convos.length,
    today:        convos.filter(c => c.date === 'Today').length,
    aiSuccess:    convos.filter(c => c.aiStatus === 'success').length,
    failed:       convos.filter(c => c.aiStatus === 'failed').length,
    lowConf:      convos.filter(c => c.aiStatus === 'low-confidence').length,
    escalated:    convos.filter(c => c.status === 'escalated').length,
  }
  const aiRate = Math.round((kpi.aiSuccess / kpi.total) * 100)

  const filtered = convos.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = c.customer.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) ||
      c.messages.some(m => m.text.toLowerCase().includes(q))
    const matchStatus = statusFilter === 'all' || c.status === statusFilter ||
      (statusFilter === 'failed' && (c.aiStatus === 'failed' || c.aiStatus === 'low-confidence'))
    return matchSearch && matchStatus
  })

  const resolveConvo = id => {
    setConvos(prev => prev.map(c => c.id === id ? { ...c, status: 'resolved' } : c))
    if (selected?.id === id) setSelected(prev => ({ ...prev, status: 'resolved' }))
  }
  const dismissEscalation = id => {
    setConvos(prev => prev.map(c => c.id === id ? { ...c, status: 'resolved', aiStatus: 'success' } : c))
    if (selected?.id === id) setSelected(prev => ({ ...prev, status: 'resolved', aiStatus: 'success' }))
  }

  const selConvo = selected ? convos.find(c => c.id === selected.id) : null

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fs-xl mb-1">
            <i className="ri-robot-line me-2 text-success"></i>Chef Bems AI — Conversations
          </h4>
          <p className="text-muted mb-0">Monitor AI-powered dietary conversations. Responses are automated via n8n.</p>
        </div>
        {/* n8n status pill */}
        <div className="d-flex align-items-center gap-2">
          <div className="rounded px-3 py-2 d-flex align-items-center gap-2" style={{ background: '#dcfce7', border: '1px solid #bbf7d0' }}>
            <span style={{ width: 8, height: 8, background: '#16a34a', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 0 2px #bbf7d0' }}></span>
            <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>n8n Workflow Active</span>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Conversations', value: kpi.total,    icon: 'ri-chat-3-line',           bg: '#e0f2fe', color: '#0369a1' },
          { label: 'Today',               value: kpi.today,    icon: 'ri-calendar-check-line',   bg: '#f0f9ff', color: '#0284c7' },
          { label: 'AI Success Rate',     value: `${aiRate}%`, icon: 'ri-robot-line',            bg: '#dcfce7', color: '#15803d' },
          { label: 'AI Failed',           value: kpi.failed,   icon: 'ri-close-circle-line',     bg: '#fee2e2', color: '#dc2626' },
          { label: 'Low Confidence',      value: kpi.lowConf,  icon: 'ri-error-warning-line',    bg: '#fce7f3', color: '#9d174d' },
          { label: 'Escalated',           value: kpi.escalated, icon: 'ri-alarm-warning-line',   bg: '#fef3c7', color: '#b45309' },
        ].map(k => (
          <div className="col" key={k.label}>
            <div className="card mb-0 border-0" style={{ background: k.bg }}>
              <div className="card-body py-3 px-3">
                <div className="d-flex align-items-center gap-2">
                  <i className={`${k.icon} fs-4`} style={{ color: k.color }}></i>
                  <div>
                    <div className="fw-bold fs-5 lh-1" style={{ color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: 11, color: k.color, opacity: 0.85 }}>{k.label}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Attention banners */}
      {kpi.failed > 0 && (
        <div className="alert d-flex align-items-center gap-2 mb-3 py-2" style={{ background:'#fee2e2', border:'1px solid #fca5a5', color:'#991b1b', fontSize:13 }}>
          <i className="ri-close-circle-line fs-5"></i>
          <span><strong>{kpi.failed} conversation{kpi.failed>1?'s':''}</strong> where the AI failed to respond — a dietary rule may be missing. Check the flagged threads.</span>
        </div>
      )}
      {kpi.lowConf > 0 && (
        <div className="alert d-flex align-items-center gap-2 mb-3 py-2" style={{ background:'#fce7f3', border:'1px solid #f9a8d4', color:'#9d174d', fontSize:13 }}>
          <i className="ri-error-warning-line fs-5"></i>
          <span><strong>{kpi.lowConf} conversation{kpi.lowConf>1?'s':''}</strong> received a low-confidence AI reply. Review and consider adding a matching dietary rule.</span>
        </div>
      )}

      {/* Chat Shell */}
      <div className="card mb-0" style={{ minHeight: 580 }}>
        <div className="card-body p-0 d-flex" style={{ minHeight: 580 }}>

          {/* ── Left panel ── */}
          <div className="d-flex flex-column border-end" style={{ width: 320, flexShrink: 0 }}>
            <div className="p-3 border-bottom">
              <input type="text" className="form-control form-control-sm mb-2"
                placeholder="Search customer, ID, or message..."
                value={search} onChange={e => setSearch(e.target.value)} />
              <div className="d-flex gap-1 flex-wrap">
                {[
                  { key: 'all',       label: `All (${kpi.total})` },
                  { key: 'pending',   label: `Pending` },
                  { key: 'resolved',  label: `Resolved` },
                  { key: 'escalated', label: `Escalated` },
                  { key: 'failed',    label: `AI Issues` },
                ].map(f => (
                  <button key={f.key} onClick={() => setStatus(f.key)}
                    className="btn btn-sm"
                    style={{ fontSize: 10, padding: '2px 8px', background: statusFilter === f.key ? '#0ea5e9' : '#f1f5f9', color: statusFilter === f.key ? '#fff' : '#475569', border: 'none' }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-auto flex-grow-1">
              {filtered.map((c, i) => {
                const sCfg = STATUS_CFG[c.status]
                const aiCfg = AI_STATUS_CFG[c.aiStatus]
                const isActive = selConvo?.id === c.id
                const lastMsg = c.messages[c.messages.length - 1]
                return (
                  <button key={c.id} onClick={() => setSelected(c)}
                    className="w-100 text-start border-0 border-bottom p-3"
                    style={{ background: isActive ? '#f0f9ff' : 'transparent', borderLeft: `3px solid ${isActive ? '#0ea5e9' : 'transparent'}`, display: 'block' }}>
                    <div className="d-flex align-items-start gap-2">
                      <div className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold flex-shrink-0"
                        style={{ width: 34, height: 34, background: AVATAR_COLORS[i % AVATAR_COLORS.length], fontSize: 11 }}>
                        {ini(c.customer)}
                      </div>
                      <div className="flex-grow-1 overflow-hidden">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fw-semibold" style={{ fontSize: 12 }}>{c.customer}</span>
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>{c.date === 'Today' ? c.time : c.date}</span>
                        </div>
                        <p className="text-truncate mb-1" style={{ fontSize: 11, color: '#64748b' }}>
                          {lastMsg.role === 'system'
                            ? <span className="text-danger"><i className="ri-error-warning-line me-1"></i>{lastMsg.text.slice(0, 50)}…</span>
                            : lastMsg.text.slice(0, 55) + (lastMsg.text.length > 55 ? '…' : '')
                          }
                        </p>
                        <div className="d-flex gap-1">
                          <span className="badge rounded-pill" style={{ background: aiCfg.bg, color: aiCfg.color, fontSize: 9 }}>
                            <i className={`${aiCfg.icon} me-1`}></i>{aiCfg.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Right panel ── */}
          {selConvo ? (() => {
            const sCfg  = STATUS_CFG[selConvo.status]
            const aiCfg = AI_STATUS_CFG[selConvo.aiStatus]
            const idx   = convos.findIndex(c => c.id === selConvo.id)
            return (
              <div className="d-flex flex-column flex-grow-1">
                {/* Header */}
                <div className="p-3 border-bottom d-flex align-items-center gap-3" style={{ background: '#f8fafc' }}>
                  <div className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold flex-shrink-0"
                    style={{ width: 40, height: 40, background: AVATAR_COLORS[idx % AVATAR_COLORS.length], fontSize: 13 }}>
                    {ini(selConvo.customer)}
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-semibold" style={{ fontSize: 14 }}>{selConvo.customer}
                      <span className="text-muted ms-2" style={{ fontSize: 11, fontWeight: 400 }}>{selConvo.id}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      <i className="ri-phone-line me-1"></i>{selConvo.phone}
                      <span className="mx-2">·</span>
                      <i className="ri-map-pin-line me-1"></i>{selConvo.zone}
                      {selConvo.responseTime && (
                        <><span className="mx-2">·</span><i className="ri-timer-line me-1"></i>AI responded in {selConvo.responseTime}</>
                      )}
                    </div>
                  </div>
                  <div className="d-flex gap-2 flex-wrap justify-content-end">
                    {selConvo.tags.map(t => {
                      const [bg,col] = TAG_COLORS[t] || ['#f1f5f9','#475569']
                      return <span key={t} className="badge rounded-pill" style={{ background:bg, color:col, fontSize:10 }}>{t}</span>
                    })}
                    <span className="badge rounded-pill" style={{ background: sCfg.bg, color: sCfg.color, fontSize:11 }}>
                      <i className={`${sCfg.icon} me-1`}></i>{sCfg.label}
                    </span>
                    <span className="badge rounded-pill" style={{ background: aiCfg.bg, color: aiCfg.color, fontSize:11 }}>
                      <i className={`${aiCfg.icon} me-1`}></i>{aiCfg.label}
                    </span>
                  </div>
                </div>

                {/* Messages (read-only) */}
                <div className="flex-grow-1 overflow-auto p-4 d-flex flex-column gap-3" style={{ background: '#f8fafc' }}>
                  {selConvo.messages.map((m, mi) => {
                    if (m.role === 'system') {
                      return (
                        <div key={mi} className="d-flex justify-content-center">
                          <div className="rounded px-3 py-2 d-flex align-items-center gap-2"
                            style={{ background: '#fff7ed', border: '1px solid #fed7aa', fontSize: 11, color: '#92400e', maxWidth: '80%' }}>
                            <i className="ri-settings-3-line flex-shrink-0"></i>
                            <span><strong>System:</strong> {m.text}</span>
                          </div>
                        </div>
                      )
                    }
                    const isAI = m.role === 'ai'
                    return (
                      <div key={mi} className={`d-flex gap-2 ${isAI ? 'flex-row-reverse' : ''}`}>
                        {isAI ? (
                          <div className="d-flex align-items-center justify-content-center rounded-circle text-white flex-shrink-0"
                            style={{ width: 30, height: 30, background: '#10b981', fontSize: 13, alignSelf: 'flex-end' }}>
                            <i className="ri-robot-line"></i>
                          </div>
                        ) : (
                          <div className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold flex-shrink-0"
                            style={{ width: 30, height: 30, background: AVATAR_COLORS[idx % AVATAR_COLORS.length], fontSize: 10, alignSelf: 'flex-end' }}>
                            {ini(selConvo.customer)}
                          </div>
                        )}
                        <div style={{
                          maxWidth: '68%',
                          background: isAI ? '#d1fae5' : '#fff',
                          border: `1px solid ${isAI ? '#6ee7b7' : '#e2e8f0'}`,
                          borderRadius: isAI ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                          padding: '10px 14px', fontSize: 13, color: '#1e293b', whiteSpace: 'pre-line',
                        }}>
                          {isAI && (
                            <div className="d-flex align-items-center gap-1 mb-1">
                              <i className="ri-robot-line" style={{ color: '#10b981', fontSize: 10 }}></i>
                              <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>Chef Bems AI · via n8n</span>
                            </div>
                          )}
                          {m.text}
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, textAlign: 'right' }}>{fmtTime(m.time)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Admin Action Bar (read-only — no reply box) */}
                <div className="p-3 border-top d-flex align-items-center justify-content-between" style={{ background: '#fff' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    <i className="ri-information-line me-1"></i>
                    Replies are handled automatically by Chef Bems AI via n8n.
                  </div>
                  <div className="d-flex gap-2">
                    {selConvo.status === 'escalated' && (
                      <button className="btn btn-sm btn-outline-warning" onClick={() => dismissEscalation(selConvo.id)}>
                        <i className="ri-check-line me-1"></i>Dismiss Escalation
                      </button>
                    )}
                    {(selConvo.aiStatus === 'failed' || selConvo.aiStatus === 'low-confidence') && (
                      <button className="btn btn-sm btn-outline-secondary">
                        <i className="ri-settings-3-line me-1"></i>Fix Dietary Rule
                      </button>
                    )}
                    {selConvo.status !== 'resolved' && (
                      <button className="btn btn-sm btn-success" onClick={() => resolveConvo(selConvo.id)}>
                        <i className="ri-checkbox-circle-line me-1"></i>Mark Resolved
                      </button>
                    )}
                    {selConvo.status === 'resolved' && (
                      <span style={{ fontSize: 12, color: '#15803d' }}>
                        <i className="ri-checkbox-circle-fill me-1"></i>Resolved
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })() : (
            <div className="flex-grow-1 d-flex align-items-center justify-content-center text-muted">
              <div className="text-center">
                <i className="ri-chat-3-line fs-1 d-block mb-2"></i>
                Select a conversation to view
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
