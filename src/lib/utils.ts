import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

/**
 * Safely encode a query parameter for URL usage
 */
export function encodeQueryParam(value: string): string {
    return encodeURIComponent(value);
}

/**
 * Safely decode a query parameter from URL
 */
export function decodeQueryParam(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        // Return original value if decoding fails
        return value;
    }
}

/**
 * Create a URL with query parameters
 */
export function createUrlWithQuery(path: string, query: string): string {
    const encodedQuery = encodeQueryParam(query);
    return `${path}?q=${encodedQuery}`;
}

/**
 * Extract and decode query parameter from URLSearchParams
 */
export function getQueryParam(searchParams: URLSearchParams, key: string): string | null {
    const value = searchParams.get(key);
    return value ? decodeQueryParam(value) : null;
}
