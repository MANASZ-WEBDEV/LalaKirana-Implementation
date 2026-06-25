export type Language = 'english' | 'hindi' | 'bilingual';

export const translations = {
  english: {
    brandName: 'LalaKirana',
    billNo: 'Bill No',
    date: 'Date',
    cashier: 'Cashier',
    mode: 'Mode',
    full: 'Full',
    quick: 'Quick',
    paid: 'Paid',
    unpaid: 'Unpaid',
    partially_paid: 'Partially Paid',
    item: 'Item',
    qty: 'Qty',
    rate: 'Rate',
    total: 'Total',
    grandTotal: 'GRAND TOTAL',
    thankYou: 'Thank you! Visit again',
    customer: 'Customer',
    phone: 'Phone',
    quickSale: 'Quick Sale',
    atMRP: 'At MRP',
    youPaid: 'You paid',
    youSaved: 'You saved',
    belowMRP: '% off MRP',
    addedToKhata: 'Added to your khata',
    khataSummary: 'Your Khata Summary',
    prevBalance: 'Previous balance',
    thisPurchase: 'This purchase',
    currentBalance: 'Current balance',
    khataUpdate: 'Your Khata Update',
    paymentReceived: 'Payment received',
    remainingBalance: 'Remaining balance',
  },
  hindi: {
    brandName: 'लालाकिराना',
    billNo: 'बिल नं.',
    date: 'दिनांक',
    cashier: 'कैशियर',
    mode: 'भुगतान विधि',
    full: 'पूर्ण',
    quick: 'त्वरित',
    paid: 'भुगतान',
    unpaid: 'बकाया',
    partially_paid: 'आंशिक भुगतान',
    item: 'वस्तु',
    qty: 'मात्रा',
    rate: 'दर',
    total: 'कुल',
    grandTotal: 'कुल राशि',
    thankYou: 'धन्यवाद! फिर आइए',
    customer: 'ग्राहक',
    phone: 'फ़ोन',
    quickSale: 'त्वरित बिक्री',
    atMRP: 'MRP पर',
    youPaid: 'आपने दिया',
    youSaved: 'आपने बचाया',
    belowMRP: 'MRP से % कम',
    addedToKhata: 'खाते में जोड़ा गया',
    khataSummary: 'आपका खाता विवरण',
    prevBalance: 'पिछला बकाया',
    thisPurchase: 'यह ख़रीदारी',
    currentBalance: 'वर्तमान बकाया',
    khataUpdate: 'आपका खाता अपडेट',
    paymentReceived: 'भुगतान प्राप्त हुआ',
    remainingBalance: 'शेष बकाया',
  }
};

export function getLabel(key: keyof typeof translations.english, lang: Language): string {
  if (lang === 'bilingual') {
    return `${translations.hindi[key]} / ${translations.english[key]}`;
  }
  if (lang === 'hindi') {
    return translations.hindi[key];
  }
  return translations.english[key];
}

export function formatStoreName(configuredStoreName: string, lang: Language): string {
  if (configuredStoreName.trim().toLowerCase() === 'lalakirana') {
    if (lang === 'bilingual') {
      return `${translations.hindi.brandName} / ${translations.english.brandName}`;
    }
    if (lang === 'hindi') {
      return translations.hindi.brandName;
    }
    return translations.english.brandName;
  }
  return configuredStoreName;
}

export function formatFooterMessage(configuredFooter: string, lang: Language): string {
  if (configuredFooter.trim().toLowerCase() === 'thank you! visit again') {
    if (lang === 'bilingual') {
      return `${translations.hindi.thankYou} / ${translations.english.thankYou}`;
    }
    if (lang === 'hindi') {
      return translations.hindi.thankYou;
    }
    return translations.english.thankYou;
  }
  return configuredFooter;
}

export function formatModeStatus(mode: string | undefined, status: string | undefined, lang: Language): string {
  const mKey = (mode || '').toLowerCase() as keyof typeof translations.english;
  const sKey = (status || '').toLowerCase() as keyof typeof translations.english;

  const mEng = translations.english[mKey] || mode || '';
  const sEng = translations.english[sKey] || status || '';
  const mHin = translations.hindi[mKey] || mode || '';
  const sHin = translations.hindi[sKey] || status || '';

  const engString = sEng ? `${mEng} (${sEng})` : mEng;
  const hinString = sHin ? `${mHin} (${sHin})` : mHin;

  if (lang === 'bilingual') {
    return `${hinString} / ${engString}`;
  }
  if (lang === 'hindi') {
    return hinString;
  }
  return engString;
}

export function formatThankYouPayment(name: string, lang: Language): string {
  if (lang === 'bilingual') {
    return `${name}, आपके भुगतान के लिए धन्यवाद! / Thank you for your payment, ${name}!`;
  }
  if (lang === 'hindi') {
    return `${name}, आपके भुगतान के लिए धन्यवाद!`;
  }
  return `Thank you for your payment, ${name}!`;
}
