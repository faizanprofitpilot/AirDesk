/**
 * Build Vapi agent configuration for an HVAC business
 */
export function buildVapiAgent(
  businessName: string,
  agentName?: string | null,
  customGreeting?: string | null,
  knowledgeBase?: string | null,
  defaultNextAvailable?: string | null,
  serviceFeeEnabled?: boolean,
  serviceCallFee?: number | null
) {
  const agentNameText = agentName || 'an AI assistant';
  const greeting = customGreeting 
    ? customGreeting.replace(/{{business_name}}/g, businessName).replace(/{{agent_name}}/g, agentNameText)
    : `Thank you for calling ${businessName}. This is ${agentNameText}. How can I help you with your HVAC needs today?`;

  const baseSystemPrompt = `You are a professional HVAC phone receptionist for ${businessName}.

Rules:
- One question at a time
- Short sentences (under 15 words when possible)
- Always acknowledge before asking
- Never promise an exact appointment time - always say "Our team will call/text shortly to confirm the appointment"
- Never promise a total price - only mention service call fee if asked, with disclaimer that final cost depends on the work needed
- If caller asks about medical/legal/anything unrelated to HVAC: politely redirect to HVAC service
- Wait for the caller to finish speaking completely before responding - NEVER interrupt
- When you have collected all necessary information (name, phone, address, issue, scheduling preference), say goodbye and end the call
- End the call by saying: "Thank you. Our team will call or text you shortly to confirm the appointment. Have a great day!"
- After saying goodbye, the call will automatically end`;

  // Append knowledge base (business information) if provided
  const systemPrompt = knowledgeBase && knowledgeBase.trim()
    ? `${baseSystemPrompt}\n\nBusiness Information:\n${knowledgeBase.trim()}`
    : baseSystemPrompt;

  // Log knowledge base configuration for debugging
  if (knowledgeBase && knowledgeBase.trim()) {
    console.log(`[buildVapiAgent] Knowledge base applied: ${knowledgeBase.substring(0, 100)}...`);
  }

  return {
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.4,
      maxTokens: 180,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
      ],
    },
    voice: {
      provider: 'deepgram',
      voiceId: 'asteria', // Vapi uses just the voice name, not 'aura-asteria-en'
    },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
    },
    firstMessage: greeting,
    // Configure stopSpeakingPlan to prevent interruptions
    // High values mean agent waits longer before interrupting
    stopSpeakingPlan: {
      numWords: 5, // Wait for caller to say at least 5 words before considering interruption
      voiceSeconds: 0.5, // Require 0.5 seconds of continuous speech before stopping (max allowed by Vapi)
      backoffSeconds: 2.0, // Wait 2 seconds after interruption before resuming
    },
    // Note: Call ending will be handled via server webhook when agent says goodbye
    // The webhook will detect the goodbye message and end the call
  };
}
