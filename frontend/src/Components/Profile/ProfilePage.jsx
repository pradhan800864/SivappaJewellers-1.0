import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import "./ProfilePage.css";
import { toast } from "react-hot-toast";
import ReferralsPage from "../Referrals/ReferralsPage"; // ✅ Import Referrals Component
import { AuthContext } from "../../Context/AuthContext";

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Account Settings"); // ✅ Default selection
  const [isEditing, setIsEditing] = useState(false); // ✅ Edit mode state
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    mobile_number: "",
  });
  const [transactions, setTransactions] = useState([]);
  const [showWalletHistory, setShowWalletHistory] = useState(false);

  const { logout } = useContext(AuthContext);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/loginSignUp"); // Redirect if not logged in
        return;
      }

      try {
        const response = await fetch("http://localhost:4998/api/users/me", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        if (response.ok) {
          setUser(data);
          setFormData({
            username: data.username,
            email: data.email,
            mobile_number: data.mobile_number || "",
          });

          const txRes = await fetch(`http://localhost:4998/api/wallet/history/${data.id}?limit=5`);
          const txData = await txRes.json();
          if (txRes.ok) setTransactions(txData);
        } else {
          console.error("Failed to fetch user:", data.error);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    logout();
    localStorage.removeItem("token"); // Clear token
    navigate("/loginSignUp"); // Redirect to login
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch("http://localhost:4998/api/users/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: user.id, 
          username: formData.username,
          email: formData.email,
          mobile_number: formData.mobile_number,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data); // Update UI with new details
        setIsEditing(false); // Exit edit mode
        toast.success("Updated user details successfully!", { duration: 3000 });
      } else {
        toast.error(data.error || "Failed to update profile", { duration: 3000 });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  if (!user) return <p className="loading">Loading...</p>;

  return (
    <div className="profileSection">
      {/* Sidebar (Left) */}
      <div className="profileSidebar">
        <h3 className="profileHeading">My Account</h3>
        <div className="profileCategories">
          <p className={activeTab === "My Orders" ? "active" : ""} onClick={() => setActiveTab("My Orders")}>
            My Orders
          </p>
          <p className={activeTab === "My Favorites" ? "active" : ""} onClick={() => setActiveTab("My Favorites")}>
            My Favorites
          </p>
          <p className={activeTab === "Account Settings" ? "active" : ""} onClick={() => setActiveTab("Account Settings")}>
            Account Settings
          </p>
          <p className={activeTab === "Referrals" ? "active" : ""} onClick={() => setActiveTab("Referrals")}>
            Referrals
          </p>
          <p className="logout" onClick={handleLogout}>Logout</p>
        </div>
      </div>

      {/* Account Details (Right) */}
      <div className="profileDetails">
        <h3 className="profileHeading">{activeTab}</h3>

        {activeTab === "Account Settings" && (
          <>
            {!isEditing ? (
              <>
                <p><strong>Username:</strong> {user.username.toUpperCase()}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Mobile:</strong> {user.mobile_number || "Not Available"}</p>
                <div className="profileButtons">
                  <button className="editButton" onClick={() => setIsEditing(true)}>Edit Profile</button>
                </div>
              </>
            ) : (
              <>
                <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="Username" />
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" />
                <input type="text" name="mobile_number" value={formData.mobile_number} onChange={handleChange} placeholder="Mobile Number" />
                <div className="profileButtons">
                  <button className="saveButton" onClick={handleSave}>Save</button>
                  <button className="cancelButton" onClick={() => setIsEditing(false)}>Cancel</button>
                </div>
              </>
            )}
          </>
        )}

        {/* ✅ Referrals Section */}
        {activeTab === "Referrals" && (
          <>
            <ReferralsPage user={user} />

            <div className="walletSection" style={{ marginTop: "1.5rem" }}>
              <p><strong>Wallet:</strong> {user.wallet ?? 0} coins</p>
              
              <div className="walletHistoryDropdown">
                <button onClick={() => setShowWalletHistory(!showWalletHistory)} className="walletToggle">
                  {showWalletHistory ? "Hide Wallet History" : "Show Wallet History"}
                </button>

                {showWalletHistory && (
                  <div className="walletHistoryList">
                    {transactions.length === 0 ? (
                      <p className="noTx">No recent wallet activity.</p>
                    ) : (
                      <ul>
                        {transactions.map((tx, idx) => (
                          <li key={idx}>
                            <span className={tx.type === "credit" ? "text-green" : "text-red"}>
                              {tx.type === "credit" ? "+" : "-"}{tx.coins} coins
                            </span>{" "}
                            ({tx.source}) – {new Date(tx.created_at).toLocaleDateString()}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
