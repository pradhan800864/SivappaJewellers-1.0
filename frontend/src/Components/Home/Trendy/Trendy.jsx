import React, { useEffect, useMemo, useState } from "react";
import "./Trendy.css";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../../Features/Cart/cartSlice";
import { Link } from "react-router-dom";
import axios from "axios";
import { FiArrowUpRight, FiHeart, FiShoppingBag } from "react-icons/fi";
import toast from "react-hot-toast";
import { resolveImageUrl } from "../../../utils/resolveImageUrl";
import OtpLoginModal from "../../Authentication/OtpLoginModal/OtpLoginModal";
import { fetchProductCatalog } from "../../../utils/productCatalog";

const API_BASE = process.env.REACT_APP_API_BASE;

const parseNum = (v) => {
  if (v === null || v === undefined) return 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

const LABEL_CATEGORY_BY_KEY = {
  trendy: "trendy",
  trending: "trendy",
  newarrival: "new-arrival",
  newarrivals: "new-arrival",
  bestseller: "best-seller",
  bestsellers: "best-seller",
  toprated: "top-rated",
};

const normalizeLabelKey = (label) =>
  String(label || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");

const parseLabels = (labels) => {
  if (Array.isArray(labels)) return labels;
  if (typeof labels === "string") {
    try {
      const parsed = JSON.parse(labels);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Some older rows may be stored as comma-separated labels.
    }
    return labels.split(",").map((s) => s.trim());
  }
  return [];
};

const getLabelCategories = (labels) =>
  [
    ...new Set(
      parseLabels(labels)
        .map((label) => LABEL_CATEGORY_BY_KEY[normalizeLabelKey(label)])
        .filter(Boolean)
    ),
  ];

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

/**
 * ✅ Latest price calculation:
 * metal_amount = weight * metal_rate
 * final_price  = metal_amount + (metal_amount * vadd/100) + stone_price(optional)
 * Rounded to whole rupees.
 */
const computeVaddPrice = ({
  weight,
  metalRate,
  vaddPct,
  stonePrice = 0,
}) => {
  const w = parseNum(weight);
  const r = parseNum(metalRate);
  const v = parseNum(vaddPct);
  const s = parseNum(stonePrice);

  const metalAmount = w * r;
  const vaddAmount = (metalAmount * v) / 100;
  return Math.round(metalAmount + vaddAmount + s);
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

  // The products API already resolves its image fields against the customer
  // backend. Prefer those URLs so localhost does not incorrectly rebuild the
  // path against the separate admin uploads server.
  const front = resolveImageUrl(p.frontImg || p.image_url || imgs[0]);
  const back = resolveImageUrl(
    p.backImg || imgs[1] || p.frontImg || imgs[0] || p.image_url
  );
  const labels = parseLabels(p.labels);

  const isGroup = !!p.is_group;

  // inputs we may need for calculation
  const avgPieceWeight = parseNum(p.avg_piece_weight);
  const netWeight = parseNum(p.net_weight);
  const metalRate = parseNum(p.metal_rate); // may be present from /api/products
  const finalPriceFromApi = parseNum(p.final_price); // should already be computed in backend (rounded)
  const stonePrice = parseNum(p.stone_price);
  const vaddPct = parseNum(p.vadd);

  let productPrice = 0;

  if (isGroup) {
    // group → compute using avg piece weight + rate + vadd
    // (rate might be missing; we will fetch later in useEffect)
    productPrice =
      avgPieceWeight > 0 && metalRate > 0
        ? computeVaddPrice({
            weight: avgPieceWeight,
            metalRate,
            vaddPct,
            stonePrice, // keep if you want stones in group price too
          })
        : 0;
  } else {
    // non-group → prefer backend final_price (already correct)
    if (finalPriceFromApi > 0) {
      productPrice = Math.round(finalPriceFromApi);
    } else if (netWeight > 0 && metalRate > 0) {
      // fallback calculation if API didn't send final_price
      productPrice = computeVaddPrice({
        weight: netWeight,
        metalRate,
        vaddPct,
        stonePrice,
      });
    } else {
      productPrice = 0;
    }
  }

  return {
    id: p.id,
    productID: p.id,
    productName: p.name || "Product",
    productPrice, // ✅ whole rupees
    productReviews: p.reviews || "No reviews",
    frontImg: front,
    backImg: back,
    productType: p.product_type || p.product_type_name || "Jewellery",
    isGroup,
    avgPieceWeight,
    netWeight,
    purity: p.purity,
    vadd: vaddPct,
    stone_price: stonePrice,
    metal_rate: metalRate,
    final_price: Math.round(finalPriceFromApi || 0),
    labels,
    labelCategories: getLabelCategories(labels),
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

  const [activeTab, setActiveTab] = useState("tab1");

  // wishList: { [productID]: true/false }
  const [wishList, setWishList] = useState({});
  const [favoriteLoginProductId, setFavoriteLoginProductId] = useState(null);

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
      final_price: Math.round(parseNum(product.productPrice ?? product.final_price ?? 0)),
    };

    const productInCart = cartItems.find(
      (item) => item.productID === normalized.productID
    );

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

  // ✅ Load products + compute group prices with VADD (latest logic)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const list = await fetchProductCatalog();
        const ui = list.map(toUiProduct);

        // for groups: if metal_rate missing, fetch it and recompute with vadd
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
              const newPrice = computeVaddPrice({
                weight: p.avgPieceWeight,
                metalRate: rate,
                vaddPct: p.vadd,
                stonePrice: p.stone_price,
              });
              return { ...p, metal_rate: rate, productPrice: newPrice, final_price: newPrice };
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
        // ignore
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ INR formatter without decimals
  const formatINR = (value) => {
    const num = Math.round(parseNum(value));
    return num.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const saveFavorite = async (productID) => {
    const token = getAuthToken();
    if (!token) {
      setFavoriteLoginProductId(productID);
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

      if (err?.response?.status === 401) setFavoriteLoginProductId(productID);
    }
  };

  // ✅ DB persist favorite toggle (same behavior you want)
  const toggleFavorite = async (e, productID) => {
    e.preventDefault();
    e.stopPropagation();
    await saveFavorite(productID);
  };

  const tabAll = useMemo(
    () => {
      const trendy = products.filter((product) =>
        product.labelCategories.includes("trendy")
      );
      return pickRandom(trendy.length ? trendy : products, 8);
    },
    [products]
  );
  const tabNew = useMemo(
    () => pickRandom(products.filter((product) => product.labelCategories.includes("new-arrival")), 8),
    [products]
  );
  const tabBest = useMemo(
    () => pickRandom(products.filter((product) => product.labelCategories.includes("best-seller")), 8),
    [products]
  );
  const tabTop = useMemo(
    () => pickRandom(products.filter((product) => product.labelCategories.includes("top-rated")), 8),
    [products]
  );

  const renderGrid = (items) => (
    <div className="trendyMainContainer">
      {items.map((product) => (
        <article className="trendyProductContainer" key={product.id}>
          <div className="trendyProductImages">
            <Link
              to={`/product/${product.id}`}
              onClick={scrollToTop}
              aria-label={`View ${product.productName}`}
            >
              <img
                src={resolveImageUrl(product.frontImg)}
                alt={product.productName}
                className="trendyProduct_front"
                loading="lazy"
                decoding="async"
              />
              <img
                src={resolveImageUrl(product.backImg)}
                alt={product.productName}
                className="trendyProduct_back"
                loading="lazy"
                decoding="async"
              />
              <span className="trendyViewPiece">
                View piece <FiArrowUpRight aria-hidden="true" />
              </span>
            </Link>
            <button
              type="button"
              className="trendyWishButton"
              onClick={(e) => toggleFavorite(e, product.productID)}
              aria-label={`${wishList[product.productID] ? "Remove" : "Save"} ${product.productName} ${wishList[product.productID] ? "from" : "to"} favourites`}
              aria-pressed={Boolean(wishList[product.productID])}
            >
              <FiHeart className={wishList[product.productID] ? "isFavorite" : ""} />
            </button>
            <button
              type="button"
              className="trendyCartButton"
              onClick={() => handleAddToCart(product)}
            >
              <FiShoppingBag aria-hidden="true" />
              <span>Add to cart</span>
            </button>
          </div>

          <div className="trendyProductInfo">
            <div className="trendyProductCategoryWishlist">
              <p>{product.productType}</p>
              <span>Store confirmed</span>
            </div>

            <Link
              className="trendyProductNameInfo"
              to={`/product/${product.id}`}
              onClick={scrollToTop}
            >
              <h3>{product.productName}</h3>
              <p>₹{formatINR(product.productPrice)}</p>
            </Link>
          </div>
        </article>
      ))}
      {!items.length && (
        <p className="trendyEmptyState">No pieces are available in this edit yet.</p>
      )}
    </div>
  );

  if (loading) return <div className="trendyProducts">Loading trendy products…</div>;
  if (err) return <div className="trendyProducts text-red-600">Error: {err}</div>;

  return (
    <section className="trendyProducts" aria-labelledby="trendyTitle">
      <OtpLoginModal
        isOpen={Boolean(favoriteLoginProductId)}
        title="Login to save favorite"
        onClose={() => setFavoriteLoginProductId(null)}
        onSuccess={() => {
          const productId = favoriteLoginProductId;
          setFavoriteLoginProductId(null);
          if (productId) return saveFavorite(productId);
          return undefined;
        }}
      />
      <div className="trendyHeading">
        <div>
          <p>Curated from our catalogue</p>
          <h2 id="trendyTitle">The current edit.</h2>
        </div>
        <Link to="/shop" onClick={scrollToTop}>
          View all jewellery <FiArrowUpRight aria-hidden="true" />
        </Link>
      </div>

      <div className="trendyTabs">
        <div className="tabs" role="tablist" aria-label="Product edits">
          <button type="button" role="tab" aria-selected={activeTab === "tab1"} onClick={() => handleTabClick("tab1")} className={activeTab === "tab1" ? "active" : ""}>
            All
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "tab2"} onClick={() => handleTabClick("tab2")} className={activeTab === "tab2" ? "active" : ""}>
            New Arrivals
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "tab3"} onClick={() => handleTabClick("tab3")} className={activeTab === "tab3" ? "active" : ""}>
            Best Seller
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "tab4"} onClick={() => handleTabClick("tab4")} className={activeTab === "tab4" ? "active" : ""}>
            Top Rated
          </button>
        </div>

        <div className="trendyTabContent" role="tabpanel">
          {activeTab === "tab1" && renderGrid(tabAll)}
          {activeTab === "tab2" && renderGrid(tabNew)}
          {activeTab === "tab3" && renderGrid(tabBest)}
          {activeTab === "tab4" && renderGrid(tabTop)}
        </div>
      </div>

      <div className="discoverMore">
        <Link to="/shop" onClick={scrollToTop}>
          Discover the full collection <FiArrowUpRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
};

export default Trendy;
