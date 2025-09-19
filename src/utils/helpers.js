export const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// You can add more helper functions here if needed
// For example, a function to validate URLs or sanitize inputs