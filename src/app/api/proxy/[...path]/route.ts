import { NextRequest, NextResponse } from 'next/server';

const SCHEDULER_API_BASE = process.env.BACKEND_API_BASE || 'http://localhost:8010/api/v1';

// API Key 验证函数
function validateApiKey(request: NextRequest, path: string): NextResponse | null {
  // 排除 /system/health 接口，不需要 API Key 验证
  if (path === 'system/health') {
    return null; // 不需要验证，继续处理请求
  }

  // 从请求头中获取 X-API-Key
  const providedApiKey = request.headers.get('X-API-Key');
  
  if (!providedApiKey) {
    return NextResponse.json(
      { success: false, error: 'Missing X-API-Key header' },
      { status: 401 }
    );
  }

  // 验证是否为有效的客户端请求
  // 这里我们接受来自前端的 'client-request' 标识
  if (providedApiKey !== 'client-request') {
    return NextResponse.json(
      { 
        success: false, 
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid API key'
        },
        timestamp: new Date().toISOString()
      },
      { status: 401 }
    );
  }

  return null; // 验证通过，继续处理请求
}

// 创建带有 API Key 的请求头
function createHeaders(apiKey: string | undefined, request: NextRequest, path: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // 透传部分安全可控的请求头以保持兼容性
  const authHeader = request.headers.get('Authorization');
  const xRequestedWith = request.headers.get('X-Requested-With');
  if (authHeader) headers['Authorization'] = authHeader;
  if (xRequestedWith) headers['X-Requested-With'] = xRequestedWith;

  // 后端鉴权仅在非健康检查时附加真实 API Key
  if (apiKey && path !== 'system/health') {
    headers['X-API-Key'] = apiKey;
  }

  return headers;
}

// 通用的代理请求处理函数
async function proxyRequest(
  request: NextRequest,
  method: string,
  path: string,
  body?: string
) {
  try {
    // 验证 API Key
    const validationError = validateApiKey(request, path);
    if (validationError) {
      return validationError;
    }

    // 拼接查询参数，确保分页/筛选等功能正常
    const base = `${SCHEDULER_API_BASE}/${path}`;
    const targetUrl = new URL(base);
    const search = request.nextUrl.search;
    if (search) {
      targetUrl.search = search;
    }
    const apiKey = process.env.API_KEY;
    
    const response = await fetch(targetUrl.toString(), {
      method,
      headers: createHeaders(apiKey, request, path),
      body: body || undefined,
    });

    const data = await response.json();
    
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    
    // 检查是否是连接错误（后端服务器未运行）
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BACKEND_UNAVAILABLE',
            message: 'Backend service is not available. Please ensure the scheduler service is running on port 8010.'
          },
          timestamp: new Date().toISOString()
        },
        {
          status: 503,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
          }
        }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: {
          code: 'PROXY_ERROR',
          message: 'Proxy request failed'
        },
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        }
      }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const path = resolvedParams?.path?.join('/') || '';
  return proxyRequest(request, 'GET', path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const path = resolvedParams?.path?.join('/') || '';
  const body = await request.text();
  return proxyRequest(request, 'POST', path, body);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const path = resolvedParams?.path?.join('/') || '';
  const body = await request.text();
  return proxyRequest(request, 'PUT', path, body);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const path = resolvedParams?.path?.join('/') || '';
  return proxyRequest(request, 'DELETE', path);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    },
  });
}
