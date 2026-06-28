require('dotenv').config();

const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, '..', 'landing', 'index.template.html');
const outputPath = path.join(__dirname, '..', 'landing', 'index.html');

const template = fs.readFileSync(templatePath, 'utf-8');

const googleFormId = process.env.GOOGLE_FORM_ID;
const whatsappNumber = process.env.WHATSAPP_NUMBER;

if (!whatsappNumber) {
  console.error('Error: WHATSAPP_NUMBER is required. Add it to your .env file or pass it as an environment variable.');
  process.exit(1);
}

const whatsappText = 'Привіт! Зійшов з Instagram Reels, хочу дізнатися про SofaSearch';
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText)}`;

let googleFormButton = '';
if (googleFormId) {
  const googleFormUrl = `https://docs.google.com/forms/d/e/${googleFormId}/viewform?usp=pp_url`;
  googleFormButton = `<a class="btn" href="${googleFormUrl}" target="_blank" rel="noopener">✉️ Залишити email</a>`;
}

const html = template
  .replace(/{{WHATSAPP_URL}}/g, whatsappUrl)
  .replace(/{{WHATSAPP_NUMBER}}/g, whatsappNumber)
  .replace('{{GOOGLE_FORM_BUTTON}}', googleFormButton);

fs.writeFileSync(outputPath, html, 'utf-8');
console.log(`Landing page generated: ${outputPath}`);

if (!googleFormId) {
  console.log('Note: GOOGLE_FORM_ID is not set. Only WhatsApp CTA will be shown.');
}
