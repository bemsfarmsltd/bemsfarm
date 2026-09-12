import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import SalesHub from './SalesHub'

// ── Categories & Definitions ────────────────────────────────────────────────
const CATEGORY_DEFINITIONS = [
  { id: 'all',        label: 'All Products',        emoji: '🛒', key: 'all' },
  { id: 'popular',    label: '⭐ Top Picks',          emoji: '⭐', key: 'popular' },
  { id: 'oils',       label: 'Cooking Oils',        emoji: '🫒', key: 'oils' },
  { id: 'grains',     label: 'Grains & Flours',     emoji: '🌾', key: 'grains' },
  { id: 'seasoning',  label: 'Spices & Seasoning',  emoji: '🧂', key: 'seasoning' },
  { id: 'household',  label: 'Household & Soaps',   emoji: '🧼', key: 'household' },
  { id: 'canned',     label: 'Canned Foods',        emoji: '🥫', key: 'canned' },
  { id: 'beverages',  label: 'Beverages & Drinks',  emoji: '🧃', key: 'beverages' },
  { id: 'vegetables', label: 'Fresh Produce',       emoji: '🥬', key: 'vegetables' },
  { id: 'meat',       label: 'Meat & Seafood',      emoji: '🥩', key: 'meat' },
  { id: 'meals',      label: 'Cooked Meals',        emoji: '🍲', key: 'meals' },
  { id: 'dairy',      label: 'Dairy & Eggs',        emoji: '🥛', key: 'dairy' },
]

const CAT_COLORS = {
  all: '#059669',
  popular: '#d97706',
  oils: '#d97706',
  grains: '#b45309',
  seasoning: '#db2777',
  household: '#0891b2',
  canned: '#dc2626',
  beverages: '#2563eb',
  vegetables: '#059669',
  meat: '#e11d48',
  meals: '#7c3aed',
  dairy: '#4f46e5',
}

