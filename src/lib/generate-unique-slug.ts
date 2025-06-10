import { customAlphabet } from "nanoid";
import slugify from "slugify";

export interface GenerateUniqueSlugOptions {
    /** Base string to generate slug from */
    text: string;
    /** Function to check if slug exists */
    checkExists: (slug: string) => Promise<boolean>;
    /** Maximum number of retries (default: 3) */
    maxRetries?: number;
    /** Optional prefix to add before the slug */
    prefix?: string;
    /** Optional suffix to add after the slug */
    suffix?: string;
}

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 6);

/**
 * Generates a URL-safe slug from text with uniqueness check
 * @param text - Text to generate slug from
 * @param checkExists - Function to check if slug exists
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param prefix - Optional prefix to add before the slug
 * @param suffix - Optional suffix to add after the slug
 * @returns A unique slug string
 */
export async function generateUniqueSlug({ text, checkExists, maxRetries = 3, prefix, suffix }: GenerateUniqueSlugOptions): Promise<string> {
    // Convert to lowercase and replace spaces/special chars with hyphens
    let baseSlug = slugify(text, { lower: true, strict: true });

    // Add prefix/suffix if provided
    if (prefix) baseSlug = `${prefix}-${baseSlug}`;
    if (suffix) baseSlug = `${baseSlug}-${suffix}`;

    // Try the base slug first
    if (!(await checkExists(baseSlug))) {
        return baseSlug;
    }

    // Try with random suffixes
    for (let i = 0; i < maxRetries; i++) {
        const uniqueSuffix = nanoid();
        const newSlug = `${baseSlug}-${uniqueSuffix}`;

        if (!(await checkExists(newSlug))) {
            return newSlug;
        }
    }

    // If all retries failed, use timestamp + random string as fallback
    const timestamp = Date.now().toString(36);
    const fallbackSuffix = nanoid();
    return `${baseSlug}-${timestamp}${fallbackSuffix}`;
}
