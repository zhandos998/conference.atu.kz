export const feeParticipantCategories = ['participant', 'student'];
export const feeCountryGroups = ['kz', 'foreign'];

export const defaultFeeSettings = {
  participant: {
    kz: { amount: 5000, currency: 'KZT' },
    foreign: { amount: 30, currency: 'USD' },
  },
  student: {
    kz: { amount: 3000, currency: 'KZT' },
    foreign: { amount: 20, currency: 'USD' },
  },
};

export function normalizeFeeSettings(settings = {}) {
  return feeParticipantCategories.reduce((normalized, category) => {
    normalized[category] = feeCountryGroups.reduce((groups, group) => {
      const defaultFee = defaultFeeSettings[category][group];
      const amount = Number(settings?.[category]?.[group]?.amount ?? defaultFee.amount);

      groups[group] = {
        amount: Number.isFinite(amount) ? amount : defaultFee.amount,
        currency: defaultFee.currency,
      };

      return groups;
    }, {});

    return normalized;
  }, {});
}

export function resolveApplicationFee(application, settings) {
  if (application?.payment_fee_amount !== null && application?.payment_fee_amount !== undefined && application?.payment_fee_currency) {
    return {
      amount: Number(application.payment_fee_amount),
      currency: application.payment_fee_currency,
    };
  }

  const normalizedSettings = normalizeFeeSettings(settings);
  const category = feeParticipantCategories.includes(application?.participant_category)
    ? application.participant_category
    : 'participant';
  const countryGroup = feeCountryGroups.includes(application?.country_group)
    ? application.country_group
    : 'kz';

  return normalizedSettings[category][countryGroup];
}

export function formatFeeAmount(fee, language) {
  const amount = Number(fee?.amount ?? 0);
  const locale = language === 'kz' ? 'kk-KZ' : (language === 'en' ? 'en-US' : 'ru-RU');
  const formattedAmount = new Intl.NumberFormat(locale, {
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
  const currency = fee?.currency === 'USD'
    ? 'USD'
    : (language === 'en' ? 'KZT' : 'тг');

  return `${formattedAmount} ${currency}`;
}
