import React, { useEffect, useState, useContext } from "react";
import "./LoginSignUp.css";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { AuthContext } from "../../../Context/AuthContext";
import { devBypassLogin, requestLoginOtp, verifyLoginOtp } from "../../../utils/auth";

const isDevLoginEnabled = process.env.REACT_APP_ENABLE_DEV_LOGIN === "true";

const LoginSignUp = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [mobileNumber, setMobileNumber] = useState("");

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

  const handleChange = (e) => {
    const value = e.target.value;
    setMobileNumber(value);

    if (!otpSent && value !== loginMobile && resendSeconds > 0) {
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

  const handleDevBypassLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await devBypassLogin(mobileNumber.trim() || undefined);
      if (result.success) {
        await login(result.token);
        toast.success("Local test login successful.", { duration: 3000 });
        navigate("/");
      } else {
        setError(result.error || "Local test login failed");
      }
    } catch (err) {
      toast.error("Local test login failed. Please try again.", { duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handles mobile OTP login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const enteredMobileNumber = (otpSent ? loginMobile : mobileNumber).trim();

      if (!enteredMobileNumber) {
        setError("Mobile number is required!");
        setLoading(false);
        return;
      }

      if (!otpSent) {
        if (resendSeconds > 0 && enteredMobileNumber === loginMobile) {
          setError(`Please wait ${formatCountdown(resendSeconds)} before requesting another OTP.`);
          setLoading(false);
          return;
        }

        const result = await requestLoginOtp(enteredMobileNumber);
        if (result.success) {
          setOtpSent(true);
          setLoginMobile(enteredMobileNumber);
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
            <p className="active">
              Login
            </p>
          </div>

          <div className="loginSignUpTabsContent">
            {error && <p className="error-message">{error}</p>} {/* Show error if exists */}

            {/* 🔹 Login Form */}
            <div className="loginSignUpTabsContentLogin">
              <form onSubmit={handleSubmit}>
                <input
                  type="tel"
                  name="mobile_number"
                  placeholder="Mobile Number *"
                  value={otpSent ? loginMobile : mobileNumber}
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
                <p className="loginLegalNotice">
                  Continuing verifies this mobile number and may create a customer account.
                  Please review our <Link to="/terms">Terms of Use</Link> and{" "}
                  <Link to="/privacy">Privacy Notice</Link>.
                </p>
                <button
                  type="submit"
                  disabled={loading || (!otpSent && resendSeconds > 0 && mobileNumber === loginMobile)}
                >
                  {loading ? (otpSent ? "Verifying..." : "Sending OTP...") : otpSent ? "Verify OTP & Log In" : "Send OTP"}
                </button>
                {isDevLoginEnabled && !otpSent && (
                  <button
                    type="button"
                    className="devLoginButton"
                    disabled={loading}
                    onClick={handleDevBypassLogin}
                  >
                    Local Test Login
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginSignUp;
