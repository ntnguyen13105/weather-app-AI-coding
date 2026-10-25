export function validateFields(form, rules, setErrors) {
  const values = Object.fromEntries(new FormData(form));
  const errors = {};
  for (const [name, validate] of Object.entries(rules)) {
    const message = validate(values[name] ?? '', values);
    if (message) errors[name] = message;
  }
  setErrors(errors);
  const first = Object.keys(errors)[0];
  if (first) {
    form.elements.namedItem(first)?.focus();
    return null;
  }
  return values;
}
