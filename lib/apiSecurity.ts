import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { UserService } from "@/lib/userService";
import { RolesService } from "@/lib/rolesService";
import { logger } from "@/lib/logger";

// Rate limiting store (in production use Redis or external service)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface AuthenticatedRequest extends NextRequest {
  user?: {
    uid: string;
    email?: string;
    role?: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * Rate limiting middleware
 */
export function rateLimit(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
  return (req: NextRequest): { allowed: boolean; remaining: number } => {
    const identifier = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    const current = rateLimitStore.get(identifier);
    if (!current || current.resetTime < windowStart) {
      rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (current.count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    current.count++;
    rateLimitStore.set(identifier, current);
    return { allowed: true, remaining: maxRequests - current.count };
  };
}

/**
 * Authentication middleware
 */
export async function authenticate(req: NextRequest): Promise<{
  success: boolean;
  user?: { uid: string; email?: string; role?: string };
  error?: string;
}> {
  try {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return { success: false, error: 'Authorization header required' };
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return { success: false, error: 'Token required' };
    }

    const adminAuth = await getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const user = await UserService.getUserById(decodedToken.uid);
    const userRole = user?.role || 'user';

    return {
      success: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: userRole || 'user'
      }
    };
  } catch (error: any) {
    logger.error('Token verification failed', error);
    return { success: false, error: 'Invalid or expired token' };
  }
}

/**
 * Authorization middleware
 */
export async function authorize(
  user: { uid: string; role?: string }, 
  requiredRoles: string[] = [],
  requiredPermissions: string[] = []
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check roles
    if (requiredRoles.length > 0 && user.role) {
      const hasRole = requiredRoles.includes(user.role);
      if (!hasRole) {
        return { success: false, error: 'Insufficient role permissions' };
      }
    }

    // Check specific permissions
    if (requiredPermissions.length > 0) {
      const hasAllPermissions = await Promise.all(
        requiredPermissions.map(permission => 
          RolesService.userHasPermission(user.uid, permission)
        )
      );
      
      if (!hasAllPermissions.every(Boolean)) {
        return { success: false, error: 'Insufficient permissions' };
      }
    }

    return { success: true };
  } catch (error: any) {
    logger.error('Authorization check failed', error);
    return { success: false, error: 'Authorization verification failed' };
  }
}

/**
 * Input validation middleware
 */
export function validateInput<T>(
  data: any,
  schema: {
    [K in keyof T]: {
      required?: boolean;
      type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
    };
  }
): { valid: boolean; errors: string[]; data?: T } {
  const errors: string[] = [];
  const validatedData: any = {};

  for (const [key, rules] of Object.entries(schema)) {
    const value = data[key];
    const rule = rules as {
      required?: boolean;
      type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
    };

    // Required validation
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${key} is required`);
      continue;
    }

    // Skip further validation if value is not provided and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Type validation
    if (rule.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rule.type) {
        errors.push(`${key} must be of type ${rule.type}`);
        continue;
      }
    }

    // String validations
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${key} must be at least ${rule.minLength} characters long`);
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${key} must not exceed ${rule.maxLength} characters`);
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${key} format is invalid`);
      }
    }

    validatedData[key] = value;
  }

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? validatedData : undefined
  };
}

/**
 * Error response formatter
 */
export function createErrorResponse(
  error: string,
  status: number = 500,
  details?: any
): NextResponse<ApiResponse> {
  const response: ApiResponse = {
    success: false,
    error,
    timestamp: new Date().toISOString()
  };

  if (details && process.env.NODE_ENV === 'development') {
    response.data = { details };
  }

  logger.error(`API Error (${status}): ${error}`, details);
  return NextResponse.json(response, { status });
}

/**
 * Success response formatter
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(response, { status });
}

/**
 * Comprehensive API middleware wrapper
 */
export function withApiSecurity(
  handler: (req: NextRequest, context: { user: { uid: string; email?: string; role?: string } }) => Promise<NextResponse>,
  options: {
    rateLimit?: { maxRequests: number; windowMs: number };
    requiredRoles?: string[];
    requiredPermissions?: string[];
    validateInput?: {
      [key: string]: {
        required?: boolean;
        type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
        minLength?: number;
        maxLength?: number;
        pattern?: RegExp;
      };
    };
  } = {}
) {
  return async (req: NextRequest) => {
    try {
      // Rate limiting
      if (options.rateLimit) {
        const { allowed, remaining } = rateLimit(
          options.rateLimit.maxRequests,
          options.rateLimit.windowMs
        )(req);

        if (!allowed) {
          return createErrorResponse('Too many requests', 429);
        }

        // Add rate limit headers
        const response = new NextResponse();
        response.headers.set('X-RateLimit-Remaining', remaining.toString());
      }

      // Authentication
      const authResult = await authenticate(req);
      if (!authResult.success || !authResult.user) {
        return createErrorResponse(authResult.error || 'Authentication failed', 401);
      }

      // Authorization
      if (options.requiredRoles || options.requiredPermissions) {
        const authzResult = await authorize(
          authResult.user,
          options.requiredRoles,
          options.requiredPermissions
        );

        if (!authzResult.success) {
          return createErrorResponse(authzResult.error || 'Authorization failed', 403);
        }
      }

      // Input validation for POST/PUT requests
      if (options.validateInput && (req.method === 'POST' || req.method === 'PUT')) {
        try {
          const body = await req.json();
          const validation = validateInput(body, options.validateInput);
          
          if (!validation.valid) {
            return createErrorResponse(
              `Validation failed: ${validation.errors.join(', ')}`,
              400
            );
          }
        } catch {
          return createErrorResponse('Invalid JSON payload', 400);
        }
      }

      // Execute handler
      return await handler(req, { user: authResult.user });

    } catch (error: any) {
      logger.error('API middleware error', error);
      return createErrorResponse('Internal server error', 500);
    }
  };
}