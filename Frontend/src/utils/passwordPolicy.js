export const PASSWORD_MIN_LENGTH = 9;
export const PASSWORD_REQUIREMENTS =
  'At least 9 characters, exactly one uppercase letter, one lowercase letter, one number, and one special character.';
export const PASSWORD_PATTERN =
  /^(?=.{9,}$)(?=[^A-Z]*[A-Z][^A-Z]*$)(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).*$/;

export const isValidPassword = (password) => PASSWORD_PATTERN.test(password);
