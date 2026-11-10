export const PASSWORD_MIN_LENGTH = 9;
export const PASSWORD_REQUIREMENTS =
  'Password must be at least 9 characters, with exactly one uppercase letter, at least one lowercase letter, one number, and one special character.';

const passwordPattern = /^(?=.{9,}$)(?=[^A-Z]*[A-Z][^A-Z]*$)(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).*$/;

export const isValidPassword = (password) =>
  typeof password === 'string' && passwordPattern.test(password);
