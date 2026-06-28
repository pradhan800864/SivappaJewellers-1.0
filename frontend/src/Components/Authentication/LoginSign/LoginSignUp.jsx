import React, { useEffect, useState, useContext } from "react";
import "./LoginSignUp.css";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { AuthContext } from "../../../Context/AuthContext";
import { requestLoginOtp, verifyLoginOtp } from "../../../utils/auth";

const LoginSignUp = () => {
  const [activeTab, setActiveTab] = useState("tabButton1");
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    mobile_number: "",
    address: "",
    state: "",
    referral_code: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loginOtp, setLoginOtp] = useState("");
  const [loginMobile, setLoginMobile] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;

    const timer = setInterval(() => {
      setResendSeconds((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendSeconds]);

  const formatCountdown = (seconds) => {
    const safeSeconds = Math.max(Number(seconds) || 0, 0);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    if (minutes <= 0) return `${remainingSeconds}s`;
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const handleTab = (tab) => {
    setActiveTab(tab);
    setFormData({
      username: "",
      email: "",
      password: "",
      mobile_number: "",
      address: "",
      state: "",
      referral_code: "",
    });
    setError("");
    setOtpSent(false);
    setLoginOtp("");
    setLoginMobile("");
    setResendSeconds(0);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === "mobile_number" && !otpSent && value !== loginMobile && resendSeconds > 0) {
      setResendSeconds(0);
      setError("");
    }
  };

  const startOtpCooldown = (result) => {
    setResendSeconds(Number(result.retry_after_seconds || result.resend_after_seconds || 60));
  };

  const handleResendOtp = async () => {
    if (resendSeconds > 0 || !loginMobile) return;

    setLoading(true);
    setError("");

    try {
      const result = await requestLoginOtp(loginMobile);
      if (result.success) {
        setLoginOtp("");
        startOtpCooldown(result);
        toast.success(result.message || "OTP sent successfully!", { duration: 3000 });
      } else {
        if (result.retry_after_seconds) startOtpCooldown(result);
        setError(result.error || "Failed to send OTP");
      }
    } catch (err) {
      toast.error("Server error. Try again later.", { duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handles API Requests for Login & Register
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let payload = { ...formData };

      if (activeTab === "tabButton1") {
        const mobileNumber = (otpSent ? loginMobile : formData.mobile_number).trim();

        if (!mobileNumber) {
          setError("Mobile number is required!");
          setLoading(false);
          return;
        }

        if (!otpSent) {
          if (resendSeconds > 0 && mobileNumber === loginMobile) {
            setError(`Please wait ${formatCountdown(resendSeconds)} before requesting another OTP.`);
            setLoading(false);
            return;
          }

          const result = await requestLoginOtp(mobileNumber);
          if (result.success) {
            setOtpSent(true);
            setLoginMobile(mobileNumber);
            startOtpCooldown(result);
            toast.success(result.message || "OTP sent successfully!", { duration: 3000 });
          } else {
            if (result.retry_after_seconds) startOtpCooldown(result);
            setError(result.error || "Failed to send OTP");
          }
          setLoading(false);
          return;
        }

        if (!loginOtp.trim()) {
          setError("OTP is required!");
          setLoading(false);
          return;
        }

        const result = await verifyLoginOtp(loginMobile, loginOtp.trim());
        if (result.success) {
          await login(result.token);
          toast.success("Logged in successfully!", { duration: 3000 });
          navigate("/");
        } else {
          setError(result.error || "Invalid OTP");
        }
        setLoading(false);
        return;
      } else {
        // ✅ REGISTER
        if (
          !formData.username ||
          !formData.email ||
          !formData.password ||
          !formData.mobile_number ||
          !formData.address ||
          !formData.state
        ) {
          setError("All fields are required!");
          setLoading(false);
          return;
        }

        payload = {
          ...formData,
          referral_code: formData.referral_code.trim() || null,
        };
      }

      const response = await fetch(process.env.REACT_APP_API_BASE + "/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        // ✅ REGISTER SUCCESS
        toast.success(data.message || "Registration successful! Please log in.", { duration: 3000 });
        setActiveTab("tabButton1"); // ✅ Switch to Login Tab Automatically
      } else if (data.error === "This user has already reached the maximum of 2 referrals.") {
        toast.error("User has reached the maximum number of referrals allowed.", { duration: 3000 });
      }
      else {
        setError(data.error || "Something went wrong");
        toast.error("Something went wrong in Authentication", { duration: 3000 });
      }
    } catch (err) {
      toast.error("Server error. Try again later.", { duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="loginSignUpSection">
        <div className="loginSignUpContainer">
          <div className="loginSignUpTabs">
            <p onClick={() => handleTab("tabButton1")} className={activeTab === "tabButton1" ? "active" : ""}>
              Login
            </p>
            <p onClick={() => handleTab("tabButton2")} className={activeTab === "tabButton2" ? "active" : ""}>
              Register
            </p>
          </div>

          <div className="loginSignUpTabsContent">
            {error && <p className="error-message">{error}</p>} {/* Show error if exists */}

            {/* 🔹 Login Form */}
            {activeTab === "tabButton1" && (
              <div className="loginSignUpTabsContentLogin">
                <form onSubmit={handleSubmit}>
                  <input
                    type="tel"
                    name="mobile_number"
                    placeholder="Registered Mobile Number *"
                    value={otpSent ? loginMobile : formData.mobile_number}
                    onChange={handleChange}
                    disabled={otpSent}
                    required
                  />
                  {otpSent && (
                    <>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength="6"
                        placeholder="Enter OTP *"
                        value={loginOtp}
                        onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        required
                      />
                      <button
                        type="button"
                        className="secondaryOtpButton"
                        disabled={loading}
                        onClick={() => {
                          setOtpSent(false);
                          setLoginOtp("");
                        }}
                      >
                        Change Mobile Number
                      </button>
                      <p className="otpTimerText">
                        {resendSeconds > 0
                          ? `You can request a new OTP in ${formatCountdown(resendSeconds)}.`
                          : "Didn't receive the OTP?"}
                      </p>
                      {resendSeconds <= 0 && (
                        <button
                          type="button"
                          className="secondaryOtpButton"
                          disabled={loading}
                          onClick={handleResendOtp}
                        >
                          Request New OTP
                        </button>
                      )}
                    </>
                  )}
                  {!otpSent && resendSeconds > 0 && (
                    <p className="otpTimerText">
                      You can request a new OTP for {loginMobile || "this number"} in {formatCountdown(resendSeconds)}.
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading || (!otpSent && resendSeconds > 0 && formData.mobile_number === loginMobile)}
                  >
                    {loading ? (otpSent ? "Verifying..." : "Sending OTP...") : otpSent ? "Verify OTP & Log In" : "Send OTP"}
                  </button>
                </form>
                <p>
                  No account yet? <span onClick={() => handleTab("tabButton2")}>Create Account</span>
                </p>
              </div>
            )}

            {/* 🔹 Register Form */}
            {activeTab === "tabButton2" && (
              <div className="loginSignUpTabsContentRegister">
                <form onSubmit={handleSubmit}>
                  <input type="text" name="username" placeholder="Username *" value={formData.username} onChange={handleChange} required />
                  <input type="tel" name="mobile_number" placeholder="Mobile Number *" value={formData.mobile_number} onChange={handleChange} required />
                  <input type="email" name="email" placeholder="Email address *" value={formData.email} onChange={handleChange} required />
                  <input type="password" name="password" placeholder="Password *" value={formData.password} onChange={handleChange} required />
                  <input type="text" name="address" placeholder="Address *" value={formData.address} onChange={handleChange} required />
                  <input type="text" name="state" placeholder="State *" value={formData.state} onChange={handleChange} required />
                  <input type="text" name="referral_code" placeholder="Referral Code (optional)" value={formData.referral_code} onChange={handleChange} />
                  <button type="submit" disabled={loading}>
                    {loading ? "Registering..." : "Register"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginSignUp;
