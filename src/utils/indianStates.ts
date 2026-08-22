export interface IndianState {
  code: string;
  name: string;
  type: 'state' | 'ut';
}

export const INDIAN_STATES: IndianState[] = [
  { code: '01', name: 'Jammu and Kashmir', type: 'ut' },
  { code: '02', name: 'Himachal Pradesh', type: 'state' },
  { code: '03', name: 'Punjab', type: 'state' },
  { code: '04', name: 'Chandigarh', type: 'ut' },
  { code: '05', name: 'Uttarakhand', type: 'state' },
  { code: '06', name: 'Haryana', type: 'state' },
  { code: '07', name: 'Delhi', type: 'ut' },
  { code: '08', name: 'Rajasthan', type: 'state' },
  { code: '09', name: 'Uttar Pradesh', type: 'state' },
  { code: '10', name: 'Bihar', type: 'state' },
  { code: '11', name: 'Sikkim', type: 'state' },
  { code: '12', name: 'Arunachal Pradesh', type: 'state' },
  { code: '13', name: 'Nagaland', type: 'state' },
  { code: '14', name: 'Manipur', type: 'state' },
  { code: '15', name: 'Mizoram', type: 'state' },
  { code: '16', name: 'Tripura', type: 'state' },
  { code: '17', name: 'Meghalaya', type: 'state' },
  { code: '18', name: 'Assam', type: 'state' },
  { code: '19', name: 'West Bengal', type: 'state' },
  { code: '20', name: 'Jharkhand', type: 'state' },
  { code: '21', name: 'Odisha', type: 'state' },
  { code: '22', name: 'Chhattisgarh', type: 'state' },
  { code: '23', name: 'Madhya Pradesh', type: 'state' },
  { code: '24', name: 'Gujarat', type: 'state' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu', type: 'ut' },
  { code: '27', name: 'Maharashtra', type: 'state' },
  { code: '28', name: 'Andhra Pradesh (Old)', type: 'state' },
  { code: '29', name: 'Karnataka', type: 'state' },
  { code: '30', name: 'Goa', type: 'state' },
  { code: '31', name: 'Lakshadweep', type: 'ut' },
  { code: '32', name: 'Kerala', type: 'state' },
  { code: '33', name: 'Tamil Nadu', type: 'state' },
  { code: '34', name: 'Puducherry', type: 'ut' },
  { code: '35', name: 'Andaman and Nicobar Islands', type: 'ut' },
  { code: '36', name: 'Telangana', type: 'state' },
  { code: '37', name: 'Andhra Pradesh (New)', type: 'state' },
  { code: '38', name: 'Ladakh', type: 'ut' },
  { code: '97', name: 'Other Territory', type: 'ut' },
];

export function getStateByCode(code: string): IndianState | undefined {
  const normalized = code.trim().padStart(2, '0');
  return INDIAN_STATES.find((s) => s.code === normalized);
}

export function getStateByName(name: string): IndianState | undefined {
  const lower = name.trim().toLowerCase();
  return INDIAN_STATES.find(
    (s) => s.name.toLowerCase() === lower || s.name.toLowerCase().includes(lower)
  );
}

/**
 * Extracts the 2-digit state code from a 15-character Indian GSTIN
 * e.g., "27ABCDE1234F1Z5" -> "27"
 */
export function getStateCodeFromGstin(gstin: string): string | null {
  const clean = gstin.trim().toUpperCase();
  if (clean.length >= 2) {
    const code = clean.substring(0, 2);
    if (/^\d{2}$/.test(code) && getStateByCode(code)) {
      return code;
    }
  }
  return null;
}

export function validateGstin(gstin: string): boolean {
  if (!gstin) return true; // Optional field
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin.trim().toUpperCase());
}

/**
 * Formats a state name and code into standard Rule 46 format e.g., "Uttar Pradesh (09)"
 */
export function formatStateWithCode(name?: string | null, code?: string | null): string {
  if (!name || !name.trim()) return '';
  const cleanName = name.trim();

  // If state name already includes code pattern e.g. "Uttar Pradesh (09)"
  if (/\(\d{2}\)$/.test(cleanName)) {
    return cleanName;
  }

  let finalCode = code ? code.trim().padStart(2, '0') : null;
  if (!finalCode || !/^\d{2}$/.test(finalCode)) {
    const found = getStateByName(cleanName);
    if (found) {
      finalCode = found.code;
    }
  }

  return finalCode ? `${cleanName} (${finalCode})` : cleanName;
}

