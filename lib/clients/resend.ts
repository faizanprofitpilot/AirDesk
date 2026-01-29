import { Resend } from 'resend';
import { SummaryData, IntakeData, UrgencyLevel } from '@/types';

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  throw new Error('Missing RESEND_API_KEY');
}

export const resend = new Resend(apiKey);

/**
 * Generate a ticket ID in format: HVAC-YYYY-MMDD-####
 */
function generateTicketId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `HVAC-${year}-${month}${day}-${random}`;
}

/**
 * Format phone number for display: (XXX) XXX-XXXX for US numbers
 * Preserves international format for non-US numbers
 */
function formatPhoneNumber(phone: string): string {
  if (!phone || phone === 'Not provided') return phone;
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // US number pattern: +1XXXXXXXXXX or 1XXXXXXXXXX or XXXXXXXXXX
  const usMatch = cleaned.match(/^\+?1?(\d{10})$/);
  if (usMatch) {
    const digits = usMatch[1];
    return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
  }
  
  // Return original if international
  return phone;
}

/**
 * Format phone number for tel: link (E.164 format)
 */
function formatPhoneForTel(phone: string): string {
  if (!phone || phone === 'Not provided') return '';
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // If starts with +, return as-is
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If starts with 1 and 10 digits, add +
  if (cleaned.match(/^1\d{10}$/)) {
    return `+${cleaned}`;
  }
  
  // If 10 digits, assume US and add +1
  if (cleaned.match(/^\d{10}$/)) {
    return `+1${cleaned}`;
  }
  
  // Return with + prefix if missing
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

/**
 * Format address for Google Maps link
 */
function formatAddressForMaps(address: string): string {
  if (!address || address === 'Not provided') return '';
  return encodeURIComponent(address);
}

/**
 * Capitalize city and state names
 */
function capitalizeLocation(text: string): string {
  if (!text) return text;
  return text.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

/**
 * Generate action items based on urgency and priority
 */
function generateActionItems(priority: 'URGENT' | 'NORMAL', urgency: string): string[] {
  if (priority === 'URGENT' || urgency === 'ASAP') {
    return [
      'Dispatch on-call technician immediately',
      'Confirm ETA with caller within 15 minutes',
      'Follow up if no response within 30 minutes'
    ];
  }
  return [
    'Confirm appointment window with caller',
    'Assign technician to service address',
    'Send confirmation text/email when scheduled'
  ];
}

/**
 * Determine priority based on urgency and issue category
 */
function determinePriority(intake: IntakeData): 'URGENT' | 'NORMAL' {
  const urgency = intake.urgency || intake.urgency_level;
  const issueCategory = intake.issueCategory;
  
  // URGENT if "no heat" or "no cool" + ASAP urgency or extreme language
  if ((issueCategory === 'No heat' || issueCategory === 'No cool') && 
      (urgency === 'ASAP' || urgency === 'high')) {
    return 'URGENT';
  }
  
  return 'NORMAL';
}

/**
 * Determine ticket status based on required fields
 */
function determineStatus(intake: IntakeData, sendIncomplete: boolean): 'NEW' | 'INCOMPLETE' {
  const hasName = !!(intake.callerName || intake.full_name);
  const hasPhone = !!(intake.callerPhone || intake.callback_number);
  const hasIssue = !!(intake.issueCategory || intake.issueDescription || intake.reason_for_call);
  
  if (hasName && hasPhone && hasIssue) {
    return 'NEW';
  }
  
  // Only send incomplete if toggle is enabled
  if (sendIncomplete) {
    return 'INCOMPLETE';
  }
  
  // Default to NEW even if incomplete (for backward compatibility)
  return 'NEW';
}

// Helper function to extract caller information from multiple sources
function extractCallerInfo(
  intake: IntakeData,
  summary: SummaryData,
  transcript: string | null
): { name: string; phone: string; address: string; issue: string } {
  let name = intake.callerName || intake.full_name || '';
  let phone = intake.callerPhone || intake.callback_number || '';
  let address = '';
  let issue = intake.issueCategory || intake.issueDescription || intake.reason_for_call || '';

  // Build address from components
  const addressParts: string[] = [];
  if (intake.addressLine1) addressParts.push(intake.addressLine1);
  if (intake.city) addressParts.push(intake.city);
  if (intake.state) addressParts.push(intake.state);
  if (addressParts.length > 0) {
    address = addressParts.join(', ');
  } else if (intake.incident_location) {
    address = intake.incident_location;
  }

  // Try to extract from summary if not in intake
  if (!name && summary.summary_bullets) {
    for (const bullet of summary.summary_bullets) {
      const callerMatch = bullet.match(/Caller\s+(?:is|:)\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|$)/i);
      if (callerMatch && callerMatch[1]) {
        name = callerMatch[1].trim();
        break;
      }
    }
  }

  if (!phone && summary.summary_bullets) {
    for (const bullet of summary.summary_bullets) {
      const phoneMatch = bullet.match(/(?:Phone|Number|Callback):\s*([+\d\s\-\(\)]+)/i);
      if (phoneMatch && phoneMatch[1]) {
        phone = phoneMatch[1].trim();
        break;
      }
    }
  }

  return {
    name: name || 'Not provided',
    phone: phone || 'Not provided',
    address: address || 'Not provided',
    issue: issue || 'Not provided',
  };
}

export async function sendIntakeEmail(
  to: string[],
  intake: IntakeData,
  summary: SummaryData,
  transcript: string | null,
  recordingUrl: string | null,
  urgency: UrgencyLevel,
  callerPhoneNumber?: string, // Optional: caller's phone number from call metadata
  sendIncompleteTickets: boolean = false, // Whether to send incomplete tickets
  ccEmails?: string[], // Optional CC list
  callId?: string, // Optional: call ID for dashboard link
  serviceCallFee?: number // Optional: service call fee amount
) {
  // Extract caller info from multiple sources
  const callerInfo = extractCallerInfo(intake, summary, transcript);
  
  // Use callerPhoneNumber if callback_number is not available
  if (callerInfo.phone === 'Not provided' && callerPhoneNumber) {
    callerInfo.phone = callerPhoneNumber;
  }

  // Generate ticket ID
  const ticketId = generateTicketId();
  
  // Determine priority and status
  const priority = determinePriority(intake);
  const status = determineStatus(intake, sendIncompleteTickets);

  // Format data for display
  const formattedPhone = formatPhoneNumber(callerInfo.phone);
  const telLink = formatPhoneForTel(callerInfo.phone);
  const mapsLink = callerInfo.address !== 'Not provided' 
    ? `https://www.google.com/maps/search/?api=1&query=${formatAddressForMaps(callerInfo.address)}`
    : '';
  const formattedCity = capitalizeLocation(intake.city || '');
  const formattedState = intake.state ? intake.state.toUpperCase() : '';
  const requestedTime = intake.requestedWindow || 'ASAP';
  const issueCategory = intake.issueCategory || 'Not specified';
  const issueDescription = intake.issueDescription || callerInfo.issue || 'Not provided';
  const urgencyReason = intake.urgency || intake.urgency_level || 'Normal';
  
  // Build subject line
  const issueText = callerInfo.issue.length > 30 ? callerInfo.issue.substring(0, 30) + '...' : callerInfo.issue;
  const city = intake.city || 'Unknown';
  const subject = `[NEW HVAC LEAD] ${issueText} – ${city} – ${requestedTime}`;
  
  // Preheader text (hidden preview)
  const preheader = `New HVAC lead: ${issueCategory} in ${formattedCity}${formattedState ? `, ${formattedState}` : ''} — requested ${requestedTime.toLowerCase()}.`;
  
  // Short ticket ID for display (first 8 chars)
  const shortTicketId = ticketId.substring(0, 8);
  
  // Action items
  const actionItems = generateActionItems(priority, urgencyReason);
  
  // Transcript snippet (first ~800 chars or ~12 lines)
  const transcriptLines = transcript ? transcript.split('\n') : [];
  const transcriptSnippet = transcript 
    ? transcriptLines.slice(0, 12).join('\n') + (transcriptLines.length > 12 ? '\n...' : '')
    : '';
  const transcriptLength = transcript ? transcript.length : 0;
  const hasMoreTranscript = transcriptLength > 800;
  
  // Call duration (if available from call metadata - would need to be passed in)
  const callDuration = ''; // TODO: Add if available
  
  // Dashboard URL
  const dashboardUrl = callId ? `https://airdesk.app/calls/${callId}` : 'https://airdesk.app/calls';
  
  // Build HTML email with new design

  // Priority badge colors
  const priorityBgColor = priority === 'URGENT' ? '#F97316' : '#1E40AF';
  const priorityHoverColor = priority === 'URGENT' ? '#EA580C' : '#1E3A8A';
  
  // Status badge
  const statusBgColor = status === 'INCOMPLETE' ? '#F1F5F9' : '#F1F5F9';
  const statusTextColor = status === 'INCOMPLETE' ? '#475569' : '#1F2937';
  const statusBorderColor = '#E2E8F0';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <!-- Preheader -->
  <div style="display: none; font-size: 1px; color: #ffffff; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader}
  </div>
  
  <!-- Main Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="640" style="max-width: 640px; background-color: #ffffff;">
          
          <!-- Header Bar -->
          <tr>
            <td style="padding: 20px 24px; background-color: #ffffff; border-bottom: 1px solid #E2E8F0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td width="50%" align="left" valign="middle">
                    <span style="font-size: 20px; font-weight: 700; color: #1E40AF; letter-spacing: -0.5px;">AirDesk</span>
                  </td>
                  <td width="50%" align="right" valign="middle">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding-right: 8px;">
                          <span style="display: inline-block; padding: 4px 12px; background-color: ${priorityBgColor}; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 4px;">${priority}</span>
                        </td>
                        <td>
                          <span style="display: inline-block; padding: 4px 12px; background-color: ${statusBgColor}; color: ${statusTextColor}; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 4px; border: 1px solid ${statusBorderColor};">${status}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Dispatch Summary Hero Card -->
          <tr>
            <td style="padding: 32px 24px; background-color: #F1F5F9; border-bottom: 1px solid #E2E8F0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <!-- Issue -->
                  <td width="50%" style="padding-bottom: 16px; padding-right: 12px;" valign="top">
                    <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #94A3B8; margin-bottom: 4px;">Issue</div>
                    <div style="font-size: 16px; font-weight: 700; color: #1F2937; line-height: 1.4; margin-bottom: 4px;">${issueCategory}</div>
                    <div style="font-size: 14px; color: #475569; line-height: 1.5;">${issueDescription.length > 60 ? issueDescription.substring(0, 60) + '...' : issueDescription}</div>
                  </td>
                  <!-- Requested Time -->
                  <td width="50%" style="padding-bottom: 16px; padding-left: 12px;" valign="top">
                    <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #94A3B8; margin-bottom: 4px;">Requested Time</div>
                    <div style="font-size: 16px; font-weight: 700; color: #1F2937; line-height: 1.4;">${requestedTime}</div>
                  </td>
                </tr>
                <tr>
                  <!-- Address -->
                  <td width="50%" style="padding-top: 16px; padding-right: 12px; border-top: 1px solid #E2E8F0;" valign="top">
                    <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #94A3B8; margin-bottom: 4px;">Address</div>
                    ${callerInfo.address !== 'Not provided' && mapsLink
                      ? `<a href="${mapsLink}" target="_blank" style="font-size: 16px; font-weight: 700; color: #1E40AF; text-decoration: none; line-height: 1.4; display: block;">${callerInfo.address}</a>`
                      : `<div style="font-size: 16px; font-weight: 700; color: #1F2937; line-height: 1.4;">${callerInfo.address}</div>`
                    }
                  </td>
                  <!-- Caller -->
                  <td width="50%" style="padding-top: 16px; padding-left: 12px; border-top: 1px solid #E2E8F0;" valign="top">
                    <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #94A3B8; margin-bottom: 4px;">Caller</div>
                    <div style="font-size: 16px; font-weight: 700; color: #1F2937; line-height: 1.4; margin-bottom: 4px;">${callerInfo.name !== 'Not provided' ? callerInfo.name : 'Unknown'}</div>
                    ${telLink
                      ? `<a href="tel:${telLink}" style="font-size: 14px; color: #1E40AF; text-decoration: none; font-weight: 600;">${formattedPhone}</a>`
                      : `<div style="font-size: 14px; color: #475569;">${formattedPhone}</div>`
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Primary Actions Row -->
          <tr>
            <td style="padding: 24px; background-color: #ffffff; border-bottom: 1px solid #E2E8F0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <!-- Call Customer Button -->
                        <td style="padding-right: 12px;">
                          ${telLink
                            ? `<a href="tel:${telLink}" style="display: inline-block; padding: 12px 24px; background-color: #1E40AF; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 6px; text-align: center; min-width: 140px;">Call Customer</a>`
                            : `<span style="display: inline-block; padding: 12px 24px; background-color: #94A3B8; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 6px; text-align: center; min-width: 140px; cursor: not-allowed;">Call Customer</span>`
                          }
                        </td>
                        <!-- Open Ticket Button -->
                        <td style="padding-right: 12px;">
                          <a href="${dashboardUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #ffffff; color: #1E40AF; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 6px; border: 2px solid #1E40AF; text-align: center; min-width: 140px;">Open Ticket</a>
                        </td>
                        <!-- Listen to Recording Button (if available) -->
                        ${recordingUrl
                          ? `<td>
                              <a href="${recordingUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #F97316; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 6px; text-align: center; min-width: 140px;">Listen to Recording</a>
                            </td>`
                          : ''
                        }
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Details Section -->
          <tr>
            <td style="padding: 24px; background-color: #ffffff; border-bottom: 1px solid #E2E8F0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <div style="font-size: 13px; font-weight: 600; color: #1F2937; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">Details</div>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #E2E8F0; width: 140px; font-size: 13px; color: #94A3B8; font-weight: 500;">Ticket ID</td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #E2E8F0;">
                          <div style="font-size: 15px; font-weight: 700; color: #1F2937; font-family: 'Courier New', monospace; letter-spacing: 0.5px;">${shortTicketId}</div>
                          <div style="font-size: 11px; color: #94A3B8; margin-top: 2px; font-family: 'Courier New', monospace;">${ticketId}</div>
                        </td>
                      </tr>
                      ${callDuration
                        ? `<tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #94A3B8; font-weight: 500;">Call Duration</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px; color: #475569;">${callDuration}</td>
                          </tr>`
                        : ''
                      }
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #94A3B8; font-weight: 500;">Urgency</td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px; color: #475569;">${urgencyReason}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #94A3B8; font-weight: 500;">Service Fee</td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px; color: #475569;">
                          ${intake.serviceFeeMentioned ? 'Yes' : 'No'}
                          ${intake.serviceFeeMentioned && serviceCallFee ? ` (starts at $${serviceCallFee})` : ''}
                        </td>
                      </tr>
                      ${intake.notes
                        ? `<tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #94A3B8; font-weight: 500;">Notes</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px; color: #475569; line-height: 1.5;">${intake.notes}</td>
                          </tr>`
                        : ''
                      }
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Action Items -->
          ${actionItems.length > 0
            ? `<tr>
                <td style="padding: 24px; background-color: #F1F5F9; border-bottom: 1px solid #E2E8F0;">
                  <div style="font-size: 13px; font-weight: 600; color: #1F2937; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Action Items</div>
                  <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
                    ${actionItems.map(item => `<li style="margin-bottom: 4px;">${item}</li>`).join('')}
                  </ul>
                </td>
              </tr>`
            : ''
          }
          
          <!-- Transcript Section -->
          ${transcriptSnippet
            ? `<tr>
                <td style="padding: 24px; background-color: #F1F5F9; border-bottom: 1px solid #E2E8F0;">
                  <div style="font-size: 13px; font-weight: 600; color: #1F2937; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Call Transcript</div>
                  <div style="background-color: #ffffff; padding: 16px; border: 1px solid #E2E8F0; border-radius: 6px; font-size: 13px; color: #475569; line-height: 1.6; white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; max-height: 300px; overflow-y: auto;">
${transcriptSnippet}${hasMoreTranscript ? '\n\n[Transcript truncated - view full transcript in dashboard]' : ''}
                  </div>
                  ${hasMoreTranscript
                    ? `<div style="margin-top: 12px; text-align: center;">
                        <a href="${dashboardUrl}" target="_blank" style="color: #1E40AF; text-decoration: none; font-size: 13px; font-weight: 600;">View Full Transcript →</a>
                      </div>`
                    : ''
                  }
                </td>
              </tr>`
            : ''
          }
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #ffffff; text-align: center;">
              <div style="font-size: 12px; color: #94A3B8; line-height: 1.6;">
                <p style="margin: 0 0 8px 0;">This ticket was generated automatically by <strong style="color: #1E40AF;">AirDesk</strong>.</p>
                <p style="margin: 0 0 8px 0; color: #475569;"><strong>Important:</strong> Appointments are not confirmed until a team member follows up.</p>
              </div>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  // Plain text version for email clients that don't support HTML
  const text = `
${subject}

Priority: ${priority} | Status: ${status}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DISPATCH SUMMARY

Issue: ${issueCategory}
${issueDescription !== issueCategory ? `Description: ${issueDescription}\n` : ''}Requested Time: ${requestedTime}
Address: ${callerInfo.address !== 'Not provided' ? `${callerInfo.address}\n${mapsLink ? `Map: ${mapsLink}\n` : ''}` : 'Not provided'}
Caller: ${callerInfo.name !== 'Not provided' ? callerInfo.name : 'Unknown'}
Phone: ${formattedPhone}${telLink ? `\nCall: tel:${telLink}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACTIONS

${telLink ? `Call Customer: tel:${telLink}` : 'Call Customer: Phone not available'}
Open Ticket: ${dashboardUrl}
${recordingUrl ? `Listen to Recording: ${recordingUrl}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DETAILS

Ticket ID: ${ticketId}
${callDuration ? `Call Duration: ${callDuration}\n` : ''}Urgency: ${urgencyReason}
Service Fee: ${intake.serviceFeeMentioned ? 'Yes' : 'No'}
${intake.notes ? `Notes: ${intake.notes}\n` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${actionItems.length > 0 ? `ACTION ITEMS\n\n${actionItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` : ''}${transcriptSnippet ? `CALL TRANSCRIPT\n\n${transcriptSnippet}${hasMoreTranscript ? '\n\n[Transcript truncated - view full transcript in dashboard]' : ''}\n\nView Full Transcript: ${dashboardUrl}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` : ''}This ticket was generated automatically by AirDesk.

Important: Appointments are not confirmed until a team member follows up.
  `.trim();

  // Check API key
  if (!apiKey) {
    const error = new Error('RESEND_API_KEY not configured');
    console.error('[Resend] Configuration error:', error.message);
    throw error;
  }

  const maxRetries = 3;
  let lastError: any = null;

  // Use Resend's default from address (works out of the box)
  const fromAddress = 'AirDesk <onboarding@resend.dev>';

  console.log('[Resend] Attempting to send HVAC ticket email:', {
    to,
    cc: ccEmails,
    from: fromAddress,
    subject,
    priority,
    status,
    ticketId,
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Resend] Email attempt ${attempt}/${maxRetries}...`);
      
      const emailOptions: any = {
        from: fromAddress,
        to,
        subject,
        html,
        text,
      };

      // Add CC if provided
      if (ccEmails && ccEmails.length > 0) {
        emailOptions.cc = ccEmails;
      }
      
      const { data, error } = await resend.emails.send(emailOptions);

      if (error) {
        console.error(`[Resend] Resend API returned error on attempt ${attempt}:`, error);
        throw error;
      }

      console.log('[Resend] Email sent successfully:', {
        id: data?.id,
        to,
        cc: ccEmails,
        subject,
        ticketId,
      });

      return data;
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Resend] Email attempt ${attempt}/${maxRetries} failed:`, {
        error: errorMessage,
        attempt,
        to,
      });
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff: 1s, 2s, 4s)
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`[Resend] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  console.error('[Resend] All email attempts failed after', maxRetries, 'retries');
  throw lastError || new Error('Email sending failed after retries');
}
