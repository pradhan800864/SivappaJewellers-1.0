import React, { useEffect, useMemo, useState } from "react";
import "./Trendy.css";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../../Features/Cart/cartSlice";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FiHeart } from "react-icons/fi";
import { FaStar, FaCartPlus } from "react-icons/fa";
import toast from "react-hot-toast";

const API_BASE = process.env.REACT_APP_API_BASE;

const fixUrl = (u) => {
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u; // already absolute
  if (u.startsWith("/")) return API_BASE + u;
  return `${API_BASE}/${u}`;
};

const parseNum = (v) => {
  if (v === null || v === undefined) return 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

// Try common token keys (use whichever your app stores)
const getAuthToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken") ||
  "";

// call your existing backend route: /api/metal-rate?metal=gold&purity=22K
const fetchMetalRate = async (metal, purity) => {
  const { data } = await axios.get(`${API_BASE}/api/metal-rate`, {
    params: { metal, purity },
  });
  return parseNum(data?.price_inr ?? data?.price ?? data);
};

const toUiProduct = (p) => {
  let imgs = [];
  if (Array.isArray(p.image_urls)) imgs = p.image_urls;
  else if (typeof p.image_urls === "string") {
    try {
      imgs = JSON.parse(p.image_urls);
      if (!Array.isArray(imgs)) imgs = [p.image_urls];
    } catch {
      imgs = p.image_urls
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  const front = fixUrl(p.image_url || imgs[0]);
  const back = fixUrl(imgs[1] || imgs[0] || p.image_url);

  const isGroup = !!p.is_group;
  const avgPieceWeight = parseNum(p.avg_piece_weight);
  const metalRate = parseNum(p.metal_rate); // may be null
  const finalPrice = parseNum(p.final_price);
  const netPrice = parseNum(p.net_price);
  const makingCharges = parseNum(p.making_charges);

  let productPrice = 0;
  if (isGroup) {
    productPrice =
      avgPieceWeight > 0 && metalRate > 0 ? Math.round(avgPieceWeight * metalRate) : 0;
  } else {
    productPrice = finalPrice || netPrice || makingCharges || 0;
  }

  return {
    id: p.id,
    productID: p.id,
    productName: p.name || "Product",
    productPrice,
    productReviews: p.reviews || "No reviews",
    frontImg: front,
    backImg: back,
    productType: p.product_type || "Jewellery",
    isGroup,
    avgPieceWeight,
    purity: p.purity,
  };
};

const pickRandom = (arr, n) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
};

const Trendy = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("tab1");

  // wishList: { [productID]: true/false }
  const [wishList, setWishList] = useState({});

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const handleTabClick = (tab) => setActiveTab(tab);

  const scrollToTop = () =>
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

  const cartItems = useSelector((state) => state.cart.items);

  const handleAddToCart = (product) => {
    const normalized = {
      ...product,
  
      // Cart expects these fields
      productID: product.productID ?? product.id,
      name: product.name ?? product.productName,
      productName: product.productName ?? product.name,
  
      // ✅ IMPORTANT: cart reads final_price everywhere
      final_price:
        product.final_price ??
        product.productPrice ??
        0,
    };
  
    const productInCart = cartItems.find((item) => item.productID === normalized.productID);
  
    if (productInCart && productInCart.quantity >= 20) {
      toast.error("Product limit reached", {
        duration: 2000,
        style: { backgroundColor: "#ff4b4b", color: "white" },
        iconTheme: { primary: "#fff", secondary: "#ff4b4b" },
      });
    } else {
      dispatch(addToCart(normalized));
      toast.success(`Added to cart!`, {
        duration: 2000,
        style: { backgroundColor: "#07bc0c", color: "white" },
        iconTheme: { primary: "#fff", secondary: "#07bc0c" },
      });
    }
  };
  

  // ✅ Load products + compute group prices (existing logic)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const { data } = await axios.get(`${API_BASE}/api/products`);
        const list = Array.isArray(data) ? data : data.rows || data.items || [];
        const ui = list.map(toUiProduct);

        const needRateKeys = new Set();
        ui.forEach((p) => {
          if (p.isGroup && p.avgPieceWeight > 0) {
            const key = `${(p.productType || "").toLowerCase()}|${p.purity || ""}`;
            needRateKeys.add(key);
          }
        });

        const rateMap = {};
        await Promise.all(
          Array.from(needRateKeys).map(async (key) => {
            const [metal, purity] = key.split("|");
            try {
              const rate = await fetchMetalRate(metal, purity);
              rateMap[key] = rate;
            } catch (e) {
              rateMap[key] = 0;
            }
          })
        );

        const priced = ui.map((p) => {
          if (p.isGroup) {
            const key = `${(p.productType || "").toLowerCase()}|${p.purity || ""}`;
            const rate = parseNum(rateMap[key]);
            if (rate > 0 && p.avgPieceWeight > 0) {
              return { ...p, productPrice: Math.round(p.avgPieceWeight * rate) };
            }
          }
          return p;
        });

        if (alive) setProducts(priced);
      } catch (e) {
        if (alive) setErr(e?.response?.data?.error || e.message || "Failed to load products");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ Load current user's favorites (DB) → mark hearts red
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return; // not logged in; keep all hearts gray

    let alive = true;
    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/favorites`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const favRows = data?.favorites || [];
        const map = {};
        favRows.forEach((r) => {
          const pid = Number(r.product_id);
          if (Number.isFinite(pid)) map[pid] = true;
        });

        if (alive) setWishList(map);
      } catch (e) {
        // If token expired, don't block UI; just ignore
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const formatINR = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "0";
    return num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ✅ DB persist favorite toggle (same behavior you want)
  const toggleFavorite = async (e, productID) => {
    e.preventDefault();
    e.stopPropagation();

    const token = getAuthToken();
    if (!token) {
      toast.error("Please login to add favorites");
      navigate("/loginSignUp");
      return;
    }

    const alreadyFav = !!wishList[productID];

    // optimistic UI
    setWishList((prev) => ({ ...prev, [productID]: !alreadyFav }));

    try {
      if (!alreadyFav) {
        await axios.post(
          `${API_BASE}/api/favorites`,
          { product_id: productID },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Added to favorites");
      } else {
        await axios.delete(`${API_BASE}/api/favorites/${productID}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Removed from favorites");
      }
    } catch (err) {
      // rollback on failure
      setWishList((prev) => ({ ...prev, [productID]: alreadyFav }));

      const msg = err?.response?.data?.error || err.message || "Failed to update favorite";
      toast.error(msg);

      // If unauthorized, push to login
      if (err?.response?.status === 401) navigate("/loginSignUp");
    }
  };

  const tabAll = useMemo(() => pickRandom(products, 8), [products]);
  const tabNew = useMemo(() => pickRandom(products, 8), [products]);
  const tabBest = useMemo(() => pickRandom(products, 8), [products]);
  const tabTop = useMemo(() => pickRandom(products, 8), [products]);

  const renderGrid = (items) => (
    <div className="trendyMainContainer">
      {items.map((product) => (
        <div className="trendyProductContainer" key={product.id}>
          <div className="trendyProductImages">
            {/* ✅ FIX: correct route with id */}
            <Link to={`/product/${product.id}`} onClick={scrollToTop}>
              <img
                src={product.frontImg}
                alt={product.productName}
                className="trendyProduct_front"
              />
              <img
                src={product.backImg}
                alt={product.productName}
                className="trendyProduct_back"
              />
            </Link>
            <h4 onClick={() => handleAddToCart(product)}>Add to Cart</h4>
          </div>

          <div className="trendyProductImagesCart" onClick={() => handleAddToCart(product)}>
            <FaCartPlus />
          </div>

          <div className="trendyProductInfo">
            <div className="trendyProductCategoryWishlist">
              <p>{product.productType}</p>

              {/* ✅ DB Persist Favorite */}
              <FiHeart
                onClick={(e) => toggleFavorite(e, product.productID)}
                style={{
                  color: wishList[product.productID] ? "red" : "#767676",
                  cursor: "pointer",
                }}
              />
            </div>

            <div className="trendyProductNameInfo">
              {/* ✅ FIX: correct route with id */}
              <Link to={`/product/${product.id}`} onClick={scrollToTop}>
                <h5>{product.productName}</h5>
              </Link>

              <p>₹{formatINR(product.productPrice)}</p>

              <div className="trendyProductRatingReviews">
                <div className="trendyProductRatingStar">
                  {[...Array(5)].map((_, i) => (
                    <FaStar key={i} color="#FEC78A" size={10} />
                  ))}
                </div>
                <span>{product.productReviews}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) return <div className="trendyProducts">Loading trendy products…</div>;
  if (err) return <div className="trendyProducts text-red-600">Error: {err}</div>;

  return (
    <div className="trendyProducts">
      <h2>
        Our Trendy <span>Products</span>
      </h2>

      <div className="trendyTabs">
        <div className="tabs">
          <p onClick={() => handleTabClick("tab1")} className={activeTab === "tab1" ? "active" : ""}>
            All
          </p>
          <p onClick={() => handleTabClick("tab2")} className={activeTab === "tab2" ? "active" : ""}>
            New Arrivals
          </p>
          <p onClick={() => handleTabClick("tab3")} className={activeTab === "tab3" ? "active" : ""}>
            Best Seller
          </p>
          <p onClick={() => handleTabClick("tab4")} className={activeTab === "tab4" ? "active" : ""}>
            Top Rated
          </p>
        </div>

        <div className="trendyTabContent">
          {activeTab === "tab1" && renderGrid(tabAll)}
          {activeTab === "tab2" && renderGrid(tabNew)}
          {activeTab === "tab3" && renderGrid(tabBest)}
          {activeTab === "tab4" && renderGrid(tabTop)}
        </div>
      </div>

      <div className="discoverMore">
        <Link to="/shop" onClick={scrollToTop}>
          <p>Discover More</p>
        </Link>
      </div>
    </div>
  );
};

export default Trendy;