const DEFAULT_POS_PRODUCTS = [
  { id: 1,  barcode: 'BF-OIL-001',  sku: 'OIL-5L',    name: 'Kings Pure Vegetable Oil (5L)',         cat: 'oils',       price: 13500, stock: 45, unit: '5L Gallon',  image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80', icon: '🫒' },
  { id: 2,  barcode: 'BF-OIL-002',  sku: 'OIL-25L',   name: 'Emperor Pure Palm Oil (25L Jerrycan)',  cat: 'oils',       price: 42000, stock: 18, unit: '25L Keg',     image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80', icon: '🫒' },
  { id: 3,  barcode: 'BF-GRN-001',  sku: 'RICE-50KG', name: 'Royal Stallion Long Grain Rice (50kg)', cat: 'grains',     price: 68000, stock: 32, unit: '50kg Bag',    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80', icon: '🌾' },
  { id: 4,  barcode: 'BF-GRN-002',  sku: 'RICE-25KG', name: 'Mama Gold Premium Parboiled Rice (25kg)', cat: 'grains',  price: 36500, stock: 24, unit: '25kg Bag',    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80', icon: '🌾' },
  { id: 5,  barcode: 'BF-GRN-003',  sku: 'BEAN-PNT',  name: 'Oloyin Honey Sweet Beans (Paint Bucket)',cat: 'grains',     price: 6500,  stock: 60, unit: 'Paint Rubber',image: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=500&auto=format&fit=crop&q=80', icon: '🫘' },
  { id: 6,  barcode: 'BF-GRN-004',  sku: 'GARI-PNT',  name: 'Ijebu Crisp White Garri (Paint Bucket)',cat: 'grains',     price: 3200,  stock: 85, unit: 'Paint Rubber',image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80', icon: '🌾' },
  { id: 7,  barcode: 'BF-GRN-005',  sku: 'YAM-TUB',   name: 'Abakaliki Heavy Yam Tubers (Selected Grade A)', cat: 'grains', price: 2800, stock: 40, unit: 'Tuber',       image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&auto=format&fit=crop&q=80', icon: '🍠' },
  { id: 8,  barcode: 'BF-GRN-006',  sku: 'SEMO-10KG', name: 'Golden Penny Semovita (10kg Pack)',     cat: 'grains',     price: 14200, stock: 30, unit: '10kg Bag',    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80', icon: '🌾' },
  { id: 9,  barcode: 'BF-SPIC-001', sku: 'MAGGI-STR', name: 'Maggi Star Seasoning Cubes (Pack of 100)', cat: 'seasoning', price: 1800, stock: 120, unit: 'Pack',      image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&auto=format&fit=crop&q=80', icon: '🧂' },
  { id: 10, barcode: 'BF-SPIC-002', sku: 'KNORR-CHK', name: 'Knorr Chicken Bouillon Cubes (50 Cubes)', cat: 'seasoning', price: 2200, stock: 95,  unit: 'Pack',      image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&auto=format&fit=crop&q=80', icon: '🧂' },
  { id: 11, barcode: 'BF-SPIC-003', sku: 'CRAY-PNT',  name: 'Oron Crayfish Fresh Ground (Paint Bucket)', cat: 'seasoning', price: 8500, stock: 25, unit: 'Bucket',    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&auto=format&fit=crop&q=80', icon: '🦐' },
  { id: 12, barcode: 'BF-EGG-001',  sku: 'EGG-CRT',   name: 'Bems Farms Fresh Organic Jumbo Eggs (Crate of 30)', cat: 'dairy', price: 4200, stock: 110, unit: 'Crate (30)', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500&auto=format&fit=crop&q=80', icon: '🥚' },
  { id: 13, barcode: 'BF-DAIR-001', sku: 'PEAK-TIN',  name: 'Peak Full Cream Milk Powder (400g Tin)', cat: 'dairy',     price: 3400,  stock: 50, unit: '400g Tin',    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80', icon: '🥛' },
  { id: 14, barcode: 'BF-CAN-001',  sku: 'GINO-PST',  name: 'Gino Peppe & Onion Tomato Paste (Pack of 50)', cat: 'canned', price: 9500, stock: 40, unit: 'Carton (50)', image: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=500&auto=format&fit=crop&q=80', icon: '🥫' },
  { id: 15, barcode: 'BF-CAN-002',  sku: 'GEISHA-CAN',name: 'Geisha Mackerel in Rich Tomato Sauce (Pack of 12)', cat: 'canned', price: 8400, stock: 35, unit: '12 Cans', image: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=500&auto=format&fit=crop&q=80', icon: '🐟' },
  { id: 16, barcode: 'BF-VEG-001',  sku: 'ONION-BAG', name: 'Fresh Red Kano Onions (Half Bag)',       cat: 'vegetables', price: 18500, stock: 15, unit: 'Half Bag',    image: 'https://images.unsplash.com/photo-1580201092675-a0a6a6cafbb1?w=500&auto=format&fit=crop&q=80', icon: '🧅' },
  { id: 17, barcode: 'BF-VEG-002',  sku: 'RODO-BSK',  name: 'Fresh Scotch Bonnet Habanero Pepper (Basket)', cat: 'vegetables', price: 12000, stock: 20, unit: 'Basket', image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=500&auto=format&fit=crop&q=80', icon: '🌶️' },
  { id: 18, barcode: 'BF-VEG-003',  sku: 'TOM-BSK',   name: 'Jos Fresh Plum Tomatoes (Big Basket)',   cat: 'vegetables', price: 24000, stock: 12, unit: 'Basket',      image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80', icon: '🍅' },
  { id: 19, barcode: 'BF-MEAT-001', sku: 'CHK-WHL',   name: 'Whole Dressed Farm Broiler Chicken (2.5kg)', cat: 'meat',   price: 7500,  stock: 28, unit: '2.5kg Bird',  image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=500&auto=format&fit=crop&q=80', icon: '🍗' },
  { id: 20, barcode: 'BF-MEAT-002', sku: 'CAT-LIVE',  name: 'Live Point-and-Kill Farm Catfish (Per kg)', cat: 'meat',   price: 4500,  stock: 65, unit: 'Per kg',      image: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=500&auto=format&fit=crop&q=80', icon: '🐟' },
  { id: 21, barcode: 'BF-MEAT-003', sku: 'BEEF-KG',   name: 'Fresh Boneless Prime Beef (Per kg)',     cat: 'meat',       price: 6200,  stock: 40, unit: 'Per kg',      image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=500&auto=format&fit=crop&q=80', icon: '🥩' },
  { id: 22, barcode: 'BF-BEV-001',  sku: 'MILO-500G', name: 'Nestle Milo Energy Cocoa Food Drink (500g)', cat: 'beverages', price: 3200, stock: 70, unit: '500g Pouch', image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop&q=80', icon: '🧃' },
  { id: 23, barcode: 'BF-BEV-002',  sku: 'CHIV-JUC',  name: 'Chivita 100% Real Orange Juice (1L Pack of 10)', cat: 'beverages', price: 11500, stock: 30, unit: 'Carton (10)', image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=80', icon: '🧃' },
  { id: 24, barcode: 'BF-HSE-001',  sku: 'VIVA-1KG',  name: 'Viva Plus Aromatherapy Laundry Detergent (1kg Pack)', cat: 'household', price: 2100, stock: 90, unit: '1kg Bag', image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=80', icon: '🧼' },
  { id: 25, barcode: 'BF-HSE-002',  sku: 'HYPO-1L',   name: 'Hypo Super Bleach & Disinfectant (1L Bottle)', cat: 'household', price: 1400, stock: 75, unit: '1L Bottle', image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=80', icon: '🧼' },
  { id: 26, barcode: 'BF-MEAL-001', sku: 'JOL-CMB',   name: 'Chef Bems Signature Party Jollof Rice & Smoked Chicken Combo', cat: 'meals', price: 4800, stock: 50, unit: 'Portion Box', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80', icon: '🍲' },
  { id: 27, barcode: 'BF-MEAL-002', sku: 'EGU-POU',   name: 'Special Egusi Soup with Goat Meat & Pounded Yam', cat: 'meals', price: 5500, stock: 45, unit: 'Platter', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80', icon: '🍲' },
]

const MOCK_CUSTOMERS = [
  { id: 1, name: 'Amara Obi',     phone: '0810 000 1234', tier: 'Platinum', points: 2450, wallet: 5000,  orders: 24 },
  { id: 2, name: 'Tunde Adeyemi', phone: '0802 345 6789', tier: 'Gold',     points: 1200, wallet: 1200,  orders: 12 },
  { id: 3, name: 'Mrs. Okonkwo',  phone: '0706 789 0123', tier: 'Platinum', points: 3800, wallet: 8500,  orders: 38 },
  { id: 4, name: 'Kemi Balogun',  phone: '0817 234 5678', tier: 'Silver',   points: 620,  wallet: 0,     orders: 4  },
  { id: 5, name: 'Seun Abiodun',  phone: '0803 456 7890', tier: 'Gold',     points: 1700, wallet: 3000,  orders: 17 },
]

const HISTORY_MOCK = [
  { inv: 'BF-INV-1023', cust: 'Walk-in',      method: 'Cash',       time: '10:45 AM', amount: 3500 },
  { inv: 'BF-INV-1024', cust: 'Amara Obi',    method: 'Transfer',   time: '11:10 AM', amount: 14200 },
  { inv: 'BF-INV-1025', cust: 'Mrs. Okonkwo', method: 'Card / POS', time: '12:05 PM', amount: 8750 },
  { inv: 'BF-INV-1026', cust: 'Walk-in',      method: 'Cash',       time: '01:20 PM', amount: 2400 },
  { inv: 'BF-INV-1027', cust: 'Tunde Adeyemi',method: 'QR / USSD',  time: '02:05 PM', amount: 6600 },
  { inv: 'BF-INV-1028', cust: 'Kemi Balogun', method: 'Card / POS', time: '02:40 PM', amount: 5100 },
]

const ONLINE_ORDERS = [
  {
    id: 'ORD-WEB-4421', channel: 'website', customer: 'Amara Obi', phone: '0810 000 1234',
    time: '09:14 AM', status: 'new', note: 'Please pack neatly, delivery by 12pm',
    items: [
      { productId: 1,  qty: 2 },
      { productId: 12, qty: 3 },
      { productId: 9,  qty: 1 },
    ],
  },
  {
    id: 'ORD-WA-4422', channel: 'whatsapp', customer: 'Mrs. Okonkwo', phone: '0706 789 0123',
    time: '10:02 AM', status: 'new', note: 'Include extra fresh pepper',
    items: [
      { productId: 2,  qty: 1 },
      { productId: 3,  qty: 1 },
      { productId: 17, qty: 2 },
    ],
  },
  {
    id: 'ORD-IG-4423', channel: 'instagram', customer: 'Kemi Balogun', phone: '0817 234 5678',
    time: '10:45 AM', status: 'pending', note: 'Call before dispatch',
    items: [
      { productId: 16, qty: 1 },
      { productId: 19, qty: 2 },
      { productId: 26, qty: 2 },
    ],
  },
  {
    id: 'ORD-WEB-4424', channel: 'website', customer: 'Tunde Adeyemi', phone: '0802 345 6789',
    time: '11:30 AM', status: 'pending', note: 'Deliver to office reception',
    items: [
      { productId: 13, qty: 2 },
      { productId: 15, qty: 1 },
      { productId: 22, qty: 3 },
    ],
  },
  {
    id: 'ORD-WA-4425', channel: 'whatsapp', customer: 'Seun Abiodun', phone: '0803 456 7890',
    time: '12:10 PM', status: 'new', note: 'Need this urgently before 2pm',
    items: [
      { productId: 3,  qty: 2 },
      { productId: 20, qty: 3 },
    ],
  },
]

const CHANNEL_META = {
  website:   { label: 'Website Order',   icon: 'ri-global-line',    color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  whatsapp:  { label: 'WhatsApp Order',  icon: 'ri-whatsapp-line',  color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  instagram: { label: 'Instagram Direct',icon: 'ri-instagram-line', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8' },
  phone:     { label: 'Phone Call Order',icon: 'ri-phone-line',     color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
}

const STATUS_META = {
  new:        { label: 'New Incoming', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  pending:    { label: 'Pending Pack', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  processing: { label: 'Loaded in Cart',color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
}

const TIER_COLOR = {
  Platinum: { text: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  Gold:     { text: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  Silver:   { text: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
  Bronze:   { text: '#c2410c', bg: '#fff7ed', border: '#fed7aa' }
}

const fmt = n => '₦' + Math.round(n || 0).toLocaleString()
const genOrderId = () => 'BF-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-5)

// Audio Synthesizer for POS Scan & Actions
function playBeep(type = 'scan') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === 'scan') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.08)
    } else if (type === 'success') {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime)
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.22)
    } else if (type === 'error') {
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, ctx.currentTime)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.15)
    }
  } catch {
    // Audio muted if blocked
  }
}

// ── Smart Category / Icon Classifier ────────────────────────────────────────
function getProductCat(p) {
  const catName = (p.category || p.category_name || p.cat || '').toLowerCase()
  const name = (p.name || '').toLowerCase()

  if (catName.includes('oil') || catName.includes('sauce') || name.includes('oil') || name.includes('kings') || name.includes('emperor') || name.includes('mayonnaise') || name.includes('bama') || name.includes('whippy') || name.includes('vinegar') || name.includes('ketchup') || name.includes('butter')) return 'oils'
  if (catName.includes('grain') || catName.includes('flour') || catName.includes('carb') || name.includes('rice') || name.includes('bean') || name.includes('yam') || name.includes('poundo') || name.includes('plantain') || name.includes('semovita') || name.includes('wheat') || name.includes('flour') || name.includes('garri') || name.includes('cassava') || name.includes('potato') || name.includes('noodle') || name.includes('pasta') || name.includes('spaghetti') || name.includes('indomie') || name.includes('custard')) return 'grains'
  if (catName.includes('season') || catName.includes('spice') || name.includes('maggi') || name.includes('knorr') || name.includes('royco') || name.includes('salt') || name.includes('curry') || name.includes('thyme') || name.includes('crayfish') || name.includes('ginger') || name.includes('garlic')) return 'seasoning'
  if (catName.includes('soap') || catName.includes('clean') || catName.includes('detergent') || catName.includes('house') || name.includes('soap') || name.includes('mama') || name.includes('viva') || name.includes('so klin') || name.includes('detergent') || name.includes('hypo') || name.includes('ariel') || name.includes('bleach') || name.includes('tissue') || name.includes('sponge')) return 'household'
  if (catName.includes('can') || catName.includes('paste') || name.includes('tomato') || name.includes('tin') || name.includes('sardine') || name.includes('geisha') || name.includes('corned') || name.includes('gino') || name.includes('sonia') || name.includes('derica')) return 'canned'
  if (catName.includes('bev') || catName.includes('drink') || catName.includes('juice') || name.includes('milo') || name.includes('zobo') || name.includes('kunu') || name.includes('water') || name.includes('juice') || name.includes('tea') || name.includes('drink') || name.includes('chivita') || name.includes('coke') || name.includes('malt') || name.includes('milk') || name.includes('peak') || name.includes('dano') || name.includes('cowbell')) return 'beverages'
  if (catName.includes('veg') || catName.includes('fruit') || catName.includes('fresh') || name.includes('onion') || name.includes('spinach') || name.includes('efo') || name.includes('ugu') || name.includes('pepper') || name.includes('rodo') || name.includes('tatashe') || name.includes('carrot') || name.includes('cucumber') || name.includes('cabbage')) return 'vegetables'
  if (catName.includes('fish') || catName.includes('sea') || catName.includes('meat') || catName.includes('poultry') || name.includes('tilapia') || name.includes('catfish') || name.includes('mackerel') || name.includes('stockfish') || name.includes('goat') || name.includes('chicken') || name.includes('turkey') || name.includes('beef') || name.includes('prawn')) return 'meat'
  if (catName.includes('meal') || catName.includes('soup') || catName.includes('food') || name.includes('soup') || name.includes('jollof') || name.includes('fried rice') || name.includes('egusi') || name.includes('ofada') || name.includes('afang') || name.includes('banga')) return 'meals'
  if (catName.includes('dairy') || catName.includes('egg') || name.includes('egg') || name.includes('yogurt') || name.includes('cheese')) return 'dairy'
  return 'grains'
}

function getProductIcon(name = '', cat = '') {
  const n = name.toLowerCase()
  if (n.includes('oil') || n.includes('kings') || n.includes('emperor') || n.includes('mayonnaise') || n.includes('bama') || n.includes('whippy')) return '🫒'
  if (n.includes('rice') || n.includes('wheat') || n.includes('semovita') || n.includes('flour') || n.includes('garri')) return '🌾'
  if (n.includes('bean') || n.includes('oloyin')) return '🫘'
  if (n.includes('yam') || n.includes('poundo') || n.includes('cassava') || n.includes('potato')) return '🍠'
  if (n.includes('plantain') || n.includes('banana')) return '🍌'
  if (n.includes('soup') || n.includes('egusi') || n.includes('ofada') || n.includes('afang') || n.includes('banga')) return '🍲'
  if (n.includes('chicken') || n.includes('turkey') || n.includes('fowl')) return '🍗'
  if (n.includes('beef') || n.includes('meat') || n.includes('goat')) return '🥩'
  if (n.includes('fish') || n.includes('tilapia') || n.includes('catfish') || n.includes('mackerel') || n.includes('crayfish') || n.includes('prawn') || n.includes('stockfish')) return '🐟'
  if (n.includes('egg')) return '🥚'
  if (n.includes('milk') || n.includes('peak') || n.includes('dano') || n.includes('cowbell') || n.includes('yogurt') || n.includes('custard')) return '🥛'
  if (n.includes('tomato') || n.includes('tatashe') || n.includes('pepper') || n.includes('rodo') || n.includes('gino') || n.includes('derica')) return '🍅'
  if (n.includes('onion')) return '🧅'
  if (n.includes('spinach') || n.includes('efo') || n.includes('ugu') || n.includes('vegetable')) return '🥬'
  if (n.includes('salt') || n.includes('maggi') || n.includes('knorr') || n.includes('spice') || n.includes('seasoning')) return '🧂'
  if (n.includes('milo') || n.includes('beverage') || n.includes('juice') || n.includes('drink') || n.includes('zobo') || n.includes('water')) return '🧃'
  if (n.includes('soap') || n.includes('mama') || n.includes('viva') || n.includes('so klin') || n.includes('detergent') || n.includes('hypo')) return '🧼'
  return '🌾'
}

// ── Main POS Component ────────────────────────────────────────────────────────
export default function POS() {
  const { user } = useAuth()
  const [viewMode, setViewMode] = useState('hub') // 'hub' (First Screen) | 'register' (Active Ringing)

  // Theme state: defaults to crisp 'light' mode or saved preference
  const [theme, setTheme] = useState(() => localStorage.getItem('bems_pos_theme') || 'light')

  function toggleTheme() {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('bems_pos_theme', next)
      return next
    })
  }

  // Live Backend State
  const [productsList, setProductsList] = useState(DEFAULT_POS_PRODUCTS)
  const [customersList, setCustomersList] = useState(MOCK_CUSTOMERS)
  const [historyList, setHistoryList] = useState(HISTORY_MOCK)
  const [loadingPOS, setLoadingPOS] = useState(false)

  // Dynamic Lookup Maps
  const { byBarcode, bySku } = useMemo(() => {
    const bc = {}, sk = {}
    productsList.forEach(p => {
      if (p.barcode) bc[p.barcode.toUpperCase()] = p
      if (p.sku) sk[p.sku.toUpperCase()] = p
    })
    return { byBarcode: bc, bySku: sk }
  }, [productsList])

  // UI State
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch]                 = useState('')
  const [toast, setToast]                   = useState(null)
  const [toastTimer, setToastTimer]         = useState(null)

  // Online orders
  const [onlineOrders, setOnlineOrders]     = useState(ONLINE_ORDERS)
  const [onlineFilter, setOnlineFilter]     = useState('all')
  const [expandedOrder, setExpandedOrder]   = useState(null)

  // Customer
  const [customer, setCustomer]             = useState(null)
  const [custSearch, setCustSearch]         = useState('')
  const [showCustPanel, setShowCustPanel]   = useState(false)

  // Cart
  const [cart, setCart]                     = useState([])
  const [discountPct, setDiscountPct]       = useState(0)
  const [orderNote, setOrderNote]           = useState('')
  const [highlightId, setHighlightId]       = useState(null)

  // Held orders
  const [heldOrders, setHeldOrders]         = useState([])
  const [orderId, setOrderId]               = useState(genOrderId)

  // Modals
  const [activeModal, setActiveModal]       = useState(null)
  const closeModal = () => setActiveModal(null)

  // Scanner basket modal
  const [scanCart, setScanCart]             = useState([])
  const [scanCode, setScanCode]             = useState('')
  const scanModalInputRef                   = useRef(null)

  // Cash modal
  const [cashReceived, setCashReceived]     = useState('')
  // Card modal
  const [cardTab, setCardTab]               = useState('visa')
  // Transfer modal
  const [bankName, setBankName]             = useState('')
  const [txnRef, setTxnRef]                 = useState('')
  // Split modal
  const [splitRows, setSplitRows]           = useState([
    { method: 'Cash',          amount: '' },
    { method: 'Bank Transfer', amount: '' },
  ])
  // Hold modal
  const [holdRef, setHoldRef]               = useState('')
  const [holdNote, setHoldNote]             = useState('')
  // Pay later modal
  const [payLaterCust, setPayLaterCust]     = useState('')
  const [payLaterDate, setPayLaterDate]     = useState('')
  // Success data
  const [successData, setSuccessData]       = useState(null)

  // Goods Return modal
  const POS_RETURN_REASONS = [
    'Damaged on delivery',
    'Wrong item sent',
    'Quality below standard',
    'Spoiled / Already expired',
    'Item missing from order',
    'Incorrect quantity',
    'Customer changed mind',
    'Packaging damaged'
  ]
  const [returnForm, setReturnForm] = useState({
    customer: 'Walk-in', phone: '', product: DEFAULT_POS_PRODUCTS[0], qty: 1, unitPrice: DEFAULT_POS_PRODUCTS[0].price,
    reason: POS_RETURN_REASONS[0], notes: '', condition: 'resalable', refundMethod: 'Cash',
  })
  const [returnStep, setReturnStep]         = useState(1)
  const [returnLogs, setReturnLogs]         = useState([])
  const [returnSuccess, setReturnSuccess]   = useState(null)

  // Shift Analytics Navigation & Denominations
  const [analyticsTab, setAnalyticsTab]       = useState('overview')
  const [analyticsFilter, setAnalyticsFilter] = useState('all')
  const [denominations, setDenominations]     = useState({
    1000: 10,
    500: 10,
    200: 4,
    100: 1,
    50: 0,
  })

  const scanInputRef = useRef(null)

  // Load Live Backend Data
  useEffect(() => {
    let isMounted = true
    async function loadPOSData() {
      try {
        let prods = []
        try {
          const res = await api.get('/products?limit=250')
          prods = res.data?.products || res.data?.data || res.data || []
        } catch {
          try {
            const raw = await fetch('/api/products?limit=250')
            const json = await raw.json()
            prods = json.products || json.data || []
          } catch {
            const res = await api.get('/admin/pos/products?limit=250').catch(() => null)
            prods = res?.data?.products || res?.data || []
          }
        }

        if (Array.isArray(prods) && prods.length > 0 && isMounted) {
          const mapped = prods.map(p => {
            const rawPrice = Number(p.price || p.unit_price || 0)
            const sanitizedPrice = rawPrice >= 500000 ? Math.round(rawPrice / 1500) : Math.round(rawPrice)
            return {
              id: p.id,
              barcode: p.barcode || `BF-${p.sku || p.id}`,
              sku: p.sku || `SKU-${p.id}`,
              name: p.name,
              cat: getProductCat(p),
              price: sanitizedPrice || 1000,
              stock: p.stock != null ? Number(p.stock) : (p.stock_quantity != null ? Number(p.stock_quantity) : 25),
              unit: p.unit || 'unit',
              image: p.image_url || p.image || null,
              icon: p.icon || getProductIcon(p.name, p.category || p.cat)
            }
          })
          setProductsList(mapped)
          setReturnForm(f => ({
            ...f,
            product: f.product || mapped[0],
            unitPrice: f.unitPrice || mapped[0]?.price || 0
          }))
        }
      } catch (e) {
        console.warn('Live products fallback', e)
      }

      try {
        const custRes = await api.get('/admin/pos/customers').catch(() => api.get('/admin/customers'))
        const custs = custRes?.data?.customers || custRes?.data || []
        if (Array.isArray(custs) && custs.length > 0 && isMounted) {
          const mappedCusts = custs.map(c => ({
            id: c.id,
            name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.name || 'Customer',
            phone: c.phone || '—',
            tier: c.tier || 'Silver',
            points: c.loyalty_points || 0,
            wallet: c.wallet_balance || 0,
            orders: c.total_orders || 0
          }))
          setCustomersList(mappedCusts)
        }
      } catch (e) {
        console.warn('Live customers fallback', e)
      }

      try {
        const ordRes = await api.get('/admin/orders?status=pending&limit=15').catch(() => null)
        const ords = ordRes?.data?.orders || []
        if (Array.isArray(ords) && ords.length > 0 && isMounted) {
          const mappedOrders = ords.map(o => ({
            id: o.order_ref || `ORD-${o.id}`,
            channel: o.channel || 'website',
            customer: o.customer_name || `${o.user?.first_name || ''} ${o.user?.last_name || ''}`.trim() || 'Online Customer',
            phone: o.customer_phone || o.phone || '—',
            time: o.created_at ? new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
            status: o.status || 'pending',
            note: o.delivery_note || o.notes || '',
            items: (o.items || []).map(it => ({
              productId: it.product_id,
              qty: it.quantity || 1
            }))
          }))
          setOnlineOrders(mappedOrders)
        }
      } catch (e) {
        console.warn('Live online orders fallback', e)
      }

      try {
        const rcptRes = await api.get('/admin/pos/receipts').catch(() => null)
        const rcpts = rcptRes?.data?.receipts || []
        if (Array.isArray(rcpts) && rcpts.length > 0 && isMounted) {
          const mappedHistory = rcpts.map(r => ({
            inv: r.order_ref || `INV-${r.id}`,
            cust: r.customer_name || 'Walk-in',
            method: r.payment_method || 'Cash',
            time: r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
            amount: Number(r.total_amount || r.total || 0)
          }))
          setHistoryList(mappedHistory)
        }
      } catch (e) {
        console.warn('Live POS receipts fallback', e)
      }
    }

    loadPOSData()
    return () => { isMounted = false }
  }, [])

  // Toast Helper
  function showToast(msg, type = 'success', icon = '✅') {
    if (toastTimer) clearTimeout(toastTimer)
    setToast({ msg, type, icon })
    setToastTimer(setTimeout(() => setToast(null), 2400))
  }

  // Cart & Product Methods
  function addProductToCart(product) {
    playBeep('scan')
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id)
      if (ex) {
        showToast(`${product.name} (Qty ${ex.qty + 1})`, 'success', product.icon || '🌾')
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      showToast(`${product.name} added`, 'success', product.icon || '🌾')
      return [...prev, { ...product, qty: 1, note: '' }]
    })
    setHighlightId(product.id)
    setTimeout(() => setHighlightId(null), 500)
  }

  function updateQty(id, qty) {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.id !== id))
      showToast('Item removed from cart', 'info', '🗑️')
      return
    }
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }

  function updateNote(id, note) {
    setCart(prev => prev.map(i => i.id === id ? { ...i, note } : i))
  }

  function clearCart() {
    setCart([])
    setDiscountPct(0)
    setOrderNote('')
    setCustomer(null)
    setOrderId(genOrderId())
    showToast('Register cart cleared', 'info', '🧹')
  }

  // Barcode Scanner Listener
  const handleBarcodeScan = useCallback((code) => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    const product = byBarcode[trimmed] || byBarcode['BF-' + trimmed] || bySku[trimmed]
    if (product) {
      addProductToCart(product)
    } else {
      playBeep('error')
      showToast(`Unknown barcode: ${trimmed}`, 'error', '❌')
    }
  }, [byBarcode, bySku])

  const scanBuffer = useRef('')
  const lastKeyTime = useRef(0)
  const onScanRef = useRef(handleBarcodeScan)
  onScanRef.current = handleBarcodeScan

  useEffect(() => {
    function onKeyDown(e) {
      const tag = e.target.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      if (e.key === 'F1') {
        e.preventDefault()
        if (viewMode === 'hub') {
          setViewMode('register')
        } else {
          scanInputRef.current?.focus()
        }
        return
      }
      if (e.key === 'F2') {
        e.preventDefault()
        setShowCustPanel(p => !p)
        return
      }
      if (e.key === 'F3') {
        e.preventDefault()
        setActiveModal('online')
        return
      }
      if (e.key === 'F4') {
        e.preventDefault()
        if (cart.length > 0) setActiveModal('hold')
        return
      }
      if (e.key === 'F6' || e.key === 'F7') {
        e.preventDefault()
        setActiveModal('analytics')
        return
      }
      if (e.key === 'F8') {
        e.preventDefault()
        if (cart.length > 0) setActiveModal('cash')
        return
      }
      if (e.key === 'F9') {
        e.preventDefault()
        if (cart.length > 0) setActiveModal('card')
        return
      }
      if (e.key === 'F10') {
        e.preventDefault()
        if (cart.length > 0) setActiveModal('transfer')
        return
      }
      if (e.key === 'F11') {
        e.preventDefault()
        if (cart.length > 0) setActiveModal('split')
        return
      }
      if (e.key === 'F12') {
        e.preventDefault()
        setActiveModal('return')
        return
      }
      if (e.key === 'Escape') {
        if (activeModal) {
          e.preventDefault()
          closeModal()
        } else if (search) {
          e.preventDefault()
          setSearch('')
        } else if (viewMode === 'register' && cart.length === 0) {
          e.preventDefault()
          setViewMode('hub')
        }
        return
      }

      if (isInput) return

      const now = Date.now()
      if (e.key === 'Enter') {
        if (scanBuffer.current.length >= 3) {
          onScanRef.current(scanBuffer.current)
        }
        scanBuffer.current = ''
        return
      }
      if (e.key.length === 1) {
        if (now - lastKeyTime.current > 300) scanBuffer.current = ''
        scanBuffer.current += e.key
        lastKeyTime.current = now
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [viewMode, activeModal, search, cart.length])

  useEffect(() => {
    document.body.classList.add('sidebar-hidden')
    return () => document.body.classList.remove('sidebar-hidden')
  }, [])

  // Scanner basket helpers
  function scannerAddProduct(code) {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    const product = byBarcode[trimmed] || byBarcode['BF-' + trimmed] || bySku[trimmed]
    if (!product) {
      playBeep('error')
      showToast(`Item not found: ${trimmed}`, 'error', '❌')
      return
    }
    playBeep('scan')
    setScanCart(prev => {
      const ex = prev.find(i => i.id === product.id)
      if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...product, qty: 1 }]
    })
    showToast(`${product.name} scanned`, 'success', product.icon || '🌾')
    setScanCode('')
    setTimeout(() => scanModalInputRef.current?.focus(), 50)
  }

  function scannerUpdateQty(id, qty) {
    if (qty <= 0) {
      setScanCart(prev => prev.filter(i => i.id !== id))
      return
    }
    setScanCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }

  function scannerAddToOrder() {
    scanCart.forEach(item => {
      setCart(prev => {
        const ex = prev.find(i => i.id === item.id)
        if (ex) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + item.qty } : i)
        return [...prev, { ...item, note: '' }]
      })
    })
    playBeep('success')
    showToast(`${scanCart.length} item(s) added to order`, 'success', '🛒')
    setScanCart([])
    closeModal()
  }

  function scannerQuickPay() {
    scannerAddToOrder()
    setTimeout(() => setActiveModal('cash'), 60)
  }

  // Online orders -> cart
  function loadOnlineOrderToCart(order) {
    let loaded = 0
    order.items.forEach(({ productId, qty }) => {
      const product = productsList.find(p => p.id === productId)
      if (!product) return
      setCart(prev => {
        const ex = prev.find(i => i.id === product.id)
        if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + qty } : i)
        return [...prev, { ...product, qty, note: '' }]
      })
      loaded++
    })
    const matched = customersList.find(c => c.name === order.customer)
    if (matched) setCustomer(matched)
    setOnlineOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'processing' } : o))
    playBeep('success')
    showToast(`${loaded} item(s) imported to cart`, 'success', '📥')
    closeModal()
  }

  // Order Holding
  function doHold() {
    if (cart.length === 0) return
    setHeldOrders(prev => [...prev, { orderId, cart, customer, discountPct, orderNote, ref: holdRef, note: holdNote }])
    showToast(`Order held · ${holdRef || orderId}`, 'info', '⏸️')
    setHoldRef('')
    setHoldNote('')
    closeModal()
    clearCart()
  }

  function recallOrder(idx) {
    const held = heldOrders[idx]
    if (cart.length > 0) {
      setHeldOrders(prev => [...prev, { orderId, cart, customer, discountPct, orderNote }])
    }
    setCart(held.cart)
    setCustomer(held.customer)
    setDiscountPct(held.discountPct)
    setOrderNote(held.orderNote)
    setOrderId(held.orderId)
    setHeldOrders(prev => prev.filter((_, i) => i !== idx))
    showToast('Held order restored to cart', 'success', '▶️')
  }

  // Calculation
  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart])
  const discountAmt = Math.round(subtotal * (discountPct / 100))
  const afterDiscount = subtotal - discountAmt
  const vat = Math.round(afterDiscount * 0.075)
  const total = afterDiscount + vat
  const itemCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart])

  // Payment Confirmation
  async function confirmPayment(method) {
    if (cart.length === 0) return
    playBeep('success')

    const change = method === 'Cash' && cashReceived ? Math.max(0, Number(cashReceived) - total) : 0
    const receiptData = {
      orderId,
      customer,
      cart: [...cart],
      subtotal,
      discountPct,
      discountAmt,
      vat,
      total,
      method,
      orderNote,
      change,
      cashReceived: Number(cashReceived) || total,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    setHistoryList(prev => [
      { inv: orderId, cust: customer?.name || 'Walk-in Customer', method, time: receiptData.time, amount: total },
      ...prev.slice(0, 49)
    ])

    try {
      const salePayload = {
        order_ref: orderId,
        customer_id: customer?.id || null,
        customer_name: customer?.name || 'Walk-in Customer',
        customer_phone: customer?.phone || '',
        payment_method: method === 'Split Tender' ? 'Split Payment' : method,
        amount_tendered: Number(cashReceived) || total,
        discount_amount: discountAmt,
        notes: orderNote,
        items: cart.map(i => ({
          product_id: i.id,
          quantity: i.qty,
          unit_price: i.price,
          total_price: i.price * i.qty,
          notes: i.note || ''
        })),
        split_payments: method === 'Split Tender' ? splitRows.filter(r => Number(r.amount) > 0) : undefined
      }

      await api.post('/admin/pos/sale', salePayload).catch(() => api.post('/admin/pos/sales', salePayload))
    } catch (e) {
      console.warn('POS transaction sync notice', e)
    }

    setSuccessData(receiptData)
    setActiveModal('success')
  }

  function newOrder() {
    setSuccessData(null)
    closeModal()
    clearCart()
  }

  // Quick cash calculations
  const quickCashOptions = useMemo(() => {
    if (total <= 0) return [1000, 2000, 5000, 10000, 20000]
    const opts = [total]
    const round500  = Math.ceil(total / 500) * 500
    const round1000 = Math.ceil(total / 1000) * 1000
    const round5000 = Math.ceil(total / 5000) * 5000
    const round10000= Math.ceil(total / 10000) * 10000

    if (round500 > total && !opts.includes(round500)) opts.push(round500)
    if (round1000 > total && !opts.includes(round1000)) opts.push(round1000)
    if (round5000 > total && !opts.includes(round5000)) opts.push(round5000)
    if (round10000 > total && !opts.includes(round10000)) opts.push(round10000)
    return opts.slice(0, 6)
  }, [total])

  const cashChange = cashReceived ? Math.max(0, Number(cashReceived) - total) : 0

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: productsList.length, popular: Math.min(12, productsList.length) }
    CATEGORY_DEFINITIONS.forEach(c => {
      if (c.id !== 'all' && c.id !== 'popular') {
        counts[c.id] = productsList.filter(p => p.cat === c.id).length
      }
    })
    return counts
  }, [productsList])

  // Filtered Products
  const filteredProducts = useMemo(() => {
    let list = productsList
    if (activeCategory === 'popular') {
      list = productsList.slice(0, 12)
    } else if (activeCategory !== 'all') {
      list = productsList.filter(p => p.cat === activeCategory)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.cat.toLowerCase().includes(q)
      )
    }
    return list
  }, [activeCategory, search, productsList])

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    if (!custSearch.trim()) return customersList
    const q = custSearch.trim().toLowerCase()
    return customersList.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q))
  }, [custSearch, customersList])

  // Live Clock
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Live Salesperson Shift Analytics
  const shiftStats = useMemo(() => {
    const totalSales = historyList.reduce((s, h) => s + (Number(h.amount) || 0), 0)
    const txnCount = historyList.length
    const aov = txnCount > 0 ? Math.round(totalSales / txnCount) : 0
    const cashSales = historyList.filter(h => h.method === 'Cash').reduce((s, h) => s + (Number(h.amount) || 0), 0)
    const cardSales = historyList.filter(h => h.method?.includes('Card') || h.method?.includes('POS')).reduce((s, h) => s + (Number(h.amount) || 0), 0)
    const transferSales = historyList.filter(h => h.method?.includes('Transfer') || h.method?.includes('QR')).reduce((s, h) => s + (Number(h.amount) || 0), 0)
    const splitSales = historyList.filter(h => h.method?.includes('Split')).reduce((s, h) => s + (Number(h.amount) || 0), 0)
    const startingFloat = 10000
    const expectedDrawerCash = startingFloat + cashSales

    const unitsSold = 24
    const salesTarget = 100000
    const targetPct = Math.min(100, Math.round((totalSales / salesTarget) * 100))
    const vatCollected = Math.round((totalSales * 0.075) / 1.075)
    const netRevenue = totalSales - vatCollected
    const estCommission = Math.round(totalSales * 0.02)
    const walkinCount = historyList.filter(h => (h.cust || '').toLowerCase().includes('walk-in')).length
    const memberCount = historyList.filter(h => !(h.cust || '').toLowerCase().includes('walk-in')).length
    const loyaltyPtsIssued = Math.round(totalSales / 50)

    // Denomination physical count total & variance
    const countedCash = Object.entries(denominations).reduce((s, [val, qty]) => s + Number(val) * (Number(qty) || 0), 0)
    const drawerVariance = countedCash - expectedDrawerCash

    // Hourly Distribution Data
    const hourlyData = [
      { hour: '09:00 - 10:00 AM', amount: 3500, count: 1, pct: 25, isPeak: false },
      { hour: '11:00 - 12:00 PM', amount: 14200, count: 1, pct: 100, isPeak: true },
      { hour: '12:00 - 01:00 PM', amount: 8750, count: 1, pct: 62, isPeak: false },
      { hour: '01:00 - 02:00 PM', amount: 2400, count: 1, pct: 17, isPeak: false },
      { hour: '02:00 - 03:00 PM', amount: 11700, count: 2, pct: 82, isPeak: false },
    ]

    // Fast Moving Shift Items
    const topMovingItems = [
      { rank: 1, name: 'Kings Oil 2 Liters', icon: '🫒', sku: 'PRD-0015', qty: 5, revenue: 52500, share: '32%' },
      { rank: 2, name: 'Ama Wonda Fried Rice', icon: '🌾', sku: 'PRD-0009', qty: 3, revenue: 36000, share: '22%' },
      { rank: 3, name: 'Devon Kings 500ml Oil', icon: '🫒', sku: 'PRD-0017', qty: 4, revenue: 30000, share: '18%' },
      { rank: 4, name: '210g Tin Tomatoes', icon: '🍅', sku: 'PRD-0004', qty: 3, revenue: 24000, share: '15%' },
      { rank: 5, name: '1Kg Salt Biggest Pack', icon: '🧂', sku: 'PRD-0019', qty: 2, revenue: 25000, share: '13%' },
    ]

    return {
      totalSales,
      txnCount,
      aov,
      cashSales,
      cardSales,
      transferSales,
      splitSales,
      startingFloat,
      expectedDrawerCash,
      unitsSold,
      salesTarget,
      targetPct,
      vatCollected,
      netRevenue,
      estCommission,
      walkinCount,
      memberCount,
      loyaltyPtsIssued,
      countedCash,
      drawerVariance,
      hourlyData,
      topMovingItems
    }
  }, [historyList, denominations])

  // Split Helpers
  function addSplitRow() {
    setSplitRows(r => [...r, { method: 'Cash', amount: '' }])
  }
  function updateSplit(i, field, val) {
    setSplitRows(r => r.map((row, ri) => ri === i ? { ...row, [field]: val } : row))
  }

  // ── Render First Screen: Sales Hub & Shift Dashboard ──────────────────────
  if (viewMode === 'hub') {
    return (
      <SalesHub
        onOpenRegister={() => setViewMode('register')}
        historyList={historyList}
        onlineOrders={onlineOrders}
        onOpenOnlineOrder={(order) => {
          loadOnlineOrderToCart(order)
          setViewMode('register')
        }}
        onReprintReceipt={(receipt) => {
          setSuccessData(receipt)
          setActiveModal('receipt')
          setViewMode('register')
        }}
        user={user}
      />
    )
  }

  // ── Render Active Ringing & Scanning Terminal ─────────────────────────────
  return (
    <div className={`pos-app-root theme-${theme}`}>

      {/* ═══ TOPBAR / HEADER ═════════════════════════════════════════════ */}
      <header className="pos-nav-header">
        {/* Brand */}
        <div className="pos-brand-box">
          <img src="/bemsfarms_logo_compact.png" alt="Bems Farms" className="pos-main-logo" />
        </div>

        {/* Global Barcode / Search Omnibar */}
        <div className="pos-search-capsule">
          <i className="ri-search-line pos-search-ico"></i>
          <input
            id="scan-field"
            ref={scanInputRef}
            type="text"
            className="pos-search-input"
            placeholder="Search products or scan barcode (F1)..."
            autoComplete="off"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && search.trim()) {
                handleBarcodeScan(search)
              }
            }}
          />
          {search ? (
            <button onClick={() => setSearch('')} className="pos-search-clear">✕</button>
          ) : (
            <div className="pos-scan-badge">
              <span>F1</span>
            </div>
          )}
        </div>

        {/* Right Controls: Return to Sales Hub, Online Orders, Theme, Exit */}
        <div className="pos-hud-controls">
          {/* Return to Sales Hub Button (Dedicated First Screen) */}
          <button
            onClick={() => setViewMode('hub')}
            className="pos-header-analytics-pill"
            style={{ background: '#F1F5F9', color: '#0F172A', border: '1px solid #CBD5E1' }}
            title="Return to Sales Hub & Shift Dashboard">
            <i className="ri-arrow-left-line text-dark"></i>
            <span className="text-dark fw-bold">Sales Hub</span>
          </button>

          {/* Online Orders with Live Notification Badge */}
          {(() => {
            const newCount = onlineOrders.filter(o => o.status === 'new').length
            return (
              <button
                onClick={() => setActiveModal('online')}
                className="pos-header-online-pill"
                title="Online & WhatsApp Orders [F3]">
                <i className="ri-shopping-bag-3-line"></i>
                <span>Orders</span>
                {newCount > 0 && <span className="pos-online-live-chip">{newCount}</span>}
              </button>
            )
          })()}

          {heldOrders.length > 0 && (
            <button onClick={() => recallOrder(0)} className="pos-held-counter-btn">
              <i className="ri-pause-circle-fill"></i>
              <span>{heldOrders.length} Held</span>
            </button>
          )}

          {/* Theme Toggle Icon Button */}
          <button
            onClick={toggleTheme}
            className="pos-icon-circle-btn"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}>
            {theme === 'dark' ? (
              <i className="ri-sun-fill text-amber"></i>
            ) : (
              <i className="ri-moon-fill text-sapphire"></i>
            )}
          </button>

          {/* Exit Button */}
          <Link to="/dashboard" className="pos-dashboard-exit" title="Back to Main Dashboard">
            <i className="ri-logout-box-r-line"></i>
            <span>Exit</span>
          </Link>

          {/* Salesperson Profile Trigger */}
          <button
            onClick={() => setActiveModal('analytics')}
            className="pos-cashier-shift-pill"
            title="Logged In Cashier Profile & Shift Performance [F7]">
            <div className="pos-cashier-circle-mini">
              {user ? (user.first_name?.[0] || 'B') + (user.last_name?.[0] || 'F') : 'SA'}
            </div>
            <div className="pos-cashier-shift-info text-start">
              <div className="pos-cashier-shift-name">{user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Cashier' : 'Stephen Ade'}</div>
              <div className="pos-cashier-shift-stats">
                <span className="text-muted">Shift:</span> <strong className="text-emerald">{fmt(shiftStats.totalSales)}</strong>
              </div>
            </div>
          </button>
        </div>
      </header>

      {/* ═══ WORKSPACE BODY ═══════════════════════════════════════════════ */}
      <div className="pos-layout-body">

        {/* ─── LEFT: CATALOG & ACTIONS ─────────────────────────────────── */}
        <div className="pos-catalog-column">

          {/* Category Filter Pills */}
          <div className="pos-category-dock">
            {CATEGORY_DEFINITIONS.map(cat => {
              const active = activeCategory === cat.id
              const count = categoryCounts[cat.id] || 0
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`pos-dock-pill ${active ? 'active' : ''}`}>
                  <span className="pos-dock-emoji">{cat.emoji}</span>
                  <span className="pos-dock-label">{cat.label}</span>
                  <span className="pos-dock-count">{count}</span>
                </button>
              )
            })}
          </div>

          {/* Product Grid Area */}
          <div className="pos-inventory-scroll">
            {loadingPOS ? (
              <div className="pos-loading-state">
                <div className="spinner-border text-emerald mb-3" role="status" style={{ width: 44, height: 44 }}></div>
                <div className="pos-loading-text">Loading Products Catalog...</div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="pos-empty-catalog">
                <div className="pos-empty-icon">🔍</div>
                <div className="pos-empty-title">No Matching Products</div>
                <div className="pos-empty-sub">Try adjusting your search query or switching categories</div>
                <button
                  className="btn btn-emerald mt-3 px-4 py-2 fw-bold"
                  onClick={() => { setSearch(''); setActiveCategory('all') }}>
                  View All Products
                </button>
              </div>
            ) : (
              <div className="pos-inventory-grid">
                {filteredProducts.map(p => {
                  const inCart = cart.find(i => i.id === p.id)
                  const isLowStock = p.stock > 0 && p.stock <= 5

                  return (
                    <div
                      key={p.id}
                      onClick={() => addProductToCart(p)}
                      className={`pos-product-tile ${inCart ? 'in-cart-active' : ''}`}>
                      {/* Card Header Status */}
                      <div className="pos-tile-top">
                        <span className={`pos-stock-tag ${isLowStock ? 'low-warning' : ''}`}>
                          {isLowStock ? `LOW (${p.stock})` : (p.stock > 0 ? `${p.stock} in stock` : 'In Stock')}
                        </span>
                        {inCart && (
                          <span className="pos-tile-counter">{inCart.qty}</span>
                        )}
                      </div>

                      {/* Photo / Visual Container */}
                      <div className="pos-tile-media">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="pos-tile-img"
                            onError={e => {
                              e.target.style.display = 'none'
                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'block'
                            }}
                          />
                        ) : null}
                        <span className="pos-tile-emoji-fallback" style={{ display: p.image ? 'none' : 'block' }}>
                          {p.icon || getProductIcon(p.name, p.cat)}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="pos-tile-info">
                        <div className="pos-tile-name" title={p.name}>{p.name}</div>
                        <div className="pos-tile-sku">{p.sku} · per {p.unit}</div>
                      </div>

                      {/* Price & Action Footer */}
                      <div className="pos-tile-footer">
                        <div className="pos-tile-price">{fmt(p.price)}</div>

                        {inCart ? (
                          <div className="pos-tile-stepper" onClick={e => e.stopPropagation()}>
                            <button onClick={() => updateQty(p.id, inCart.qty - 1)} className="pos-tile-step-btn">−</button>
                            <span className="pos-tile-step-val">{inCart.qty}</span>
                            <button onClick={() => updateQty(p.id, inCart.qty + 1)} className="pos-tile-step-btn add">+</button>
                          </div>
                        ) : (
                          <div className="pos-tile-add-btn">
                            <i className="ri-add-line"></i>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT: DIGITAL CHECKOUT TERMINAL ─────────────────────────── */}
        <div className="pos-register-column">

          {/* Held Orders Banner */}
          {heldOrders.length > 0 && (
            <div className="pos-held-banner">
              <span className="pos-held-label">HELD ORDERS:</span>
              <div className="pos-held-scroll">
                {heldOrders.map((h, i) => (
                  <button key={i} onClick={() => recallOrder(i)} className="pos-held-chip">
                    #{i + 1} · {fmt(h.cart.reduce((s, ci) => s + ci.price * ci.qty, 0))}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Register Order Topbar */}
          <div className="pos-register-topbar">
            <div>
              <div className="pos-reg-order-id">{orderId}</div>
              <div className="pos-reg-item-count">{itemCount} {itemCount === 1 ? 'item' : 'items'} in basket</div>
            </div>

            <div className="pos-reg-top-actions">
              <button
                onClick={() => setShowCustPanel(!showCustPanel)}
                className={`pos-reg-cust-trigger ${customer ? 'has-cust' : ''}`}>
                <i className="ri-user-3-line"></i>
                <span>{customer ? customer.name.split(' ')[0] : 'Customer [F2]'}</span>
              </button>

              {cart.length > 0 && (
                <button onClick={clearCart} className="pos-reg-clear-btn">
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Customer Selection Drawer */}
          {showCustPanel && (
            <div className="pos-customer-drawer">
              <input
                type="text"
                className="pos-drawer-input"
                placeholder="Search customer name or phone..."
                value={custSearch}
                onChange={e => setCustSearch(e.target.value)}
                autoFocus
              />
              <div className="pos-drawer-list">
                {filteredCustomers.map(c => {
                  const tierMeta = TIER_COLOR[c.tier] || TIER_COLOR.Silver
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setCustomer(c); setShowCustPanel(false); setCustSearch('') }}
                      className={`pos-drawer-item ${customer?.id === c.id ? 'active-selection' : ''}`}>
                      <div>
                        <div className="pos-drawer-name">{c.name}</div>
                        <div className="pos-drawer-phone">{c.phone}</div>
                      </div>
                      <div className="text-end">
                        <span className="pos-drawer-tier-badge" style={{ color: tierMeta.text, background: tierMeta.bg, borderColor: tierMeta.border }}>
                          {c.tier}
                        </span>
                        <div className="pos-drawer-points">{c.points.toLocaleString()} pts</div>
                      </div>
                    </button>
                  )
                })}
              </div>
              {customer && (
                <button onClick={() => { setCustomer(null); setShowCustPanel(false) }} className="pos-drawer-remove-cust">
                  Switch to Walk-in Customer
                </button>
              )}
            </div>
          )}

          {/* Active Customer Strip */}
          {customer && !showCustPanel && (
            <div className="pos-active-customer-bar">
              <div className="pos-cust-initials" style={{ background: TIER_COLOR[customer.tier]?.text || '#059669' }}>
                {customer.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div style={{ flex: 1 }}>
                <div className="pos-cust-active-name">{customer.name}</div>
                <div className="pos-cust-active-sub">
                  <span style={{ color: TIER_COLOR[customer.tier]?.text || '#059669', fontWeight: 800 }}>{customer.tier} Tier</span>
                  {' · '}{customer.points.toLocaleString()} pts
                  {' · '}<span className="text-emerald fw-bold">Wallet {fmt(customer.wallet)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Cart Item Rows */}
          <div className="pos-cart-list-scroll">
            {cart.length === 0 ? (
              <div className="pos-empty-cart-state">
                <div className="pos-empty-cart-icon">🛒</div>
                <div className="pos-empty-cart-title">Cart is Empty</div>
                <div className="pos-empty-cart-sub">Scan barcodes or tap products to build order</div>
                <div className="pos-usb-tip">
                  ⚡ Hardware USB scanners scan directly on this screen
                </div>
              </div>
            ) : (
              cart.map(item => {
                const isHighlit = highlightId === item.id

                return (
                  <div key={item.id} className={`pos-cart-entry ${isHighlit ? 'item-flashed' : ''}`}>
                    <div className="pos-entry-top">
                      <div className="pos-entry-icon-wrap">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="pos-entry-img" />
                        ) : (
                          <span className="pos-entry-icon">{item.icon}</span>
                        )}
                      </div>
                      <div className="pos-entry-details">
                        <div className="pos-entry-title">{item.name}</div>
                        <div className="pos-entry-unit-rate">{fmt(item.price)} / {item.unit}</div>
                      </div>

                      {/* Stepper */}
                      <div className="pos-entry-stepper">
                        <button onClick={() => updateQty(item.id, item.qty - 1)} className="pos-entry-step-btn">−</button>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={e => updateQty(item.id, parseInt(e.target.value) || 1)}
                          className="pos-entry-step-input"
                        />
                        <button onClick={() => updateQty(item.id, item.qty + 1)} className="pos-entry-step-btn">+</button>
                      </div>

                      {/* Line Total & Remove */}
                      <div className="pos-entry-total-box">
                        <div className="pos-entry-line-total">{fmt(item.price * item.qty)}</div>
                        <button onClick={() => updateQty(item.id, 0)} className="pos-entry-remove-btn" title="Remove item">
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    </div>

                    {/* Item Note */}
                    <input
                      type="text"
                      placeholder="+ Add item packing note..."
                      value={item.note || ''}
                      onChange={e => updateNote(item.id, e.target.value)}
                      className="pos-entry-note-input"
                    />
                  </div>
                )
              })
            )}
          </div>

          {/* Order Note */}
          {cart.length > 0 && (
            <div className="pos-order-note-container">
              <input
                type="text"
                placeholder="📝 Order dispatch note / customer instructions..."
                value={orderNote}
                onChange={e => setOrderNote(e.target.value)}
                className="pos-order-note-field"
              />
            </div>
          )}

          {/* Discount Selector Chips */}
          <div className="pos-discount-strip">
            <span className="pos-discount-title">Discount:</span>
            {[0, 5, 10, 15, 20].map(d => (
              <button
                key={d}
                onClick={() => setDiscountPct(d)}
                className={`pos-discount-btn ${discountPct === d ? 'active' : ''}`}>
                {d === 0 ? 'None' : `${d}%`}
              </button>
            ))}
          </div>

          {/* Electronic Register Display Screen */}
          <div className="pos-register-screen">
            <div className="pos-screen-line">
              <span>Subtotal ({itemCount} items)</span>
              <strong>{fmt(subtotal)}</strong>
            </div>

            {discountPct > 0 && (
              <div className="pos-screen-line discount-highlight">
                <span>Discount ({discountPct}%)</span>
                <strong>− {fmt(discountAmt)}</strong>
              </div>
            )}

            <div className="pos-screen-line">
              <span>VAT (7.5%)</span>
              <strong>{fmt(vat)}</strong>
            </div>

            <div className="pos-screen-total-card">
              <div>
                <div className="pos-grand-label">TOTAL PAYABLE</div>
                <div className="pos-grand-sub">INCL. 7.5% VAT</div>
              </div>
              <div className="pos-grand-value">{fmt(total)}</div>
            </div>
          </div>

          {/* 1-Tap Tender Keypad Buttons */}
          <div className="pos-tender-pad">
            <div className="pos-tender-header">
              <span className="pos-tender-title">1-TAP TENDER METHODS</span>
              <span className="pos-tender-hotkeys">F8: Cash · F9: Card</span>
            </div>

            <div className="pos-tender-grid">
              {[
                { id: 'cash',     label: 'Cash [F8]',       icon: 'ri-money-dollar-circle-line', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
                { id: 'card',     label: 'Card / POS [F9]', icon: 'ri-bank-card-line',           color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                { id: 'transfer', label: 'Bank Transfer',   icon: 'ri-bank-line',                color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                { id: 'qr',       label: 'QR / USSD',       icon: 'ri-qr-code-line',             color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
                { id: 'split',    label: 'Split Tender',    icon: 'ri-layout-column-line',       color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
              ].map(m => (
                <button
                  key={m.id}
                  disabled={cart.length === 0}
                  onClick={() => {
                    if (cart.length > 0) {
                      if (m.id === 'cash') setCashReceived(String(total))
                      setActiveModal(m.id)
                    }
                  }}
                  className="pos-tender-btn"
                  style={{ '--btn-c': m.color, '--btn-b': m.border, '--btn-bg': m.bg }}>
                  <div className="pos-tender-ico">
                    <i className={m.icon}></i>
                  </div>
                  <div className="pos-tender-label">{m.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Register Utilities */}
          <div className="pos-footer-utilities">
            {[
              { label: 'Hold [F4]', icon: 'ri-pause-circle-line',   color: '#d97706', modal: 'hold' },
              { label: 'Returns',   icon: 'ri-arrow-go-back-line', color: '#e11d48', modal: 'return' },
              { label: 'Invoice',   icon: 'ri-file-text-line',      color: '#7c3aed', modal: 'invoice' },
              { label: 'Pay Later', icon: 'ri-time-line',           color: '#0891b2', modal: 'paylater' },
              { label: 'Receipts',  icon: 'ri-folder-history-line', color: '#2563eb', modal: 'history' },
              { label: 'Analytics [F7]', icon: 'ri-bar-chart-box-line', color: '#059669', modal: 'analytics' },
            ].map(b => (
              <button
                key={b.label}
                disabled={b.modal === 'hold' && cart.length === 0}
                onClick={() => setActiveModal(b.modal)}
                className="pos-foot-util-btn">
                <span className="pos-foot-icon-wrap" style={{ color: b.color, background: `${b.color}15` }}>
                  <i className={b.icon}></i>
                </span>
                <span className="pos-foot-text">{b.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ MODALS & WORKFLOWS ═══════════════════════════════════════════ */}
      {activeModal && activeModal !== 'success' && (
        <div className="modal-backdrop show pos-backdrop-overlay" onClick={closeModal} />
      )}

      {/* ─── Scanner Basket Modal ───────────────────────────────────────── */}
      {activeModal === 'scanner' && (() => {
        const scSub   = scanCart.reduce((s, i) => s + i.price * i.qty, 0)
        const scVat   = Math.round(scSub * 0.075)
        const scTotal = scSub + scVat

        return (
          <div className="modal show d-block pos-modal-overlay-wrap" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 760 }}>
              <div className="modal-content pos-modal-card">
                <div className="modal-header pos-modal-header bg-emerald-solid">
                  <div className="d-flex align-items-center gap-3">
                    <div className="pos-modal-ico-box">🛒</div>
                    <div>
                      <h5 className="modal-title mb-0 text-white fw-bold">Scan Basket Terminal</h5>
                      <div className="pos-modal-sub-title">High-Speed Barcode Checkout · Type or Scan + Enter</div>
                    </div>
                  </div>
                  <button className="btn-close btn-close-white ms-auto" onClick={() => { setScanCart([]); closeModal() }}></button>
                </div>

                <div className="modal-body p-0">
                  <div className="p-3 border-bottom pos-modal-sub-bar">
                    <div className="input-group input-group-lg">
                      <span className="input-group-text bg-emerald-solid text-white border-0">
                        <i className="ri-barcode-line fs-20"></i>
                      </span>
                      <input
                        ref={scanModalInputRef}
                        type="text"
                        className="form-control pos-theme-input"
                        placeholder="Scan barcode or SKU + Enter..."
                        value={scanCode}
                        autoFocus
                        autoComplete="off"
                        onChange={e => setScanCode(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') scannerAddProduct(scanCode)
                        }}
                      />
                      <button className="btn btn-emerald-solid px-4 fw-bold" onClick={() => scannerAddProduct(scanCode)}>
                        <i className="ri-add-line me-1"></i> Add
                      </button>
                    </div>
                  </div>

                  <div style={{ minHeight: 260, maxHeight: '45vh', overflowY: 'auto', padding: '12px 18px' }}>
                    {scanCart.length === 0 ? (
                      <div className="text-center py-5 text-muted">
                        <div style={{ fontSize: 54, marginBottom: 10 }}>📦</div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>No items scanned yet</div>
                        <div style={{ fontSize: 12 }}>Point barcode scanner at physical products to build order</div>
                      </div>
                    ) : (
                      scanCart.map(item => (
                        <div key={item.id} className="pos-scan-item-entry">
                          <span className="fs-24">{item.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div className="fw-bold fs-14 pos-entry-item-title">{item.name}</div>
                            <div className="text-muted fs-11">{item.sku} · {fmt(item.price)} / {item.unit}</div>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => scannerUpdateQty(item.id, item.qty - 1)}>−</button>
                            <span className="fw-bold px-2 pos-entry-item-title">{item.qty}</span>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => scannerUpdateQty(item.id, item.qty + 1)}>+</button>
                          </div>
                          <div className="fw-bold text-emerald fs-15 text-end" style={{ minWidth: 90 }}>
                            {fmt(item.price * item.qty)}
                          </div>
                          <button className="btn btn-link text-danger p-0 ms-2" onClick={() => scannerUpdateQty(item.id, 0)}>
                            <i className="ri-delete-bin-line fs-18"></i>
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {scanCart.length > 0 && (
                    <div className="p-4 border-top pos-modal-footer-summary">
                      <div className="d-flex justify-content-between mb-2 fs-13 text-muted">
                        <span>Subtotal ({scanCart.reduce((s, i) => s + i.qty, 0)} items)</span>
                        <strong className="pos-entry-item-title">{fmt(scSub)}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-3 fs-13 text-muted">
                        <span>VAT (7.5%)</span>
                        <strong className="pos-entry-item-title">{fmt(scVat)}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-4">
                        <span className="fw-bold fs-18 pos-entry-item-title">Total Payable</span>
                        <span className="fw-bolder fs-24 text-emerald">{fmt(scTotal)}</span>
                      </div>
                      <div className="d-flex gap-3">
                        <button className="btn btn-outline-emerald-solid flex-fill py-3 fw-bold" onClick={scannerAddToOrder}>
                          <i className="ri-add-circle-line me-2"></i> Add to Current Order
                        </button>
                        <button className="btn btn-emerald-solid flex-fill py-3 fw-bold" onClick={scannerQuickPay}>
                          <i className="ri-secure-payment-line me-2"></i> Instant Quick Pay
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ─── Online Orders Modal ────────────────────────────────────────── */}
      {activeModal === 'online' && (
        <div className="modal show d-block pos-modal-overlay-wrap" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 840 }}>
            <div className="modal-content pos-modal-card">
              <div className="modal-header pos-modal-header bg-sapphire-solid">
                <div className="d-flex align-items-center gap-3">
                  <div className="pos-modal-ico-box">📥</div>
                  <div>
                    <h5 className="modal-title mb-0 text-white fw-bold">Online & WhatsApp Orders</h5>
                    <div className="pos-modal-sub-title">
                      {onlineOrders.filter(o => o.status === 'new').length} New Incoming Orders · {onlineOrders.length} Total
                    </div>
                  </div>
                </div>
                <button className="btn-close btn-close-white ms-auto" onClick={closeModal}></button>
              </div>

              {/* Tabs */}
              <div className="pos-online-tabs-bar">
                {[
                  { key: 'all',        label: 'All Orders',  count: onlineOrders.length },
                  { key: 'new',        label: '🔴 New',       count: onlineOrders.filter(o => o.status === 'new').length },
                  { key: 'pending',    label: '🟡 Pending',   count: onlineOrders.filter(o => o.status === 'pending').length },
                  { key: 'processing', label: '🔵 Loaded',    count: onlineOrders.filter(o => o.status === 'processing').length },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setOnlineFilter(tab.key)}
                    className={`pos-online-tab-btn ${onlineFilter === tab.key ? 'active' : ''}`}>
                    {tab.label} <span className="pos-tab-badge">{tab.count}</span>
                  </button>
                ))}
              </div>

              <div style={{ overflowY: 'auto', maxHeight: '55vh', padding: '14px 20px' }}>
                {onlineOrders
                  .filter(o => onlineFilter === 'all' || o.status === onlineFilter)
                  .map(order => {
                    const ch = CHANNEL_META[order.channel] || CHANNEL_META.website
                    const st = STATUS_META[order.status] || STATUS_META.pending
                    const orderTotal = order.items.reduce((s, { productId, qty }) => {
                      const p = productsList.find(x => x.id === productId)
                      return s + (p ? p.price * qty : 0)
                    }, 0)
                    const isExpanded = expandedOrder === order.id

                    return (
                      <div key={order.id} className="pos-online-order-box">
                        <div className="d-flex align-items-center gap-3">
                          <div className="pos-channel-icon-circle" style={{ color: ch.color, background: ch.bg, border: `1.5px solid ${ch.border}` }}>
                            <i className={ch.icon}></i>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div className="d-flex align-items-center gap-2">
                              <span className="fw-bold fs-14 pos-entry-item-title">{order.id}</span>
                              <span className="pos-order-status-chip" style={{ color: st.color, background: st.bg, borderColor: st.border }}>
                                {st.label}
                              </span>
                              <span className="text-muted fs-11">{ch.label}</span>
                            </div>
                            <div className="fs-13 mt-1 pos-entry-item-title">
                              <strong>{order.customer}</strong> · <span className="text-muted">{order.phone}</span>
                            </div>
                            <div className="text-muted fs-11 mt-1">
                              🕐 {order.time} · {order.items.reduce((s, i) => s + i.qty, 0)} items · <strong className="text-emerald">{fmt(orderTotal)}</strong>
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                              <i className={isExpanded ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                            </button>
                            {order.status !== 'processing' ? (
                              <button className="btn btn-sm btn-emerald-solid px-3 fw-bold" onClick={() => loadOnlineOrderToCart(order)}>
                                <i className="ri-shopping-cart-2-line me-1"></i> Load to Cart
                              </button>
                            ) : (
                              <span className="text-sapphire fw-bold fs-12">
                                <i className="ri-check-double-line me-1"></i> In Cart
                              </span>
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="pos-order-expanded-tray mt-3">
                            {order.note && (
                              <div className="pos-order-alert-note mb-2">
                                <strong>Customer Note:</strong> {order.note}
                              </div>
                            )}
                            {order.items.map(({ productId, qty }) => {
                              const p = productsList.find(x => x.id === productId)
                              if (!p) return null
                              return (
                                <div key={productId} className="d-flex justify-content-between fs-12 py-1 border-bottom border-light">
                                  <span className="pos-entry-item-title">{p.icon} {p.name} × {qty}</span>
                                  <strong className="text-emerald">{fmt(p.price * qty)}</strong>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Cash Payment Modal (with 1-Tap Quick Tenders) ───────────────── */}
      {activeModal === 'cash' && (
        <div className="modal show d-block pos-modal-overlay-wrap" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 480 }}>
            <div className="modal-content pos-modal-card">
              <div className="modal-header pos-modal-header bg-emerald-solid">
                <div className="d-flex align-items-center gap-2 text-white">
                  <i className="ri-money-dollar-circle-line fs-22"></i>
                  <h6 className="modal-title mb-0 text-white fw-bold">Cash Tender & Change</h6>
                </div>
                <button className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>

              <div className="modal-body p-4">
                <div className="pos-cash-hero-box mb-3">
                  <div>
                    <span className="pos-cash-hero-lbl">Total Payable</span>
                    <div className="pos-cash-hero-val">{fmt(total)}</div>
                  </div>
                  <span className="pos-cash-hero-tag">CASH</span>
                </div>

                <div className="mb-3">
                  <label className="form-label text-muted small fw-bold">AMOUNT TENDERED (₦)</label>
                  <div className="input-group input-group-lg">
                    <span className="input-group-text bg-emerald-solid text-white border-0 fw-bold fs-20">₦</span>
                    <input
                      type="number"
                      className="form-control pos-theme-input fw-bold fs-22"
                      placeholder="0.00"
                      value={cashReceived}
                      onChange={e => setCashReceived(e.target.value)}
                      autoFocus
                    />
                    {cashReceived && (
                      <button className="btn btn-outline-secondary" onClick={() => setCashReceived('')}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="pos-quick-tender-header">1-Tap Denomination Chips</div>
                  <div className="pos-quick-tender-grid">
                    {quickCashOptions.map(amt => (
                      <button
                        key={amt}
                        type="button"
                        className="pos-quick-tender-pill"
                        onClick={() => setCashReceived(String(amt))}>
                        {amt === total ? `Exact (${fmt(amt)})` : fmt(amt)}
                      </button>
                    ))}
                  </div>
                </div>

                {cashReceived && Number(cashReceived) >= total && (
                  <div className="pos-change-banner success mb-4">
                    <span className="fw-bold">Change Due to Customer</span>
                    <span className="fw-bolder fs-20 text-emerald">{fmt(cashChange)}</span>
                  </div>
                )}
                {cashReceived && Number(cashReceived) < total && (
                  <div className="pos-change-banner danger mb-4">
                    <span className="fw-bold">Amount Remaining</span>
                    <span className="fw-bolder fs-20 text-danger">{fmt(total - Number(cashReceived))}</span>
                  </div>
                )}

                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary w-50 py-3 fw-bold" onClick={closeModal}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-emerald-solid w-50 py-3 fw-bolder fs-15"
                    disabled={!cashReceived || Number(cashReceived) < total}
                    onClick={() => confirmPayment('Cash')}>
                    Complete Sale
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Card / POS Terminal Modal ───────────────────────────────────── */}
      {activeModal === 'card' && (
        <div className="modal show d-block pos-modal-overlay-wrap" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 460 }}>
            <div className="modal-content pos-modal-card">
              <div className="modal-header pos-modal-header bg-sapphire-solid">
                <h6 className="modal-title text-white fw-bold d-flex align-items-center gap-2">
                  <i className="ri-bank-card-line"></i> External POS Terminal
                </h6>
                <button className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                  <span className="text-muted">Charge on Physical Terminal</span>
                  <span className="fw-bolder fs-22 text-sapphire">{fmt(total)}</span>
                </div>

                <div className="pos-terminal-instruction-box mb-4">
                  <i className="ri-bank-card-2-line fs-32 text-sapphire"></i>
                  <div className="fs-12 lh-base pos-entry-item-title">
                    Process <strong className="text-emerald">{fmt(total)}</strong> on the POS terminal machine.<br/>
                    Once payment approves, click <strong>Confirm Payment</strong> below.
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label text-muted small fw-bold">CARD NETWORK (OPTIONAL)</label>
                  <div className="d-flex gap-2">
                    {['Visa', 'Mastercard', 'Verve', 'Other'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCardTab(t.toLowerCase())}
                        className={`pos-card-network-btn ${cardTab === t.toLowerCase() ? 'active' : ''}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary w-50 py-3 fw-bold" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn btn-sapphire-solid w-50 py-3 fw-bold" onClick={() => confirmPayment('Card / POS')}>
                    <i className="ri-check-double-line me-1"></i> Confirm Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bank Transfer Modal ────────────────────────────────────────── */}
      {activeModal === 'transfer' && (
        <div className="modal show d-block pos-modal-overlay-wrap" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 460 }}>
            <div className="modal-content pos-modal-card">
              <div className="modal-header pos-modal-header bg-amber-solid">
                <h6 className="modal-title text-dark fw-bold">Direct Bank Transfer</h6>
                <button className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex justify-content-between mb-3">
                  <span className="text-muted">Total Transfer Amount</span>
                  <span className="fw-bolder fs-20 text-amber">{fmt(total)}</span>
                </div>

                <div className="pos-bank-account-box mb-3">
                  <div className="fw-bold mb-1 pos-entry-item-title">Transfer to: Bems Farms Ltd</div>
                  <div className="text-emerald fs-14">GTBank · <strong>0123456789</strong></div>
                  <div className="text-muted fs-11 mt-1">Ref ID: <strong>{orderId}</strong></div>
                </div>

                <div className="mb-3">
                  <label className="form-label text-muted small fw-bold">CUSTOMER BANK NAME</label>
                  <input
                    type="text"
                    className="form-control pos-theme-input"
                    placeholder="e.g. GTBank, Access, Zenith, Kuda"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label text-muted small fw-bold">SESSION ID / TRANSACTION REF</label>
                  <input
                    type="text"
                    className="form-control pos-theme-input"
                    placeholder="Enter bank reference number"
                    value={txnRef}
                    onChange={e => setTxnRef(e.target.value)}
                  />
                </div>

                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary w-50 py-3 fw-bold" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn btn-amber-solid w-50 py-3 fw-bold text-dark" onClick={() => confirmPayment('Bank Transfer')}>
                    Confirm Transfer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── QR / USSD Modal ────────────────────────────────────────────── */}
      {activeModal === 'qr' && (
        <div className="modal show d-block pos-modal-overlay-wrap" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 360 }}>
            <div className="modal-content pos-modal-card">
              <div className="modal-body text-center p-4">
                <div className="text-muted small fw-bold text-uppercase">QR & USSD Payment</div>
                <div className="fs-26 fw-bolder text-cyan my-2">{fmt(total)}</div>

                <div className="pos-qr-display-box my-3">
                  <i className="ri-qr-code-line fs-72 text-cyan"></i>
                  <div className="text-muted fs-10 fw-bold mt-1">SCAN WITH ANY MOBILE BANK APP</div>
                </div>

                <div className="pos-ussd-dial-code mb-4">
                  *737*000*{total}#
                </div>

                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary w-50 py-2 fw-bold" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn btn-cyan-solid w-50 py-2 fw-bold text-dark" onClick={() => confirmPayment('QR / USSD')}>
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Split Tender Modal ─────────────────────────────────────────── */}
      {activeModal === 'split' && (
        <div className="modal show d-block pos-modal-overlay-wrap" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 520 }}>
            <div className="modal-content pos-modal-card">
              <div className="modal-header pos-modal-header bg-purple-solid">
                <h6 className="modal-title text-white fw-bold">Split Payment Tender</h6>
                <button className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex justify-content-between mb-3 pb-2 border-bottom">
                  <span className="text-muted">Total Bill</span>
                  <span className="fw-bolder fs-20 text-purple">{fmt(total)}</span>
                </div>

                <div className="d-flex flex-column gap-2 mb-3">
                  {splitRows.map((row, i) => (
                    <div key={i} className="p-2 rounded border pos-split-item-row">
                      <div className="row g-2 align-items-center">
                        <div className="col-5">
                          <select className="form-select form-select-sm pos-theme-input" value={row.method} onChange={e => updateSplit(i, 'method', e.target.value)}>
                            {['Cash', 'Card / POS', 'Bank Transfer', 'QR / USSD', 'Wallet'].map(m => (
                              <option key={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-5">
                          <input
                            type="number"
                            className="form-control form-control-sm pos-theme-input"
                            placeholder="Amount (₦)"
                            value={row.amount}
                            onChange={e => updateSplit(i, 'amount', e.target.value)}
                          />
                        </div>
                        <div className="col-2 text-end">
                          {splitRows.length > 2 && (
                            <button type="button" className="btn btn-sm btn-outline-danger py-1 px-2" onClick={() => setSplitRows(r => r.filter((_, ri) => ri !== i))}>
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="d-flex justify-content-between align-items-center mb-4 fs-12">
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={addSplitRow}>
                    <i className="ri-add-line me-1"></i> Add Method
                  </button>
                  <span className="pos-entry-item-title">
                    Allocated: <strong className="text-emerald">{fmt(splitRows.reduce((s, r) => s + (Number(r.amount) || 0), 0))}</strong> / {fmt(total)}
                  </span>
                </div>

                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary w-50 py-3 fw-bold" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn btn-purple-solid w-50 py-3 fw-bold text-white" onClick={() => confirmPayment('Split Payment')}>
                    Submit Split Sale
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Hold Order Modal ───────────────────────────────────────────── */}
      {activeModal === 'hold' && (
        <div className="modal show d-block pos-modal-overlay-wrap" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 420 }}>
            <div className="modal-content pos-modal-card">
              <div className="modal-header pos-modal-header bg-emerald-solid">
                <h6 className="modal-title text-white fw-bold">Hold Bill [F4]</h6>
                <button className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>
              <div className="modal-body p-4">
                <div className="p-3 rounded mb-3 pos-split-item-row">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Held Bill Amount</span>
                    <strong className="fs-18 text-emerald">{fmt(total)}</strong>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label text-muted small fw-bold">HOLD REFERENCE</label>
                  <input
                    type="text"
                    className="form-control pos-theme-input"
                    placeholder="e.g. Table 4 / Mrs Okonkwo"
                    value={holdRef}
                    onChange={e => setHoldRef(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label text-muted small fw-bold">HOLD NOTE</label>
                  <textarea
                    className="form-control pos-theme-input"
                    rows="2"
                    placeholder="Optional remarks..."
                    value={holdNote}
                    onChange={e => setHoldNote(e.target.value)}
                  />
                </div>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary w-50 py-2 fw-bold" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn btn-emerald-solid w-50 py-2 fw-bold" onClick={doHold}>
                    Confirm Hold
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Invoice Preview Modal ──────────────────────────────────────── */}
      {activeModal === 'invoice' && (
        <div className="modal show d-block pos-modal-overlay-wrap" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 660 }}>
            <div className="modal-content pos-modal-card">
              <div className="modal-header pos-modal-header bg-sapphire-solid">
                <div className="d-flex align-items-center gap-2">
                  <i className="ri-file-text-line fs-22 text-white"></i>
                  <h6 className="modal-title mb-0 text-white fw-bold">Receipt & Invoice · {orderId}</h6>
                </div>
                <button className="btn-close btn-close-white ms-auto" onClick={closeModal}></button>
              </div>
              <div className="modal-body p-4">
                <div className="p-3 rounded mb-3 border pos-split-item-row">
                  <div className="d-flex justify-content-between mb-2">
                    <div>
                      <div className="fs-18 fw-bolder text-emerald">🌾 BEMS FARMS LTD</div>
                      <div className="text-muted fs-11">Fresh Grocery & Agricultural Retail</div>
                    </div>
                    <div className="text-end fs-11 text-muted">
                      <div><strong>Date:</strong> {new Date().toLocaleDateString('en-NG')}</div>
                      <div><strong>Bill ID:</strong> {orderId}</div>
                    </div>
                  </div>
                  <div className="fs-12 mt-2 pos-entry-item-title">
                    <strong>Customer:</strong> {customer?.name || 'Walk-in Customer'} {customer?.phone && `(${customer.phone})`}
                  </div>
                </div>

                <div className="table-responsive mb-3">
                  <table className="table table-sm align-middle pos-invoice-table-grid">
                    <thead>
                      <tr className="text-muted fs-11 border-bottom">
                        <th>ITEM</th>
                        <th className="text-center">QTY</th>
                        <th className="text-end">PRICE</th>
                        <th className="text-end">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="fs-12">
                      {cart.map(i => (
                        <tr key={i.id}>
                          <td>{i.icon} {i.name}</td>
                          <td className="text-center">{i.qty}</td>
                          <td className="text-end">{fmt(i.price)}</td>
                          <td className="text-end fw-bold">{fmt(i.price * i.qty)}</td>
                        </tr>
                      ))}
                      {discountPct > 0 && (
                        <tr className="text-danger">
                          <td colSpan="3" className="text-end">Discount ({discountPct}%)</td>
                          <td className="text-end fw-bold">− {fmt(discountAmt)}</td>
                        </tr>
                      )}
                      <tr className="text-muted">
                        <td colSpan="3" className="text-end">VAT (7.5%)</td>
                        <td className="text-end">{fmt(vat)}</td>
                      </tr>
                      <tr className="border-top fs-15 fw-bold">
                        <td colSpan="3" className="text-end">Total Payable</td>
                        <td className="text-end text-emerald fw-bolder">{fmt(total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary w-50 py-2 fw-bold" onClick={() => window.print()}>
                    <i className="ri-printer-line me-1"></i> Print
                  </button>
                  <button className="btn btn-emerald-solid w-50 py-2 fw-bold" onClick={closeModal}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Pay Later Modal ────────────────────────────────────────────── */}
      {activeModal === 'paylater' && (
        <div className="modal show d-block pos-modal-overlay-wrap" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 420 }}>
            <div className="modal-content pos-modal-card">
              <div className="modal-header pos-modal-header bg-amber-solid">
                <h6 className="modal-title text-dark fw-bold">Store Credit / Pay Later</h6>
                <button className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body p-4">
                <div className="p-3 rounded mb-3 pos-split-item-row">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Pay Later Balance</span>
                    <strong className="fs-18 text-amber">{fmt(total)}</strong>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label text-muted small fw-bold">CUSTOMER NAME / ACCOUNT</label>
                  <input
                    type="text"
                    className="form-control pos-theme-input"
                    placeholder="Enter customer name..."
                    value={payLaterCust || customer?.name || ''}
                    onChange={e => setPayLaterCust(e.target.value)}
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label text-muted small fw-bold">PROMISED PAYMENT DATE</label>
                  <input
                    type="date"
                    className="form-control pos-theme-input"
                    value={payLaterDate}
                    onChange={e => setPayLaterDate(e.target.value)}
                  />
                </div>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary w-50 py-2 fw-bold" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn btn-amber-solid w-50 py-2 fw-bold text-dark" onClick={() => confirmPayment('Store Credit / Pay Later')}>
                    Authorize Credit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Billing History Modal ──────────────────────────────────────── */}
      {activeModal === 'history' && (
        <div className="modal show d-block pos-modal-overlay-wrap" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 740 }}>
            <div className="modal-content pos-modal-card">
              <div className="modal-header pos-modal-header bg-sapphire-solid">
                <h6 className="modal-title text-white fw-bold">Recent POS Receipts & Sales</h6>
                <button className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>
              <div className="modal-body p-4" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                <div className="table-responsive">
                  <table className="table align-middle mb-0 fs-12 pos-invoice-table-grid">
                    <thead>
                      <tr className="text-muted border-bottom">
                        <th>INVOICE</th>
                        <th>CUSTOMER</th>
                        <th>METHOD</th>
                        <th>TIME</th>
                        <th className="text-end">AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyList.map(h => (
                        <tr key={h.inv}>
                          <td className="fw-bold text-sapphire">{h.inv}</td>
                          <td className="pos-entry-item-title">{h.cust}</td>
                          <td>
                            <span className="badge bg-light text-dark border">
                              {h.method}
                            </span>
                          </td>
                          <td className="text-muted">{h.time}</td>
                          <td className="text-end fw-bold text-emerald">{fmt(h.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer p-3">
                <button className="btn btn-outline-secondary w-100 py-2 fw-bold" onClick={closeModal}>Close History</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Payment Success Modal ──────────────────────────────────────── */}
      {activeModal === 'success' && successData && (
        <div className="pos-success-screen-overlay">
          <div className="pos-success-hero-card">
            <div className="pos-success-check-ring">
              ✓
            </div>

            <h5 className="pos-success-headline">Sale Completed!</h5>
            <div className="pos-success-bill-ref">Receipt ID: {successData.orderId}</div>

            <div className="pos-success-summary-box">
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Customer</span>
                <strong className="pos-entry-item-title">{successData.customer?.name || 'Walk-in Customer'}</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Payment Method</span>
                <strong className="text-emerald">{successData.method}</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Total Charged</span>
                <strong className="fs-16 pos-entry-item-title">{fmt(successData.total)}</strong>
              </div>
              {successData.method === 'Cash' && successData.change > 0 && (
                <div className="d-flex justify-content-between pt-2 border-top">
                  <span className="text-amber fw-bold">Change Returned</span>
                  <strong className="text-amber fs-16">{fmt(successData.change)}</strong>
                </div>
              )}
            </div>

            <div className="d-flex gap-2 mb-3">
              <button className="btn btn-outline-secondary flex-fill py-2 fw-bold" onClick={() => window.print()}>
                <i className="ri-printer-line me-1"></i> Print Receipt
              </button>
            </div>

            <button className="btn btn-emerald-solid w-100 py-3 fw-bolder fs-15" onClick={newOrder}>
              <i className="ri-add-circle-line me-1"></i> Next Customer [Enter]
            </button>
          </div>
        </div>
      )}

      {/* ─── Goods Return Modal ─────────────────────────────────────────── */}
      {activeModal === 'return' && (() => {
        const retTotal = Number(returnForm.qty) * Number(returnForm.unitPrice)

        async function submitReturn() {
          const ref = 'RTN-POS-' + String(Date.now()).slice(-5)
          try {
            await api.post('/admin/pos/returns', {
              ref,
              product_id: returnForm.product?.id,
              quantity: Number(returnForm.qty),
              unit_price: Number(returnForm.unitPrice),
              reason: returnForm.reason,
              condition: returnForm.condition,
              refund_method: returnForm.refundMethod,
              customer_name: returnForm.customer,
              phone: returnForm.phone,
              notes: returnForm.notes,
            }).catch(e => console.warn('Online return fallback', e))
          } catch (e) {
            console.warn('POS return request error', e)
          }

          setReturnLogs(prev => [...prev, { ...returnForm, ref, total: retTotal, date: new Date().toLocaleString('en-NG') }])
          setReturnSuccess({ ref, total: retTotal, method: returnForm.refundMethod, condition: returnForm.condition })
        }

        if (returnSuccess) {
          return (
            <div className="pos-success-screen-overlay">
              <div className="pos-success-hero-card" style={{ maxWidth: 380 }}>
                <div className="pos-success-check-ring" style={{ background: '#e11d48' }}>
                  ✓
                </div>
                <h6 className="fw-bold mb-1 fs-17 pos-entry-item-title">Return Processed</h6>
                <div className="text-muted fs-12 mb-3">Ref: {returnSuccess.ref}</div>
                <div className="pos-success-summary-box mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Refund Amount</span>
                    <strong className="text-danger fs-14">{fmt(returnSuccess.total)}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Method</span>
                    <span className="pos-entry-item-title">{returnSuccess.method}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Goods Condition</span>
                    <span className="text-emerald">{{ resalable: 'Restocked', damaged: 'Written off', partial: 'Split' }[returnSuccess.condition]}</span>
                  </div>
                </div>
                <button className="btn btn-emerald-solid w-100 py-2 fw-bold" onClick={closeModal}>Done</button>
              </div>
            </div>
          )
        }

        return (
          <div className="modal show d-block pos-modal-overlay-wrap" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 580 }}>
              <div className="modal-content pos-modal-card">
                <div className="modal-header pos-modal-header bg-rose-solid">
                  <div className="d-flex align-items-center gap-2">
                    <i className="ri-arrow-go-back-line fs-22 text-white"></i>
                    <div>
                      <h6 className="modal-title mb-0 text-white fw-bold">Goods Return & Customer Refund</h6>
                      <div className="pos-modal-sub-title">Step {returnStep} of 2</div>
                    </div>
                  </div>
                  <button className="btn-close btn-close-white ms-auto" onClick={closeModal}></button>
                </div>

                <div className="modal-body p-4">
                  {returnStep === 1 ? (
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label text-muted small fw-bold">SELECT PRODUCT</label>
                        <select
                          className="form-select pos-theme-input"
                          value={returnForm.product?.id || ''}
                          onChange={e => {
                            const p = productsList.find(x => x.id === Number(e.target.value))
                            if (p) setReturnForm(f => ({ ...f, product: p, unitPrice: p.price }))
                          }}>
                          {productsList.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.icon} {p.name} — {fmt(p.price)} / {p.unit}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted small fw-bold">CUSTOMER NAME</label>
                        <input
                          className="form-control pos-theme-input"
                          placeholder="Walk-in / Customer"
                          value={returnForm.customer}
                          onChange={e => setReturnForm(f => ({ ...f, customer: e.target.value }))}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted small fw-bold">PHONE NUMBER</label>
                        <input
                          className="form-control pos-theme-input"
                          placeholder="0800 000 0000"
                          value={returnForm.phone}
                          onChange={e => setReturnForm(f => ({ ...f, phone: e.target.value }))}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label text-muted small fw-bold">QUANTITY</label>
                        <input
                          type="number"
                          className="form-control pos-theme-input"
                          min="1"
                          value={returnForm.qty}
                          onChange={e => setReturnForm(f => ({ ...f, qty: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label text-muted small fw-bold">UNIT PRICE (₦)</label>
                        <input
                          type="number"
                          className="form-control pos-theme-input"
                          min="0"
                          value={returnForm.unitPrice}
                          onChange={e => setReturnForm(f => ({ ...f, unitPrice: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label text-muted small fw-bold">REFUND VALUE</label>
                        <input
                          className="form-control pos-theme-input text-danger fw-bolder"
                          readOnly
                          value={fmt(retTotal)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label text-muted small fw-bold">RETURN REASON</label>
                        <select
                          className="form-select pos-theme-input"
                          value={returnForm.reason}
                          onChange={e => setReturnForm(f => ({ ...f, reason: e.target.value }))}>
                          {POS_RETURN_REASONS.map(r => (
                            <option key={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 d-flex gap-2 pt-2">
                        <button className="btn btn-outline-secondary w-50 py-2 fw-bold" onClick={closeModal}>Cancel</button>
                        <button
                          className="btn btn-danger w-50 py-2 fw-bold"
                          onClick={() => setReturnStep(2)}
                          disabled={!returnForm.product || returnForm.qty < 1}>
                          Next: Inspect Goods
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="p-3 rounded mb-3 border pos-split-item-row">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-muted">Item</span>
                          <strong className="pos-entry-item-title">{returnForm.product?.name} × {returnForm.qty}</strong>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Total Refund</span>
                          <strong className="text-danger fs-15">{fmt(retTotal)}</strong>
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="form-label text-muted small fw-bold">CONDITION OF GOODS</label>
                        <div className="row g-2">
                          {[
                            { val: 'resalable', title: 'Resalable', desc: 'Restock immediately', color: '#059669' },
                            { val: 'damaged',   title: 'Damaged',   desc: 'Write off loss',      color: '#e11d48' },
                            { val: 'partial',   title: 'Partial',   desc: 'Partially good',      color: '#d97706' },
                          ].map(opt => (
                            <div className="col-4" key={opt.val}>
                              <div
                                onClick={() => setReturnForm(f => ({ ...f, condition: opt.val }))}
                                className={`pos-condition-pill-card ${returnForm.condition === opt.val ? 'active' : ''}`}
                                style={{ '--cond-c': opt.color }}>
                                <div className="fw-bold" style={{ color: opt.color, fontSize: 11 }}>{opt.title}</div>
                                <div className="text-muted fs-9 mt-1">{opt.desc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="form-label text-muted small fw-bold">REFUND METHOD</label>
                        <div className="d-flex gap-2">
                          {['Cash', 'Wallet Credit', 'Bank Transfer'].map(m => (
                            <button
                              key={m}
                              type="button"
                              className={`btn btn-sm flex-grow-1 ${returnForm.refundMethod === m ? 'btn-danger fw-bold' : 'btn-outline-secondary'}`}
                              onClick={() => setReturnForm(f => ({ ...f, refundMethod: m }))}>
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="d-flex gap-2">
                        <button className="btn btn-outline-secondary py-2" onClick={() => setReturnStep(1)}>Back</button>
                        <button className="btn btn-danger flex-grow-1 py-2 fw-bold" onClick={submitReturn}>
                          Complete Refund {fmt(retTotal)}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ─── Salesperson Shift Analytics & Drawer Reconciliation Modal ─── */}
      {activeModal === 'analytics' && (() => {
        const cashPct = shiftStats.totalSales > 0 ? Math.round((shiftStats.cashSales / shiftStats.totalSales) * 100) : 0
        const cardPct = shiftStats.totalSales > 0 ? Math.round((shiftStats.cardSales / shiftStats.totalSales) * 100) : 0
        const transferPct = shiftStats.totalSales > 0 ? Math.round((shiftStats.transferSales / shiftStats.totalSales) * 100) : 0
        const splitPct = shiftStats.totalSales > 0 ? Math.max(0, 100 - (cashPct + cardPct + transferPct)) : 0

        const filteredLedger = historyList.filter(h => {
          if (analyticsFilter === 'cash') return h.method === 'Cash'
          if (analyticsFilter === 'card') return h.method?.includes('Card') || h.method?.includes('POS')
          if (analyticsFilter === 'transfer') return h.method?.includes('Transfer')
          if (analyticsFilter === 'qr') return h.method?.includes('QR')
          return true
        })

        return (
          <div className="modal show d-block pos-modal-overlay-wrap" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered modal-xl pos-analytics-dialog" style={{ maxWidth: 'min(1400px, 95vw)', width: '95vw' }}>
              <div className="modal-content pos-modal-card pos-analytics-card">
                {/* Header */}
                <div className="modal-header pos-modal-header bg-emerald-solid px-4 py-3">
                  <div className="d-flex align-items-center gap-3">
                    <div className="pos-modal-ico-box pos-analytics-ico-box">📊</div>
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <h4 className="modal-title mb-0 text-white fw-bold fs-18">Salesperson Shift Analytics & Intelligence</h4>
                        <span className="badge bg-white text-dark rounded-pill px-3 py-1 text-xs fw-bolder">
                          <i className="ri-record-circle-fill text-success me-1"></i>Active Shift
                        </span>
                      </div>
                      <div className="pos-modal-sub-title fs-12 mt-0.5">
                        Salesperson: <strong>{user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Admin Cashier' : 'Stephen Ade (SA)'}</strong> &bull; Terminal #01 &bull; Opened: 08:30 AM &bull; {shiftStats.txnCount} orders
                      </div>
                    </div>
                  </div>

                  {/* Header Action Buttons */}
                  <div className="d-flex align-items-center gap-2 ms-auto">
                    <button
                      className="btn btn-light px-3 py-2 fw-bold d-flex align-items-center gap-1.5 fs-13"
                      onClick={() => window.print()}
                      title="Print Mid-Shift X-Report Thermal Slip">
                      <i className="ri-printer-line fs-15"></i>
                      <span>Print X-Report</span>
                    </button>
                    <button className="btn-close btn-close-white" onClick={closeModal}></button>
                  </div>
                </div>

                {/* Subheader Tabs Bar */}
                <div className="pos-analytics-tabs-bar px-4 py-2 d-flex gap-2 border-bottom">
                  {[
                    { id: 'overview', label: '1. Shift Performance & Velocity', icon: 'ri-dashboard-3-line' },
                    { id: 'ledger',   label: `2. Transaction Ledger (${historyList.length})`, icon: 'ri-file-list-3-line' },
                    { id: 'drawer',   label: '3. Cash Drawer & Denomination Counter', icon: 'ri-safe-2-line' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setAnalyticsTab(tab.id)}
                      className={`pos-analytics-tab-btn ${analyticsTab === tab.id ? 'active' : ''}`}>
                      <i className={`${tab.icon} me-1.5`}></i>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Body */}
                <div className="modal-body p-4 p-lg-4.5" style={{ maxHeight: 'calc(90vh - 150px)', overflowY: 'auto' }}>
                  {analyticsTab === 'overview' && (
                    <>
                      {/* 4 Primary KPI Cards */}
                      <div className="row g-3.5 mb-3.5">
                        <div className="col-6 col-lg-3">
                          <div className="pos-shift-kpi-card kpi-emerald">
                            <div className="kpi-icon-wrap"><i className="ri-money-dollar-circle-line"></i></div>
                            <div className="kpi-info">
                              <span className="kpi-label">Gross Shift Revenue</span>
                              <h3 className="kpi-value">{fmt(shiftStats.totalSales)}</h3>
                              <span className="kpi-subtext text-emerald"><i className="ri-arrow-up-line"></i> +12.4% vs prev shift</span>
                            </div>
                          </div>
                        </div>
                        <div className="col-6 col-lg-3">
                          <div className="pos-shift-kpi-card kpi-blue">
                            <div className="kpi-icon-wrap"><i className="ri-shopping-bag-3-line"></i></div>
                            <div className="kpi-info">
                              <span className="kpi-label">Completed Orders</span>
                              <h3 className="kpi-value">{shiftStats.txnCount}</h3>
                              <span className="kpi-subtext text-primary"><i className="ri-check-double-line"></i> 100% Fulfilled</span>
                            </div>
                          </div>
                        </div>
                        <div className="col-6 col-lg-3">
                          <div className="pos-shift-kpi-card kpi-amber">
                            <div className="kpi-icon-wrap"><i className="ri-scales-3-line"></i></div>
                            <div className="kpi-info">
                              <span className="kpi-label">Average Basket (AOV)</span>
                              <h3 className="kpi-value">{fmt(shiftStats.aov)}</h3>
                              <span className="kpi-subtext text-warning"><i className="ri-pie-chart-line"></i> 4.0 items / order</span>
                            </div>
                          </div>
                        </div>
                        <div className="col-6 col-lg-3">
                          <div className="pos-shift-kpi-card kpi-purple">
                            <div className="kpi-icon-wrap"><i className="ri-wallet-3-line"></i></div>
                            <div className="kpi-info">
                              <span className="kpi-label">Cash in Drawer</span>
                              <h3 className="kpi-value">{fmt(shiftStats.expectedDrawerCash)}</h3>
                              <span className="kpi-subtext text-purple">Float {fmt(shiftStats.startingFloat)} + Cash</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 4 Secondary Shift Intelligence Tiles */}
                      <div className="row g-3 mb-4">
                        {/* Target Progress */}
                        <div className="col-6 col-lg-3">
                          <div className="pos-intel-tile">
                            <div className="d-flex justify-content-between align-items-center mb-1.5">
                              <span className="pos-intel-label"><i className="ri-flag-2-line text-emerald me-1"></i>Shift Target</span>
                              <span className="pos-intel-badge">{shiftStats.targetPct}%</span>
                            </div>
                            <div className="pos-intel-num mb-1.5">{fmt(shiftStats.totalSales)} <span className="text-muted font-normal fs-11">/ {fmt(shiftStats.salesTarget)}</span></div>
                            <div className="pos-intel-progress">
                              <div className="pos-intel-bar bg-emerald" style={{ width: `${shiftStats.targetPct}%` }}></div>
                            </div>
                          </div>
                        </div>

                        {/* Estimated Commission */}
                        <div className="col-6 col-lg-3">
                          <div className="pos-intel-tile">
                            <div className="d-flex justify-content-between align-items-center mb-1.5">
                              <span className="pos-intel-label"><i className="ri-award-line text-amber me-1"></i>Est. Commission (2%)</span>
                              <span className="badge bg-amber-subtle text-amber rounded-pill px-2 py-0.5 text-xs">Active Tier</span>
                            </div>
                            <div className="pos-intel-num text-amber">{fmt(shiftStats.estCommission)}</div>
                            <div className="text-muted text-xs">Accrued shift bonus</div>
                          </div>
                        </div>

                        {/* VAT / Net Revenue */}
                        <div className="col-6 col-lg-3">
                          <div className="pos-intel-tile">
                            <div className="d-flex justify-content-between align-items-center mb-1.5">
                              <span className="pos-intel-label"><i className="ri-file-shield-2-line text-blue me-1"></i>Tax & VAT (7.5%)</span>
                              <span className="text-muted text-xs">FIRS Reconciled</span>
                            </div>
                            <div className="pos-intel-num">{fmt(shiftStats.vatCollected)}</div>
                            <div className="text-muted text-xs">Net Sales: <strong className="text-main">{fmt(shiftStats.netRevenue)}</strong></div>
                          </div>
                        </div>

                        {/* Customer Loyalty Breakdown */}
                        <div className="col-6 col-lg-3">
                          <div className="pos-intel-tile">
                            <div className="d-flex justify-content-between align-items-center mb-1.5">
                              <span className="pos-intel-label"><i className="ri-user-star-line text-purple me-1"></i>Customer Loyalty</span>
                              <span className="badge bg-purple-subtle text-purple rounded-pill px-2 py-0.5 text-xs">{shiftStats.loyaltyPtsIssued} pts</span>
                            </div>
                            <div className="pos-intel-num">{shiftStats.memberCount} Members <span className="text-muted font-normal fs-11">/ {shiftStats.walkinCount} Walk-ins</span></div>
                            <div className="text-muted text-xs">67% Registered Loyalty</div>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Tender Methods & Cash Drawer Audit */}
                      <div className="row g-4 mb-4">
                        {/* Left: Payment Method Distribution */}
                        <div className="col-lg-7">
                          <div className="pos-analytics-panel h-100">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h6 className="pos-panel-section-title mb-0">
                                <i className="ri-bank-card-line me-1.5 text-emerald"></i>Tender Methods Breakdown & Distribution
                              </h6>
                              <span className="badge bg-emerald-subtle text-emerald rounded-pill px-2.5 py-0.5 text-xs fw-bold">100% Balanced</span>
                            </div>

                            {/* Multi-color Distribution Bar */}
                            <div className="pos-tender-bar-wrapper mb-3.5">
                              <div className="pos-tender-bar">
                                <div className="pos-tender-seg cash" style={{ width: `${cashPct || 0}%` }} title={`Cash: ${fmt(shiftStats.cashSales)} (${cashPct}%)`}></div>
                                <div className="pos-tender-seg card" style={{ width: `${cardPct || 0}%` }} title={`Card/POS: ${fmt(shiftStats.cardSales)} (${cardPct}%)`}></div>
                                <div className="pos-tender-seg transfer" style={{ width: `${transferPct || 0}%` }} title={`Transfer: ${fmt(shiftStats.transferSales)} (${transferPct}%)`}></div>
                                <div className="pos-tender-seg split" style={{ width: `${splitPct || 0}%` }} title={`Split/Other: ${fmt(shiftStats.splitSales)} (${splitPct}%)`}></div>
                              </div>
                            </div>

                            {/* Method Grid */}
                            <div className="row g-2.5">
                              <div className="col-6 col-md-3">
                                <div className="pos-tender-metric-box tender-cash">
                                  <div className="d-flex align-items-center gap-1.5 mb-1">
                                    <span className="tender-dot cash"></span>
                                    <span className="tender-name">Cash</span>
                                  </div>
                                  <div className="tender-val">{fmt(shiftStats.cashSales)}</div>
                                  <div className="tender-sub">{cashPct}% share &bull; 2 txns</div>
                                </div>
                              </div>
                              <div className="col-6 col-md-3">
                                <div className="pos-tender-metric-box tender-card">
                                  <div className="d-flex align-items-center gap-1.5 mb-1">
                                    <span className="tender-dot card"></span>
                                    <span className="tender-name">Card / POS</span>
                                  </div>
                                  <div className="tender-val">{fmt(shiftStats.cardSales)}</div>
                                  <div className="tender-sub">{cardPct}% share &bull; 2 txns</div>
                                </div>
                              </div>
                              <div className="col-6 col-md-3">
                                <div className="pos-tender-metric-box tender-transfer">
                                  <div className="d-flex align-items-center gap-1.5 mb-1">
                                    <span className="tender-dot transfer"></span>
                                    <span className="tender-name">Bank Transfer</span>
                                  </div>
                                  <div className="tender-val">{fmt(shiftStats.transferSales)}</div>
                                  <div className="tender-sub">{transferPct}% share &bull; 1 txn</div>
                                </div>
                              </div>
                              <div className="col-6 col-md-3">
                                <div className="pos-tender-metric-box tender-split">
                                  <div className="d-flex align-items-center gap-1.5 mb-1">
                                    <span className="tender-dot split"></span>
                                    <span className="tender-name">QR / USSD</span>
                                  </div>
                                  <div className="tender-val">{fmt(shiftStats.splitSales)}</div>
                                  <div className="tender-sub">{splitPct}% share &bull; 1 txn</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right: Cash Drawer Reconciliation */}
                        <div className="col-lg-5">
                          <div className="pos-analytics-panel h-100 pos-drawer-reconciliation-card">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h6 className="pos-panel-section-title mb-0">
                                <i className="ri-safe-2-line me-1.5 text-warning"></i>Cash Drawer Audit & Float
                              </h6>
                              <span className="badge bg-warning text-dark rounded-pill px-2 py-0.5 text-xs fw-bold">Drawer #01</span>
                            </div>

                            <div className="pos-drawer-audit-lines mb-3">
                              <div className="pos-audit-row">
                                <span className="text-muted">Opening Float (Morning Cash)</span>
                                <strong className="pos-audit-num">{fmt(shiftStats.startingFloat)}</strong>
                              </div>
                              <div className="pos-audit-row">
                                <span className="text-muted">Cash Sales Collected</span>
                                <strong className="pos-audit-num text-success">+ {fmt(shiftStats.cashSales)}</strong>
                              </div>
                              <div className="pos-audit-row">
                                <span className="text-muted">Paid-Outs / Cash Returns</span>
                                <strong className="pos-audit-num text-muted">- ₦0</strong>
                              </div>
                              <div className="pos-audit-divider"></div>
                              <div className="pos-audit-row total-expected">
                                <span className="fw-bold">Expected Physical Cash</span>
                                <strong className="pos-audit-total text-success">{fmt(shiftStats.expectedDrawerCash)}</strong>
                              </div>
                            </div>

                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-outline-secondary w-50 py-2 fw-bold text-xs"
                                onClick={() => setAnalyticsTab('drawer')}>
                                <i className="ri-calculator-line me-1"></i>Count Notes
                              </button>
                              <button
                                className="btn btn-emerald-solid w-50 py-2 fw-bold text-xs d-flex align-items-center justify-content-center gap-1.5"
                                onClick={() => {
                                  closeModal()
                                  showToast('Shift X-Report generated and drawer reconciled.', 'success', '🛡️')
                                }}>
                                <i className="ri-checkbox-circle-line"></i>
                                <span>Reconcile Drawer</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Row: Hourly Sales Velocity & Fast Moving Products */}
                      <div className="row g-4">
                        {/* Left: Hourly Sales Velocity Chart */}
                        <div className="col-lg-6">
                          <div className="pos-analytics-panel h-100">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h6 className="pos-panel-section-title mb-0">
                                <i className="ri-time-line me-1.5 text-primary"></i>Hourly Sales Velocity & Peak Hours
                              </h6>
                              <span className="text-muted text-xs">Peak: 11:00 AM</span>
                            </div>

                            <div className="pos-hourly-chart-wrapper">
                              {shiftStats.hourlyData.map((h, i) => (
                                <div key={i} className="pos-hourly-bar-row">
                                  <div className="pos-hourly-time">{h.hour}</div>
                                  <div className="pos-hourly-bar-track">
                                    <div
                                      className={`pos-hourly-bar-fill ${h.isPeak ? 'peak' : ''}`}
                                      style={{ width: `${h.pct}%` }}>
                                    </div>
                                  </div>
                                  <div className="pos-hourly-amount">{fmt(h.amount)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Right: Top Fast Moving Products */}
                        <div className="col-lg-6">
                          <div className="pos-analytics-panel h-100">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h6 className="pos-panel-section-title mb-0">
                                <i className="ri-fire-line me-1.5 text-danger"></i>Top Selling Products in Shift
                              </h6>
                              <span className="text-muted text-xs">By Sales Volume</span>
                            </div>

                            <div className="pos-top-products-list">
                              {shiftStats.topMovingItems.map(item => (
                                <div key={item.rank} className="pos-top-prod-row">
                                  <span className="pos-top-prod-rank">#{item.rank}</span>
                                  <span className="pos-top-prod-icon">{item.icon}</span>
                                  <div className="pos-top-prod-info">
                                    <div className="pos-top-prod-name">{item.name}</div>
                                    <div className="pos-top-prod-sub">{item.sku} &bull; {item.qty} units sold</div>
                                  </div>
                                  <div className="pos-top-prod-val text-end">
                                    <div className="pos-top-prod-amount">{fmt(item.revenue)}</div>
                                    <div className="pos-top-prod-share">{item.share} revenue</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Tab 2: Transaction Ledger */}
                  {analyticsTab === 'ledger' && (
                    <div className="pos-analytics-panel">
                      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                        <div>
                          <h6 className="pos-panel-section-title mb-0">
                            <i className="ri-file-list-3-line me-1.5 text-primary"></i>Shift Transaction Ledger ({historyList.length} Receipts)
                          </h6>
                          <div className="text-muted text-xs">All ring-up receipts issued by this cashier during active shift</div>
                        </div>

                        {/* Filter Tabs */}
                        <div className="d-flex gap-1.5">
                          {['all', 'cash', 'card', 'transfer', 'qr'].map(f => (
                            <button
                              key={f}
                              onClick={() => setAnalyticsFilter(f)}
                              className={`btn btn-sm ${analyticsFilter === f ? 'btn-emerald-solid fw-bold' : 'btn-outline-secondary'} text-xs px-2.5 py-1`}>
                              {f.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="table-responsive pos-shift-table-wrap" style={{ maxHeight: '420px' }}>
                        <table className="table table-hover table-borderless pos-shift-table mb-0 align-middle">
                          <thead>
                            <tr>
                              <th>TIME</th>
                              <th>RECEIPT / INVOICE #</th>
                              <th>CUSTOMER NAME</th>
                              <th>TENDER METHOD</th>
                              <th>STATUS</th>
                              <th className="text-end">AMOUNT</th>
                              <th className="text-center">ACTION</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredLedger.map((h, idx) => (
                              <tr key={h.inv || idx}>
                                <td className="text-muted font-monospace text-xs">{h.time}</td>
                                <td className="fw-bold font-monospace text-main">{h.inv}</td>
                                <td>
                                  <div className="fw-semibold">{h.cust}</div>
                                  <div className="text-muted text-xs">{h.cust === 'Walk-in' ? 'Walk-in Customer' : 'Loyalty Member'}</div>
                                </td>
                                <td>
                                  <span className={`badge pos-tender-badge ${h.method?.toLowerCase().includes('cash') ? 'cash' : h.method?.toLowerCase().includes('card') ? 'card' : 'transfer'}`}>
                                    {h.method}
                                  </span>
                                </td>
                                <td>
                                  <span className="badge bg-success-subtle text-success rounded-pill px-2 py-0.5 text-xs">Paid</span>
                                </td>
                                <td className="text-end fw-bold font-monospace text-success fs-14">{fmt(h.amount)}</td>
                                <td className="text-center">
                                  <button
                                    className="btn btn-outline-secondary btn-sm py-1 px-2.5 text-xs fw-semibold"
                                    onClick={() => {
                                      setSuccessData({
                                        orderId: h.inv,
                                        tenderMethod: h.method,
                                        paidAmount: h.amount,
                                        changeAmount: 0,
                                        lines: [],
                                        customer: h.cust,
                                        time: h.time,
                                      })
                                      setActiveModal('success')
                                    }}>
                                    <i className="ri-printer-line me-1"></i>Reprint Slip
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Cash Float & Denominations Counter */}
                  {analyticsTab === 'drawer' && (
                    <div className="pos-analytics-panel">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                          <h6 className="pos-panel-section-title mb-0">
                            <i className="ri-safe-2-line me-1.5 text-warning"></i>Cash Drawer Physical Count & Denominations
                          </h6>
                          <div className="text-muted text-xs">Input actual bill quantities in the drawer to verify physical balance against system expected float</div>
                        </div>
                        <button
                          className="btn btn-outline-secondary btn-sm text-xs"
                          onClick={() => setDenominations({ 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0 })}>
                          <i className="ri-refresh-line me-1"></i>Reset Counts
                        </button>
                      </div>

                      <div className="row g-4">
                        {/* Denomination Counter Inputs */}
                        <div className="col-lg-7">
                          <div className="pos-denom-table-card">
                            <table className="table table-borderless pos-denom-table mb-0 align-middle">
                              <thead>
                                <tr>
                                  <th>NOTE / BILL</th>
                                  <th style={{ width: 140 }}>QUANTITY</th>
                                  <th className="text-end">SUBTOTAL</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[1000, 500, 200, 100, 50].map(val => {
                                  const count = denominations[val] || 0
                                  const sub = val * count
                                  return (
                                    <tr key={val}>
                                      <td>
                                        <span className="pos-denom-pill">₦{val.toLocaleString()} Note</span>
                                      </td>
                                      <td>
                                        <div className="input-group input-group-sm">
                                          <button
                                            className="btn btn-outline-secondary px-2"
                                            onClick={() => setDenominations(d => ({ ...d, [val]: Math.max(0, (d[val] || 0) - 1) }))}>
                                            -
                                          </button>
                                          <input
                                            type="number"
                                            min="0"
                                            className="form-control text-center fw-bold"
                                            value={count}
                                            onChange={e => setDenominations(d => ({ ...d, [val]: Number(e.target.value) || 0 }))}
                                          />
                                          <button
                                            className="btn btn-outline-secondary px-2"
                                            onClick={() => setDenominations(d => ({ ...d, [val]: (d[val] || 0) + 1 }))}>
                                            +
                                          </button>
                                        </div>
                                      </td>
                                      <td className="text-end fw-bold font-monospace fs-14">{fmt(sub)}</td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Summary & Variance Box */}
                        <div className="col-lg-5">
                          <div className="pos-denom-summary-card h-100 d-flex flex-column justify-content-between p-4">
                            <div>
                              <h6 className="fw-bold mb-3">Reconciliation Summary</h6>
                              <div className="d-flex justify-content-between py-2 border-bottom">
                                <span className="text-muted">Opening Float</span>
                                <strong>{fmt(shiftStats.startingFloat)}</strong>
                              </div>
                              <div className="d-flex justify-content-between py-2 border-bottom">
                                <span className="text-muted">Cash Sales (System)</span>
                                <strong className="text-success">+ {fmt(shiftStats.cashSales)}</strong>
                              </div>
                              <div className="d-flex justify-content-between py-2 border-bottom">
                                <span className="text-muted">Expected Drawer Cash</span>
                                <strong className="font-monospace fs-15 text-main">{fmt(shiftStats.expectedDrawerCash)}</strong>
                              </div>
                              <div className="d-flex justify-content-between py-2 border-bottom bg-emerald-subtle px-2 rounded mt-2">
                                <span className="fw-bold text-emerald">Counted Physical Cash</span>
                                <strong className="font-monospace fs-16 text-emerald">{fmt(shiftStats.countedCash)}</strong>
                              </div>

                              {/* Variance indicator */}
                              <div className="mt-3 p-3 rounded border text-center" style={{ background: shiftStats.drawerVariance === 0 ? '#ecfdf5' : '#fff1f2', borderColor: shiftStats.drawerVariance === 0 ? '#a7f3d0' : '#fecdd3' }}>
                                <div className="text-xs font-semibold" style={{ color: shiftStats.drawerVariance === 0 ? '#059669' : '#e11d48' }}>
                                  {shiftStats.drawerVariance === 0 ? 'STATUS: BALANCED (₦0 VARIANCE)' : `DISCREPANCY: ${fmt(shiftStats.drawerVariance)}`}
                                </div>
                                <div className="text-xs text-muted mt-0.5">
                                  {shiftStats.drawerVariance === 0 ? 'Physical drawer matches system records 100%' : 'Count does not match expected system balance'}
                                </div>
                              </div>
                            </div>

                            <button
                              className="btn btn-emerald-solid w-100 py-2.5 fw-bold mt-4"
                              onClick={() => {
                                closeModal()
                                showToast(`Drawer verified: ${fmt(shiftStats.countedCash)} counted.`, 'success', '🛡️')
                              }}>
                              <i className="ri-shield-check-line me-1"></i>Confirm Reconciliation
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ═══ SCAN TOAST NOTIFICATION ══════════════════════════════════════ */}
      {toast && (
        <div className={`pos-floating-toast ${toast.type}`}>
          <span className="pos-toast-emoji">{toast.icon}</span>
          <span className="pos-toast-message">{toast.msg}</span>
        </div>
      )}

      {/* ═══ HIGH-END LUXURY POS CSS SYSTEM ═══════════════════════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

        /* ── Theme Tokens ── */
        .theme-light {
          --pos-bg: #f1f5f9;
          --pos-header-bg: #ffffff;
          --pos-card-bg: #ffffff;
          --pos-sidebar-bg: #ffffff;
          --pos-border: #e2e8f0;
          --pos-border-subtle: #f8fafc;
          --pos-text-main: #0f172a;
          --pos-text-muted: #64748b;
          --pos-screen-bg: #ffffff;
          --pos-screen-text: #0f172a;
          --pos-input-bg: #f8fafc;
          --pos-input-border: #cbd5e1;
          --pos-input-text: #0f172a;
          --pos-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
          --pos-shadow-md: 0 4px 16px rgba(0, 0, 0, 0.06);
          --pos-shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.08);
          --pos-modal-bg: #ffffff;
          --pos-tray-bg: #f8fafc;
        }

        .theme-dark {
          --pos-bg: #090d16;
          --pos-header-bg: #111827;
          --pos-card-bg: #111827;
          --pos-sidebar-bg: #0d121f;
          --pos-border: #1e293b;
          --pos-border-subtle: rgba(255, 255, 255, 0.05);
          --pos-text-main: #f8fafc;
          --pos-text-muted: #94a3b8;
          --pos-screen-bg: #030712;
          --pos-screen-text: #ffffff;
          --pos-input-bg: #1e293b;
          --pos-input-border: #334155;
          --pos-input-text: #f8fafc;
          --pos-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.25);
          --pos-shadow-md: 0 4px 16px rgba(0, 0, 0, 0.35);
          --pos-shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.5);
          --pos-modal-bg: #111827;
          --pos-tray-bg: #1e293b;
        }

        /* ── Base ── */
        .pos-app-root {
          height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--pos-bg);
          color: var(--pos-text-main);
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11', 'tnum';
          transition: background 0.2s ease, color 0.2s ease;
        }

        /* ── Header ── */
        .pos-nav-header {
          height: 60px;
          display: flex;
          align-items: center;
          padding: 0 20px;
          background: var(--pos-header-bg);
          border-bottom: 1.5px solid var(--pos-border);
          gap: 16px;
          z-index: 100;
          box-shadow: var(--pos-shadow-sm);
        }
        .pos-brand-box {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pos-main-logo {
          height: 40px;
          object-fit: contain;
        }
        .pos-terminal-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          font-size: 10px;
          font-weight: 800;
          color: #059669;
          letter-spacing: 0.5px;
        }
        .theme-dark .pos-terminal-badge {
          background: rgba(5, 150, 105, 0.15);
          border-color: rgba(5, 150, 105, 0.3);
          color: #10b981;
        }
        .pos-live-beacon {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #059669;
          box-shadow: 0 0 8px #059669;
          animation: pulse 2s infinite;
        }

        /* ── Search Capsule ── */
        .pos-search-capsule {
          flex: 1;
          max-width: 540px;
          position: relative;
          margin: 0 auto;
        }
        .pos-search-ico {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #059669;
          font-size: 18px;
          pointer-events: none;
        }
        .pos-search-input {
          width: 100%;
          height: 42px;
          padding-left: 42px;
          padding-right: 95px;
          background: var(--pos-input-bg);
          border: 1.5px solid var(--pos-input-border);
          border-radius: 12px;
          color: var(--pos-text-main);
          font-size: 13px;
          font-weight: 600;
          outline: none;
          transition: all 0.2s ease;
        }
        .pos-search-input:focus {
          border-color: #059669;
          background: var(--pos-card-bg);
          box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.15);
        }
        .pos-search-clear {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--pos-text-muted);
          font-size: 16px;
          cursor: pointer;
        }
        .pos-scan-badge {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 6px;
          background: #ecfdf5;
          color: #059669;
          font-size: 10px;
          font-weight: 800;
          pointer-events: none;
        }
        .theme-dark .pos-scan-badge {
          background: rgba(5, 150, 105, 0.2);
          color: #10b981;
        }

        /* ── Top HUD Controls ── */
        .pos-hud-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pos-theme-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 10px;
          border: 1.5px solid var(--pos-border);
          background: var(--pos-card-bg);
          color: var(--pos-text-main);
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: var(--pos-shadow-sm);
          transition: all 0.15s ease;
        }
        .pos-theme-btn:hover {
          border-color: #059669;
          transform: translateY(-1px);
        }
        .pos-held-counter-btn {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 7px 14px;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
        }
        .pos-clock-card {
          text-align: right;
          line-height: 1.2;
        }
        .pos-clock-time {
          font-size: 13px;
          font-weight: 800;
          color: var(--pos-text-main);
          letter-spacing: 0.5px;
        }
        .pos-clock-date {
          font-size: 10px;
          color: var(--pos-text-muted);
        }
        .pos-dashboard-exit {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 10px;
          border: 1.5px solid var(--pos-border);
          background: var(--pos-card-bg);
          color: var(--pos-text-muted);
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          box-shadow: var(--pos-shadow-sm);
        }
        .pos-dashboard-exit:hover {
          color: var(--pos-text-main);
          border-color: #94a3b8;
        }
        .pos-cashier-circle {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #059669, #2563eb);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 800;
          font-size: 12px;
          box-shadow: 0 2px 8px rgba(5, 150, 105, 0.25);
        }

        /* ── Workspace ── */
        .pos-layout-body {
          flex: 1;
          display: flex;
          overflow: hidden;
        }
        .pos-catalog-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-right: 1.5px solid var(--pos-border);
        }

        /* ── Topbar Controls ── */
        .pos-header-online-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          border: 1.5px solid #bfdbfe;
          background: #eff6ff;
          color: #2563eb;
          font-size: 11.5px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .theme-dark .pos-header-online-pill {
          background: rgba(37, 99, 235, 0.15);
          border-color: rgba(37, 99, 235, 0.3);
          color: #60a5fa;
        }
        .pos-header-online-pill:hover {
          background: #2563eb;
          border-color: #2563eb;
          color: #fff;
          transform: translateY(-1px);
        }
        .pos-header-analytics-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 6px 14px;
          border-radius: 20px;
          border: 1.5px solid #a7f3d0;
          background: #ecfdf5;
          color: #059669;
          font-size: 11.5px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .theme-dark .pos-header-analytics-pill {
          background: rgba(5, 150, 105, 0.15);
          border-color: rgba(5, 150, 105, 0.3);
          color: #10b981;
        }
        .pos-header-analytics-pill:hover {
          background: #059669;
          border-color: #059669;
          color: #fff;
          transform: translateY(-1px);
        }
        .pos-header-analytics-pill:hover .pos-analytics-shift-badge {
          background: rgba(255, 255, 255, 0.25);
          color: #fff;
        }
        .pos-analytics-shift-badge {
          background: #059669;
          color: #fff;
          font-size: 9.5px;
          font-weight: 800;
          padding: 1px 7px;
          border-radius: 10px;
          font-family: monospace;
        }
        .pos-online-live-chip {
          background: #e11d48;
          color: #fff;
          font-size: 9.5px;
          font-weight: 900;
          padding: 1px 6px;
          border-radius: 10px;
          animation: pulse 2s infinite;
        }
        .pos-icon-circle-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1.5px solid var(--pos-border);
          background: var(--pos-card-bg);
          color: var(--pos-text-main);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          cursor: pointer;
          box-shadow: var(--pos-shadow-sm);
          transition: all 0.15s ease;
        }
        .pos-icon-circle-btn:hover {
          border-color: #059669;
          transform: translateY(-1px);
        }

        /* ── Category Dock ── */
        .pos-category-dock {
          padding: 10px 18px;
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
          background: var(--pos-header-bg);
          border-bottom: 1.5px solid var(--pos-border);
        }
        .pos-dock-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 24px;
          background: var(--pos-bg);
          border: 1.5px solid var(--pos-border);
          color: var(--pos-text-main);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }
        .pos-dock-pill:hover {
          border-color: #059669;
          background: var(--pos-card-bg);
        }
        .pos-dock-pill.active {
          background: #059669;
          color: #fff;
          border-color: #059669;
          box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);
        }
        .pos-dock-count {
          font-size: 10px;
          font-weight: 900;
          padding: 1px 7px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.08);
        }
        .pos-dock-pill.active .pos-dock-count {
          background: rgba(255, 255, 255, 0.25);
          color: #fff;
        }

        /* ── Inventory Grid Area ── */
        .pos-inventory-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 18px;
          background: var(--pos-bg);
        }
        .pos-inventory-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
          gap: 16px;
        }
        .pos-product-tile {
          background: var(--pos-card-bg);
          border: 1.5px solid var(--pos-border);
          border-radius: 16px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
          position: relative;
          box-shadow: var(--pos-shadow-sm);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pos-product-tile:hover {
          transform: translateY(-4px);
          border-color: #059669;
          box-shadow: 0 12px 24px -4px rgba(5, 150, 105, 0.15), var(--pos-shadow-md);
        }
        .pos-product-tile.in-cart-active {
          border-color: #059669;
          box-shadow: 0 0 0 2px #059669, var(--pos-shadow-md);
        }
        .pos-tile-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .pos-stock-tag {
          font-size: 9px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 6px;
          background: #ecfdf5;
          color: #059669;
        }
        .pos-stock-tag.low-warning {
          background: #fffbeb;
          color: #b45309;
        }
        .pos-tile-counter {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #059669;
          color: #fff;
          font-size: 11px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pos-tile-media {
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: var(--pos-bg);
          margin-bottom: 10px;
          overflow: hidden;
          border: 1px solid var(--pos-border-subtle);
        }
        .pos-tile-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .pos-product-tile:hover .pos-tile-img {
          transform: scale(1.08);
        }
        .pos-tile-emoji-fallback {
          font-size: 48px;
        }
        .pos-tile-info {
          margin-bottom: 10px;
        }
        .pos-tile-name {
          font-size: 13.5px;
          font-weight: 800;
          color: var(--pos-text-main);
          line-height: 1.3;
          margin-bottom: 3px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          min-height: 35px;
        }
        .pos-tile-sku {
          font-size: 10px;
          color: var(--pos-text-muted);
        }
        .pos-tile-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 8px;
          border-top: 1px solid var(--pos-border);
        }
        .pos-tile-price {
          font-size: 16px;
          font-weight: 900;
          color: #059669;
          letter-spacing: -0.3px;
        }
        .pos-tile-stepper {
          display: flex;
          align-items: center;
          gap: 3px;
          background: #f1f5f9;
          padding: 2px 4px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
        }
        .theme-dark .pos-tile-stepper {
          background: #1e293b;
          border-color: #334155;
        }
        .pos-tile-step-btn {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          border: none;
          background: #ffffff;
          color: #0f172a;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .theme-dark .pos-tile-step-btn {
          background: #334155;
          color: #fff;
        }
        .pos-tile-step-btn.add {
          background: #059669;
          color: #fff;
        }
        .pos-tile-step-val {
          font-size: 12px;
          font-weight: 900;
          color: var(--pos-text-main);
          min-width: 18px;
          text-align: center;
        }
        .pos-tile-add-btn {
          width: 30px;
          height: 30px;
          border-radius: 10px;
          background: #ecfdf5;
          color: #059669;
          border: 1.5px solid #a7f3d0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          transition: all 0.15s ease;
        }
        .pos-product-tile:hover .pos-tile-add-btn {
          background: #059669;
          color: #fff;
          border-color: #059669;
          box-shadow: 0 4px 10px rgba(5, 150, 105, 0.35);
        }

        /* ── Register Column (Checkout Sidebar) ── */
        .pos-register-column {
          width: 480px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          background: var(--pos-sidebar-bg);
          border-left: 1.5px solid var(--pos-border);
        }
        .pos-held-banner {
          padding: 8px 16px;
          background: #fffbeb;
          border-bottom: 1px solid #fde68a;
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .theme-dark .pos-held-banner {
          background: rgba(245, 158, 11, 0.15);
          border-color: rgba(245, 158, 11, 0.3);
        }
        .pos-held-label {
          font-size: 10px;
          font-weight: 900;
          color: #b45309;
        }
        .pos-held-scroll {
          display: flex;
          gap: 6px;
          overflow-x: auto;
        }
        .pos-held-chip {
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid #d97706;
          background: #ffffff;
          color: #b45309;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }
        .pos-register-topbar {
          padding: 12px 18px;
          border-bottom: 1.5px solid var(--pos-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--pos-header-bg);
        }
        .pos-reg-order-id {
          font-size: 14px;
          font-weight: 900;
          color: #059669;
          letter-spacing: 0.5px;
        }
        .pos-reg-item-count {
          font-size: 11px;
          color: var(--pos-text-muted);
          margin-top: 1px;
        }
        .pos-reg-top-actions {
          display: flex;
          gap: 8px;
        }
        .pos-reg-cust-trigger {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1.5px solid var(--pos-border);
          background: var(--pos-bg);
          color: var(--pos-text-main);
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }
        .pos-reg-cust-trigger.has-cust {
          border-color: #059669;
          background: #ecfdf5;
          color: #059669;
        }
        .pos-reg-clear-btn {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1.5px solid #fecdd3;
          background: #fff1f2;
          color: #e11d48;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        /* ── Customer Drawer ── */
        .pos-customer-drawer {
          padding: 12px 18px;
          border-bottom: 1.5px solid var(--pos-border);
          background: var(--pos-card-bg);
          box-shadow: var(--pos-shadow-md);
        }
        .pos-drawer-input {
          width: 100%;
          height: 38px;
          padding: 0 12px;
          border-radius: 8px;
          background: var(--pos-input-bg);
          border: 1.5px solid var(--pos-input-border);
          color: var(--pos-text-main);
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 10px;
          outline: none;
        }
        .pos-drawer-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 160px;
          overflow-y: auto;
        }
        .pos-drawer-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid var(--pos-border);
          background: var(--pos-bg);
          cursor: pointer;
          text-align: left;
        }
        .pos-drawer-item.active-selection {
          border-color: #059669;
          background: #ecfdf5;
        }
        .pos-drawer-name { font-size: 12px; font-weight: 800; color: var(--pos-text-main); }
        .pos-drawer-phone { font-size: 10px; color: var(--pos-text-muted); }
        .pos-drawer-tier-badge { font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; border: 1px solid transparent; }
        .pos-drawer-points { font-size: 9px; color: var(--pos-text-muted); margin-top: 2px; }
        .pos-drawer-remove-cust {
          width: 100%;
          margin-top: 8px;
          padding: 6px 0;
          border: 1px solid #fecdd3;
          border-radius: 6px;
          background: #fff1f2;
          color: #e11d48;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        /* ── Active Customer Bar ── */
        .pos-active-customer-bar {
          padding: 10px 18px;
          background: #ecfdf5;
          border-bottom: 1px solid #a7f3d0;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .theme-dark .pos-active-customer-bar {
          background: rgba(5, 150, 105, 0.12);
          border-color: rgba(5, 150, 105, 0.25);
        }
        .pos-cust-initials {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 900;
          font-size: 12px;
        }
        .pos-cust-active-name { font-size: 13px; font-weight: 800; color: var(--pos-text-main); }
        .pos-cust-active-sub { font-size: 11px; color: var(--pos-text-muted); margin-top: 1px; }

        /* ── Cart List ── */
        .pos-cart-list-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 6px 0;
          background: var(--pos-bg);
        }
        .pos-empty-cart-state {
          text-align: center;
          padding: 50px 20px;
        }
        .pos-empty-cart-icon { font-size: 48px; margin-bottom: 10px; }
        .pos-empty-cart-title { font-size: 16px; font-weight: 900; color: var(--pos-text-main); }
        .pos-empty-cart-sub { font-size: 12px; color: var(--pos-text-muted); margin-top: 4px; }
        .pos-usb-tip {
          margin-top: 20px;
          padding: 10px 14px;
          background: var(--pos-card-bg);
          border: 1.5px dashed #059669;
          border-radius: 10px;
          font-size: 11px;
          color: #059669;
          font-weight: 700;
        }
        .pos-cart-entry {
          padding: 10px 18px;
          border-bottom: 1px solid var(--pos-border);
          background: var(--pos-card-bg);
          transition: background 0.2s ease;
        }
        .pos-cart-entry.item-flashed {
          background: #ecfdf5;
        }
        .pos-entry-top {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pos-entry-icon-wrap {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          overflow: hidden;
          background: var(--pos-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid var(--pos-border);
        }
        .pos-entry-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .pos-entry-icon { font-size: 20px; }
        .pos-entry-details { flex: 1; overflow: hidden; }
        .pos-entry-title {
          font-size: 13px;
          font-weight: 800;
          color: var(--pos-text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pos-entry-unit-rate { font-size: 11px; color: var(--pos-text-muted); }
        .pos-entry-stepper {
          display: flex;
          align-items: center;
          gap: 3px;
          background: var(--pos-bg);
          padding: 2px 4px;
          border-radius: 8px;
          border: 1px solid var(--pos-border);
        }
        .pos-entry-step-btn {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          border: 1px solid var(--pos-border);
          background: var(--pos-card-bg);
          color: var(--pos-text-main);
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pos-entry-step-input {
          width: 32px;
          height: 22px;
          border: none;
          background: transparent;
          color: var(--pos-text-main);
          text-align: center;
          font-size: 12px;
          font-weight: 900;
          outline: none;
        }
        .pos-entry-total-box {
          min-width: 75px;
          text-align: right;
        }
        .pos-entry-line-total {
          font-size: 13px;
          font-weight: 900;
          color: #059669;
        }
        .pos-entry-remove-btn {
          background: none;
          border: none;
          color: #e11d48;
          font-size: 14px;
          cursor: pointer;
          padding: 0;
          margin-top: 2px;
        }
        .pos-entry-note-input {
          width: 100%;
          height: 26px;
          margin-top: 6px;
          padding: 0 8px;
          border-radius: 6px;
          background: var(--pos-bg);
          border: 1px dashed var(--pos-border);
          color: var(--pos-text-muted);
          font-size: 10px;
          outline: none;
        }

        /* ── Order Note & Discount Strip ── */
        .pos-order-note-container {
          padding: 8px 18px;
          border-top: 1px solid var(--pos-border);
          background: var(--pos-header-bg);
        }
        .pos-order-note-field {
          width: 100%;
          height: 32px;
          padding: 0 12px;
          border-radius: 8px;
          background: var(--pos-input-bg);
          border: 1.5px solid var(--pos-input-border);
          color: var(--pos-text-main);
          font-size: 11px;
          font-weight: 600;
          outline: none;
        }
        .pos-discount-strip {
          padding: 8px 18px;
          border-top: 1px solid var(--pos-border);
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--pos-header-bg);
        }
        .pos-discount-title {
          font-size: 10px;
          font-weight: 900;
          color: var(--pos-text-muted);
          text-transform: uppercase;
        }
        .pos-discount-btn {
          font-size: 10px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 6px;
          border: 1.5px solid var(--pos-border);
          background: var(--pos-bg);
          color: var(--pos-text-main);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .pos-discount-btn.active {
          background: #059669;
          color: #fff;
          border-color: #059669;
          box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3);
        }

        /* ── Electronic Register Display Screen ── */
        .pos-register-screen {
          padding: 14px 18px;
          border-top: 1.5px solid var(--pos-border);
          background: var(--pos-screen-bg);
          color: var(--pos-text-main);
        }
        .pos-screen-line {
          display: flex;
          justify-content: space-between;
          font-size: 12.5px;
          color: var(--pos-text-muted);
          margin-bottom: 5px;
        }
        .pos-screen-line strong {
          color: var(--pos-text-main);
          font-weight: 800;
        }
        .pos-screen-line.discount-highlight {
          color: #e11d48;
          font-weight: 800;
        }
        .pos-screen-total-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
          padding: 14px 18px;
          border-radius: 14px;
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          box-shadow: 0 4px 18px rgba(5, 150, 105, 0.28);
          border: none;
        }
        .theme-dark .pos-screen-total-card {
          background: linear-gradient(135deg, #064e3b 0%, #047857 100%);
          border: 1px solid #10b981;
        }
        .pos-grand-label {
          font-size: 13px;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: 0.5px;
        }
        .pos-grand-sub {
          font-size: 9.5px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.85);
          letter-spacing: 0.5px;
        }
        .pos-grand-value {
          font-size: 26px;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: -0.5px;
        }

        /* ── 1-Tap Tender Grid ── */
        .pos-tender-pad {
          padding: 12px 18px;
          border-top: 1.5px solid var(--pos-border);
          background: var(--pos-header-bg);
        }
        .pos-tender-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .pos-tender-title { font-size: 10px; font-weight: 900; color: var(--pos-text-muted); letter-spacing: 0.5px; }
        .pos-tender-hotkeys { font-size: 9px; color: var(--pos-text-muted); }
        .pos-tender-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .pos-tender-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 10px 4px;
          border-radius: 10px;
          border: 1.5px solid var(--btn-b);
          background: var(--btn-bg);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .theme-dark .pos-tender-btn {
          background: rgba(255, 255, 255, 0.04);
          border-color: var(--btn-b);
        }
        .pos-tender-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .pos-tender-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .pos-tender-ico {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: var(--btn-c);
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .theme-dark .pos-tender-ico {
          background: rgba(0, 0, 0, 0.4);
        }
        .pos-tender-label {
          font-size: 11px;
          font-weight: 800;
          color: var(--pos-text-main);
        }

        /* ── Bottom Utilities ── */
        .pos-footer-utilities {
          display: flex;
          border-top: 1.5px solid var(--pos-border);
          background: var(--pos-header-bg);
        }
        .pos-foot-util-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 10px 2px;
          background: transparent;
          border: none;
          cursor: pointer;
        }
        .pos-foot-util-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .pos-foot-icon-wrap {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
        }
        .pos-foot-text {
          font-size: 10px;
          font-weight: 800;
          color: var(--pos-text-muted);
        }

        /* ── Modals & Overlays ── */
        .pos-backdrop-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(8px);
          z-index: 800;
        }
        .pos-modal-overlay-wrap {
          z-index: 810;
        }
        .pos-modal-card {
          background: var(--pos-modal-bg) !important;
          border: 1.5px solid var(--pos-border) !important;
          border-radius: 20px !important;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0,0,0,0.3) !important;
          color: var(--pos-text-main);
        }
        .pos-modal-header {
          padding: 16px 20px;
        }
        .bg-emerald-solid { background: linear-gradient(135deg, #059669, #10b981) !important; }
        .bg-sapphire-solid { background: linear-gradient(135deg, #2563eb, #3b82f6) !important; }
        .bg-amber-solid { background: linear-gradient(135deg, #f59e0b, #d97706) !important; }
        .bg-purple-solid { background: linear-gradient(135deg, #7c3aed, #8b5cf6) !important; }
        .bg-rose-solid { background: linear-gradient(135deg, #e11d48, #f43f5e) !important; }

        .btn-emerald-solid { background: #059669; color: #fff; border: none; }
        .btn-emerald-solid:hover { background: #047857; color: #fff; }
        .btn-outline-emerald-solid { border: 2px solid #059669; color: #059669; background: transparent; }
        .btn-outline-emerald-solid:hover { background: #059669; color: #fff; }
        .btn-sapphire-solid { background: #2563eb; color: #fff; border: none; }
        .btn-amber-solid { background: #f59e0b; color: #000; border: none; }
        .btn-purple-solid { background: #7c3aed; color: #fff; border: none; }
        .btn-cyan-solid { background: #0891b2; color: #fff; border: none; }

        .pos-modal-ico-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .pos-modal-sub-title { font-size: 11px; color: rgba(255, 255, 255, 0.85); margin-top: 2px; }
        .pos-theme-input {
          background: var(--pos-input-bg) !important;
          border: 1.5px solid var(--pos-input-border) !important;
          color: var(--pos-input-text) !important;
        }
        .pos-entry-item-title { color: var(--pos-text-main) !important; }

        /* ── Online Modal Specifics ── */
        .pos-online-tabs-bar {
          display: flex;
          border-bottom: 1.5px solid var(--pos-border);
          background: var(--pos-tray-bg);
        }
        .pos-online-tab-btn {
          flex: 1;
          padding: 12px 8px;
          border: none;
          background: transparent;
          color: var(--pos-text-muted);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .pos-online-tab-btn.active {
          color: #2563eb;
          border-bottom: 3px solid #2563eb;
          background: var(--pos-modal-bg);
        }
        .pos-tab-badge {
          background: rgba(0, 0, 0, 0.08);
          padding: 1px 6px;
          border-radius: 10px;
          font-size: 10px;
        }
        .pos-online-order-box {
          padding: 14px 16px;
          border-radius: 14px;
          border: 1.5px solid var(--pos-border);
          background: var(--pos-card-bg);
          margin-bottom: 12px;
          box-shadow: var(--pos-shadow-sm);
        }
        .pos-channel-icon-circle {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }
        .pos-order-status-chip {
          font-size: 10px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 12px;
          border: 1px solid transparent;
        }
        .pos-order-expanded-tray {
          background: var(--pos-tray-bg);
          border-radius: 10px;
          padding: 12px;
          border: 1px solid var(--pos-border);
        }
        .pos-order-alert-note {
          padding: 6px 10px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 6px;
          font-size: 11px;
          color: #b45309;
        }

        /* ── Cash Hero Box ── */
        .pos-cash-hero-box {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          border-radius: 12px;
          background: #ecfdf5;
          border: 1.5px solid #a7f3d0;
        }
        .pos-cash-hero-lbl { font-size: 11px; font-weight: 900; color: #059669; text-transform: uppercase; }
        .pos-cash-hero-val { font-size: 24px; font-weight: 900; color: #059669; }
        .pos-cash-hero-tag {
          font-size: 12px;
          font-weight: 900;
          color: #059669;
          background: #d1fae5;
          padding: 4px 10px;
          border-radius: 6px;
        }
        .pos-quick-tender-header { font-size: 10px; font-weight: 900; color: var(--pos-text-muted); text-transform: uppercase; margin-bottom: 8px; }
        .pos-quick-tender-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .pos-quick-tender-pill {
          padding: 10px 4px;
          border-radius: 10px;
          border: 1.5px solid var(--pos-border);
          background: var(--pos-bg);
          color: var(--pos-text-main);
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .pos-quick-tender-pill:hover {
          background: #059669;
          border-color: #059669;
          color: #fff;
          transform: translateY(-2px);
        }
        .pos-change-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-radius: 10px;
        }
        .pos-change-banner.success { background: #ecfdf5; border: 1.5px solid #a7f3d0; color: #059669; }
        .pos-change-banner.danger { background: #fff1f2; border: 1.5px solid #fecdd3; color: #e11d48; }

        /* ── Success Overlay Screen ── */
        .pos-success-screen-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(8px);
          z-index: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .pos-success-hero-card {
          background: var(--pos-modal-bg);
          border: 1.5px solid var(--pos-border);
          border-radius: 24px;
          width: 100%;
          maxWidth: 420px;
          padding: 32px 24px;
          text-align: center;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
          color: var(--pos-text-main);
        }
        .pos-success-check-ring {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #059669, #10b981);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          font-size: 34px;
          color: #fff;
          box-shadow: 0 8px 24px rgba(5, 150, 105, 0.35);
        }
        .pos-success-headline { font-size: 20px; font-weight: 900; color: var(--pos-text-main); margin-bottom: 4px; }
        .pos-success-bill-ref { font-size: 12px; color: var(--pos-text-muted); margin-bottom: 20px; }
        .pos-success-summary-box {
          background: var(--pos-tray-bg);
          border: 1px solid var(--pos-border);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
          text-align: left;
          font-size: 13px;
        }

        /* ── Toast Notification ── */
        .pos-floating-toast {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 999;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 12px 36px rgba(0,0,0,0.25);
          animation: toastSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pos-floating-toast.success { background: #059669; color: #fff; }
        .pos-floating-toast.error { background: #e11d48; color: #fff; }
        .pos-floating-toast.info { background: #2563eb; color: #fff; }

        /* ── Cashier Shift Pill in Header ── */
        .pos-cashier-shift-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px 12px 4px 6px;
          border-radius: 9999px;
          border: 1.5px solid var(--pos-border);
          background: var(--pos-card-bg);
          color: var(--pos-text-main);
          cursor: pointer;
          box-shadow: var(--pos-shadow-sm);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pos-cashier-shift-pill:hover {
          border-color: #059669;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(5, 150, 105, 0.15);
        }
        .pos-cashier-circle-mini {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #059669, #10b981);
          color: #fff;
          font-weight: 800;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3);
        }
        .pos-cashier-shift-name {
          font-size: 11px;
          font-weight: 800;
          color: var(--pos-text-main);
          line-height: 1.1;
        }
        .pos-cashier-shift-stats {
          font-size: 10px;
          line-height: 1.2;
          margin-top: 1px;
        }

        /* ── Shift KPI Cards ── */
        .pos-analytics-card {
          border-radius: 24px !important;
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.4) !important;
        }
        .pos-analytics-ico-box {
          width: 50px !important;
          height: 50px !important;
          font-size: 28px !important;
          border-radius: 14px !important;
        }
        .pos-shift-kpi-card {
          padding: 20px 22px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          gap: 16px;
          border: 1.5px solid var(--pos-border);
          background: var(--pos-tray-bg);
          transition: all 0.2s ease;
        }
        .pos-shift-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.07);
        }
        .kpi-icon-wrap {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          flex-shrink: 0;
        }
        .kpi-emerald { border-left: 5px solid #059669; }
        .kpi-emerald .kpi-icon-wrap { background: #ecfdf5; color: #059669; }
        .kpi-blue { border-left: 5px solid #2563eb; }
        .kpi-blue .kpi-icon-wrap { background: #eff6ff; color: #2563eb; }
        .kpi-amber { border-left: 5px solid #f59e0b; }
        .kpi-amber .kpi-icon-wrap { background: #fffbeb; color: #d97706; }
        .kpi-purple { border-left: 5px solid #7c3aed; }
        .kpi-purple .kpi-icon-wrap { background: #f5f3ff; color: #7c3aed; }

        .theme-dark .kpi-emerald .kpi-icon-wrap { background: rgba(5, 150, 105, 0.2); color: #10b981; }
        .theme-dark .kpi-blue .kpi-icon-wrap { background: rgba(37, 99, 235, 0.2); color: #60a5fa; }
        .theme-dark .kpi-amber .kpi-icon-wrap { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
        .theme-dark .kpi-purple .kpi-icon-wrap { background: rgba(124, 58, 237, 0.2); color: #a78bfa; }

        .kpi-info { flex: 1; }
        .kpi-label { font-size: 11.5px; font-weight: 700; color: var(--pos-text-muted); text-transform: uppercase; letter-spacing: 0.6px; }
        .kpi-value { font-size: 25px; font-weight: 900; color: var(--pos-text-main); margin: 3px 0 2px 0; font-family: monospace; letter-spacing: -0.5px; }
        .kpi-subtext { font-size: 11px; font-weight: 600; }

        /* ── Analytics Panels & Distribution Bar ── */
        .pos-analytics-panel {
          background: var(--pos-tray-bg);
          border: 1.5px solid var(--pos-border);
          border-radius: 18px;
          padding: 22px 24px;
        }
        .pos-panel-section-title {
          font-size: 14.5px;
          font-weight: 800;
          color: var(--pos-text-main);
          display: flex;
          align-items: center;
        }
        .pos-tender-bar-wrapper {
          width: 100%;
          background: rgba(0,0,0,0.06);
          border-radius: 999px;
          padding: 4px;
        }
        .pos-tender-bar {
          display: flex;
          height: 12px;
          border-radius: 999px;
          overflow: hidden;
          gap: 2px;
        }
        .pos-tender-seg.cash { background: #059669; }
        .pos-tender-seg.card { background: #2563eb; }
        .pos-tender-seg.transfer { background: #f59e0b; }
        .pos-tender-seg.split { background: #7c3aed; }

        .pos-tender-metric-box {
          background: var(--pos-card-bg);
          border: 1px solid var(--pos-border);
          border-radius: 14px;
          padding: 12px 14px;
        }
        .tender-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          display: inline-block;
        }
        .tender-dot.cash { background: #059669; }
        .tender-dot.card { background: #2563eb; }
        .tender-dot.transfer { background: #f59e0b; }
        .tender-dot.split { background: #7c3aed; }
        .tender-name { font-size: 11.5px; font-weight: 700; color: var(--pos-text-muted); }
        .tender-val { font-size: 14.5px; font-weight: 800; color: var(--pos-text-main); font-family: monospace; }
        .tender-sub { font-size: 10px; color: var(--pos-text-muted); }

        /* ── Cash Drawer Audit Box ── */
        .pos-drawer-reconciliation-card {
          border-left: 5px solid #f59e0b;
        }
        .pos-drawer-audit-lines {
          background: var(--pos-card-bg);
          border: 1px solid var(--pos-border);
          border-radius: 14px;
          padding: 14px 18px;
        }
        .pos-audit-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          padding: 5px 0;
        }
        .pos-audit-num { font-family: monospace; font-size: 13.5px; }
        .pos-audit-divider {
          height: 1.5px;
          background: var(--pos-border);
          margin: 8px 0;
        }
        .pos-audit-row.total-expected {
          font-size: 14px;
          padding-top: 4px;
        }
        .pos-audit-total {
          font-family: monospace;
          font-size: 18px;
          font-weight: 900;
        }

        /* ── Shift Ledger Table ── */
        .pos-shift-table-wrap {
          background: var(--pos-card-bg);
          border: 1px solid var(--pos-border);
          border-radius: 14px;
          overflow: hidden;
          max-height: 320px;
          overflow-y: auto;
        }
        .pos-shift-table thead th {
          background: var(--pos-tray-bg);
          color: var(--pos-text-muted);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.6px;
          padding: 12px 18px;
          border-bottom: 1.5px solid var(--pos-border);
        }
        .pos-shift-table tbody td {
          padding: 11px 18px;
          font-size: 13px;
          color: var(--pos-text-main);
          border-bottom: 1px solid var(--pos-border);
        }
        .pos-tender-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 8px;
        }
        .pos-tender-badge.cash { background: #ecfdf5; color: #059669; }
        .pos-tender-badge.card { background: #eff6ff; color: #2563eb; }
        .pos-tender-badge.transfer { background: #fffbeb; color: #d97706; }
        .theme-dark .pos-tender-badge.cash { background: rgba(5, 150, 105, 0.2); color: #10b981; }
        .theme-dark .pos-tender-badge.card { background: rgba(37, 99, 235, 0.2); color: #60a5fa; }
        .theme-dark .pos-tender-badge.transfer { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }

        /* ── Shift Analytics Tabs & Intelligence Elements ── */
        .pos-analytics-tabs-bar {
          background: var(--pos-tray-bg);
        }
        .pos-analytics-tab-btn {
          padding: 8px 18px;
          border-radius: 12px;
          border: 1.5px solid transparent;
          background: transparent;
          color: var(--pos-text-muted);
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .pos-analytics-tab-btn:hover {
          color: var(--pos-text-main);
          background: var(--pos-card-bg);
        }
        .pos-analytics-tab-btn.active {
          background: var(--pos-card-bg);
          border-color: var(--pos-border);
          color: #059669;
          box-shadow: var(--pos-shadow-sm);
        }

        /* Intelligence Tiles */
        .pos-intel-tile {
          background: var(--pos-card-bg);
          border: 1.5px solid var(--pos-border);
          border-radius: 14px;
          padding: 14px 16px;
        }
        .pos-intel-label {
          font-size: 11px;
          font-weight: 800;
          color: var(--pos-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .pos-intel-badge {
          font-size: 10px;
          font-weight: 800;
          color: #059669;
          background: #ecfdf5;
          padding: 2px 7px;
          border-radius: 8px;
        }
        .pos-intel-num {
          font-size: 18px;
          font-weight: 900;
          color: var(--pos-text-main);
          font-family: monospace;
        }
        .pos-intel-progress {
          height: 6px;
          background: rgba(0,0,0,0.06);
          border-radius: 999px;
          overflow: hidden;
        }
        .pos-intel-bar {
          height: 100%;
          border-radius: 999px;
          transition: width 0.3s ease;
        }

        /* Hourly Velocity Chart */
        .pos-hourly-chart-wrapper {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .pos-hourly-bar-row {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
        }
        .pos-hourly-time {
          width: 125px;
          font-size: 11px;
          font-weight: 700;
          color: var(--pos-text-muted);
          flex-shrink: 0;
        }
        .pos-hourly-bar-track {
          flex: 1;
          height: 12px;
          background: rgba(0,0,0,0.05);
          border-radius: 999px;
          overflow: hidden;
        }
        .pos-hourly-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #2563eb, #3b82f6);
          border-radius: 999px;
          transition: width 0.3s ease;
        }
        .pos-hourly-bar-fill.peak {
          background: linear-gradient(90deg, #059669, #10b981);
        }
        .pos-hourly-amount {
          width: 75px;
          text-align: right;
          font-weight: 800;
          font-family: monospace;
          color: var(--pos-text-main);
          font-size: 11.5px;
        }

        /* Top Products List */
        .pos-top-products-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pos-top-prod-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: var(--pos-card-bg);
          border: 1px solid var(--pos-border);
          border-radius: 12px;
        }
        .pos-top-prod-rank {
          font-size: 11px;
          font-weight: 900;
          color: var(--pos-text-muted);
          width: 22px;
        }
        .pos-top-prod-icon {
          font-size: 20px;
        }
        .pos-top-prod-info {
          flex: 1;
        }
        .pos-top-prod-name {
          font-size: 12px;
          font-weight: 800;
          color: var(--pos-text-main);
        }
        .pos-top-prod-sub {
          font-size: 10px;
          color: var(--pos-text-muted);
        }
        .pos-top-prod-amount {
          font-size: 12.5px;
          font-weight: 900;
          font-family: monospace;
          color: #059669;
        }
        .pos-top-prod-share {
          font-size: 9.5px;
          color: var(--pos-text-muted);
        }

        /* Denominations Counter Card */
        .pos-denom-table-card {
          background: var(--pos-card-bg);
          border: 1.5px solid var(--pos-border);
          border-radius: 16px;
          padding: 16px;
        }
        .pos-denom-pill {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 8px;
          background: var(--pos-tray-bg);
          font-weight: 800;
          font-size: 12px;
          color: var(--pos-text-main);
          border: 1px solid var(--pos-border);
        }
        .pos-denom-summary-card {
          background: var(--pos-card-bg);
          border: 1.5px solid var(--pos-border);
          border-radius: 16px;
        }

        @keyframes toastSlide { from { opacity: 0; transform: translateY(12px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  )
}
