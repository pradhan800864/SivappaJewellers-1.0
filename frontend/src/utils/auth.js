import { toast } from "react-hot-toast";

export const requestLoginOtp = async (mobileNumber) => {
  try {
    const response = await fetch(process.env.REACT_APP_API_BASE + "/api/users/login/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile_number: mobileNumber }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      return { success: true, ...data };
    }

    toast.error(data.error || "Failed to send OTP", { duration: 3000 });
    return {
      success: false,
      ...data,
      error: data.error,
      otp_expired: data.otp_expired === true,
    };
  } catch (error) {
    toast.error("Server error. Please try again.", { duration: 3000 });
    return { success: false, error: "Server error" };
  }
};

export const verifyLoginOtp = async (mobileNumber, otp) => {
  try {
    const response = await fetch(process.env.REACT_APP_API_BASE + "/api/users/login/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile_number: mobileNumber, otp }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      localStorage.setItem("token", data.token);

      return {
        success: true,
        token: data.token,
        user: data.user,
      };
    }

    toast.error(data.error || "Login failed", { duration: 3000 });
    return { success: false, ...data, error: data.error };
  } catch (error) {
    toast.error("Server error. Please try again.", { duration: 3000 });
    return { success: false, error: "Server error" };
  }
};

export const devBypassLogin = async (mobileNumber) => {
  try {
    const response = await fetch(process.env.REACT_APP_API_BASE + "/api/users/login/dev-bypass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile_number: mobileNumber }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      localStorage.setItem("token", data.token);
      return {
        success: true,
        token: data.token,
        user: data.user,
      };
    }

    toast.error(data.error || "Local test login failed", { duration: 3000 });
    return { success: false, ...data, error: data.error };
  } catch (error) {
    toast.error("Local test login failed. Please try again.", { duration: 3000 });
    return { success: false, error: "Server error" };
  }
};

export const loginUser = verifyLoginOtp;
