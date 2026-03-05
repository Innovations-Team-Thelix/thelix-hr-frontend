import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';

dayjs.extend(advancedFormat);

/**
 * Merge class names with tailwind-merge to resolve conflicting utilities.
 * Combines clsx (conditional classes) with twMerge (Tailwind dedup).
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-blue-500', 'px-6') // => 'py-2 px-6 bg-blue-500'
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a numeric amount as a currency string.
 * Defaults to Nigerian Naira (NGN / ₦).
 *
 * @example
 * formatCurrency(1500000)           // => '₦1,500,000.00'
 * formatCurrency(1500000, 'USD')    // => '$1,500,000.00'
 * formatCurrency(0)                 // => '₦0.00'
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = 'NGN',
): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);

  if (isNaN(numericAmount)) {
    return currency === 'NGN' ? '₦0.00' : '$0.00';
  }

  const localeMap: Record<string, string> = {
    NGN: 'en-NG',
    USD: 'en-US',
    GBP: 'en-GB',
    EUR: 'de-DE',
  };

  const locale = localeMap[currency] || 'en-NG';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    // Fallback for unsupported currencies
    const formatted = numericAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${currency} ${formatted}`;
  }
}

/**
 * Format a date as a human-readable string.
 *
 * @example
 * formatDate('2025-03-15')            // => '15 Mar 2025'
 * formatDate(new Date(2025, 2, 15))   // => '15 Mar 2025'
 */
export function formatDate(
  date: string | Date | null | undefined,
): string {
  if (!date) return '-';

  const parsed = dayjs(date);
  if (!parsed.isValid()) return '-';

  return parsed.format('D MMM YYYY');
}

/**
 * Format a birth date based on visibility.
 *
 * @param date - The date of birth
 * @param showYear - Whether to show the year (e.g. for HR/Admin)
 * @returns Formatted date string (e.g. "January 22nd" or "January 22, 1990")
 */
export function formatBirthDate(
  date: string | Date | null | undefined,
  showYear: boolean = false,
): string {
  if (!date) return '-';

  const parsed = dayjs(date);
  if (!parsed.isValid()) return '-';

  if (showYear) {
    return parsed.format('MMMM D, YYYY');
  }
  return parsed.format('MMMM Do');
}

/**
 * Format a date range as a concise string.
 * If start and end are in the same month/year, the month and year are not repeated.
 *
 * @example
 * formatDateRange('2025-03-15', '2025-03-20')  // => '15 - 20 Mar 2025'
 * formatDateRange('2025-03-15', '2025-04-02')  // => '15 Mar - 2 Apr 2025'
 * formatDateRange('2024-12-28', '2025-01-03')  // => '28 Dec 2024 - 3 Jan 2025'
 */
export function formatDateRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
): string {
  if (!start || !end) return '-';

  const startDate = dayjs(start);
  const endDate = dayjs(end);

  if (!startDate.isValid() || !endDate.isValid()) return '-';

  const sameYear = startDate.year() === endDate.year();
  const sameMonth = sameYear && startDate.month() === endDate.month();

  if (sameMonth) {
    // "15 - 20 Mar 2025"
    return `${startDate.format('D')} \u2013 ${endDate.format('D MMM YYYY')}`;
  }

  if (sameYear) {
    // "15 Mar - 2 Apr 2025"
    return `${startDate.format('D MMM')} \u2013 ${endDate.format('D MMM YYYY')}`;
  }

  // "28 Dec 2024 - 3 Jan 2025"
  return `${startDate.format('D MMM YYYY')} \u2013 ${endDate.format('D MMM YYYY')}`;
}

/**
 * Extract initials from a full name. Returns up to 2 uppercase characters.
 *
 * @example
 * getInitials('Amina Okafor')          // => 'AO'
 * getInitials('John')                  // => 'JO'
 * getInitials('Mary Jane Watson')      // => 'MW'
 * getInitials('')                      // => '??'
 */
export function getInitials(fullName: string | null | undefined): string {
  if (!fullName || fullName.trim().length === 0) return '??';

  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();

  const first = parts[0][0];
  const last = parts[parts.length - 1][0];

  return `${first}${last}`.toUpperCase();
}

/**
 * Trigger a file download in the browser from a Blob.
 *
 * @example
 * const blob = new Blob([csvContent], { type: 'text/csv' });
 * downloadFile(blob, 'employees-report.csv');
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Clean up
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Convert an array of flat objects to a CSV string.
 *
 * @param data Array of objects to convert
 * @returns CSV string
 */
export function jsonToCsv(data: Record<string, any>[]): string {
  if (!data || !data.length) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header];
      // Handle null/undefined
      if (val === null || val === undefined) {
        return '""';
      }
      // Escape quotes and wrap in quotes
      const escaped = String(val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

/**
 * Format a timestamp string.
 *
 * @param dateStr Date string
 * @returns Formatted timestamp string
 */
export function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
