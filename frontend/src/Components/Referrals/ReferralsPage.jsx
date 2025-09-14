import React, { useEffect, useState } from "react";
import "./ReferralsPage.css";
import { toast } from "react-hot-toast";
import ReferralTree from "./ReferralTree";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4998";

const ReferralsPage = ({ user }) => {
  const [referrer, setReferrer] = useState(null);
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [isAddingReferrer, setIsAddingReferrer] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchReferrer();
  }, [user]);

  const fetchReferrer = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/users/referrer`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setReferrer(data || null);
      else console.error("Failed to fetch referrer:", data.error);
    } catch (err) {
      console.error("Error fetching referrer:", err);
    }
  };

  const handleAddReferrer = async () => {
    const code = referralCodeInput.trim();
    if (!code) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/users/addReferrer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ referral_code: code }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Referrer added successfully!", { duration: 3000 });
        setReferralCodeInput("");
        setIsAddingReferrer(false);
        fetchReferrer(); // parent will now appear above you in the tree
      } else {
        toast.error(data.error || "Invalid referral code. Please try again!", {
          duration: 3000,
        });
      }
    } catch (err) {
      console.error("Error adding referrer:", err);
      toast.error("Server error. Please try again later!", { duration: 3000 });
    }
  };

  const handleJoinCompany = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/users/addReferrer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ referral_code: null }), // assign Company
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Joined company successfully!", { duration: 3000 });
        fetchReferrer();
      } else {
        toast.error(data.error || "Failed to join company");
      }
    } catch (err) {
      console.error("Error joining company:", err);
      toast.error("Server error. Please try again later!", { duration: 3000 });
    }
  };

  return (
    <div className="referralList" style={{ display: "grid", gap: 12 }}>
      {/* 1) Your referral code */}
      <div
        style={{
          padding: "12px 16px",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <p style={{ margin: 0 }}>
          <strong>Your Referral Code:</strong>{" "}
          {user?.referral_code || user?.referralCode || "—"}
        </p>
      </div>

      {/* 2) Add your referrer (only when no parent) */}
      {!referrer && (
        <div
          className="addReferrerSection"
          style={{
            padding: "12px 16px",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            background: "#fff",
          }}
        >
          <h4 style={{ marginTop: 0 }}>Add Your Referrer</h4>

          {isAddingReferrer ? (
            <div className="addReferrerForm" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Enter Referrer’s Code"
                value={referralCodeInput}
                onChange={(e) => setReferralCodeInput(e.target.value)}
                style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, minWidth: 260 }}
              />
              <button className="primaryButton" onClick={handleAddReferrer}>
                Submit
              </button>
              <button className="secondaryButton" onClick={() => setIsAddingReferrer(false)}>
                Cancel
              </button>
              <button className="secondaryButton" onClick={handleJoinCompany}>
                Don’t Have a Referral Code? Join Company
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="primaryButton" onClick={() => setIsAddingReferrer(true)}>
                Enter Referral Code
              </button>
              <button className="secondaryButton" onClick={handleJoinCompany}>
                Don’t Have a Referral Code? Join Company
              </button>
            </div>
          )}
        </div>
      )}

      {/* (Optional) When there is a parent, you can show who referred you */}
      {referrer && (
        <div
          className="referrerSection"
          style={{
            padding: "12px 16px",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            background: "#fff",
          }}
        >
          <strong>Referred by:</strong>{" "}
          {String(referrer.username || "").toUpperCase()}
        </div>
      )}

      {/* 3) Tree view */}
      <div
        style={{
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background: "#fff",
          padding: 12,
        }}
      >
        <ReferralTree userId={user?.id} />
      </div>
    </div>
  );
};

export default ReferralsPage;
