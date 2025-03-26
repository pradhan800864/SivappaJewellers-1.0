import React, { useState } from "react";
import "./LoginSignUp.css";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

const LoginSignUp = () => {
  const [activeTab, setActiveTab] = useState("tabButton1");
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    mobile_number: "",
    referral_code: "", // ✅ Default to empty string (not null)
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTab = (tab) => {
    setActiveTab(tab);
    setStep(1);
    setFormData({
      username: "",
      email: "",
      password: "",
      mobile_number: "",
      referral_code: "",
    });
    setError("");
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Handles API Requests for Login & Register
  const handleSubmit = async (e, skipReferral = false) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let url = "";
      let payload = { ...formData };

      if (activeTab === "tabButton1") {
        // ✅ LOGIN
        url = "http://localhost:4998/api/users/login";
        payload = { email: formData.email, password: formData.password };
      } else {
        // ✅ REGISTER
        if (step === 1) {
          if (!formData.username || !formData.email || !formData.password || !formData.mobile_number) {
            setError("All fields are required!");
            setLoading(false);
            return;
          }
          setStep(2); // ✅ Move to Referral Code Step
          setLoading(false);
          return;
        }
        // ✅ Assign NULL if skipping
        if (skipReferral) {
          payload.referral_code = null;
        }
      }

      console.log("Sending Payload:", payload); // ✅ Debugging

      const response = await fetch(
        activeTab === "tabButton1"
          ? "http://localhost:4998/api/users/login"
          : "http://localhost:4998/api/users/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (response.ok) {
        if (activeTab === "tabButton1") {
          // ✅ LOGIN SUCCESS
          localStorage.setItem("token", data.token);
          toast.success("Logged in successfully!", { duration: 3000 });
          navigate("/");
        } else {
          // ✅ REGISTER SUCCESS
          toast.success("Registration successful! Please log in.", { duration: 3000 });
          setActiveTab("tabButton1"); // ✅ Switch to Login Tab Automatically
        }
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
                  <input type="email" name="email" placeholder="Email address *" value={formData.email} onChange={handleChange} required />
                  <input type="password" name="password" placeholder="Password *" value={formData.password} onChange={handleChange} required />
                  <div className="loginSignUpForgetPass">
                    <label>
                      <input type="checkbox" className="brandRadio" />
                      <p>Remember me</p>
                    </label>
                    <p>
                      <Link to="/resetPassword">Lost password?</Link>
                    </p>
                  </div>
                  <button type="submit" disabled={loading}>
                    {loading ? "Logging in..." : "Log In"}
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
                  {/* ✅ Step 1: Show main fields */}
                  {step === 1 && (
                    <>
                      <input type="text" name="username" placeholder="Username *" value={formData.username} onChange={handleChange} required />
                      <input type="tel" name="mobile_number" placeholder="Mobile Number *" value={formData.mobile_number} onChange={handleChange} required />
                      <input type="email" name="email" placeholder="Email address *" value={formData.email} onChange={handleChange} required />
                      <input type="password" name="password" placeholder="Password *" value={formData.password} onChange={handleChange} required />
                      <button type="submit" disabled={loading}>
                        {loading ? "Checking..." : "Register"}
                      </button>
                    </>
                  )}

                  {/* ✅ Step 2: Referral Code Field (Appears After Step 1) */}
                  {step === 2 && (
                    <>
                      <input type="text" name="referral_code" placeholder="Referral Code (Optional)" value={formData.referral_code} onChange={handleChange} />
                      <div className="stepTwoButtons">
                        <button type="button" className="skipButton" onClick={(e) => handleSubmit(e, true)}>
                          Skip for Now
                        </button>
                        <button type="submit" className="doneButton">
                          Done
                        </button>
                      </div>
                    </>
                  )}
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
