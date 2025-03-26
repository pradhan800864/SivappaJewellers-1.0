import React, { useEffect, useState } from "react";
import "./ReferralsPage.css";
import { toast } from "react-hot-toast";

const ReferralsPage = ({ user }) => {
  const [referrals, setReferrals] = useState([]); // Children (users referred by logged-in user)
  const [referrer, setReferrer] = useState(null); // Parent (who referred the logged-in user)
  const [referralCodeInput, setReferralCodeInput] = useState(""); // Input field for adding a referrer
  const [isAddingReferrer, setIsAddingReferrer] = useState(false); // Show input field conditionally

  useEffect(() => {
    if (!user) return;
    fetchReferralData();
  }, [user]);

  // ✅ Fetch referrer & children dynamically
  const fetchReferralData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Fetch children (users referred by logged-in user)
      const childRes = await fetch("http://localhost:4998/api/users/children", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const childData = await childRes.json();
      if (childRes.ok) setReferrals(childData);
      else console.error("Failed to fetch referrals:", childData.error);

      // Fetch parent (who referred the logged-in user)
      const parentRes = await fetch("http://localhost:4998/api/users/referrer", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const parentData = await parentRes.json();
      if (parentRes.ok) setReferrer(parentData);
      else console.error("Failed to fetch referrer:", parentData.error);
    } catch (error) {
      console.error("Error fetching referral data:", error);
    }
  };

  // ✅ Handle adding a referrer
  const handleAddReferrer = async () => {
    if (!referralCodeInput.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:4998/api/users/addReferrer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ referral_code: referralCodeInput }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Referrer added successfully!", { duration: 3000 });
        setReferralCodeInput(""); // ✅ Clear input
        setIsAddingReferrer(false);
        fetchReferralData(); // ✅ Auto-update UI with new data
      } else {
        toast.error(data.error || "Invalid referral code. Please try again!", { duration: 3000 });
      }
    } catch (error) {
      console.error("Error adding referrer:", error);
      toast.error("Server error. Please try again later!", { duration: 3000 });
    }
  };

  // ✅ Handle joining company as default referrer
  const handleJoinCompany = async () => {
    try {
      const token = localStorage.getItem("token");
  
      const response = await fetch("http://localhost:4998/api/users/addReferrer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ referral_code: null }) // ✅ Send null to trigger company assignment
      });
  
      const data = await response.json();
  
      if (response.ok) {
        toast.success("Joined company successfully!", { duration: 3000 });
        fetchReferralData(); // ✅ Auto-update UI
      } else {
        toast.error(data.error || "Failed to join company");
      }
    } catch (error) {
      console.error("Error joining company:", error);
    }
  };

  return (
    <div className="referralList">
      <h3>My Referrals</h3>

      {/* ✅ Logged-in User’s Referral Code */}
      <p><strong>Your Referral Code:</strong> {user.referral_code}</p>

      {/* ✅ Referrer Section (Parent) */}
      {referrer ? (
        <div className="referrerSection">
          <h4>You Were Referred By</h4>
          <p><strong>Username:</strong> {referrer.username.toUpperCase()}</p>
        </div>
      ) : (
        <div className="addReferrerSection">
          <h4>Add Your Referrer</h4>

          {isAddingReferrer ? (
            <div className="addReferrerForm">
              <input
                type="text"
                placeholder="Enter Referrer’s Code"
                value={referralCodeInput}
                onChange={(e) => setReferralCodeInput(e.target.value)}
              />
              <button className="primaryButton" onClick={handleAddReferrer}>Submit</button>
              <button className="secondaryButton" onClick={() => setIsAddingReferrer(false)}>Cancel</button>
            </div>
          ) : (
            <>
              <button className="primaryButton" onClick={() => setIsAddingReferrer(true)}>
                Enter Referral Code
              </button>
              <button className="secondaryButton" onClick={handleJoinCompany}>
                Don't Have a Referral Code? Join Company
              </button>
            </>
          )}
        </div>
      )}

      {/* ✅ Children Section */}
      {referrals.length > 0 ? (
        <div className="referralItem">
          <h4>Users You Referred</h4>
          {referrals.map((child, index) => (
            <p key={child.id}>
              <strong>{index + 1}:</strong> {child.username.toUpperCase()}
            </p>
          ))}
        </div>
      ) : (
        <p>No referrals yet.</p>
      )}
    </div>
  );
};

export default ReferralsPage;
