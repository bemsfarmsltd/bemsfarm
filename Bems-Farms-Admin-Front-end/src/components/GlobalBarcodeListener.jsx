import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';

// Audio Synthesizer for Global POS Scan Actions
function playGlobalBeep(type = 'scan') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'scan') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch {
    // Audio muted if blocked
  }
}

const fmt = n => '₦' + Math.round(n || 0).toLocaleString();

export default function GlobalBarcodeListener() {
  const location = useLocation();
  const scanBuffer = useRef('');
  const lastKeyTime = useRef(0);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  // If we are on POS, let the POS barcode listener handle it!
  const isPosPage = location.pathname.includes('/pos') || location.pathname.includes('/settings/pos');

  useEffect(() => {
    if (isPosPage) return; // Do not intercept on POS page

    function onKeyDown(e) {
      const tag = e.target.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // We still capture barcode scans even if they are in an input,
      // IF it's a fast sequence of characters. But typically we don't want to mess up typing.
      // Usually, barcode scanners fire much faster than human typing.
      const now = Date.now();

      if (e.key === 'Enter') {
        if (scanBuffer.current.length >= 3) {
          handleGlobalScan(scanBuffer.current);
          // If they were focused on an input, we might prevent default to avoid submitting a form,
          // but they might also naturally press enter. We'll leave default behavior intact but process the scan.
        }
        scanBuffer.current = '';
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (now - lastKeyTime.current > 100) {
          // If >100ms since last key, it's probably human typing, start over.
          // Scanners are usually < 50ms between strokes.
          scanBuffer.current = '';
        }
        scanBuffer.current += e.key;
        lastKeyTime.current = now;
      }
    }

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [isPosPage]);

  const handleGlobalScan = async (code) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    
    setLoading(true);
    try {
      // Use the POS product lookup endpoint which filters by barcode
      const res = await api.get(`/admin/pos/products?barcode=${encodeURIComponent(trimmed)}`);
      
      const product = res.data.products?.[0];
      
      if (product) {
        playGlobalBeep('success');
        setScannedProduct(product);
      } else {
        playGlobalBeep('error');
        toast.error(`No product found with barcode: ${trimmed}`);
      }
    } catch (err) {
      playGlobalBeep('error');
      toast.error(`Barcode scan failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!scannedProduct) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1055 }}>
      <div className="modal-dialog modal-dialog-centered modal-sm">
        <div className="modal-content shadow-lg border-0 rounded-4 overflow-hidden">
          <div className="modal-header border-0 pb-0 pt-4 px-4 bg-light">
            <div>
              <h5 className="modal-title fw-bold text-dark mb-0">Scanned Product</h5>
              <p className="text-muted fs-xs mb-0">Barcode: {scannedProduct.barcode || '-'}</p>
            </div>
            <button
              type="button"
              className="btn-close shadow-none"
              onClick={() => setScannedProduct(null)}
              style={{ padding: '1rem', margin: '-1rem -1rem -1rem auto' }}
            ></button>
          </div>
          <div className="modal-body p-4 text-center">
            {scannedProduct.image_url ? (
              <img src={scannedProduct.image_url} alt={scannedProduct.name} className="img-fluid rounded-3 mb-3" style={{ maxHeight: '120px', objectFit: 'contain' }} />
            ) : (
              <div className="bg-light rounded-3 d-flex align-items-center justify-content-center mb-3 mx-auto" style={{ height: '120px', width: '120px' }}>
                <i className="ri-shopping-basket-2-line text-muted fs-1"></i>
              </div>
            )}
            
            <h6 className="fw-bold text-dark mb-1">{scannedProduct.name}</h6>
            <div className="d-flex justify-content-center align-items-baseline gap-2 mb-3">
              <span className="fw-bold text-success fs-4">{fmt(scannedProduct.price || scannedProduct.unit_price)}</span>
              <span className="text-muted fs-sm">/ {scannedProduct.unit || 'unit'}</span>
            </div>

            <div className="d-flex justify-content-around bg-light rounded-3 p-2 mb-0 border">
              <div className="text-center">
                <div className="text-muted fs-xs text-uppercase fw-semibold mb-1">Stock</div>
                <div className="fw-bold text-dark fs-sm">{scannedProduct.stock_quantity || 0}</div>
              </div>
              <div className="vr"></div>
              <div className="text-center">
                <div className="text-muted fs-xs text-uppercase fw-semibold mb-1">SKU</div>
                <div className="fw-bold text-dark fs-sm">{scannedProduct.sku || '-'}</div>
              </div>
            </div>
          </div>
          <div className="modal-footer border-0 p-3 bg-light d-flex gap-2">
            <button className="btn btn-outline-secondary w-100 fw-bold" onClick={() => setScannedProduct(null)}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
