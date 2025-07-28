// Modern Vercel Function using Web API format
export async function GET(request) {
  try {
    // Basic response
    const data = {
      message: 'Hello from AIONET API!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    };

    return Response.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      { 
        error: 'Internal server error',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    return Response.json({
      message: 'POST request received',
      data: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST Error:', error);
    return Response.json(
      { 
        error: 'Bad request',
        message: error.message 
      },
      { status: 400 }
    );
  }
}
