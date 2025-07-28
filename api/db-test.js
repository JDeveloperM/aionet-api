// Database test Vercel Function
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    // Check environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json(
        { 
          error: 'Missing environment variables',
          hasSupabaseUrl: !!process.env.SUPABASE_URL,
          hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        },
        { status: 500 }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test database connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Database error:', error);
      return Response.json(
        { 
          error: 'Database connection failed',
          details: error.message
        },
        { status: 500 }
      );
    }

    return Response.json({
      status: 'Database connected successfully',
      timestamp: new Date().toISOString(),
      testResult: 'OK'
    });

  } catch (error) {
    console.error('Function error:', error);
    return Response.json(
      { 
        error: 'Function execution failed',
        message: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
