/**
 * In-memory Key-Value Store
 * This replaces Deno KV for Node.js environment
 * For production, consider using Redis
 */

interface KVStore {
    [key: string]: any;
}

const store: KVStore = {};

/**
 * Get value by key
 */
export async function get<T = any>(key: string): Promise<T | null> {
    const value = store[key];
    return value !== undefined ? JSON.parse(JSON.stringify(value)) : null;
}

/**
 * Set value by key
 */
export async function set(key: string, value: any): Promise<void> {
    store[key] = JSON.parse(JSON.stringify(value));
}

/**
 * Delete value by key
 */
export async function del(key: string): Promise<void> {
    delete store[key];
}

/**
 * Get all values with keys matching prefix
 */
export async function getByPrefix<T = any>(prefix: string): Promise<T[]> {
    const results: T[] = [];

    for (const key in store) {
        if (key.startsWith(prefix)) {
            results.push(JSON.parse(JSON.stringify(store[key])));
        }
    }

    return results;
}

/**
 * Delete all keys with prefix
 */
export async function deleteByPrefix(prefix: string): Promise<number> {
    let count = 0;
    const keysToDelete: string[] = [];

    for (const key in store) {
        if (key.startsWith(prefix)) {
            keysToDelete.push(key);
        }
    }

    for (const key of keysToDelete) {
        delete store[key];
        count++;
    }

    return count;
}

/**
 * Clear all data (for testing)
 */
export async function clear(): Promise<void> {
    for (const key in store) {
        delete store[key];
    }
}

/**
 * Get all keys
 */
export async function keys(): Promise<string[]> {
    return Object.keys(store);
}

/**
 * Check if key exists
 */
export async function has(key: string): Promise<boolean> {
    return key in store;
}
