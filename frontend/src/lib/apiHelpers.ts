// ✅ UNIFIED ERROR HANDLING HELPER
// This file provides consistent error handling across the entire application

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  // Special flags for specific error types
  deleted?: boolean;
  deletedData?: any;
  banned?: boolean;
  banData?: any;
  // HTTP status for debugging
  status?: number;
}

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Handles API responses and normalizes error handling
 */
export async function handleApiResponse<T = any>(
  response: Response
): Promise<ApiResponse<T>> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  // Parse response body
  let body: any;
  try {
    body = isJson ? await response.json() : await response.text();
  } catch (parseError) {
    console.error('Failed to parse response:', parseError);
    body = null;
  }

  // Success response
  if (response.ok) {
    // If body already has success flag, return as-is
    if (typeof body === 'object' && 'success' in body) {
      return body;
    }
    // Otherwise wrap in standard format
    return {
      success: true,
      data: body,
      status: response.status,
    };
  }

  // Error response - normalize format
  console.error(`API Error ${response.status}:`, body);

  // If body is already in our standard format, return it
  if (typeof body === 'object' && 'success' in body) {
    return {
      ...body,
      status: response.status,
    };
  }

  // Otherwise create standard error response
  return {
    success: false,
    error: typeof body === 'string' ? body : body?.error || `HTTP ${response.status} Error`,
    status: response.status,
    data: body,
  };
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: string,
  status: number = 500,
  additionalData?: any
): ApiResponse {
  return {
    success: false,
    error,
    status,
    ...additionalData,
  };
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T = any>(
  data: T,
  status: number = 200
): ApiResponse<T> {
  return {
    success: true,
    data,
    status,
  };
}

/**
 * Type guard to check if response is an error
 */
export function isApiError(response: ApiResponse): response is ApiResponse & { success: false; error: string } {
  return response.success === false && typeof response.error === 'string';
}

/**
 * Type guard to check if response is a success
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true && 'data' in response;
}
