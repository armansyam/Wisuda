/**
 * Wisuda Platform — WA Service (wa.me links only, no Baileys)
 */

const { getDb } = require('../config/database');
const { getWaTemplates, getDefaultWaTemplates, setSetting } = require('../config/wa-templates');

function loadTemplates() {
  return getWaTemplates();
}

function saveTemplates(templates) {
  setSetting('wa_templates', templates, 'WhatsApp templates configuration');
}

function generateWaLink(phone, templateKey, variables) {
  const templates = loadTemplates();
  let message = templates[templateKey] || `Template ${templateKey} not found`;
  
  // Replace variables
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    message = message.replace(regex, value ?? '');
  }
  
  // Clean phone number (remove non-digits, ensure 62 prefix)
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
  if (!cleanPhone.startsWith('62')) cleanPhone = '62' + cleanPhone;
  
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
}

function getTemplate(templateKey) {
  return loadTemplates()[templateKey];
}

function setTemplate(templateKey, template) {
  const templates = loadTemplates();
  templates[templateKey] = template;
  saveTemplates(templates);
}

module.exports = { 
  generateWaLink, 
  getTemplate, 
  setTemplate, 
  loadTemplates,
  saveTemplates 
};