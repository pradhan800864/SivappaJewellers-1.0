import React, { useState, useEffect } from "react";
import "./ShoppingCart.css";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-hot-toast";
import { MdOutlineClose } from "react-icons/md";
import { devBypassLogin, requestLoginOtp, verifyLoginOtp } from "../../utils/auth";
import { Link } from "react-router-dom";
import { AuthContext } from "../../Context/AuthContext"; // Update the path as per your project
import { useContext } from "react";
import success from "../../Assets/success.png";
import { removeFromCart, updateQuantity, clearCart } from "../../Features/Cart/cartSlice";
import { resolveImageUrl } from "../../utils/resolveImageUrl";
import { getEditableCustomerName } from "../../utils/customerDisplay";

const isDevLoginEnabled = process.env.REACT_APP_ENABLE_DEV_LOGIN === "true";

const ShoppingCart = () => {
  const cartItems = useSelector((state) => state.cart.items);
  const dispatch = useDispatch();
  // eslint-disable-next-line
  const { isAuthenticated: isAuthenticatedFromContext, loading, login, user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("cartTab1");
  const [payments, setPayments] = useState(false);

  const handleTabClick = (tab) => {
    if (tab === "cartTab1" || cartItems.length > 0) {
      setActiveTab(tab);
    }
  };

  const handleQuantityChange = (productId, quantity) => {
    if (quantity >= 1 && quantity <= 20) {
      dispatch(updateQuantity({ productID: productId, quantity: quantity }));
    }
  };
  const [placedOrderItems, setPlacedOrderItems] = useState([]);
  const [placedOrderId, setPlacedOrderId] = useState(null);
  // eslint-disable-next-line
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginMobile, setLoginMobile] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginResendSeconds, setLoginResendSeconds] = useState(0);
  const [customerDetails, setCustomerDetails] = useState({
    username: "",
    address: "",
    state: "",
  });

  const [locationQuery, setLocationQuery] = useState("");
  const [matchedStores, setMatchedStores] = useState([]);
  const [allStores, setAllStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [storeSearchPerformed, setStoreSearchPerformed] = useState(false);
  const [showAllStores, setShowAllStores] = useState(false);
  const [showStoreOptions, setShowStoreOptions] = useState(true);
  const [isSearchingStores, setIsSearchingStores] = useState(false);
  const [isLoadingAllStores, setIsLoadingAllStores] = useState(false);

  const formatStoreAddress = (store) =>
    [store?.address, store?.stateName].filter(Boolean).join(", ");

  const isCustomerDetailsComplete = () =>
    Boolean(
      customerDetails.username.trim() &&
      customerDetails.address.trim() &&
      customerDetails.state.trim()
    );

  const handleCustomerDetailsChange = (field, value) => {
    setCustomerDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearchStores = async () => {
    const query = locationQuery.trim();

    if (query.length < 2) {
      toast.error("Please enter your district or state name.");
      return;
    }

    try {
      setIsSearchingStores(true);
      setStoreSearchPerformed(true);
      setMatchedStores([]);
      setSelectedStore(null);
      setShowStoreOptions(true);
      setShowAllStores(false);
      setAllStores([]);

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE}/api/stores?search=${encodeURIComponent(query)}`
      );

      const data = await response.json();

      if (response.ok) {
        const stores = Array.isArray(data.stores) ? data.stores : [];
        setMatchedStores(stores);
        if (stores.length > 0) {
          toast.success(
            `${stores.length} store${stores.length > 1 ? "s" : ""} found for your location.`
          );
        }
      } else {
        setMatchedStores([]);
        toast.error(data.error || "Store search failed.");
      }
    } catch (error) {
      setMatchedStores([]);
      toast.error("Something went wrong. Try again.");
    } finally {
      setIsSearchingStores(false);
    }
  };

  const handleLoadAllStores = async () => {
    try {
      setIsLoadingAllStores(true);

      const response = await fetch(process.env.REACT_APP_API_BASE + "/api/stores");
      const data = await response.json();

      if (response.ok) {
        setAllStores(Array.isArray(data.stores) ? data.stores : []);
        setShowAllStores(true);
        setShowStoreOptions(true);
      } else {
        toast.error(data.error || "Failed to load stores.");
      }
    } catch (error) {
      toast.error("Something went wrong. Try again.");
    } finally {
      setIsLoadingAllStores(false);
    }
  };

  const handleSelectStore = (store) => {
    setSelectedStore(store);
    setShowStoreOptions(false);
    toast.success(`${store.shopName} selected for your order.`);
  };

  const displayedStores = showAllStores ? allStores : matchedStores;
  const selectableStores = selectedStore && showStoreOptions
    ? displayedStores.filter((store) => store.id !== selectedStore.id)
    : displayedStores;
  const shouldShowNoServiceMessage =
    storeSearchPerformed && !isSearchingStores && matchedStores.length === 0 && !showAllStores;
  const shouldShowStoreOptions =
    showStoreOptions && (selectableStores.length > 0 || shouldShowNoServiceMessage);

  const handlePlaceOrder = async () => {
    if (!selectedStore?.id || !user) {
      toast.error("Please select a store before placing order.");
      return;
    }

    if (!isCustomerDetailsComplete()) {
      toast.error("Please enter your name, address and state before submitting the order request.");
      return;
    }
  
    try {
      const token = localStorage.getItem("token");
      const profileRes = await fetch(process.env.REACT_APP_API_BASE + "/api/users/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: user.id,
          username: customerDetails.username.trim(),
          email: user.email,
          mobile_number: user.mobile_number,
          address: customerDetails.address.trim(),
          state: customerDetails.state.trim(),
        }),
      });

      const profileData = await profileRes.json().catch(() => ({}));
      if (!profileRes.ok) {
        toast.error(profileData.error || "Failed to save customer details.");
        return;
      }

      const response = await fetch(process.env.REACT_APP_API_BASE + "/api/place-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          storeId: selectedStore.id,
          products: cartItems.map((item) => ({
            productID: item.productID,
            quantity: item.quantity,
          })),
        }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        setPlacedOrderItems(cartItems);
        setPlacedOrderId(data.orderId || null);
        dispatch(clearCart());
        handleTabClick("cartTab3");
        window.scrollTo({ top: 0, behavior: "smooth" });
        setPayments(true);
        toast.success("Order request submitted successfully!");
      } else {
        toast.error(data.error || "Failed to place order.");
      }
    } catch (error) {
      toast.error("Server error while placing order.");
    }
  };

  // const subtotal = cartItems.reduce(
  //   (acc, item) => acc + item.final_price * item.quantity,
  //   0
  // );
  // const gst = subtotal * 0.03;
  // const total = subtotal + gst;

  const placedSubtotal = placedOrderItems.reduce(
    (acc, item) => acc + item.final_price * item.quantity,
    0
  );
  const placedGst = placedSubtotal * 0.03;
  const placedTotal = placedSubtotal + placedGst;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    setCustomerDetails({
      username: getEditableCustomerName(user),
      address: user.address || "",
      state: user.state || "",
    });
  }, [user]);

  useEffect(() => {
    if (loginResendSeconds <= 0) return undefined;

    const timer = setInterval(() => {
      setLoginResendSeconds((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [loginResendSeconds]);

  const formatLoginCountdown = (seconds) => {
    const safeSeconds = Math.max(Number(seconds) || 0, 0);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    if (minutes <= 0) return `${remainingSeconds}s`;
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const resetCheckoutLoginState = () => {
    setLoginMobile("");
    setLoginOtp("");
    setLoginOtpSent(false);
    setLoginResendSeconds(0);
  };

  const startCheckoutOtpCooldown = (result) => {
    setLoginResendSeconds(Number(result.retry_after_seconds || result.resend_after_seconds || 60));
  };

  const handleRequestLoginOtp = async () => {
    try {
      const result = await requestLoginOtp(loginMobile);
      if (result.success) {
        setLoginOtpSent(true);
        startCheckoutOtpCooldown(result);
        toast.success(result.message || "OTP sent successfully!");
      } else if (result.retry_after_seconds) {
        startCheckoutOtpCooldown(result);
      }
    } catch (error) {
      toast.error("Failed to send OTP");
    }
  };

  const handleResendCheckoutOtp = async () => {
    if (loginResendSeconds > 0 || !loginMobile) return;

    try {
      const result = await requestLoginOtp(loginMobile);
      if (result.success) {
        setLoginOtp("");
        startCheckoutOtpCooldown(result);
        toast.success(result.message || "OTP sent successfully!");
      } else if (result.retry_after_seconds) {
        startCheckoutOtpCooldown(result);
      }
    } catch (error) {
      toast.error("Failed to send OTP");
    }
  };

  const handleLogin = async () => {
    try {
      const result = await verifyLoginOtp(loginMobile, loginOtp);
      if (result.success && result.token) {
        await login(result.token);  // ✅ This updates AuthContext
        toast.success("Login successful!");
        resetCheckoutLoginState();
        setLocationQuery("");
        setMatchedStores([]);
        setAllStores([]);
        setSelectedStore(null);
        setStoreSearchPerformed(false);
        setShowAllStores(false);
      } else {
        toast.error(result.error || "Invalid OTP");
      }
    } catch (error) {
      toast.error("Login failed");
    }
  };

  const handleDevBypassCheckoutLogin = async () => {
    try {
      const result = await devBypassLogin(loginMobile.trim() || undefined);
      if (result.success && result.token) {
        await login(result.token);
        toast.success("Local test login successful.");
        resetCheckoutLoginState();
        setLocationQuery("");
        setMatchedStores([]);
        setAllStores([]);
        setSelectedStore(null);
        setStoreSearchPerformed(false);
        setShowAllStores(false);
      } else {
        toast.error(result.error || "Local test login failed");
      }
    } catch (error) {
      toast.error("Local test login failed");
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // current Date

  const currentDate = new Date();

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Random number

  // Radio Button Data

  return (
    <div>
      <div className="shoppingCartSection">
        <h2>Cart</h2>

        <div className="shoppingCartTabsContainer">
          <div className={`shoppingCartTabs ${activeTab}`}>
            <button
              className={activeTab === "cartTab1" ? "active" : ""}
              onClick={() => {
                handleTabClick("cartTab1");
                setPayments(false);
              }}
            >
              <div className="shoppingCartTabsNumber">
                <h3>01</h3>
                <div className="shoppingCartTabsHeading">
                  <h3>Shopping Bag</h3>
                  <p>Manage Your Items List</p>
                </div>
              </div>
            </button>
            <button
              className={activeTab === "cartTab2" ? "active" : ""}
              onClick={() => {
                handleTabClick("cartTab2");
                setPayments(false);
              }}
              disabled={cartItems.length === 0}
            >
              <div className="shoppingCartTabsNumber">
                <h3>02</h3>
                <div className="shoppingCartTabsHeading">
                  <h3>Shipping and Checkout</h3>
                  <p>Checkout Your Items List</p>
                </div>
              </div>
            </button>
            <button
              className={activeTab === "cartTab3" ? "active" : ""}
              onClick={() => {
                handleTabClick("cartTab3");
              }}
              disabled={cartItems.length === 0 || payments === false}
            >
              <div className="shoppingCartTabsNumber">
                <h3>03</h3>
                <div className="shoppingCartTabsHeading">
                  <h3>Confirmation</h3>
                  <p>Review And Submit Your Order</p>
                </div>
              </div>
            </button>
          </div>
          <div className="shoppingCartTabsContent">
            {/* tab1 */}
            {activeTab === "cartTab1" && (
              <div className="shoppingBagSection">
                <div className="shoppingBagTableSection">
                  {/* For Desktop Devices */}
                  <table className="shoppingBagTable">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Quantity</th>
                        {/* <th>Subtotal</th> */}
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.length > 0 ? (
                        cartItems.map((item) => (
                          <tr key={item.productID}>
                            <td data-label="Product">
                              <div className="shoppingBagTableImg">
                                <Link to={`/product/${item.productID}`} onClick={scrollToTop}>
                                  <img src={resolveImageUrl(item.frontImg)} alt="" />
                                </Link>
                              </div>
                            </td>
                            <td data-label="">
                              <div className="shoppingBagTableProductDetail">
                                <Link to={`/product/${item.productID}`} onClick={scrollToTop}>
                                  <h4>{item.name}</h4>
                                </Link>
                                <p>{item.productReviews}</p>
                              </div>
                            </td>
                            <td className="cartPriceCell"
                              data-label="Price"
                              style={{ textAlign: "center" }}
                            >
                              <div className="cartPriceWrapper">
                                ₹{Number(item.final_price).toLocaleString("en-IN")}
                              </div>
                            </td>
                            <td data-label="Quantity">
                              <div className="ShoppingBagTableQuantity">
                                <button
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.productID,
                                      item.quantity - 1
                                    )
                                  }
                                >
                                  <span style={{ color: "black", fontSize: "20px" }}>-</span>
                                </button>
                                <input
                                  type="text"
                                  min="1"
                                  max="20"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      item.productID,
                                      parseInt(e.target.value)
                                    )
                                  }
                                />
                                <button
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.productID,
                                      item.quantity + 1
                                    )
                                  }
                                >
                                  <span style={{ color: "black", fontSize: "20px" }}>+</span>
                                </button>
                              </div>
                            </td>
                            <td data-label="">
                              <MdOutlineClose
                                onClick={() =>
                                  dispatch(removeFromCart(item.productID))
                                }
                              />
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6">
                            <div className="shoppingCartEmpty">
                              <span>Your cart is empty!</span>
                              <Link to="/shop" onClick={scrollToTop}>
                                <button>Shop Now</button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <td
                        colSpan="6"
                        className="shopCartFooter"
                        style={{
                          borderBottom: "none",
                          padding: "20px 0px",
                        }}
                      >
                        {cartItems.length > 0 && (
                          <div className="shopCartFooterContainer">
                            <form>
                              <input
                                type="text"
                                placeholder="Coupon Code"
                              ></input>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                }}
                                style={{
                                  backgroundColor: "black",
                                  color: "white",
                                  padding: "10px 16px",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer"
                                }}
                              >
                               Apply Coupon
                              </button>
                            </form>
                            {/* <button
                              onClick={(e) => {
                                e.preventDefault();
                              }}
                              className="shopCartFooterbutton"
                            >
                              Update Cart
                            </button> */}
                          </div>
                        )}
                      </td>
                    </tfoot>
                  </table>

                  {/* For Mobile devices */}

                  <div className="shoppingBagTableMobile">
                    {cartItems.length > 0 ? (
                      <>
                        {cartItems.map((item) => (
                          <div key={item.productID}>
                            <div className="shoppingBagTableMobileItems">
                              <div className="shoppingBagTableMobileItemsImg">
                                <Link to="/product" onClick={scrollToTop}>
                                  <img src={resolveImageUrl(item.frontImg)} alt="" />
                                </Link>
                              </div>
                              <div className="shoppingBagTableMobileItemsDetail">
                                <div className="shoppingBagTableMobileItemsDetailMain">
                                <Link to={`/product/${item.productID}`} onClick={scrollToTop}>
                                  <h4>{item.productName || item.name}</h4>
                                </Link>
                                  <p>{item.productReviews}</p>
                                  <div className="shoppingBagTableMobileQuantity">
                                    <button
                                      onClick={() =>
                                        handleQuantityChange(
                                          item.productID,
                                          item.quantity - 1
                                        )
                                      }
                                    >
                                      -
                                    </button>
                                    <input
                                      type="text"
                                      min="1"
                                      max="20"
                                      value={item.quantity}
                                      onChange={(e) =>
                                        handleQuantityChange(
                                          item.productID,
                                          parseInt(e.target.value)
                                        )
                                      }
                                    />
                                    <button
                                      onClick={() =>
                                        handleQuantityChange(
                                          item.productID,
                                          item.quantity + 1
                                        )
                                      }
                                    >
                                      +
                                    </button>
                                  </div>
                                  <span>₹{Number(item.final_price).toLocaleString("en-IN")}</span>
                                </div>
                                <div className="shoppingBagTableMobileItemsDetailTotal">
                                  <MdOutlineClose
                                    size={20}
                                    onClick={() =>
                                      dispatch(removeFromCart(item.productID))
                                    }
                                  />
                                  <p>₹{Number(item.quantity * item.final_price).toLocaleString("en-IN")}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="shopCartFooter">
                          <div className="shopCartFooterContainer">
                            <form>
                              <input
                                type="text"
                                placeholder="Coupon Code"
                              ></input>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                }}
                              >
                                Apply Coupon
                              </button>
                            </form>
                            {/* <button
                              onClick={(e) => {
                                e.preventDefault();
                              }}
                              className="shopCartFooterbutton"
                            >
                              Update Cart
                            </button> */}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="shoppingCartEmpty">
                        <span>Your cart is empty!</span>
                        <Link to="/shop" onClick={scrollToTop}>
                          <button>Shop Now</button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
                <div className="shoppingBagTotal">
                  <button
                    onClick={() => {
                      handleTabClick("cartTab2");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={cartItems.length === 0}
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </div>
            )}

            {/* tab2 */}
            {activeTab === "cartTab2" && (
              <div className="checkoutSection">
                <div className="checkoutDetailsSection">
                  <h4>Billing Details</h4>

                  <div className="checkoutDetailsForm">
                    {loading ? (
                      <p>Checking authentication...</p>
                    ) : isAuthenticatedFromContext ? (
                      // ✅ If authenticated, show success message & store search
                      <>
                        <p className="loginSuccessMsg">
                          Authentication successful. Please enter your delivery details and choose the store you prefer.
                        </p>
                        <div className="checkoutCustomerDetails">
                          <input
                            type="text"
                            placeholder="Full Name *"
                            value={customerDetails.username}
                            onChange={(e) => handleCustomerDetailsChange("username", e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Delivery Address *"
                            value={customerDetails.address}
                            onChange={(e) => handleCustomerDetailsChange("address", e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="State *"
                            value={customerDetails.state}
                            onChange={(e) => handleCustomerDetailsChange("state", e.target.value)}
                          />
                        </div>
                        <div className="storeSearchSection">
                          <input
                            type="text"
                            placeholder="Enter district or state name"
                            value={locationQuery}
                            onChange={(e) => {
                              setLocationQuery(e.target.value);
                              setMatchedStores([]);
                              setAllStores([]);
                              setSelectedStore(null);
                              setShowStoreOptions(true);
                              setStoreSearchPerformed(false);
                              setShowAllStores(false);
                            }}
                          />
                          <button
                            type="button"
                            className="storeSearchButton"
                            onClick={handleSearchStores}
                            disabled={isSearchingStores}
                          >
                            {isSearchingStores ? "Searching..." : "Search Stores"}
                          </button>
                        </div>

                        {selectedStore && (
                          <div className="selectedStoreBanner">
                            <span>
                              <strong>Selected Store:</strong> {selectedStore.shopName}
                              {formatStoreAddress(selectedStore) ? `, ${formatStoreAddress(selectedStore)}` : ""}
                            </span>
                            <button
                              type="button"
                              className="changeStoreButton"
                              onClick={() => setShowStoreOptions(true)}
                            >
                              Change Store
                            </button>
                          </div>
                        )}

                        {shouldShowStoreOptions && (
                          <div className="storeSelectionPanel">
                            {selectableStores.length > 0 && (
                              <div className="storeResultsSection">
                                <p className="storeResultsHeading">
                                  {showAllStores ? "All Store Locations" : "Matched Stores"}
                                </p>
                                <div className="storeResultsList">
                                  {selectableStores.map((store) => (
                                    <div
                                      key={store.id}
                                      className="storeResultCard"
                                    >
                                      <div className="storeResultInfo">
                                        <h5>{store.shopName}</h5>
                                        <p>{formatStoreAddress(store) || "Address not available"}</p>
                                        {store.pincode && <span>Pincode: {store.pincode}</span>}
                                      </div>
                                      <button
                                        type="button"
                                        className="storeSelectButton"
                                        onClick={() => handleSelectStore(store)}
                                      >
                                        Select Store
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {shouldShowNoServiceMessage && (
                              <div className="storeNoMatch">
                                <p>
                                  Sorry we are not providing the service at your location, please check our store locations from here.
                                </p>
                                <button
                                  type="button"
                                  className="storeSearchButton"
                                  onClick={handleLoadAllStores}
                                  disabled={isLoadingAllStores}
                                >
                                  {isLoadingAllStores ? "Loading Stores..." : "View Store Locations"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      // ✅ Login form
                      <form>
                        <input
                          type="tel"
                          placeholder="Mobile Number"
                          value={loginMobile}
                          disabled={loginOtpSent}
                          onChange={(e) => setLoginMobile(e.target.value)}
                        />
                        {loginOtpSent && (
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength="6"
                            placeholder="Enter OTP"
                            value={loginOtp}
                            onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          />
                        )}
                        {loginOtpSent && (
                          <button
                            type="button"
                            onClick={() => {
                              setLoginOtpSent(false);
                              setLoginOtp("");
                            }}
                            style={{
                              backgroundColor: "white",
                              color: "black",
                              padding: "10px 20px",
                              border: "1px solid #d1d5db",
                              borderRadius: "4px",
                              cursor: "pointer",
                              marginTop: "10px"
                            }}
                          >
                            Change Mobile Number
                          </button>
                        )}
                        {loginOtpSent && (
                          <p style={{ color: "#767676", fontSize: "14px", marginTop: "8px" }}>
                            {loginResendSeconds > 0
                              ? `You can request a new OTP in ${formatLoginCountdown(loginResendSeconds)}.`
                              : "Didn't receive the OTP?"}
                          </p>
                        )}
                        {loginOtpSent && loginResendSeconds <= 0 && (
                          <button
                            type="button"
                            onClick={handleResendCheckoutOtp}
                            style={{
                              backgroundColor: "white",
                              color: "black",
                              padding: "10px 20px",
                              border: "1px solid #d1d5db",
                              borderRadius: "4px",
                              cursor: "pointer",
                              marginTop: "10px"
                            }}
                          >
                            Request New OTP
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={loginOtpSent ? handleLogin : handleRequestLoginOtp}
                          style={{
                            backgroundColor: "black",
                            color: "white",
                            padding: "10px 20px",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            marginTop: "10px"
                          }}
                        >
                          {loginOtpSent ? "Verify OTP & Login" : "Send OTP"}
                        </button>
                        {isDevLoginEnabled && !loginOtpSent && (
                          <button
                            type="button"
                            onClick={handleDevBypassCheckoutLogin}
                            style={{
                              backgroundColor: "white",
                              color: "black",
                              padding: "10px 20px",
                              border: "1px solid #d1d5db",
                              borderRadius: "4px",
                              cursor: "pointer",
                              marginTop: "10px"
                            }}
                          >
                            Local Test Login
                          </button>
                        )}
                      </form>
                    )}
                  </div>
                </div>



                <div className="checkoutPaymentSection">
                <div className="checkoutTotalContainer">
                  <h3>Your Order</h3>
                  <div className="checkoutItems">
                    <table>
                      <thead>
                        <tr>
                          <th>PRODUCTS</th>
                          <th>SUBTOTALS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cartItems.map((item) => (
                          <tr key={item.productID}>
                            <td>
                              {item.name} x {item.quantity}
                            </td>
                            <td>₹{(item.final_price * item.quantity).toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculate Subtotal, GST, Total */}
                  {(() => {
                    const subtotal = cartItems.reduce(
                      (sum, item) => sum + item.final_price * item.quantity,
                      0
                    );
                    const gst = subtotal * 0.03;
                    const total = subtotal + gst;

                    return (
                      <div className="checkoutTotal">
                        <table>
                          <tbody>
                            <tr>
                              <th>Subtotal</th>
                              <td>₹{subtotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                              <th>GST (3%)</th>
                              <td>₹{gst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                              <th>Total</th>
                              <td>₹{total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
                  
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={!isAuthenticatedFromContext || !selectedStore || !isCustomerDetailsComplete()}
                  
                >
                  Submit Order Request
                </button>

                </div>
              </div>
            )}

            {/* tab3 */}
            {activeTab === "cartTab3" && (
              <div className="orderCompleteSection">
                <div className="orderComplete">
                  <div className="orderCompleteMessage">
                    <div className="orderCompleteMessageImg">
                      <img src={resolveImageUrl(success)} alt="" />
                    </div>
                    <h3>Your order request has been submitted!</h3>
                    <p>Thank you. We have sent your request to the selected store.</p>
                    {selectedStore && (
                      <div className="orderNextSteps">
                        <p>
                          Your request has been forwarded to <strong>{selectedStore.shopName}</strong>
                          {formatStoreAddress(selectedStore) ? (
                            <> at <strong>{formatStoreAddress(selectedStore)}</strong></>
                          ) : null}.
                        </p>
                        <p>The store team will contact you shortly to confirm availability, billing and payment details.</p>
                      </div>
                    )}
                    <div className="orderCompleteActions">
                      <Link
                        to="/profile"
                        state={{ activeTab: "My Orders" }}
                        className="orderActionButton primary"
                        onClick={scrollToTop}
                      >
                        View My Orders
                      </Link>
                      <Link
                        to="/shop"
                        className="orderActionButton"
                        onClick={scrollToTop}
                      >
                        Continue Shopping
                      </Link>
                    </div>
                  </div>
                  <div className="orderInfo">
                    <div className="orderInfoItem">
                      <p>Order Number</p>
                      <h4>{placedOrderId || "-"}</h4>
                    </div>
                    <div className="orderInfoItem">
                      <p>Date</p>
                      <h4>{formatDate(currentDate)}</h4>
                    </div>
                    <div className="orderInfoItem">
                      <p>Total</p>
                      <h4>₹{placedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h4>
                    </div>
                   
                  </div>
                  <div className="orderTotalContainer">
                    <h3>Order Details</h3>
                    <div className="orderItems">
                      <table>
                        <thead>
                          <tr>
                            <th>PRODUCTS</th>
                            <th>SUBTOTALS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {placedOrderItems.map((items) => (
                            <tr key={items.productID}>
                              <td>{items.name} x {items.quantity}</td>
                              <td>₹{(items.final_price * items.quantity).toLocaleString("en-IN")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="orderTotal">
                      <table>
                        <tbody>
                          <tr>
                            <th>Subtotal</th>
                            <td>₹{placedSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                          </tr>
                          <tr>
                            <th>GST (3%)</th>
                            <td>₹{placedGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                          </tr>
                          <tr>
                            <th>Total</th>
                            <td>₹{placedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingCart;
