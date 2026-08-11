const path = require('path');
const fs = require('fs');
const config = require('../config/settings');
const { getSettings } = require('../config/wa-templates');
const { formatCurrency, formatDate } = require('./currency');

/**
 * Generates dynamic Final Invoice Proof URL for a booking without writing static files to disk.
 */
function saveFinalInvoiceSnapshot(booking, db) {
  if (!booking || !booking.id) return null;

  const dynamicUrl = `/api/public/tracking/${booking.tracking_token || booking.id}/invoice`;

  try {
    db.prepare('UPDATE bookings SET final_invoice_url = ? WHERE id = ?').run(dynamicUrl, booking.id);
  } catch (e) {}

  return dynamicUrl;
}

module.exports = {
  saveFinalInvoiceSnapshot
};
