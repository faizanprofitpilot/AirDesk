// Test script to verify calls page filtering and display logic
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && !match[1].startsWith('#')) {
        process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    });
  }
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Simulate the getDateRange function from app/calls/page.tsx
function getDateRange(searchParams) {
  // If no period specified, show all (no filter)
  if (!searchParams.period || searchParams.period === 'all') {
    return null; // No date filter
  }

  // Custom dates
  if (searchParams.period === 'custom') {
    if (searchParams.start && searchParams.end) {
      return {
        start: new Date(searchParams.start),
        end: new Date(searchParams.end),
      };
    }
    return null;
  }
  
  // If start and end are provided in URL, use them (DateFilter sets these)
  if (searchParams.start && searchParams.end) {
    return {
      start: new Date(searchParams.start),
      end: new Date(searchParams.end),
    };
  }

  // Fallback: calculate from period
  const now = new Date();
  let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let start;

  switch (searchParams.period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    case 'week':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    default:
      return null;
  }

  return { start, end };
}

async function testCallsPage() {
  console.log('=== TESTING CALLS PAGE LOGIC ===\n');
  
  // Get a firm ID
  const { data: firms, error: firmError } = await supabase
    .from('firms')
    .select('id')
    .limit(1);
  
  if (firmError || !firms || firms.length === 0) {
    console.error('❌ Error: No firms found');
    return;
  }
  
  const firmId = firms[0].id;
  console.log(`✓ Using firm_id: ${firmId}\n`);
  
  // Test 1: Get total calls count (no filters)
  console.log('TEST 1: Total calls (no filters)');
  console.log('-----------------------------------');
  const { data: allCalls, error: allError, count: allCount } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .eq('firm_id', firmId);
  
  if (allError) {
    console.error('❌ Error fetching all calls:', allError);
  } else {
    console.log(`✓ Found ${allCount || 0} total calls`);
    if (allCalls && allCalls.length > 0) {
      console.log(`  Sample calls:`);
      allCalls.slice(0, 3).forEach(call => {
        console.log(`    - ${call.id.substring(0, 8)}... | ${call.started_at} | ${call.status}`);
      });
    }
  }
  console.log('');
  
  // Test 2: Test date filter logic - All Time
  console.log('TEST 2: Date filter - "All Time" (no filter)');
  console.log('-----------------------------------');
  const allTimeParams = {};
  const allTimeRange = getDateRange(allTimeParams);
  console.log(`  Period: (none)`);
  console.log(`  Date range: ${allTimeRange ? `${allTimeRange.start} to ${allTimeRange.end}` : 'null (no filter)'}`);
  
  let allTimeQuery = supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .eq('firm_id', firmId);
  
  if (allTimeRange) {
    allTimeQuery = allTimeQuery
      .gte('started_at', allTimeRange.start.toISOString())
      .lte('started_at', allTimeRange.end.toISOString());
  }
  
  const { data: allTimeCalls, count: allTimeCount } = await allTimeQuery.order('started_at', { ascending: false });
  console.log(`  ✓ Result: ${allTimeCount || 0} calls`);
  console.log('');
  
  // Test 3: Test date filter - Today
  console.log('TEST 3: Date filter - "Today"');
  console.log('-----------------------------------');
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  const todayParams = {
    period: 'today',
    start: todayStart.toISOString(),
    end: todayEnd.toISOString()
  };
  const todayRange = getDateRange(todayParams);
  console.log(`  Period: today`);
  console.log(`  Date range: ${todayRange.start.toISOString()} to ${todayRange.end.toISOString()}`);
  
  let todayQuery = supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .eq('firm_id', firmId);
  
  if (todayRange) {
    todayQuery = todayQuery
      .gte('started_at', todayRange.start.toISOString())
      .lte('started_at', todayRange.end.toISOString());
  }
  
  const { data: todayCalls, count: todayCount } = await todayQuery.order('started_at', { ascending: false });
  console.log(`  ✓ Result: ${todayCount || 0} calls`);
  if (todayCalls && todayCalls.length > 0) {
    console.log(`  Sample today calls:`);
    todayCalls.slice(0, 2).forEach(call => {
      console.log(`    - ${call.id.substring(0, 8)}... | ${call.started_at}`);
    });
  }
  console.log('');
  
  // Test 4: Test date filter - Last 7 Days
  console.log('TEST 4: Date filter - "Last 7 Days"');
  console.log('-----------------------------------');
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  const weekParams = {
    period: 'week',
    start: weekStart.toISOString(),
    end: weekEnd.toISOString()
  };
  const weekRange = getDateRange(weekParams);
  console.log(`  Period: week`);
  console.log(`  Date range: ${weekRange.start.toISOString()} to ${weekRange.end.toISOString()}`);
  
  let weekQuery = supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .eq('firm_id', firmId);
  
  if (weekRange) {
    weekQuery = weekQuery
      .gte('started_at', weekRange.start.toISOString())
      .lte('started_at', weekRange.end.toISOString());
  }
  
  const { data: weekCalls, count: weekCount } = await weekQuery.order('started_at', { ascending: false });
  console.log(`  ✓ Result: ${weekCount || 0} calls`);
  console.log('');
  
  // Test 5: Test status filter
  console.log('TEST 5: Status filter - "emailed"');
  console.log('-----------------------------------');
  const { data: emailedCalls, count: emailedCount } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .eq('firm_id', firmId)
    .eq('status', 'emailed')
    .order('started_at', { ascending: false });
  
  console.log(`  ✓ Result: ${emailedCount || 0} calls with status 'emailed'`);
  console.log('');
  
  // Test 6: Combined filters (date + status)
  console.log('TEST 6: Combined filters - "Today" + "emailed"');
  console.log('-----------------------------------');
  let combinedQuery = supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .eq('firm_id', firmId)
    .eq('status', 'emailed');
  
  if (todayRange) {
    combinedQuery = combinedQuery
      .gte('started_at', todayRange.start.toISOString())
      .lte('started_at', todayRange.end.toISOString());
  }
  
  const { data: combinedCalls, count: combinedCount } = await combinedQuery.order('started_at', { ascending: false });
  console.log(`  ✓ Result: ${combinedCount || 0} calls (today + emailed)`);
  console.log('');
  
  // Test 7: Verify calls have required fields for display
  console.log('TEST 7: Verify call data structure');
  console.log('-----------------------------------');
  if (allCalls && allCalls.length > 0) {
    const sampleCall = allCalls[0];
    const requiredFields = ['id', 'firm_id', 'started_at', 'status'];
    const missingFields = requiredFields.filter(field => !sampleCall[field]);
    
    if (missingFields.length === 0) {
      console.log('  ✓ All required fields present');
      console.log(`  Sample call structure:`);
      console.log(`    - id: ${sampleCall.id ? '✓' : '✗'}`);
      console.log(`    - firm_id: ${sampleCall.firm_id ? '✓' : '✗'}`);
      console.log(`    - started_at: ${sampleCall.started_at ? '✓' : '✗'}`);
      console.log(`    - status: ${sampleCall.status ? '✓' : '✗'}`);
      console.log(`    - intake_json: ${sampleCall.intake_json ? '✓' : '✗'}`);
      console.log(`    - transcript_text: ${sampleCall.transcript_text ? '✓' : '✗'}`);
    } else {
      console.log(`  ❌ Missing fields: ${missingFields.join(', ')}`);
    }
  } else {
    console.log('  ⚠ No calls to verify structure');
  }
  console.log('');
  
  // Summary
  console.log('=== SUMMARY ===');
  console.log(`Total calls in database: ${allCount || 0}`);
  console.log(`Calls with "All Time" filter: ${allTimeCount || 0}`);
  console.log(`Calls with "Today" filter: ${todayCount || 0}`);
  console.log(`Calls with "Last 7 Days" filter: ${weekCount || 0}`);
  console.log(`Calls with status "emailed": ${emailedCount || 0}`);
  console.log(`Calls with "Today" + "emailed": ${combinedCount || 0}`);
  console.log('');
  
  // Check for issues
  if (allCount > 0 && allTimeCount === 0) {
    console.log('⚠️  WARNING: Total calls exist but "All Time" filter returns 0!');
  }
  if (allCount > 0 && allTimeCount !== allCount) {
    console.log(`⚠️  WARNING: "All Time" filter should return ${allCount} but returns ${allTimeCount}`);
  }
  if (todayCount > allTimeCount) {
    console.log('⚠️  WARNING: "Today" filter returns more calls than "All Time"!');
  }
  
  console.log('\n✓ Test completed');
}

testCallsPage().catch(console.error);
