/**
 * Utility untuk wrap API calls dengan loading state
 */

export interface ApiCallOptions {
  onStart?: () => void;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onFinally?: () => void;
  timeout?: number; // milliseconds, default 30000 (30s)
}

/**
 * Wrapper untuk API calls dengan automatic timeout detection
 */
export async function apiCallWithLoading<T>(
  apiCall: () => Promise<T>,
  options: ApiCallOptions = {}
): Promise<T> {
  const {
    onStart,
    onSuccess,
    onError,
    onFinally,
    timeout = 30000,
  } = options;

  // Start loading
  onStart?.();

  try {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout - jaringan terlalu lambat'));
      }, timeout);
    });

    // Race between API call and timeout
    const result = await Promise.race([
      apiCall(),
      timeoutPromise,
    ]);

    onSuccess?.(result);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
    onError?.(error instanceof Error ? error : new Error(errorMessage));
    throw error;
  } finally {
    onFinally?.();
  }
}

/**
 * Retry utility dengan exponential backoff
 */
export async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    onRetry?: (attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt < maxRetries - 1) {
        onRetry?.(attempt + 1);
        // Exponential backoff
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}
