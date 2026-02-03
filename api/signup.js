// Simple Signup API endpoint for Restocka
// Deploy as Vercel Serverless Function or Node.js endpoint

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-role-key';
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, password, organizationName, plan = 'PRO' } = JSON.parse(event.body);

    // Validate input
    if (!email || !password || !organizationName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Create user account (this would typically use Better Auth or Supabase Auth)
    // For now, we'll create a simple organization record
    
    const { data: org, error: orgError } = await supabase
      .from('organization')
      .insert({
        name: organizationName,
        subscription_status: 'TRIAL',
        subscription_tier: plan,
        trial_start_date: new Date().toISOString(),
        trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        locations_count: 1,
        products_count: 0,
        orders_this_month: 0
      })
      .select()
      .single();

    if (orgError) {
      console.error('Organization creation error:', orgError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create organization' })
      };
    }

    // Create default location
    await supabase.from('location').insert({
      organization_id: org.id,
      name: 'Main Branch',
      address: ''
    });

    // Log the signup
    await supabase.from('usage_logs').insert({
      organization_id: org.id,
      action_type: 'SIGNUP',
      resource_type: 'organization',
      metadata: { email, plan }
    });

    // Return success
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        organization: {
          id: org.id,
          name: org.name,
          trial_ends_at: org.trial_end_date
        },
        message: 'Organization created successfully!',
        next_steps: [
          'Check your email for verification',
          'Add your products to inventory',
          'Set up reorder rules',
          'Invite your team members'
        ]
      })
    };

  } catch (error) {
    console.error('Signup error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
