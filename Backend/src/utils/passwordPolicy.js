export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REQUIREMENTS =
  'Password must be at least 8 characters, with exactly one uppercase letter, lowercase for the other letters, at least one number, and at least one special character.';

const passwordPattern = /^(?!.*\s)(?=.{8,}$)(?=[^A-Z]*[A-Z][^A-Z]*$)(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).*$/;

export const isValidPassword = (password) =>
  typeof password === 'string' && passwordPattern.test(password);
