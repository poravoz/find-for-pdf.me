
export const validateName = (name: string): string => {
    const value = name.trim();
  
    if (value.length < 3) {
      return 'Name must contain at least 3 characters';
    }
  
    if (value.length > 80) {
      return 'Name cannot exceed 80 characters';
    }
  
    const nameRegex =
      /^[A-Za-zА-Яа-яЁёІіЇїЄєҐґ]+(?:[ '-][A-Za-zА-Яа-яЁёІіЇїЄєҐґ]+)*$/;
  
    if (!nameRegex.test(value)) {
      return 'Only Latin or Cyrillic letters, spaces, hyphens and apostrophes are allowed';
    }
  
    return '';
  };
  
  export const validateEmail = (email: string): string => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
    if (!email.trim()) {
      return 'Email is required';
    }
  
    if (!emailRegex.test(email.trim())) {
      return 'Please enter a valid email address';
    }
  
    return '';
  };
  
  export const getPasswordRules = (password: string) => ({
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9\s]/.test(password),
    noSpaces: !/\s/.test(password),
  });
  
  export const validatePassword = (password: string): string => {
    const rules = getPasswordRules(password);
  
    if (password.length > 128) {
      return 'Password cannot exceed 128 characters';
    }
  
    if (!Object.values(rules).every(Boolean)) {
      return 'Password does not meet all security requirements';
    }
  
    return '';
  };
  