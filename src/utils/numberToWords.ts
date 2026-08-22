/**
 * Indian Currency Number-to-Words Converter
 * Converts numeric rupee and paise values into formal words
 * following the Indian Numbering System (Lakhs and Crores).
 * e.g., 12450.50 -> "Twelve Thousand Four Hundred Fifty Rupees and Fifty Paise Only"
 */

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertTwoDigits(num: number): string {
  if (num === 0) return '';
  if (num < 20) return ONES[num];
  const ten = Math.floor(num / 10);
  const one = num % 10;
  return TENS[ten] + (one > 0 ? '-' + ONES[one] : '');
}

function convertThreeDigits(num: number): string {
  const hundred = Math.floor(num / 100);
  const remainder = num % 100;
  let str = '';
  if (hundred > 0) {
    str += ONES[hundred] + ' Hundred';
    if (remainder > 0) {
      str += ' ';
    }
  }
  if (remainder > 0) {
    str += convertTwoDigits(remainder);
  }
  return str;
}

/**
 * Converts a positive integer into words using Indian Numbering system.
 */
function convertIntegerToIndianWords(num: number): string {
  if (num === 0) return 'Zero';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;

  const lakh = Math.floor(num / 100000);
  num %= 100000;

  const thousand = Math.floor(num / 1000);
  num %= 1000;

  const remainder = num;

  const parts: string[] = [];

  if (crore > 0) {
    parts.push(convertIntegerToIndianWords(crore) + ' Crore');
  }
  if (lakh > 0) {
    parts.push(convertTwoDigits(lakh) + ' Lakh');
  }
  if (thousand > 0) {
    parts.push(convertTwoDigits(thousand) + ' Thousand');
  }
  if (remainder > 0) {
    parts.push(convertThreeDigits(remainder));
  }

  return parts.join(' ').trim();
}

/**
 * Converts an Indian Rupee amount (including paise) into official invoice words.
 * e.g., 1121.00 -> "One Thousand One Hundred Twenty-One Rupees Only"
 * e.g., 100.50 -> "One Hundred Rupees and Fifty Paise Only"
 * e.g., 0.75 -> "Seventy-Five Paise Only"
 */
export function numberToIndianWords(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Zero Rupees Only';
  }

  const rounded = Math.round((Math.abs(amount) + Number.EPSILON) * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  if (rupees === 0 && paise === 0) {
    return 'Zero Rupees Only';
  }

  let words = '';

  if (rupees > 0) {
    words += convertIntegerToIndianWords(rupees) + (rupees === 1 ? ' Rupee' : ' Rupees');
  }

  if (paise > 0) {
    const paiseWords = convertTwoDigits(paise) + ' Paise';
    if (rupees > 0) {
      words += ' and ' + paiseWords;
    } else {
      words += paiseWords;
    }
  }

  return words + ' Only';
}
