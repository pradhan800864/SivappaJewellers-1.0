import React, { useState, useEffect } from "react";
import "./ShoppingCart.css";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-hot-toast";
import { MdOutlineClose } from "react-icons/md";
import { MdOutlineShoppingBag, MdOutlineStorefront, MdOutlineVerified } from "react-icons/md";
import { devBypassLogin, requestLoginOtp, verifyLoginOtp } from "../../utils/auth";
import { Link } from "react-router-dom";
import { AuthContext } from "../../Context/AuthContext"; // Update the path as per your project
import { useContext } from "react";
import success from "../../Assets/success.png";
import { removeFromCart, updateQuantity, clearCart } from "../../Features/Cart/cartSlice";
import { resolveImageUrl } from "../../utils/resolveImageUrl";
import {
  getEditableCustomerEmail,
  getEditableCustomerName,
} from "../../utils/customerDisplay";
import { policyMeta } from "../Legal/legalContent";

const isDevLoginEnabled = process.env.REACT_APP_ENABLE_DEV_LOGIN === "true";

const ShoppingCart = () => {
  const cartItems = useSelector((state) => state.cart.items);
  const dispatch = useDispatch();
  // eslint-disable-next-line
  const { isAuthenticated: isAuthenticatedFromContext, loading, login, user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("cartTab1");
  const [payments, setPayments] = useState(false);
  const [acceptedOrderRequestTerms, setAcceptedOrderRequestTerms] = useState(false);

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

  const hasSavedDeliveryAddress = Boolean(
    String(user?.address || "").trim() && String(user?.state || "").trim()
  );
  const customerEmail = getEditableCustomerEmail(user?.email);
  const customerMobileDigits = String(user?.mobile_number || "").replace(/\D/g, "");

  const isCustomerProfileComplete = Boolean(
    getEditableCustomerName(user) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) &&
      customerMobileDigits.length >= 10 &&
      customerMobileDigits.length <= 15 &&
      hasSavedDeliveryAddress
  );

  const handleSearchStores = async () => {
    if (!hasSavedDeliveryAddress) {
      toast.error("Please update your delivery address and state in Account Settings first.");
      return;
    }

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

    if (!isCustomerProfileComplete) {
      toast.error("Please complete all profile fields in Account Settings before submitting an order request.");
      return;
    }

    if (!acceptedOrderRequestTerms) {
      toast.error("Please review and accept the order-request terms before submitting.");
      return;
    }
  
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(process.env.REACT_APP_API_BASE + "/api/place-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeId: selectedStore.id,
          termsVersion: policyMeta.version,
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
        setAcceptedOrderRequestTerms(false);
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
  const cartSubtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.final_price || 0) * item.quantity,
    0
  );
  const cartTotalQuantity = cartItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

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
    <div className="cartPage">
      <div className="shoppingCartSection">
        <header className="cartPageHeader">
          <div>
            <p className="cartEyebrow">Your jewellery request</p>
            <h1>From your edit to your store.</h1>
          </div>
          <p className="cartPageHeaderCopy">
            Review your pieces, choose the store you trust, and send a no-obligation
            request for final availability and pricing.
          </p>
        </header>

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
                <span className="cartStepIcon"><MdOutlineShoppingBag /></span>
                <div className="shoppingCartTabsHeading">
                  <span>01</span>
                  <h3>Request bag</h3>
                  <p>Review your selected pieces</p>
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
                <span className="cartStepIcon"><MdOutlineStorefront /></span>
                <div className="shoppingCartTabsHeading">
                  <span>02</span>
                  <h3>Details & store</h3>
                  <p>Choose where to send it</p>
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
                <span className="cartStepIcon"><MdOutlineVerified /></span>
                <div className="shoppingCartTabsHeading">
                  <span>03</span>
                  <h3>Request submitted</h3>
                  <p>See what happens next</p>
                </div>
              </div>
            </button>
          </div>
          <div className="shoppingCartTabsContent">
            {/* tab1 */}
            {activeTab === "cartTab1" && (
              <div className="shoppingBagSection">
                <div className="shoppingBagTableSection">
                  <div className="cartSectionHeading">
                    <div>
                      <p className="cartEyebrow">The pieces you chose</p>
                      <h2>Your request bag</h2>
                    </div>
                    <span>{cartTotalQuantity} {cartTotalQuantity === 1 ? "piece" : "pieces"}</span>
                  </div>
                  {cartItems.length > 0 ? (
                    <div className="cartItemList">
                      {cartItems.map((item) => (
                        <article className="cartItemCard" key={item.productID}>
                          <Link
                            className="cartItemImage"
                            to={`/product/${item.productID}`}
                            onClick={scrollToTop}
                          >
                            <img
                              src={resolveImageUrl(item.frontImg)}
                              alt={item.productName || item.name}
                            />
                          </Link>
                          <div className="cartItemContent">
                            <div className="cartItemTopline">
                              <div>
                                <p className="cartItemLabel">Selected piece</p>
                                <Link to={`/product/${item.productID}`} onClick={scrollToTop}>
                                  <h3>{item.productName || item.name}</h3>
                                </Link>
                              </div>
                              <button
                                className="cartRemoveButton"
                                type="button"
                                aria-label={`Remove ${item.productName || item.name}`}
                                onClick={() => dispatch(removeFromCart(item.productID))}
                              >
                                <MdOutlineClose />
                              </button>
                            </div>
                            {item.productReviews && <p className="cartItemReview">{item.productReviews}</p>}
                            <div className="cartItemMeta">
                              <div>
                                <span>Price</span>
                                <strong>₹{Number(item.final_price).toLocaleString("en-IN")}</strong>
                              </div>
                              <div>
                                <span>Quantity</span>
                                <div className="ShoppingBagTableQuantity">
                                  <button
                                    type="button"
                                    aria-label="Decrease quantity"
                                    onClick={() => handleQuantityChange(item.productID, item.quantity - 1)}
                                  >−</button>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    aria-label={`Quantity for ${item.productName || item.name}`}
                                    min="1"
                                    max="20"
                                    value={item.quantity}
                                    onChange={(event) =>
                                      handleQuantityChange(item.productID, parseInt(event.target.value))
                                    }
                                  />
                                  <button
                                    type="button"
                                    aria-label="Increase quantity"
                                    onClick={() => handleQuantityChange(item.productID, item.quantity + 1)}
                                  >+</button>
                                </div>
                              </div>
                              <div className="cartItemTotal">
                                <span>Estimated subtotal</span>
                                <strong>
                                  ₹{Number(item.quantity * item.final_price).toLocaleString("en-IN")}
                                </strong>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="shoppingCartEmpty">
                      <span className="cartEmptyIcon"><MdOutlineShoppingBag /></span>
                      <p>Your request bag is waiting for something special.</p>
                      <Link to="/shop" onClick={scrollToTop}>Explore jewellery</Link>
                    </div>
                  )}
                </div>
                <div className="shoppingBagTotal">
                  <p className="cartEyebrow">Request overview</p>
                  <h3>Ready for the next step?</h3>
                  <div className="cartSummaryRow">
                    <span>Selected pieces</span>
                    <strong>{cartTotalQuantity}</strong>
                  </div>
                  <div className="cartSummaryRow total">
                    <span>Estimated subtotal</span>
                    <strong>₹{cartSubtotal.toLocaleString("en-IN")}</strong>
                  </div>
                  <p className="cartSummaryNote">
                    Final weight, live metal rate, charges and tax will be confirmed by your selected store.
                  </p>
                  <button
                    onClick={() => {
                      handleTabClick("cartTab2");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={cartItems.length === 0}
                  >
                    Choose your store <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            )}

            {/* tab2 */}
            {activeTab === "cartTab2" && (
              <div className="checkoutSection">
                <div className="checkoutDetailsSection">
                  <div className="checkoutSectionIntro">
                    <p className="cartEyebrow">Where should we send it?</p>
                    <h2>Choose your trusted store.</h2>
                    <p>
                      We use your saved profile to connect this request with a nearby Sai Suryaa store.
                    </p>
                  </div>

                  <div className="checkoutDetailsForm">
                    {loading ? (
                      <p>Checking authentication...</p>
                    ) : isAuthenticatedFromContext ? (
                      // ✅ If authenticated, show success message & store search
                      <>
                        {hasSavedDeliveryAddress ? (
                          <p className="loginSuccessMsg">
                            Profile verified. Search for a store to continue with your order request.
                          </p>
                        ) : (
                          <div className="checkoutProfileWarning" role="alert">
                            <div>
                              <strong>Delivery address required</strong>
                              <p>
                                Update your delivery address and state in Account Settings before searching for stores.
                              </p>
                            </div>
                            <Link
                              to="/profile"
                              state={{ activeTab: "Account Settings" }}
                              className="checkoutProfileLink"
                              onClick={scrollToTop}
                            >
                              Update Profile
                            </Link>
                          </div>
                        )}
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
                            disabled={isSearchingStores || !hasSavedDeliveryAddress}
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
                      <form className="checkoutLoginForm">
                        <div className="checkoutLoginIntro">
                          <span><MdOutlineVerified /></span>
                          <div>
                            <h3>Sign in to continue</h3>
                            <p>We will verify your mobile number before sending this request.</p>
                          </div>
                        </div>
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
                            className="checkoutSecondaryButton"
                            onClick={() => {
                              setLoginOtpSent(false);
                              setLoginOtp("");
                            }}
                          >
                            Change Mobile Number
                          </button>
                        )}
                        {loginOtpSent && (
                          <p className="checkoutOtpHint">
                            {loginResendSeconds > 0
                              ? `You can request a new OTP in ${formatLoginCountdown(loginResendSeconds)}.`
                              : "Didn't receive the OTP?"}
                          </p>
                        )}
                        {loginOtpSent && loginResendSeconds <= 0 && (
                          <button
                            type="button"
                            className="checkoutSecondaryButton"
                            onClick={handleResendCheckoutOtp}
                          >
                            Request New OTP
                          </button>
                        )}
                        <p className="checkoutLoginLegal">
                          Continuing verifies this mobile number and may create an account.
                          See our <Link to="/terms" target="_blank" rel="noreferrer">Terms</Link>{" "}
                          and <Link to="/privacy" target="_blank" rel="noreferrer">Privacy Notice</Link>.
                        </p>
                        <button
                          type="button"
                          className="checkoutPrimaryButton"
                          onClick={loginOtpSent ? handleLogin : handleRequestLoginOtp}
                        >
                          {loginOtpSent ? "Verify OTP & Login" : "Send OTP"}
                        </button>
                        {isDevLoginEnabled && !loginOtpSent && (
                          <button
                            type="button"
                            className="checkoutSecondaryButton"
                            onClick={handleDevBypassCheckoutLogin}
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
                  <p className="cartEyebrow">Your selection</p>
                  <h3>Request summary</h3>
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
                              <th>Estimated subtotal</th>
                              <td>₹{subtotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                              <th>Estimated GST (3%)</th>
                              <td>₹{gst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                              <th>Estimated total</th>
                              <td>₹{total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                  <p className="orderEstimateNotice">
                    Estimate only. The selected store will confirm availability, actual
                    weight, live metal rate, charges, discounts and applicable tax before
                    any payment or completed sale.
                  </p>
                </div>

                <label className="orderRequestConsent">
                  <input
                    type="checkbox"
                    checked={acceptedOrderRequestTerms}
                    onChange={(event) => setAcceptedOrderRequestTerms(event.target.checked)}
                  />
                  <span>
                    I expressly ask the selected store to contact me about these items. I
                    understand this is not a confirmed sale or tax invoice, and I agree to
                    the <Link to="/terms" target="_blank" rel="noreferrer">Order Request Terms</Link>{" "}
                    (version {policyMeta.version}) and acknowledge the{" "}
                    <Link to="/privacy" target="_blank" rel="noreferrer">Privacy Notice</Link>.
                  </span>
                </label>
                  
                <button
                  type="button"
                  className="submitRequestButton"
                  onClick={handlePlaceOrder}
                  disabled={!isAuthenticatedFromContext || !selectedStore || !isCustomerProfileComplete || !acceptedOrderRequestTerms}
                  
                >
                  Submit order request <span aria-hidden="true">→</span>
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
                      <img src={resolveImageUrl(success)} alt="" aria-hidden="true" />
                    </div>
                    <p className="cartEyebrow">Request received</p>
                    <h2>Your pieces are on their way to the store.</h2>
                    <p>Thank you. Your selected store now has everything it needs to follow up.</p>
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
                        className="orderActionButton primary"
                        onClick={scrollToTop}
                      >
                        Open My Account
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
                      <p>Estimated total</p>
                      <h4>₹{placedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h4>
                    </div>
                   
                  </div>
                  <div className="orderTotalContainer">
                    <div className="orderTotalHeading">
                      <p className="cartEyebrow">A copy for you</p>
                      <h3>Requested items</h3>
                    </div>
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
                            <th>Estimated subtotal</th>
                            <td>₹{placedSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                          </tr>
                          <tr>
                            <th>Estimated GST (3%)</th>
                            <td>₹{placedGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                          </tr>
                          <tr>
                            <th>Estimated total</th>
                            <td>₹{placedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="orderEstimateNotice">
                      No payment has been collected. The selected store will confirm the
                      final sale price and issue the applicable bill or tax invoice.
                    </p>
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
