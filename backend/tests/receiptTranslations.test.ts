import { describe, it, expect } from 'vitest';
import {
  translateWord,
  translateProductNameText,
  offlineFallback,
} from '../../frontend/src/features/billing/receiptTranslations.js';

describe('Receipt Product Name Translation Engine', () => {
  const testDict: Record<string, string> = {
    ...offlineFallback,
    'lays': 'लेज', // User override addition
    'salt': 'सफ़ेद नमक', // User overrides default 'नमक'
  };

  describe('translateWord', () => {
    it('should translate known tokens in lowercase', () => {
      expect(translateWord('atta', testDict)).toBe('आटा');
      expect(translateWord('sugar', testDict)).toBe('चीनी');
    });

    it('should translate known tokens with mixed casing', () => {
      expect(translateWord('Atta', testDict)).toBe('आटा');
      expect(translateWord('ATTA', testDict)).toBe('आटा');
    });

    it('should fall back to original English spelling for unknown tokens', () => {
      expect(translateWord('unknownword', testDict)).toBe('unknownword');
      expect(translateWord('Chocolate', testDict)).toBe('Chocolate');
    });

    it('should preserve surrounding punctuation and brackets', () => {
      expect(translateWord('(atta)', testDict)).toBe('(आटा)');
      expect(translateWord('salt,', testDict)).toBe('सफ़ेद नमक,');
      expect(translateWord('dahi.', testDict)).toBe('दही.');
    });
  });

  describe('translateProductNameText', () => {
    it('should translate multi-token product names correctly', () => {
      const name = 'Ashirvaad Atta 5kg';
      // Ashirvaad -> आशीर्वाद, Atta -> आटा, 5kg -> 5kg (unknown token fallback)
      const translated = translateProductNameText(name, 'hindi', testDict);
      expect(translated).toBe('आशीर्वाद आटा 5kg');
    });

    it('should translate overridden tokens and preserve offline-only tokens', () => {
      // salt is overridden in testDict to 'सफ़ेद नमक', oil is in offlineFallback
      const name = 'Salt and Oil';
      const translated = translateProductNameText(name, 'hindi', testDict);
      expect(translated).toBe('सफ़ेद नमक and तेल');
    });

    it('should handle special symbols and connectors cleanly', () => {
      const name = 'Head & Shoulders Shampoo';
      // Head -> Head (unknown), Shoulders -> Shoulders (unknown), Shampoo -> Shampoo (unknown)
      // If we add them to testDict, we can assert correct lookup.
      const customDict = {
        ...testDict,
        'head': 'हेड',
        'shoulders': 'शोल्डर्स',
        'shampoo': 'शैम्पू'
      };
      const translated = translateProductNameText(name, 'hindi', customDict);
      expect(translated).toBe('हेड & शोल्डर्स शैम्पू');
    });

    it('should handle hyphens and brand names like Parle-G', () => {
      const name = 'Parle-G Gold Biscuits';
      // Parle-G -> पारले-जी, Gold -> गोल्ड, Biscuits -> बिस्कुट
      const customDict = {
        ...testDict,
        'parle-g': 'पारले-जी',
        'gold': 'गोल्ड'
      };
      const translated = translateProductNameText(name, 'hindi', customDict);
      expect(translated).toBe('पारले-जी गोल्ड बिस्कुट');
    });

    it('should safely bypass translation if language is English', () => {
      const name = 'Ashirvaad Atta 5kg';
      const translated = translateProductNameText(name, 'english', testDict);
      expect(translated).toBe(name);
    });
  });
});
