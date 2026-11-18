export function getPaymentStatusMeta(paymentStatus) {
  const s = String(paymentStatus || 'pending').toLowerCase().trim()
  if (s === 'paid' || s === 'completed' || s === 'success') {
    return { label: 'Paid', bg: '#dcfce7', color: '#166534', border: '#bbf7d0' }
  }
  if (s === 'failed' || s === 'declined') {
    return { label: 'Failed', bg: '#fee2e2', color: '#991b1b', border: '#fecaca' }
  }
  if (s === 'refunded') {
    return { label: 'Refunded', bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe' }
  }
  return { label: 'Unpaid', bg: '#fef3c7', color: '#92400e', border: '#fde68a' }
}
