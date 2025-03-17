import React, { useState } from "react";
import "./LoginSignUp.css";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

const LoginSignUp = () => {
  const [activeTab, setActiveTab] = useState("tabButton1");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    mobile_number: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTab = (tab) => {
    setActiveTab(tab);
    setFormData({ username: "", email: "", password: "", mobile_number: "" }); // Reset fields when switching tabs
    setError(""); // Clear errors when switching
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url =
        activeTab === "tabButton1"
          ? "http://localhost:4998/api/users/login"
          : "http://localhost:4998/api/users/register";

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        if (activeTab === "tabButton1") {
          localStorage.setItem("token", data.token);
          toast.success("Logged in successfully!", { duration: 3000 });
          navigate("/");
        } else {
          toast.success("Registration successful! Please log in.", { duration: 3000 });
          handleTab("tabButton1");
        }
      } else {
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
            <p
              onClick={() => handleTab("tabButton1")}
              className={activeTab === "tabButton1" ? "active" : ""}
            >
              Login
            </p>
            <p
              onClick={() => handleTab("tabButton2")}
              className={activeTab === "tabButton2" ? "active" : ""}
            >
              Register
            </p>
          </div>

          <div className="loginSignUpTabsContent">
            {error && <p className="error-message">{error}</p>} {/* Show error if exists */}

            {/* Login Form */}
            {activeTab === "tabButton1" && (
              <div className="loginSignUpTabsContentLogin">
                <form onSubmit={handleSubmit}>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email address *"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                  <input
                    type="password"
                    name="password"
                    placeholder="Password *"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
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
                  No account yet?{" "}
                  <span onClick={() => handleTab("tabButton2")}>Create Account</span>
                </p>
              </div>
            )}

            {/* Register Form */}
            {activeTab === "tabButton2" && (
              <div className="loginSignUpTabsContentRegister">
                <form onSubmit={handleSubmit}>
                  <input
                    type="text"
                    name="username"
                    placeholder="Username *"
                    value={formData.username}
                    onChange={handleChange}
                    required
                  />
                  <input
                    type="tel"
                    name="mobile_number"
                    placeholder="Mobile Number *"
                    value={formData.mobile_number}
                    onChange={handleChange}
                    required
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email address *"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                  <input
                    type="password"
                    name="password"
                    placeholder="Password *"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <p>
                    Your personal data will be used to support your experience
                    throughout this website, to manage access to your account,
                    and for other purposes described in our{" "}
                    <Link to="/terms" style={{ color: "#c32929" }}>privacy policy</Link>.
                  </p>
                  <button type="submit" disabled={loading}>
                    {loading ? "Registering..." : "Register"}
                  </button>
                </form>
                <p>
                  Already have an account?{" "}
                  <span onClick={() => handleTab("tabButton1")}>Login</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginSignUp;
