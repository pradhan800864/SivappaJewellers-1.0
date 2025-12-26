import React, { useState, useEffect } from "react";
import "./ShoppingCart.css";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-hot-toast";
import { MdOutlineClose } from "react-icons/md";
import { loginUser } from "../../utils/auth";
import { Link } from "react-router-dom";
import { AuthContext } from "../../Context/AuthContext"; // Update the path as per your project
import { useContext } from "react";
import success from "../../Assets/success.png";
import { removeFromCart, updateQuantity, clearCart } from "../../Features/Cart/cartSlice";

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
  const [storeAddress, setStoreAddress] = useState(null);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [placedOrderItems, setPlacedOrderItems] = useState([]);
  // eslint-disable-next-line
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    mobile_number: "",
  });
  const [createAccount, setCreateAccount] = useState(false);

  const [pincode, setPincode] = useState("");
  const [isPincodeValid, setIsPincodeValid] = useState(false);
    // eslint-disable-next-line
  const [nearestLocation, setNearestLocation] = useState(null);
    // eslint-disable-next-line
  const [orderCode, setOrderCode] = useState(null);
  const [nearestStoreId, setNearestStoreId] = useState(null);
  // eslint-disable-next-line
  const [nearestStore, setNearestStore] = useState(null);
  const handleCheckPincode = async () => {
    if (!/^\d{6}$/.test(pincode)) {
      toast.error("Please enter a valid 6-digit pincode.");
      return;
    }
  
    try {
      const response = await fetch("http://localhost:4998/api/pincode/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        setNearestStore({ name: data.nearestLocation, address: data.address });
        setNearestStoreId(data.storeId);
        setIsPincodeValid(true);
        setNearestLocation(data.nearestLocation);
        setOrderCode(data.orderCode);
        setStoreAddress(data.address);  // NEW
        toast.success("Pincode validated!");
      } else {
        toast.error(data.error || "Pincode validation failed.");
      }
    } catch (error) {
      toast.error("Something went wrong. Try again.");
    }
  };

  const handlePlaceOrder = async () => {
    console.log(!isPincodeValid, !nearestStoreId, !user)
    if (!isPincodeValid || nearestStoreId==null || !user) {
      toast.error("Please validate pincode before placing order.");
      return;
    }
  
    try {
      const response = await fetch("http://localhost:4998/api/place-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          userId: user.id,
          storeId: nearestStoreId, // Make sure you have this from the pincode check response
          pincode,
          products: cartItems.map((item) => ({
            productID: item.productID,
            quantity: item.quantity,
          })),
        }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        // 🔁 Move to the confirmation tab
        setPlacedOrderItems(cartItems);
        dispatch(clearCart());
        handleTabClick("cartTab3");
        window.scrollTo({ top: 0, behavior: "smooth" });
        setPayments(true);
        toast.success("Order placed successfully!");
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

  const handleLogin = async () => {
    try {
      const result = await loginUser(email, password);
      if (result.token) {
        await login(result.token);  // ✅ This updates AuthContext
        toast.success("Login successful!");
        setIsReturningUser(false);  // optional: collapse login form
        setPincode("");             // optional: reset pincode
      } else {
        toast.error("Invalid credentials");
      }
    } catch (error) {
      toast.error("Login failed");
    }
  };

  const handleRegister = async () => {
    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        mobile_number: formData.mobile_number,
        referral_code: null,
      };
  
      const response = await fetch("http://localhost:4998/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        toast.success("Registered successfully!");
        setCreateAccount(false);
        setIsReturningUser(true);
      } else {
        toast.error(data.error || "Registration failed.");
      }
    } catch (error) {
      toast.error("Server error. Try again later.");
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

  const orderNumber = Math.floor(Math.random() * 100000);

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
                                  <img src={item.frontImg} alt="" />
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
                                  <img src={item.frontImg} alt="" />
                                </Link>
                              </div>
                              <div className="shoppingBagTableMobileItemsDetail">
                                <div className="shoppingBagTableMobileItemsDetailMain">
                                  <Link to="/product" onClick={scrollToTop}>
                                    <h4>{item.productName}</h4>
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

                  {/* Show checkbox only if not authenticated */}
                  {!isAuthenticatedFromContext && !isReturningUser && (
                    <div className="returningUserToggle">
                      <input
                        type="checkbox"
                        id="returningUserCheckbox"
                        checked={isReturningUser}
                        onChange={() => setIsReturningUser(true)}
                      />
                      <label htmlFor="returningUserCheckbox">
                        Sign In Already Registered User
                      </label>
                    </div>
                  )}

                  <div className="checkoutDetailsForm">
                    {loading ? (
                      <p>Checking authentication...</p>
                    ) : isAuthenticatedFromContext ? (
                      // ✅ If authenticated, show success message & pincode
                      <>
                        <p className="loginSuccessMsg">
                          🗝️ Authentication Successful. Please enter pincode to check the product availability in near by stores.
                        </p>
                        <div className="pincodeCheckSection" style={{ marginTop: "16px" }}>
                          <input
                            type="text"
                            placeholder="Enter Pincode"
                            style={{
                              padding: "10px",
                              width: "200px",
                              marginRight: "10px",
                              borderRadius: "4px",
                              border: "1px solid #ccc"
                            }}
                            value={pincode}
                            onChange={(e) => setPincode(e.target.value)}
                            maxLength={6}
                          />
                          <button
                            style={{
                              backgroundColor: "black",
                              color: "white",
                              padding: "10px 16px",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer"
                            }}
                            onClick={handleCheckPincode}
                          >
                            Check Availability
                          </button>
                          {isPincodeValid && (
                            <div style={{ marginTop: "10px", color: "green" }}>
                              📍 Pincode Validated 
                            </div>
                          )}
                        </div>
                      </>
                    ) : isReturningUser ? (
                      // ✅ Login form
                      <form>
                        <input
                          type="email"
                          placeholder="Email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                        <input
                          type="password"
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleLogin}
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
                          Login
                        </button>
                      </form>
                    ) : (
                      // ✅ Registration form
                      <form>
                        <input
                          type="text"
                          placeholder="Username *"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                        <input
                          type="tel"
                          placeholder="Mobile Number *"
                          value={formData.mobile_number}
                          onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                        />
                        <input
                          type="email"
                          placeholder="Email *"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                        <input
                          type="password"
                          placeholder="Password *"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />

                        <label className="returningUserToggle">
                          <input
                            type="checkbox"
                            checked={createAccount}
                            onChange={() => setCreateAccount(!createAccount)}
                          />
                          Create An Account?
                        </label>

                        {createAccount && (
                          <button
                            type="button"
                            className="registerBtn"
                            onClick={handleRegister}
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
                            Register
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
                  disabled={!pincode || !isPincodeValid}
                  
                >
                  Place Order
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
                      <img src={success} alt="" />
                    </div>
                    <h3>Your order is completed!</h3>
                    <p>Thank you. Your order has been received.</p>
                    {storeAddress && (
                      <p>
                        🎉 Your order has been forwarded to our nearest store at <strong>{storeAddress}</strong>.
                        Our customer service team will contact you shortly to confirm the details.
                      </p>
                    )}
                  </div>
                  <div className="orderInfo">
                    <div className="orderInfoItem">
                      <p>Order Number</p>
                      <h4>{orderNumber}</h4>
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
