export const SELLER_FORM_ID_MAP = {
  0: 'businessDetails',
  1: 'bankDetails',
  2: 'address',
  3: 'documents',
  4: 'review',
} as const;

export const SELLER_STEPPER_STEP_COUNT = Object.keys(SELLER_FORM_ID_MAP).map(
  Number,
) as (keyof typeof SELLER_FORM_ID_MAP)[];

export const SELLER_STEPPER_STEP_COUNT_MAP = Object.fromEntries(
  SELLER_STEPPER_STEP_COUNT.map((type) => [type, type]),
) as {
  [K in keyof typeof SELLER_FORM_ID_MAP]: K;
};

export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const BANK_ACCOUNT_NUMBER_REGEX = /^[0-9]{9,18}$/;
