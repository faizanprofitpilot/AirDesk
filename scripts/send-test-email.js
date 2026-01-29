/**
 * Script to send a sample HVAC ticket email
 * Usage: node scripts/send-test-email.js
 */

const { Resend } = require('resend');

// Check for API key
if (!process.env.RESEND_API_KEY) {
  console.error('❌ Error: RESEND_API_KEY environment variable is not set.');
  console.error('Please set it before running: export RESEND_API_KEY=your_key_here');
  process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

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

// Helper functions (simplified versions from resend.ts)
function extractCallerInfo(intake, summary, transcript) {
  const name = intake.callerName || 'Not provided';
  const phone = intake.callerPhone || 'Not provided';
  const address = intake.addressLine1 
    ? `${intake.addressLine1}${intake.city ? `, ${intake.city}` : ''}${intake.state ? `, ${intake.state}` : ''}`
    : 'Not provided';
  const issue = intake.issueDescription || intake.issueCategory || 'Not specified';
  
  return { name, phone, address, issue };
}

function generateTicketId() {
  return `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function determinePriority(intake) {
  if (intake.urgency === 'ASAP' || intake.urgency === 'high') {
    return 'High';
  }
  return 'Normal';
}

function determineStatus(intake, sendIncompleteTickets) {
  const requiredFields = ['callerName', 'callerPhone', 'addressLine1', 'issueCategory'];
  const missingFields = requiredFields.filter(field => !intake[field]);
  
  if (missingFields.length > 0 && !sendIncompleteTickets) {
    return 'Incomplete';
  }
  return 'Ready to Dispatch';
}

async function sendTestEmail() {
  const toEmail = 'faizan.m.dewan@gmail.com';
  
  const callerInfo = extractCallerInfo(sampleIntake, sampleSummary, sampleTranscript);
  const ticketId = generateTicketId();
  const priority = determinePriority(sampleIntake);
  const status = determineStatus(sampleIntake, false);
  
  const issueText = callerInfo.issue.length > 30 ? callerInfo.issue.substring(0, 30) + '...' : callerInfo.issue;
  const city = sampleIntake.city || 'Unknown';
  const requestedTime = sampleIntake.requestedWindow || 'Not specified';
  const subject = `[NEW HVAC LEAD] ${issueText} – ${city} – ${requestedTime}`;
  
  // Build HTML email
  const ticketDetails = `
    <h3>Ticket Details</h3>
    <ul>
      <li><strong>Ticket ID:</strong> ${ticketId}</li>
      <li><strong>Status:</strong> ${status}</li>
      <li><strong>Priority:</strong> ${priority}</li>
    </ul>
  `;
  
  const callerDetails = `
    <h3>Caller Information</h3>
    <ul>
      <li><strong>Name:</strong> ${callerInfo.name}</li>
      <li><strong>Phone:</strong> ${callerInfo.phone}</li>
      <li><strong>Service Address:</strong> ${callerInfo.address}</li>
    </ul>
  `;
  
  const serviceDetails = `
    <h3>Service Request</h3>
    <ul>
      <li><strong>Issue Category:</strong> ${sampleIntake.issueCategory || 'Not specified'}</li>
      <li><strong>Issue Description:</strong> ${sampleIntake.issueDescription || 'Not provided'}</li>
      <li><strong>Urgency:</strong> ${sampleIntake.urgency || 'Normal'}</li>
      <li><strong>Requested Time:</strong> ${sampleIntake.requestedWindow || 'Not specified'}</li>
      ${sampleIntake.notes ? `<li><strong>Notes:</strong> ${sampleIntake.notes}</li>` : ''}
    </ul>
  `;
  
  const summarySection = `
    <h3>Summary</h3>
    <ul>
      ${sampleSummary.summary_bullets.map(bullet => `<li>${bullet}</li>`).join('')}
    </ul>
  `;
  
  const actionItems = `
    <h3>Action Items</h3>
    <ul>
      ${sampleSummary.action_items.map(item => `<li>${item}</li>`).join('')}
    </ul>
  `;
  
  const transcriptSection = sampleTranscript ? `
    <h3>Call Transcript</h3>
    <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap; font-family: monospace; font-size: 12px;">${sampleTranscript}</pre>
  ` : '';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        h2 { color: #1E40AF; border-bottom: 2px solid #F97316; padding-bottom: 10px; }
        h3 { color: #1E40AF; margin-top: 20px; }
        ul { list-style-type: none; padding-left: 0; }
        li { padding: 5px 0; border-bottom: 1px solid #eee; }
        strong { color: #1F2937; }
        .priority-high { color: #DC2626; font-weight: bold; }
        .priority-normal { color: #059669; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>New HVAC Service Request</h2>
        ${ticketDetails}
        ${callerDetails}
        ${serviceDetails}
        ${summarySection}
        ${actionItems}
        ${transcriptSection}
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
          This ticket was automatically generated by AirDesk AI Receptionist.
        </p>
      </div>
    </body>
    </html>
  `;
  
  const text = `
NEW HVAC SERVICE REQUEST

Ticket Details:
- Ticket ID: ${ticketId}
- Status: ${status}
- Priority: ${priority}

Caller Information:
- Name: ${callerInfo.name}
- Phone: ${callerInfo.phone}
- Service Address: ${callerInfo.address}

Service Request:
- Issue Category: ${sampleIntake.issueCategory || 'Not specified'}
- Issue Description: ${sampleIntake.issueDescription || 'Not provided'}
- Urgency: ${sampleIntake.urgency || 'Normal'}
- Requested Time: ${sampleIntake.requestedWindow || 'Not specified'}
${sampleIntake.notes ? `- Notes: ${sampleIntake.notes}` : ''}

Summary:
${sampleSummary.summary_bullets.map(bullet => `- ${bullet}`).join('\n')}

Action Items:
${sampleSummary.action_items.map(item => `- ${item}`).join('\n')}

${sampleTranscript ? `Call Transcript:\n${sampleTranscript}` : ''}

---
This ticket was automatically generated by AirDesk AI Receptionist.
  `;
  
  try {
    console.log('Sending test email to:', toEmail);
    console.log('Subject:', subject);
    
    const { data, error } = await resend.emails.send({
      from: 'AirDesk <onboarding@resend.dev>',
      to: toEmail,
      subject: subject,
      html: html,
      text: text,
    });
    
    if (error) {
      console.error('Error sending email:', error);
      process.exit(1);
    }
    
    console.log('✅ Email sent successfully!');
    console.log('Email ID:', data?.id);
    console.log('Recipient:', toEmail);
    console.log('\nNote: Check your inbox and spam folder. Emails from onboarding@resend.dev may go to spam.');
  } catch (error) {
    console.error('Failed to send email:', error);
    process.exit(1);
  }
}

sendTestEmail();
