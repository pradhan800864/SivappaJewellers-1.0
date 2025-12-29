import React, { useState } from "react";
import "./ResetPass.css";
import { Link } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4998";

const ResetPass = () => {
  const [step, setStep] = useState(1); // 1=email, 2=otp+newPassword
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const postJson = async (url, body) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Request failed");
    return data;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    const e1 = email.trim().toLowerCase();
    if (!e1) return setErr("Please enter your email");

    setLoading(true);
    try {
      await postJson(`${API_BASE}/api/auth/forgot-password`, { email: e1 });
      setMsg("OTP sent. Please check your email.");
      setStep(2);
    } catch (ex) {
      setErr(ex.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    const e1 = email.trim().toLowerCase();
    const o1 = otp.trim();

    if (!e1) return setErr("Email is missing");
    if (!o1 || o1.length !== 6) return setErr("Please enter the 6-digit OTP");
    if (!newPassword || newPassword.length < 6)
      return setErr("Password must be at least 6 characters");
    if (newPassword !== confirmPassword)
      return setErr("Passwords do not match");

    setLoading(true);
    try {
      await postJson(`${API_BASE}/api/auth/reset-password`, {
        email: e1,
        otp: o1,
        newPassword,
      });

      setMsg("Password updated successfully. Please login now.");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      // If you want, you can redirect to loginSignUp here.
      // window.location.href = "/loginSignUp";
    } catch (ex) {
      setErr(ex.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setErr("");
    setMsg("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div>
      <div className="resetPasswordSection">
        <h2>Reset Your Password</h2>

        <div className="resetPasswordContainer">
          {msg ? <p style={{ color: "green", marginBottom: 10 }}>{msg}</p> : null}
          {err ? <p style={{ color: "red", marginBottom: 10 }}>{err}</p> : null}

          {step === 1 ? (
            <>
              <p>We will send you an OTP to reset your password</p>
              <form onSubmit={handleSendOtp}>
                <input
                  type="email"
                  placeholder="Email address *"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
                <button type="submit" disabled={loading}>
                  {loading ? "Sending..." : "Send OTP"}
                </button>
              </form>
            </>
          ) : (
            <>
              <p>
                OTP sent to <b>{email.trim().toLowerCase()}</b>
              </p>

              <form onSubmit={handleResetPassword}>
                <input
                  type="text"
                  placeholder="Enter OTP (6 digits) *"
                  required
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  disabled={loading}
                />

                <input
                  type="password"
                  placeholder="New password (min 6 chars) *"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />

                <input
                  type="password"
                  placeholder="Confirm new password *"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />

                <button type="submit" disabled={loading}>
                  {loading ? "Updating..." : "Reset Password"}
                </button>
              </form>

              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                style={{
                  marginTop: 10,
                  width: "100%",
                  background: "transparent",
                  border: "1px solid #ddd",
                  padding: "10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Back
              </button>
            </>
          )}
        </div>

        <p>
          Back to{" "}
          <Link to="/loginSignUp">
            <span>Login</span>
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPass;
