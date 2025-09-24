// app/api/users/secure/route.ts
import { NextRequest } from "next/server";
import { withApiSecurity, createSuccessResponse, createErrorResponse } from "@/lib/apiSecurity";
import { UserService } from "@/lib/userService";
import { UserRole } from "@/types/auth";

async function getUsersHandler(req: NextRequest, context: { user: { uid: string; email?: string; role?: string } }) {
  try {
    // Get query parameters
    const url = new URL(req.url);
    const maxResults = parseInt(url.searchParams.get('limit') || '50');
    const role = url.searchParams.get('role') as UserRole | null;
    
    const users = role 
      ? await UserService.getUsersByRole(role)
      : await UserService.getAllUsers(maxResults);
    
    return createSuccessResponse({
      users,
      total: users.length,
      requestedBy: context.user.uid
    });

  } catch (error: any) {
    return createErrorResponse('Failed to fetch users', 500, error);
  }
}

async function createUserHandler(req: NextRequest, context: { user: { uid: string; email?: string; role?: string } }) {
  try {
    const body = await req.json();
    
    const newUser = await UserService.createUserWithAuth(
      body.email,
      body.role || 'user',
      body.displayName
    );

    return createSuccessResponse({
      user: newUser,
      createdBy: context.user.uid
    }, 201);

  } catch (error: any) {
    return createErrorResponse('Failed to create user', 500, error);
  }
}

// Secure GET endpoint with admin role requirement
export const GET = withApiSecurity(getUsersHandler, {
  rateLimit: { maxRequests: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
  requiredRoles: ['admin'],
});

// Secure POST endpoint with input validation
export const POST = withApiSecurity(createUserHandler, {
  rateLimit: { maxRequests: 20, windowMs: 15 * 60 * 1000 }, // 20 requests per 15 minutes
  requiredRoles: ['admin'],
  validateInput: {
    email: {
      required: true,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    displayName: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 50,
    },
    role: {
      required: false,
      type: 'string',
    }
  }
});