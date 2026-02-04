/**
 * Utility functions for safe rendering to prevent "Cannot convert object to primitive value" errors
 */

/**
 * Safely converts any value to string for rendering
 * Prevents objects from being rendered directly in JSX
 */
export function safeString(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  if (typeof value === 'object') {
    // If it's an object, try to extract meaningful value
    if (Array.isArray(value)) {
      return value.map(safeString).join(', ');
    }
    
    // For objects, return empty string or JSON representation
    console.warn('Attempted to render object as string:', value);
    return JSON.stringify(value);
  }
  
  return '';
}

/**
 * Safely get a key for React elements
 * Ensures the key is always a primitive value
 */
export function safeKey(value: any, fallback: string | number): string | number {
  if (value === null || value === undefined) {
    return fallback;
  }
  
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'object') {
    // If it's an object, use fallback
    console.warn('Object used as React key, using fallback:', { value, fallback });
    return fallback;
  }
  
  return String(value);
}

/**
 * Safely render value in JSX
 * Use this when you're unsure if the value might be an object
 */
export function safeRender(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return null;
  }
  
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  
  if (typeof value === 'object') {
    console.error('Cannot render object directly:', value);
    return null;
  }
  
  return value;
}

/**
 * Type guard to check if value is safe to render
 */
export function isSafeToRender(value: any): value is string | number | boolean | null | undefined {
  const type = typeof value;
  return type === 'string' || type === 'number' || type === 'boolean' || value === null || value === undefined;
}

/**
 * Safely get className from potential object
 */
export function safeClassName(...classes: any[]): string {
  return classes
    .filter(Boolean)
    .map(cls => typeof cls === 'string' ? cls : '')
    .filter(Boolean)
    .join(' ');
}
