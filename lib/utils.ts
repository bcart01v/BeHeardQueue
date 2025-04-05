/**
 * Generates a company-specific signup URL
 * @param companyId The ID of the company
 * @param baseUrl The base URL of your application (optional)
 * @returns The complete signup URL with company ID as a query parameter
 */
export function generateCompanySignupLink(companyId: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/signup?companyId=${companyId}`;
}

/**
 * Extracts the company ID from a signup URL
 * @param url The URL to extract the company ID from
 * @returns The company ID or null if not found
 */
export function extractCompanyIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('companyId');
  } catch (error) {
    console.error('Error extracting company ID from URL:', error);
    return null;
  }
} 