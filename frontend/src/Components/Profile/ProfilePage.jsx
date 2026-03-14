import React, { useEffect, useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./ProfilePage.css";
import { toast } from "react-hot-toast";
import ReferralsPage from "../Referrals/ReferralsPage";
import { AuthContext } from "../../Context/AuthContext";
import { resolveImageUrl } from "../../utils/resolveImageUrl";

const API_BASE = process.env.REACT_APP_API_BASE;

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
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
  const [orderDetailsError, setOrderDetailsError] = useState("");
  const [levelReport, setLevelReport] = useState([]);
  const [bestLevel, setBestLevel] = useState(null);
  const [levelReportLoading, setLevelReportLoading] = useState(false);
  const [levelReportError, setLevelReportError] = useState("");
  const ORDERS_LIMIT = 5;

  const { logout } = useContext(AuthContext);

  const getToken = () => localStorage.getItem("token");

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    const run = async () => {
      if (!user?.id) return;
      if (activeTab !== "Referrals") return;
  
      setLevelReportLoading(true);
      setLevelReportError("");
  
      try {
        const res = await fetch(`${API_BASE}/api/referrals/level-commission/${user.id}`);
        const data = await res.json().catch(() => ({}));
  
        if (!res.ok) {
          setLevelReportError(data.error || "Failed to load level report");
          setLevelReport([]);
          setBestLevel(null);
          return;
        }
  
        setLevelReport(Array.isArray(data.levels) ? data.levels : []);
        setBestLevel(data.best_level ?? null);
      } catch (e) {
        setLevelReportError("Failed to load level report");
        setLevelReport([]);
        setBestLevel(null);
      } finally {
        setLevelReportLoading(false);
      }
    };
  
    run();
  }, [activeTab, user?.id]);  

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

  const formatINR = (n) =>
    Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatCommissionSource = (source) => {
    const s = String(source || "").toLowerCase();
    if (s === "referral") return "Billing";
    if (s === "redemption") return "Redeemed";
    return source || "-";
  };

  const handleViewOrderDetails = async (invoiceNumber) => {
    const token = getToken();
    if (!token) {
      navigate("/loginSignUp");
      return;
    }

    setOrderDetailsLoading(true);
    setOrderDetailsError("");
    try {
      const res = await fetch(
        `${API_BASE}/api/order-history/my/${encodeURIComponent(invoiceNumber)}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || "Failed to load invoice details";
        setOrderDetailsError(msg);
        toast.error(msg);
        return;
      }
      setSelectedOrderDetails(data);
    } catch (e) {
      console.error("view order details error:", e);
      setOrderDetailsError("Failed to load invoice details");
      toast.error("Failed to load invoice details");
    } finally {
      setOrderDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "My Orders") {
      setOrdersPage(1);
      setSelectedOrderDetails(null);
      setOrderDetailsError("");
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
            ) : selectedOrderDetails ? (
              <div className="orderDetailsCard">
                <div className="orderDetailsHead">
                  <h4>Order Details</h4>
                  <button
                    type="button"
                    className="orderBackBtn"
                    onClick={() => {
                      setSelectedOrderDetails(null);
                      setOrderDetailsError("");
                    }}
                  >
                    Back to Orders
                  </button>
                </div>

                {orderDetailsLoading ? (
                  <p>Loading details...</p>
                ) : orderDetailsError ? (
                  <p style={{ color: "red" }}>{orderDetailsError}</p>
                ) : (
                  <>
                    <div className="odGrid">
                      <div className="odBox">
                        <h5>Seller Details</h5>
                        <p><b>Shop:</b> {selectedOrderDetails.invoice?.seller_shop_name || "-"}</p>
                        <p><b>Address:</b> {selectedOrderDetails.invoice?.seller_address || "-"}</p>
                        <p><b>GSTIN:</b> {selectedOrderDetails.invoice?.seller_gstin || "-"}</p>
                        <p><b>Email:</b> {selectedOrderDetails.invoice?.seller_email || "-"}</p>
                        <p><b>Phone:</b> {selectedOrderDetails.invoice?.seller_phone || "-"}</p>
                      </div>
                      <div className="odBox">
                        <h5>Order Summary</h5>
                        <p><b>Invoice:</b> {selectedOrderDetails.invoice?.invoice_number || "-"}</p>
                        <p>
                          <b>Date:</b>{" "}
                          {selectedOrderDetails.invoice?.created_at
                            ? new Date(selectedOrderDetails.invoice.created_at).toLocaleDateString()
                            : "-"}
                        </p>
                        <p><b>Payment Mode:</b> {selectedOrderDetails.invoice?.payment_mode || "-"}</p>
                        <p><b>Subtotal:</b> ₹{formatINR(selectedOrderDetails.totals?.subtotal || 0)}</p>
                        <p><b>GST:</b> ₹{formatINR(selectedOrderDetails.totals?.gst || 0)}</p>
                        <p><b>Total:</b> ₹{formatINR(selectedOrderDetails.totals?.total || 0)}</p>
                      </div>
                    </div>

                    <div className="commissionSummaryRow">
                      <div className="commissionPill">
                        <span>Credited Coins</span>
                        <strong>{Number(selectedOrderDetails.commission?.summary?.credited_coins || 0)}</strong>
                      </div>
                      <div className="commissionPill">
                        <span>Redeemed Coins</span>
                        <strong>{Number(selectedOrderDetails.commission?.summary?.debited_coins || 0)}</strong>
                      </div>
                    </div>

                    <div className="ordersTableWrap" style={{ marginTop: "14px" }}>
                      <table className="ordersTable">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Item</th>
                            <th>HSN</th>
                            <th>Qty</th>
                            <th>Taxable</th>
                            <th>GST</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedOrderDetails.items || []).map((it, idx) => (
                            <tr key={`${it.id || idx}-${idx}`}>
                              <td>{idx + 1}</td>
                              <td>{it.name || "-"}</td>
                              <td>{it.hsn_code || "-"}</td>
                              <td>{Number(it.qty || 1)}</td>
                              <td>₹{formatINR(it.line_subtotal || 0)}</td>
                              <td>₹{formatINR(it.line_tax || 0)}</td>
                              <td>₹{formatINR(it.line_total || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="ordersTableWrap" style={{ marginTop: "14px" }}>
                      <table className="ordersTable">
                        <thead>
                          <tr>
                            <th colSpan={4}>Commission Activity</th>
                          </tr>
                          <tr>
                            <th>Date</th>
                            <th>Source</th>
                            <th>Type</th>
                            <th>Coins</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedOrderDetails.commission?.rows || []).length === 0 ? (
                            <tr>
                              <td colSpan={4}>No commission activity for this invoice.</td>
                            </tr>
                          ) : (
                            (selectedOrderDetails.commission?.rows || []).map((r) => (
                              <tr key={r.id}>
                                <td>{r.created_at ? new Date(r.created_at).toLocaleString() : "-"}</td>
                                <td>{formatCommissionSource(r.source)}</td>
                                <td>{r.type || "-"}</td>
                                <td>{Number(r.coins || 0)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
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
                        <th>Action</th>
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
                          <td>
                            <button
                              type="button"
                              className="invoiceViewBtn"
                              onClick={() => handleViewOrderDetails(o.invoice_number)}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

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
                        src={resolveImageUrl(normalizeFirstImage(p))}
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

                {/* ✅ Level-wise Commission Report (placed right after wallet history button) */}
                <div className="levelReportCard">
                  <div className="levelReportHeader">
                    <h4>Level-wise Commission Report</h4>

                    <button
                      type="button"
                      className="levelReportRefresh"
                      onClick={async () => {
                        if (!user?.id) return;

                        try {
                          const url = `${API_BASE}/api/referrals/level-commission-excel/${user.id}`;
                          const res = await fetch(url);

                          if (!res.ok) {
                            const err = await res.json().catch(() => ({}));
                            alert(err.error || "Download failed");
                            return;
                          }

                          const blob = await res.blob();
                          const downloadUrl = window.URL.createObjectURL(blob);

                          const a = document.createElement("a");
                          a.href = downloadUrl;
                          a.download = `level_commission_invoices.xlsx`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();

                          window.URL.revokeObjectURL(downloadUrl);
                        } catch (e) {
                          alert("Download failed");
                        }
                      }}
                    >
                      Download To Excel
                    </button>

                    <button
                      type="button"
                      className="levelReportRefresh"
                      onClick={async () => {
                        if (!user?.id) return;
                        setLevelReportLoading(true);
                        setLevelReportError("");
                        try {
                          const res = await fetch(`${API_BASE}/api/referrals/level-commission/${user.id}`);
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) {
                            setLevelReportError(data.error || "Failed to load level report");
                            setLevelReport([]);
                            setBestLevel(null);
                            return;
                          }
                          setLevelReport(Array.isArray(data.levels) ? data.levels : []);
                          setBestLevel(data.best_level ?? null);
                        } catch (e) {
                          setLevelReportError("Failed to load level report");
                          setLevelReport([]);
                          setBestLevel(null);
                        } finally {
                          setLevelReportLoading(false);
                        }
                      }}
                      disabled={levelReportLoading}
                    >
                      {levelReportLoading ? "Loading..." : "Refresh"}
                    </button>
                  </div>

                  {levelReportError ? (
                    <p className="levelReportError">{levelReportError}</p>
                  ) : levelReportLoading ? (
                    <p className="levelReportHint">Loading level report...</p>
                  ) : levelReport.length === 0 ? (
                    <p className="levelReportHint">No referral commissions yet.</p>
                  ) : (
                    <table className="levelReportTable">
                      <thead>
                        <tr className="levelReportTableHeaderRow">
                          <th>Levels</th>
                          <th className="textRight">Coins</th>
                          <th className="textRight">No of Invoices</th>
                        </tr>
                      </thead>

                      <tbody>
                        {levelReport.map((r) => {
                          const lvl = Number(r.level || 0);
                          const coins = Number(r.coins || 0);
                          const txc = Number(r.tx_count || 0);

                          return (
                            <tr key={lvl} className={bestLevel === lvl ? "bestRow" : ""}>
                              <td>Level {lvl}</td>
                              <td className="textRight">{coins}</td>
                              <td className="textRight">{txc}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
