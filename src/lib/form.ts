export function nullableString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function requiredString(formData: FormData, key: string) {
  const value = nullableString(formData, key);
  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

export function nullableInt(formData: FormData, key: string) {
  const value = nullableString(formData, key);
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${key} must be a number`);
  }

  return parsed;
}

export function nullableBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export function requiredDate(formData: FormData, key: string) {
  const value = nullableString(formData, key);
  if (!value) {
    throw new Error(`${key} is required`);
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${key} must be a valid date`);
  }

  return date;
}
