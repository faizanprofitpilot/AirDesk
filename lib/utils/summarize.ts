import { openai } from '@/lib/clients/openai';
import { SummaryData, IntakeData, UrgencyLevel } from '@/types';

export async function generateSummary(
  transcript: string,
  intake: IntakeData
): Promise<SummaryData> {
  const prompt = `You are summarizing an HVAC service call. Generate a structured summary in JSON format.

Transcript:
${transcript}

Intake Data:
${JSON.stringify(intake, null, 2)}

Return a JSON object with this exact structure:
{
  "title": "Brief descriptive title (e.g., 'No Heat - John Doe - Chicago')",
  "summary_bullets": ["Bullet 1", "Bullet 2", "Bullet 3", ...], // 5-8 key points about the service request
  "key_facts": {
    "incident_date": "Date or timeframe if available (legacy field, may be empty)",
    "location": "Service address (city, state) if available",
    "injuries": "Not applicable for HVAC (legacy field, may be empty)",
    "treatment": "Not applicable for HVAC (legacy field, may be empty)",
    "insurance": "Not applicable for HVAC (legacy field, may be empty)"
  },
  "action_items": ["Action 1", "Action 2", ...], // Recommended next steps (e.g., "Dispatch technician", "Confirm appointment")
  "urgency_level": "normal" | "high" | "emergency_redirected",
  "follow_up_recommendation": "Brief recommendation for dispatch team"
}

Focus on:
- Service issue (heating, cooling, etc.)
- Service address
- Urgency level
- Scheduling preference
- Any special notes

Be concise and professional. Focus on actionable information for dispatch.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an HVAC service call summarization assistant. Return only valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  try {
    const parsed = JSON.parse(content) as SummaryData;
    
    // Determine urgency from intake data
    const urgency = intake.urgency || intake.urgency_level;
    const issueCategory = intake.issueCategory;
    
    // Set urgency_level based on HVAC-specific logic
    if (issueCategory === 'No heat' || issueCategory === 'No cool') {
      if (urgency === 'ASAP' || urgency === 'high') {
        parsed.urgency_level = 'high';
      } else {
        parsed.urgency_level = 'normal';
      }
    } else if (intake.emergency_redirected) {
      parsed.urgency_level = 'emergency_redirected';
    } else {
      parsed.urgency_level = (urgency === 'ASAP' || urgency === 'high') ? 'high' : 'normal';
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse summary:', content);
    // Fallback summary
    const callerName = intake.callerName || intake.full_name || 'Unknown';
    const issue = intake.issueCategory || intake.issueDescription || intake.reason_for_call || 'Not specified';
    const city = intake.city || 'Unknown';
    
    return {
      title: `${issue} - ${callerName} - ${city}`,
      summary_bullets: [
        `Caller: ${callerName}`,
        `Phone: ${intake.callerPhone || intake.callback_number || 'Not provided'}`,
        `Issue: ${issue}`,
        `Address: ${intake.addressLine1 || intake.incident_location || 'Not provided'}`,
        `Urgency: ${intake.urgency || intake.urgency_level || 'Not specified'}`,
      ],
      key_facts: {
        incident_date: intake.incident_date_or_timeframe,
        location: intake.city ? `${intake.addressLine1 || ''}, ${intake.city}${intake.state ? `, ${intake.state}` : ''}`.trim() : intake.incident_location,
        injuries: undefined,
        treatment: undefined,
        insurance: undefined,
      },
      action_items: ['Dispatch technician', 'Confirm appointment with caller'],
      urgency_level: (intake.urgency === 'ASAP' || intake.urgency_level === 'high') ? 'high' : 'normal',
      follow_up_recommendation: 'Dispatch technician to service address',
    };
  }
}
