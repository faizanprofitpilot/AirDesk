/**
 * Test script to verify calls are being fetched correctly for Service Calls page
 * This mimics the exact query logic from app/calls/page.tsx
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (match) {
      let value = match[2];
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testServiceCallsQuery() {
  try {
    console.log('🔍 Testing Service Calls Query...\n');

    // Step 1: Get a test firm (or use a specific firm ID)
    const { data: firms, error: firmsError } = await supabase
      .from('firms')
      .select('id, firm_name, owner_user_id')
      .limit(1);

    if (firmsError || !firms || firms.length === 0) {
      console.error('❌ No firms found:', firmsError);
      return;
    }

    const firm = firms[0];
    console.log(`✅ Found firm: ${firm.firm_name} (ID: ${firm.id})\n`);

    // Step 2: Count total calls for this firm
    const { count: totalCalls, error: countError } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', firm.id);

    if (countError) {
      console.error('❌ Error counting calls:', countError);
      return;
    }

    console.log(`📊 Total calls in database: ${totalCalls || 0}\n`);

    // Step 3: Fetch calls using the EXACT query from Service Calls page
    // This mimics app/calls/page.tsx with period='all' (no date filter)
    let query = supabase
      .from('calls')
      .select('*')
      .eq('firm_id', firm.id);

    // No status filter (mimics "All Statuses")
    // No date filter (mimics period='all')

    // Order by started_at descending
    query = query.order('started_at', { ascending: false });

    const { data: calls, error: callsError } = await query;

    if (callsError) {
      console.error('❌ Error fetching calls:', callsError);
      return;
    }

    console.log(`✅ Query returned ${calls?.length || 0} calls\n`);

    if (calls && calls.length > 0) {
      console.log('📋 Call Details:');
      calls.forEach((call, index) => {
        const intake = call.intake_json || {};
        console.log(`\n  ${index + 1}. Call ID: ${call.id}`);
        console.log(`     Status: ${call.status}`);
        console.log(`     Started: ${call.started_at}`);
        console.log(`     From: ${call.from_number || 'N/A'}`);
        console.log(`     Caller Name: ${intake.callerName || intake.full_name || 'N/A'}`);
        console.log(`     Issue: ${intake.issueCategory || 'N/A'}`);
        console.log(`     Urgency: ${intake.urgency || call.urgency || 'normal'}`);
        console.log(`     Has Transcript: ${call.transcript_text ? 'Yes' : 'No'}`);
        console.log(`     Has Intake: ${call.intake_json ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('⚠️  No calls found with this query!');
      console.log('\n🔍 Checking if calls exist with different filters...\n');

      // Check with no filters at all
      const { data: allCalls } = await supabase
        .from('calls')
        .select('id, firm_id, status, started_at')
        .eq('firm_id', firm.id);

      if (allCalls && allCalls.length > 0) {
        console.log(`✅ Found ${allCalls.length} calls with basic query`);
        console.log('   This suggests the issue is with the query filters or ordering\n');
      } else {
        console.log('❌ No calls found even with basic query');
        console.log('   This suggests calls might not be associated with this firm_id\n');
      }
    }

    // Step 4: Compare with dashboard query (which works)
    console.log('\n🔍 Comparing with Dashboard query (which works)...\n');
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data: dashboardCalls } = await supabase
      .from('calls')
      .select('*')
      .eq('firm_id', firm.id)
      .gte('started_at', todayStart.toISOString())
      .lte('started_at', todayEnd.toISOString())
      .order('started_at', { ascending: false })
      .limit(10);

    console.log(`📊 Dashboard query (today only): ${dashboardCalls?.length || 0} calls`);

    // Step 5: Test with date filter
    console.log('\n🔍 Testing with date filter (last 7 days)...\n');
    
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const { data: weekCalls } = await supabase
      .from('calls')
      .select('*')
      .eq('firm_id', firm.id)
      .gte('started_at', weekStart.toISOString())
      .order('started_at', { ascending: false });

    console.log(`📊 Last 7 days query: ${weekCalls?.length || 0} calls`);

    console.log('\n✅ Test complete!\n');
    console.log('Summary:');
    console.log(`  - Total calls in DB: ${totalCalls || 0}`);
    console.log(`  - Service Calls query (no filters): ${calls?.length || 0}`);
    console.log(`  - Dashboard query (today): ${dashboardCalls?.length || 0}`);
    console.log(`  - Last 7 days query: ${weekCalls?.length || 0}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testServiceCallsQuery();
