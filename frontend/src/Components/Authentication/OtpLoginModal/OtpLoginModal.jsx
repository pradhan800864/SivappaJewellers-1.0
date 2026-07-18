import React, { useContext, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { AuthContext } from "../../../Context/AuthContext";
import { devBypassLogin, requestLoginOtp, verifyLoginOtp } from "../../../utils/auth";
import { Link } from "react-router-dom";
import "./OtpLoginModal.css";

const isDevLoginEnabled = process.env.REACT_APP_ENABLE_DEV_LOGIN === "true";

const OtpLoginModal = ({ isOpen, onClose, onSuccess, title = "Login to continue" }) => {
  const { login } = useContext(AuthContext);
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [lockedMobile, setLockedMobile] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setMobileNumber("");
      setOtp("");
      setOtpSent(false);
      setLockedMobile("");
      setResendSeconds(0);
      setError("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = setInterval(() => {
      setResendSeconds((seconds) => Math.max(seconds - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  if (!isOpen) return null;

  const startCooldown = (result) => {
    setResendSeconds(Number(result.retry_after_seconds || result.resend_after_seconds || 60));
  };

  const handleSendOtp = async () => {
    const mobile = (otpSent ? lockedMobile : mobileNumber).trim();
    if (!mobile) {
      setError("Please enter your mobile number.");
      return;
    }
    if (!otpSent && resendSeconds > 0 && mobile === lockedMobile) return;

    setLoading(true);
    setError("");

    try {
      const result = await requestLoginOtp(mobile);
      if (result.success) {
        setOtpSent(true);
        setLockedMobile(mobile);
        setOtp("");
        startCooldown(result);
        toast.success(result.message || "OTP sent successfully.");
      } else {
        if (result.retry_after_seconds) startCooldown(result);
        setError(result.error || "Failed to send OTP.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setError("Please enter the OTP.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await verifyLoginOtp(lockedMobile, otp.trim());
      if (result.success) {
        await login(result.token);
        toast.success("Logged in successfully.");
        onClose();
        if (onSuccess) await onSuccess();
      } else {
        setError(result.error || "Invalid OTP.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await devBypassLogin(mobileNumber.trim() || undefined);
      if (result.success) {
        await login(result.token);
        toast.success("Local test login successful.");
        onClose();
        if (onSuccess) await onSuccess();
      } else {
        setError(result.error || "Local test login failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="otpModalOverlay" role="presentation" onClick={onClose}>
      <div className="otpModal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="otpModalClose" onClick={onClose} aria-label="Close">
          x
        </button>
        <h3>{title}</h3>
        <p className="otpModalHint">Enter your mobile number to save this item to your favorites.</p>
        {error && <p className="otpModalError">{error}</p>}
        <p className="otpModalLegal">
          Continuing verifies this mobile number and may create an account. See our{" "}
          <Link to="/terms" onClick={onClose}>Terms</Link> and{" "}
          <Link to="/privacy" onClick={onClose}>Privacy Notice</Link>.
        </p>

        <input
          type="tel"
          placeholder="Mobile Number"
          value={otpSent ? lockedMobile : mobileNumber}
          onChange={(e) => setMobileNumber(e.target.value)}
          disabled={otpSent || loading}
        />

        {otpSent && (
          <>
            <input
              type="text"
              inputMode="numeric"
              maxLength="6"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={loading}
            />
            <button
              type="button"
              className="otpModalSecondary"
              disabled={loading}
              onClick={() => {
                setOtpSent(false);
                setOtp("");
              }}
            >
              Change Mobile Number
            </button>
            <p className="otpModalTimer">
              {resendSeconds > 0 ? `You can request a new OTP in ${resendSeconds}s.` : "Didn't receive the OTP?"}
            </p>
          </>
        )}

        <button
          type="button"
          className="otpModalPrimary"
          disabled={loading || (!otpSent && resendSeconds > 0 && mobileNumber === lockedMobile)}
          onClick={otpSent ? handleVerifyOtp : handleSendOtp}
        >
          {loading ? "Please wait..." : otpSent ? "Verify OTP" : "Send OTP"}
        </button>

        {otpSent && resendSeconds <= 0 && (
          <button type="button" className="otpModalSecondary" disabled={loading} onClick={handleSendOtp}>
            Request New OTP
          </button>
        )}

        {isDevLoginEnabled && !otpSent && (
          <button type="button" className="otpModalSecondary" disabled={loading} onClick={handleDevLogin}>
            Local Test Login
          </button>
        )}
      </div>
    </div>
  );
};

export default OtpLoginModal;
