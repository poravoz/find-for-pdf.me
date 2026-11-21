export type PasswordRuleKey =
  | 'passwordMinLength'
  | 'passwordUppercase'
  | 'passwordLowercase'
  | 'passwordNumber'
  | 'passwordSpecial'
  | 'passwordNoSpaces';

export interface PasswordRule {
  key: PasswordRuleKey;
  valid: boolean;
}

export const getPasswordRules = (password: string): PasswordRule[] => [
  {
    key: 'passwordMinLength',
    valid: password.length >= 8 && password.length <= 128,
  },
  {
    key: 'passwordUppercase',
    valid: /[A-Z]/.test(password),
  },
  {
    key: 'passwordLowercase',
    valid: /[a-z]/.test(password),
  },
  {
    key: 'passwordNumber',
    valid: /\d/.test(password),
  },
  {
    key: 'passwordSpecial',
    valid: /[^A-Za-z0-9\s]/.test(password),
  },
  {
    key: 'passwordNoSpaces',
    valid: !/\s/.test(password),
  },
];

export const isPasswordValid = (password: string): boolean =>
  getPasswordRules(password).every((rule) => rule.valid);
  