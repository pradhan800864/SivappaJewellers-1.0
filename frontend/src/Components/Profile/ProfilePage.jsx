import React, { useEffect, useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./ProfilePage.css";
import { toast } from "react-hot-toast";
import ReferralsPage from "../Referrals/ReferralsPage";
import { AuthContext } from "../../Context/AuthContext";

const API_BASE = "http://localhost:4998";

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(
    location.state?.activeTab || "Account Settings"
  );
  const [isEditing, setIsEditing] = useState(false); // ✅ Edit mode state
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    mobile_number: "",
  });
  const [transactions, setTransactions] = useState([]);
  const [showWalletHistory, setShowWalletHistory] = useState(false);

  // ✅ Favorites state
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [favLoading, setFavLoading] = useState(false);
  const [favError, setFavError] = useState("");
  // ✅ Orders state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const ORDERS_LIMIT = 5;

  const { logout } = useContext(AuthContext);

  const getToken = () => localStorage.getItem("token");

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchUser = async () => {
      const token = getToken();
      if (!token) {
        navigate("/loginSignUp"); // Redirect if not logged in
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/users/me`, {
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

          // wallet history
          const txRes = await fetch(
            `${API_BASE}/api/wallet/history/${data.id}?limit=5`
          );
          const txData = await txRes.json();
          if (txRes.ok) setTransactions(txData);
        } else {
          console.error("Failed to fetch user:", data.error);
          navigate("/loginSignUp");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();
  }, [navigate]);

  const fetchFavorites = async () => {
    const token = getToken();
    if (!token) {
      navigate("/loginSignUp");
      return;
    }

    setFavLoading(true);
    setFavError("");
    try {
      const res = await fetch(`${API_BASE}/api/favorites/products`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok) {
        setFavoriteProducts(data.products || []);
      } else {
        setFavError(data.error || "Failed to load favorites");
      }
    } catch (e) {
      console.error("fetchFavorites error:", e);
      setFavError("Failed to load favorites");
    } finally {
      setFavLoading(false);
    }
  };

  const fetchOrders = async (page = 1) => {
    const token = getToken();
    if (!token) {
      navigate("/loginSignUp");
      return;
    }
  
    setOrdersLoading(true);
    setOrdersError("");
  
    try {
      const res = await fetch(
        `${API_BASE}/api/order-history/my?page=${page}&limit=${ORDERS_LIMIT}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
  
      const data = await res.json();
  
      if (res.ok) {
        setOrders(data.orders || []);
        setOrdersTotal(Number(data.total || 0));
      } else {
        setOrdersError(data.error || "Failed to load orders");
      }
    } catch (e) {
      console.error("fetchOrders error:", e);
      setOrdersError("Failed to load orders");
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "My Orders") {
      setOrdersPage(1);
      fetchOrders(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);  
  useEffect(() => {
    if (activeTab === "My Orders") {
      fetchOrders(ordersPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordersPage]);
  

  // ✅ when user opens My Favorites tab, load favorites
  useEffect(() => {
    if (activeTab === "My Favorites") {
      fetchFavorites();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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
      const token = getToken();

      const response = await fetch(`${API_BASE}/api/users/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
  const normalizeFirstImage = (p) => {
    const urls = p?.image_urls;
  
    const firstFromArray = (arr) => {
      const u = (arr?.[0] || "").trim();
      if (!u) return "";
      // if relative path -> prefix backend
      if (u.startsWith("/")) return `${API_BASE}${u}`;
      return u;
    };

    if (Array.isArray(urls)) {
      return firstFromArray(urls) || "/images/placeholder.png";
    }
  
    if (typeof urls === "string") {
      const s = urls.trim();
      if (!s) return "/images/placeholder.png";
  
      // Try JSON array
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return firstFromArray(parsed) || "/images/placeholder.png";
      } catch (_) {}
  
      // Try Postgres array style: {url1,url2}
      if (s.startsWith("{") && s.endsWith("}")) {
        const inner = s.slice(1, -1);
        const parts = inner.split(",").map(x => x.replace(/^"(.*)"$/, "$1").trim());
        return firstFromArray(parts) || "/images/placeholder.png";
      }
  
      // Single URL string
      if (s.startsWith("/")) return `${API_BASE}${s}`;
      return s;
    }
  
    return "/images/placeholder.png";
  };
  

  const removeFavorite = async (productId) => {
    const token = getToken();
    if (!token) {
      navigate("/loginSignUp");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/favorites/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        toast.success("Removed from favorites", { duration: 2500 });
        // Update UI instantly (no need to refetch)
        setFavoriteProducts((prev) => prev.filter((x) => x.id !== productId));
      } else {
        toast.error(data.error || "Failed to remove favorite", { duration: 3000 });
      }
    } catch (e) {
      console.error("removeFavorite error:", e);
      toast.error("Failed to remove favorite", { duration: 3000 });
    }
  };

  if (!user) return <p className="loading">Loading...</p>;

  const formatWalletMessage = (tx) => {
    const source = (tx.source || "").toLowerCase();
    const who = tx.invoice_user || "";
    const inv = tx.invoice_number ? `${tx.invoice_number}` : "";

    if (source === "referral")
      return who ? `Referral Bonus • ${who}` : "Referral Bonus";
  
    if (source === "referral-edit")
      return who ? `Billed Invoice Edited • ${who}` : "Billed Invoice Edited";
  
    if (source === "redemption")
      return inv ? `Redeemed for Invoice - ${inv}` : "Coins Redeemed";
  
    if (source === "order")
      return who ? `Order Reward • ${who}` : "Order Reward";
  
    if (source === "order-cancel")
      return who ? `Order Reversed • ${who}` : "Order Reversed";

    if (source === "return-recalc")
      return who ? `Return Recalculated • ${who}` : "Return Recalculated";
  
    if (source === "admin")
      return "Admin Adjustment";
  
    return "Wallet Update";
  };
  
  
  

  return (
    <div className="profileSection">
      {/* Sidebar (Left) */}
      <div className="profileSidebar">
        <h3 className="profileHeading">My Account</h3>
        <div className="profileCategories">
          <p
            className={activeTab === "My Orders" ? "active" : ""}
            onClick={() => setActiveTab("My Orders")}
          >
            My Orders
          </p>

          <p
            className={activeTab === "My Favorites" ? "active" : ""}
            onClick={() => setActiveTab("My Favorites")}
          >
            My Favorites
          </p>

          <p
            className={activeTab === "Account Settings" ? "active" : ""}
            onClick={() => setActiveTab("Account Settings")}
          >
            Account Settings
          </p>

          <p
            className={activeTab === "Referrals" ? "active" : ""}
            onClick={() => setActiveTab("Referrals")}
          >
            Referrals
          </p>

          <p className="logout" onClick={handleLogout}>
            Logout
          </p>
        </div>
      </div>

      {/* Details (Right) */}
      <div className="profileDetails">
        <h3 className="profileHeading">{activeTab}</h3>

        {/* ✅ My Orders (placeholder for now) */}
        {activeTab === "My Orders" && (
          <>
            {ordersLoading ? (
              <p>Loading orders...</p>
            ) : ordersError ? (
              <p style={{ color: "red" }}>{ordersError}</p>
            ) : orders.length === 0 ? (
              <p>No orders found.</p>
            ) : (
              <>
                <div className="ordersTableWrap">
                  <table className="ordersTable">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Date</th>
                        <th>Items</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id}>
                          <td className="mono">{o.invoice_number || "-"}</td>
                          <td>
                            {o.created_at
                              ? new Date(o.created_at).toLocaleDateString()
                              : "-"}
                          </td>
                          <td>{o.items_count ?? "-"}</td>
                          <td>
                            ₹
                            {Number(o.subtotal || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="ordersPager">
                  <button
                    className="pagerBtn"
                    onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                    disabled={ordersPage <= 1}
                  >
                    Prev
                  </button>

                  <div className="pagerInfo">
                    Page {ordersPage} of {Math.max(1, Math.ceil(ordersTotal / ORDERS_LIMIT))}
                  </div>

                  <button
                    className="pagerBtn"
                    onClick={() =>
                      setOrdersPage((p) => {
                        const max = Math.max(1, Math.ceil(ordersTotal / ORDERS_LIMIT));
                        return Math.min(max, p + 1);
              })
            }
            disabled={ordersPage >= Math.ceil(ordersTotal / ORDERS_LIMIT)}
          >
            Next
          </button>
        </div>
      </>
    )}
  </>
)}


        {/* ✅ My Favorites */}
        {activeTab === "My Favorites" && (
          <>
            {favLoading ? (
              <p>Loading favorites...</p>
            ) : favError ? (
              <p style={{ color: "red" }}>{favError}</p>
            ) : favoriteProducts.length === 0 ? (
              <p>No favorites yet.</p>
            ) : (
              <div className="favGrid">
                {favoriteProducts.map((p) => (
                  <div className="favCard" key={p.id}>
                    <div
                      className="favImgWrap"
                      onClick={() => navigate(`/product/${p.id}`)}
                      title="Open product"
                    >
                      <img
                        className="favImg"
                        src={normalizeFirstImage(p)}
                        alt={p.name || "Product"}
                        onError={(e) => {
                          e.currentTarget.src = "/images/placeholder.png";
                        }}
                      />
                    </div>

                    <div className="favInfo">
                      <div className="favName">{p.name}</div>
                      <div className="favMeta">
                        {p.purity ? `Purity: ${p.purity}` : ""}
                      </div>
                    </div>

                    <button
                      className="favRemoveBtn"
                      onClick={() => removeFavorite(p.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ✅ Account Settings */}
        {activeTab === "Account Settings" && (
          <>
            {!isEditing ? (
              <>
                <p>
                  <strong>Username:</strong> {user.username.toUpperCase()}
                </p>
                <p>
                  <strong>Email:</strong> {user.email}
                </p>
                <p>
                  <strong>Mobile:</strong> {user.mobile_number || "Not Available"}
                </p>
                <div className="profileButtons">
                  <button
                    className="editButton"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </button>
                </div>
              </>
            ) : (
              <>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Username"
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                />
                <input
                  type="text"
                  name="mobile_number"
                  value={formData.mobile_number}
                  onChange={handleChange}
                  placeholder="Mobile Number"
                />
                <div className="profileButtons">
                  <button className="saveButton" onClick={handleSave}>
                    Save
                  </button>
                  <button
                    className="cancelButton"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ✅ Referrals */}
        {activeTab === "Referrals" && (
          <>
            <ReferralsPage user={user} />

            <div className="walletSection" style={{ marginTop: "1.5rem" }}>
              <p>
                <strong>Wallet:</strong> {Math.floor(Number(user.wallet ?? 0))} coins
              </p>


              <div className="walletHistoryDropdown">
                <button
                  onClick={() => setShowWalletHistory(!showWalletHistory)}
                  className="walletToggle"
                >
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
                          <span
                            className={tx.type === "credit" ? "text-green" : "text-red"}
                          >
                            {tx.type === "credit" ? "+" : "-"}
                            {tx.coins} coins
                          </span>{" "}
                          — {formatWalletMessage(tx)} —{" "}
                          {new Date(tx.created_at).toLocaleDateString()}
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
