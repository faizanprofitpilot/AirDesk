import { openai } from '@/lib/clients/openai';
import { IntakeData } from '@/types';

/**
 * Extract structured intake data from transcript using LLM
 * Similar to DineLine's approach - single LLM call for extraction + summary
 */
export async function extractIntakeFromTranscript(
  transcript: string,
  existingIntake?: IntakeData
): Promise<IntakeData> {
  if (!transcript || transcript.trim().length === 0) {
    return existingIntake || {};
  }

  const prompt = `You are extracting structured data from an HVAC service call transcript.

Transcript:
${transcript}

Extract the following information from the transcript and return it as JSON. If information is not available in the transcript, use null.

Return a JSON object with this exact structure. Use null for missing values:
{
  "callerName": "Customer's full name (e.g., 'John Smith') or null",
  "callerPhone": "Phone number in any format (e.g., '2152059732', '215-205-9732', '(215) 205-9732') or null",
  "addressLine1": "Street address (e.g., '123 Pennsylvania Avenue') or null",
  "city": "City name or null",
  "state": "State abbreviation (e.g., 'PA', 'IL') or null",
  "issueCategory": "One of: 'No heat', 'No cool', 'Furnace', 'AC', 'Thermostat', 'Strange noise', 'Leak', 'Other' or null",
  "issueDescription": "Detailed description of the HVAC issue or null",
  "urgency": "One of: 'ASAP', 'can wait' or null",
  "requestedWindow": "Preferred appointment time/date (e.g., 'Tomorrow morning at 8:00 a.m.', 'ASAP', 'Next week') or null"
}

Focus on extracting:
- Customer name (look for "My name is...", "I'm...", "This is...", or when the AI asks for name)
- Phone number (look for digits, phone number patterns)
- Address (look for street addresses, city, state)
- Issue description (what's wrong with the HVAC system)
- Urgency (ASAP, urgent, emergency, or can wait)
- Requested time (when they want service)

Be accurate and only extract information that is clearly stated in the transcript.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an HVAC service call data extraction assistant. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Low temperature for accurate extraction
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.warn('[Extract Intake] No response from OpenAI');
      return existingIntake || {};
    }

    try {
      const extracted = JSON.parse(content) as Record<string, any>;
      
      // Convert null to undefined for TypeScript compatibility
      const normalizeValue = (value: any) => value === null ? undefined : value;
      
      // Merge with existing intake data (existing takes precedence)
      const merged: IntakeData = {
        ...existingIntake,
        // Only use extracted values if existing intake doesn't have them
        callerName: existingIntake?.callerName || normalizeValue(extracted.callerName) || existingIntake?.full_name,
        callerPhone: existingIntake?.callerPhone || normalizeValue(extracted.callerPhone) || existingIntake?.callback_number,
        addressLine1: existingIntake?.addressLine1 || normalizeValue(extracted.addressLine1),
        city: existingIntake?.city || normalizeValue(extracted.city),
        state: existingIntake?.state || normalizeValue(extracted.state),
        issueCategory: existingIntake?.issueCategory || normalizeValue(extracted.issueCategory),
        issueDescription: existingIntake?.issueDescription || normalizeValue(extracted.issueDescription) || existingIntake?.reason_for_call,
        urgency: existingIntake?.urgency || normalizeValue(extracted.urgency),
        requestedWindow: existingIntake?.requestedWindow || normalizeValue(extracted.requestedWindow),
        // Preserve legacy fields for backward compatibility
        full_name: existingIntake?.full_name || normalizeValue(extracted.callerName),
        callback_number: existingIntake?.callback_number || normalizeValue(extracted.callerPhone),
        reason_for_call: existingIntake?.reason_for_call || normalizeValue(extracted.issueDescription),
      };

      // Clean up undefined values (but keep empty strings and other falsy values that might be meaningful)
      Object.keys(merged).forEach(key => {
        if (merged[key as keyof IntakeData] === undefined) {
          delete merged[key as keyof IntakeData];
        }
      });

      console.log('[Extract Intake] Successfully extracted data:', {
        callerName: merged.callerName || merged.full_name,
        callerPhone: merged.callerPhone || merged.callback_number,
        addressLine1: merged.addressLine1,
        city: merged.city,
        issueDescription: merged.issueDescription || merged.reason_for_call,
      });

      return merged;
    } catch (parseError) {
      console.error('[Extract Intake] Failed to parse JSON:', content);
      return existingIntake || {};
    }
  } catch (error) {
    console.error('[Extract Intake] Error calling OpenAI:', error);
    return existingIntake || {};
  }
}
