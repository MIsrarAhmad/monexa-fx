export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REQUIREMENTS =
  'At least 8 characters, exactly one uppercase letter, lowercase for the other letters, and at least one special character.';
export const PASSWORD_PATTERN =
  /^(?!.*\s)(?=.{8,}$)(?=[^A-Z]*[A-Z][^A-Z]*$)(?=.*[a-z])(?=.*[^A-Za-z0-9\s]).*$/;

export const isValidPassword = (password) => PASSWORD_PATTERN.test(password);
