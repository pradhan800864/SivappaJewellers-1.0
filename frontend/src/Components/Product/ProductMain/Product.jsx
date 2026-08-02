import React, { useEffect, useMemo, useState } from "react";

import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../../Features/Cart/cartSlice";

import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import { FiFileText, FiHeart, FiShield, FiTool } from "react-icons/fi";

import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import { resolveImageUrl } from "../../../utils/resolveImageUrl";
import OtpLoginModal from "../../Authentication/OtpLoginModal/OtpLoginModal";
import "./Product.css";

const API_BASE = process.env.REACT_APP_API_BASE;
const PLACEHOLDER = "/images/placeholder.png"; // ensure this file exists in public/images/

const toPublicUrl = (u) => {
  if (!u) return null;
  return resolveImageUrl(u); // ✅ uses REACT_APP_UPLOADS_BASE
};


const Product = () => {
  const { id } = useParams();
  const dispatch = useDispatch();

  // Data
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI State
  const [currentImg, setCurrentImg] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [wishList, setWishList] = useState({}); // { [productId]: true }
  const [favoriteLoginProductId, setFavoriteLoginProductId] = useState(null);

  const getAuthToken = () =>
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    "";

  const cartItems = useSelector((state) => state.cart.items);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

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
      } catch {
        // ignore
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Fetch product by id
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    axios
      .get(`${API_BASE}/api/products/${id}`)
      .then((res) => {
        setProduct(res.data);
        setLoading(false);
        setCurrentImg(0);
      })
      .catch((err) => {
        setError("Product not found");
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!product?.name) return undefined;
    const previousTitle = document.title;
    document.title = `${product.name} | Sai Suryaa Jewellers`;
    return () => {
      document.title = previousTitle;
    };
  }, [product?.name]);

  // Build image list
  const images = useMemo(() => {
    if (!product) return [];

    let list = [];
    if (Array.isArray(product.images) && product.images.length) {
      list = product.images;
    } else if (Array.isArray(product.image_urls) && product.image_urls.length) {
      list = product.image_urls;
    } else {
      list = [
        product.frontImg,
        product.backImg,
        product.image1,
        product.image2,
        product.image3,
        product.image4,
      ].filter(Boolean);
    }

    // normalize to absolute URLs and dedupe
    const normalized = Array.from(new Set(list.map(toPublicUrl).filter(Boolean)));
    return normalized.length ? normalized : [PLACEHOLDER];
  }, [product]);

  const handleImgError = (e) => {
    if (e.currentTarget.src.includes(PLACEHOLDER)) return;
    e.currentTarget.onerror = null;
    e.currentTarget.src = PLACEHOLDER;
  };

  const prevImg = () =>
    setCurrentImg((i) => (i === 0 ? images.length - 1 : i - 1));
  const nextImg = () =>
    setCurrentImg((i) => (i === images.length - 1 ? 0 : i + 1));

  const increment = () => setQuantity((q) => q + 1);
  const decrement = () => setQuantity((q) => (q > 1 ? q - 1 : 1));
  const handleQtyInput = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!Number.isNaN(val) && val > 0) setQuantity(val);
  };

  const saveFavorite = async (productId) => {
    const token = getAuthToken();
    if (!token) {
      setFavoriteLoginProductId(productId);
      return;
    }

    const alreadyFav = !!wishList[productId];

    // optimistic
    setWishList((prev) => ({ ...prev, [productId]: !alreadyFav }));

    try {
      if (!alreadyFav) {
        await axios.post(
          `${API_BASE}/api/favorites`,
          { product_id: productId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Added to favorites");
      } else {
        await axios.delete(`${API_BASE}/api/favorites/${productId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Removed from favorites");
      }
    } catch (err) {
      // rollback
      setWishList((prev) => ({ ...prev, [productId]: alreadyFav }));
      toast.error(err?.response?.data?.error || "Failed to update favorite");
    }
  };

  const toggleFavorite = async (e, productId) => {
    e.preventDefault();
    await saveFavorite(productId);
  };

  /**
   * ✅ Latest price alignment:
   * final_price should already come from backend as:
   * metal_value + (metal_value * vadd/100) (+ stone_price if backend includes it)
   *
   * We still guard + force whole rupees (no decimals).
   */
  const finalPriceRaw = Number(product?.final_price ?? product?.price ?? 0);
  const priceNumber = Number.isFinite(finalPriceRaw) ? Math.round(finalPriceRaw) : 0;
  const priceLabel = `₹${priceNumber.toLocaleString("en-IN")}`;


  const handleAddToCart = () => {
    if (!product) return;

    const payload = {
      ...product,
      productID: product.id,
      productName: product.name,
      productPrice: priceNumber, // ✅ whole rupees
      frontImg: images[0],
      quantity,
    };

    const productInCart = cartItems.find(
      (item) => item.productID === payload.productID
    );

    if (productInCart && productInCart.quantity >= 20) {
      toast.error("Product limit reached", {
        duration: 2000,
        style: { backgroundColor: "#ff4b4b", color: "white" },
        iconTheme: { primary: "#fff", secondary: "#ff4b4b" },
      });
    } else {
      dispatch(addToCart(payload));
      toast.success("Added to cart!", {
        duration: 2000,
        style: { backgroundColor: "#07bc0c", color: "white" },
        iconTheme: { primary: "#fff", secondary: "#07bc0c" },
      });
    }
  };

  if (loading) {
    return (
      <div className="productSection productSection--state">
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
        <div className="productShowCase">
          <div className="productDetails">
            <div className="productName">
              <h1>Loading...</h1>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="productSection productSection--state">
        <div className="productShowCase">
          <div className="productDetails">
            <div className="productName">
              <h1>{error || "Product not found"}</h1>
            </div>
            <Link to="/shop" className="backLink">
              ← Back to Shop
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
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
      <main className="productSection">
        <div className="productShowCase">
          <div className="productGallery">
            <div className="productThumb" aria-label="Product images">
              {images.map((src, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setCurrentImg(idx)}
                  className={currentImg === idx ? "active" : ""}
                  aria-label={`View image ${idx + 1} of ${product.name}`}
                  aria-current={currentImg === idx ? "true" : undefined}
                >
                  <img
                    src={resolveImageUrl(src)}
                    onError={handleImgError}
                    alt=""
                    loading={idx === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                </button>
              ))}
            </div>

            <div className="productFullImg">
              <img
                src={resolveImageUrl(images[currentImg])}
                alt={product.name || "Product"}
                onError={handleImgError}
              />

              {images.length > 1 && (
                <div className="buttonsGroup">
                  <button
                    type="button"
                    onClick={prevImg}
                    className="directionBtn"
                    aria-label="Previous product image"
                  >
                    <GoChevronLeft size={19} />
                  </button>
                  <button
                    type="button"
                    onClick={nextImg}
                    className="directionBtn"
                    aria-label="Next product image"
                  >
                    <GoChevronRight size={19} />
                  </button>
                </div>
              )}

              <div className="productImageCount" aria-live="polite">
                {String(currentImg + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
              </div>
            </div>
          </div>

          <div className="productDetails">
            <div className="productBreadcrumb">
              <div className="breadcrumbLink">
                <Link to="/">Home</Link><span aria-hidden="true">/</span>
                <Link to="/shop">The Shop</Link>
              </div>
            </div>

            <p className="productEyebrow">
              {product.type_name || product.product_type || product.type || "Jewellery"}
              {product.purity ? ` · ${product.purity}` : ""}
            </p>

            <div className="productName">
              <h1>{product.name}</h1>
            </div>

            <div className="productPrice">
              <span>Store-confirmed catalogue price</span>
              <h3>{priceLabel}</h3>
            </div>

            <div className="productDescription">
              <p>
                {product.full_description ||
                  product.short_description ||
                  "Contact the selected store to confirm this product’s design, weight, purity, availability and final price."}
              </p>
            </div>

            <div className="infoBadges">
              <div className="featureItem">
                <FiTool className="featureIcon" aria-hidden="true" />
                <span className="featureText">
                  Made to Order
                  <span className="tooltipContainer">
                    <span className="tooltipIcon">?</span>
                    <span className="tooltipText">
                      This product will be exclusively made once we receive your
                      order. Hence, additional time is taken for delivery. Weight
                      and prices are subject to minor changes.
                    </span>
                  </span>
                </span>
              </div>

              <div className="infoBadge">
                <FiShield className="infoBadgeIcon" aria-hidden="true" />
                <span className="infoBadgeText">Store-Confirmed Fulfilment</span>
              </div>

              <button
                type="button"
                className="infoBadge"
                onClick={() => {
                  const el = document.getElementById("priceBreakupSection");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <FiFileText className="infoBadgeIcon" aria-hidden="true" />
                <span className="infoBadgeText">Price Break-Up</span>
              </button>
            </div>

            <div className="productPurchasePanel">
              <div className="productPurchaseHeading">
                <span>Choose quantity</span>
                {product.product_code && <small>Code: {product.product_code}</small>}
              </div>
              <div className="productCartQuantity">
              <div className="productQuantity">
                <button type="button" onClick={decrement} aria-label="Decrease quantity">
                  -
                </button>
                <input
                  type="text"
                  value={quantity}
                  onChange={handleQtyInput}
                  aria-label="Product quantity"
                  inputMode="numeric"
                />
                <button type="button" onClick={increment} aria-label="Increase quantity">
                  +
                </button>
              </div>
              <div className="productCartBtn">
                <button type="button" onClick={handleAddToCart}>
                  Add to Cart
                </button>
              </div>
              </div>

              <div className="productWishShare">
                <button
                  type="button"
                  className="productWishList"
                  onClick={(e) => toggleFavorite(e, product.id)}
                  aria-pressed={Boolean(wishList[product.id])}
                >
                  <FiHeart
                    className={wishList[product.id] ? "isWishlisted" : ""}
                    size={17}
                  />
                  <span>{wishList[product.id] ? "Wishlisted" : "Add to Wishlist"}</span>
                </button>
                <p>No payment is collected online. Your selected store confirms final details.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default Product;
