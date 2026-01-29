# AirDesk MVP

AI phone receptionist for HVAC companies. Answers calls 24/7, captures lead details, and emails dispatch-ready tickets.

## Tech Stack

- **Next.js 16** (App Router) with TypeScript
- **Supabase** (Auth + Database + RLS)
- **Vapi** (AI voice calls + speech recognition)
- **OpenAI** (Structured data extraction + summarization)
- **Resend** (Email delivery)
- **Tailwind CSS** (Styling)

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Vapi account with API key
- OpenAI API key
- Resend API key

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor and run the migration files in the `sql/` directory
3. Get your Supabase credentials:
   - Go to Project Settings → API
   - Copy `Project URL` (NEXT_PUBLIC_SUPABASE_URL)
   - Copy `anon public` key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - Copy `service_role` key (SUPABASE_SERVICE_ROLE_KEY) - keep this secret!

### 3. Vapi Setup

1. Sign up at https://vapi.ai
2. Create an API key
3. Copy the API key (VAPI_API_KEY)

### 4. OpenAI Setup

1. Sign up at https://platform.openai.com
2. Create an API key
3. Copy the API key (OPENAI_API_KEY)

### 5. Resend Setup

1. Sign up at https://resend.com
2. Create an API key
3. Verify a sender domain (or use the default for testing)
4. Copy the API key (RESEND_API_KEY)

### 6. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Vapi
VAPI_API_KEY=your_vapi_api_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Resend
RESEND_API_KEY=your_resend_api_key

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
# For production, use your actual domain:
# NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 7. Local Development with ngrok

For local development, you need to expose your local server to the internet for Vapi webhooks:

1. Install ngrok: https://ngrok.com/download
2. Start your Next.js dev server:
   ```bash
   npm run dev
   ```
3. In another terminal, start ngrok:
   ```bash
   ngrok http 3000
   ```
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. Update `.env.local`:
   ```env
   NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
   ```

**Note**: ngrok URLs change on free tier restarts. For production, use a permanent domain.

## Running the Application

```bash
npm run dev
```

Visit http://localhost:3000 (or your ngrok URL)

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── vapi/          # Vapi webhooks and provisioning
│   │   ├── telephony/     # Phone number provisioning
│   │   └── test-intake-email/ # Test email endpoint
│   ├── (auth)/
│   │   └── login/         # Login page
│   ├── dashboard/         # Dashboard
│   ├── settings/           # Business settings
│   └── calls/              # Call logs
├── lib/
│   ├── clients/            # API clients
│   ├── agent/              # Agent prompts
│   ├── intake/             # Call processing
│   └── utils/              # Utilities
├── components/             # React components
├── types/                  # TypeScript types
└── sql/                    # Database migrations
```

## Key Features

- **24/7 Call Answering**: AI receptionist answers every call, even after hours
- **Lead Qualification**: Captures name, phone, address, issue category, urgency, and scheduling preference
- **Automatic Ticket Generation**: Emails dispatch-ready tickets with Ticket ID, priority, and all details
- **Call Logs**: View all calls with filters, transcripts, and recordings
- **Configurable Settings**: Business name, agent name, notification emails, business hours, service call fee, etc.

## Testing

1. Create a user account via the login page
2. Configure business settings (business name, agent name, notification emails, etc.)
3. Provision a phone number via the dashboard
4. Call your provisioned number
5. Complete the qualification conversation with the AI receptionist
6. Check your email for the HVAC ticket
7. View the call in the dashboard/calls page

## Production Deployment

1. Deploy to Vercel, Railway, or your preferred platform
2. Set environment variables in your hosting platform
3. Update `NEXT_PUBLIC_APP_URL` to your production domain
4. Ensure Resend sender domain is verified
5. Provision phone numbers via the dashboard

## Troubleshooting

- **Webhooks not working**: Ensure ngrok is running (dev) or domain is correct (prod)
- **Calls not routing**: Check business settings and phone number provisioning
- **Emails not sending**: Check Resend API key and sender domain verification
- **RLS errors**: Ensure user is authenticated and owns the business

## License

MIT
