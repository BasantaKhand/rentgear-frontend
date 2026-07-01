// Password rules mirrored from the backend policy (for real-time UX feedback).
export const rules = [
  { key: 'length', label: 'At least 12 characters', test: (p) => p.length >= 12 },
  { key: 'upper', label: 'An uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'A lowercase letter', test: (p) => /[a-z]/.test(p) },
  { key: 'number', label: 'A number', test: (p) => /[0-9]/.test(p) },
  { key: 'special', label: 'A special character (!@#$%^&*)', test: (p) => /[!@#$%^&*]/.test(p) },
];

export function evaluate(password) {
  const pw = password || '';
  const met = rules.filter((r) => r.test(pw)).map((r) => r.key);
  const score = met.length;

  let label = 'Weak';
  let color = 'var(--accent-error)';
  if (score >= 5) {
    label = 'Strong';
    color = 'var(--accent-success)';
  } else if (score === 4) {
    label = 'Good';
    color = '#eab308';
  } else if (score >= 2) {
    label = 'Fair';
    color = 'var(--accent-warning)';
  }

  return { score, label, color, met };
}

// Submit is allowed once the password is "Good" (4/5) or "Strong" (5/5)
export function isStrongEnough(password) {
  return evaluate(password).score >= 4;
}
