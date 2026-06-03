class TaxEngine {
  // KRA PAYE brackets (Kenya) - 2024 rates
  static calculatePAYE(grossPay) {
    const annualPay = grossPay * 12;
    let tax = 0;

    if (annualPay <= 288000) {
      tax = annualPay * 0.10;
    } else if (annualPay <= 388000) {
      tax = 28800 + (annualPay - 288000) * 0.25;
    } else if (annualPay <= 6000000) {
      tax = 28800 + 25000 + (annualPay - 388000) * 0.30;
    } else if (annualPay <= 9600000) {
      tax = 28800 + 25000 + 1683600 + (annualPay - 6000000) * 0.325;
    } else {
      tax = 28800 + 25000 + 1683600 + 1170000 + (annualPay - 9600000) * 0.35;
    }

    const monthlyTax = tax / 12;
    const personalRelief = 2400;
    const afterRelief = Math.max(0, monthlyTax - personalRelief);

    return Math.round(afterRelief * 100) / 100;
  }

  // SHA (Social Health Authority) - 2.75% of gross pay
  static calculateSHA(grossPay) {
    return Math.round(grossPay * 0.0275 * 100) / 100;
  }

  // VAT calculation
  static calculateVAT(amount, rate = 0.16) {
    const vat = amount * rate;
    const exclusive = amount / (1 + rate);
    return { vat: Math.round(vat * 100) / 100, exclusive: Math.round(exclusive * 100) / 100 };
  }

  // Withholding tax
  static calculateWithholdingTax(amount, rate = 0.05) {
    return Math.round(amount * rate * 100) / 100;
  }
}

module.exports = TaxEngine;
