/**
 * Script to send a sample HVAC ticket email
 * Usage: node scripts/send-sample-email.js <email>
 */

require('dotenv').config({ path: '.env.local' });

const { sendIntakeEmail } = require('../lib/clients/resend');

const recipientEmail = process.argv[2] || 'faizan.m.dewan@gmail.com';

console.log(`[Sample Email] Sending sample HVAC ticket email to: ${recipientEmail}`);

// Sample HVAC intake data
const sampleIntake = {
  callerName: 'John Smith',
  callerPhone: '+15551234567',
  addressLine1: '123 Main Street',
  city: 'Chicago',
  state: 'IL',
  issueCategory: 'No heat',
  issueDescription: 'Furnace not working, no heat in the house',
  urgency: 'ASAP',
  requestedWindow: 'Tomorrow morning at 8:00 a.m.',
  nextAvailableOffered: true,
  serviceFeeMentioned: false,
  notes: 'Caller mentioned it\'s very cold and they have elderly parents at home',
};

// Sample summary data
const sampleSummary = {
  title: 'No Heat - John Smith - Chicago',
  summary_bullets: [
    'Caller: John Smith',
    'Phone: +1 (555) 123-4567',
    'Issue: No heat - Furnace not working',
    'Address: 123 Main Street, Chicago, IL',
    'Urgency: ASAP (elderly parents at home)',
    'Requested Time: Tomorrow morning at 8:00 a.m.',
  ],
  key_facts: {
    location: '123 Main Street, Chicago, IL',
  },
  action_items: [
    'Dispatch technician to service address',
    'Confirm appointment with caller',
    'Priority: High (no heat + elderly residents)',
  ],
  urgency_level: 'high',
  follow_up_recommendation: 'Dispatch technician ASAP due to no heat and elderly residents',
};

const sampleTranscript = `AI Receptionist: Thank you for calling ABC HVAC. This is Jessica. How can I help you with your HVAC needs today?

Caller: Hi, my furnace isn't working and I have no heat.

AI Receptionist: I understand. Is this something that needs attention ASAP, or can it wait?

Caller: ASAP please. It's very cold and I have elderly parents at home.

AI Receptionist: Got it. What's your name?

Caller: John Smith.

AI Receptionist: Thanks. What's the best number to reach you at?

Caller: 555-123-4567.

AI Receptionist: Thanks. What's the service address?

Caller: 123 Main Street, Chicago, Illinois.

AI Receptionist: When would you like us to come out? We have tomorrow morning at 8:00 a.m. available, or you can let me know your preference.

Caller: Tomorrow morning at 8:00 a.m. works.

AI Receptionist: Thank you. Our team will call or text you shortly to confirm the appointment. Have a great day!`;

const sampleRecordingUrl = null; // No recording for test

async function sendSampleEmail() {
  try {
    const emailResult = await sendIntakeEmail(
      [recipientEmail],
      sampleIntake,
      sampleSummary,
      sampleTranscript,
      sampleRecordingUrl,
      'high', // urgency
      '+15551234567', // caller phone
      false, // send incomplete tickets
      [], // CC emails
      'test-call-id-123', // call ID
      99 // service call fee
    );

    console.log('[Sample Email] ✅ Sample HVAC ticket email sent successfully!');
    console.log(`   Email ID: ${emailResult?.id || 'unknown'}`);
    console.log(`   Recipient: ${recipientEmail}`);
    console.log(`   From: AirDesk <onboarding@resend.dev>`);
    console.log(`   Note: Check your inbox and spam folder.`);
  } catch (error) {
    console.error('[Sample Email] ❌ Error sending email:', error);
    console.error('   Details:', error.message);
    console.error('   Hint: Make sure RESEND_API_KEY is set in .env.local');
    process.exit(1);
  }
}

sendSampleEmail();
