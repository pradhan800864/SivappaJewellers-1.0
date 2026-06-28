export const isPlaceholderCustomerName = (value) =>
  /^customer-\d{4}-\d+$/i.test(String(value || "").trim());

export const isPlaceholderCustomerEmail = (value) =>
  String(value || "").trim().toLowerCase().endsWith("@otp.local");

export const getCustomerDisplayName = (user) => {
  const username = String(user?.username || "").trim();
  if (username && !isPlaceholderCustomerName(username)) return username;
  return "Customer";
};

export const getCustomerProfileValue = (value, fallback = "Not added yet") => {
  const text = String(value || "").trim();
  return text || fallback;
};

export const getCustomerEmailDisplay = (email) => {
  if (!email || isPlaceholderCustomerEmail(email)) return "Not added yet";
  return email;
};

export const getEditableCustomerName = (user) => {
  const username = String(user?.username || "").trim();
  return isPlaceholderCustomerName(username) ? "" : username;
};

export const getEditableCustomerEmail = (email) =>
  isPlaceholderCustomerEmail(email) ? "" : String(email || "").trim();
