import React, { useEffect, useMemo, useState } from "react";

import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../../Features/Cart/cartSlice";

import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import { FiHeart } from "react-icons/fi";

import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";

import "./Product.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4998";
const PLACEHOLDER = "/images/placeholder.png"; // ensure this file exists in public/images/

const toPublicUrl = (u) => {
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  return `${API_BASE}/${String(u).replace(/^\/+/, "")}`;
};

const Product = () => {
  const { id } = useParams();
  const dispatch = useDispatch();

  // Data
  const [product, setProduct] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  // UI State (kept as-is to preserve styles)
  const [currentImg, setCurrentImg]   = useState(0);
  const [quantity, setQuantity]       = useState(1);
  const [clicked, setClicked]         = useState(false);

  const cartItems = useSelector((state) => state.cart.items);

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
        console.error("Failed to fetch product:", err);
        setError("Product not found");
        setLoading(false);
      });
  }, [id]);

  // Build image list: prefer product.images from API; fall back to product.image_urls; last resort: try legacy fields
  const images = useMemo(() => {
    if (!product) return [];

    let list = [];
    if (Array.isArray(product.images) && product.images.length) {
      list = product.images;
    } else if (Array.isArray(product.image_urls) && product.image_urls.length) {
      list = product.image_urls;
    } else {
      list = [
        product.frontImg, product.backImg,
        product.image1, product.image2, product.image3, product.image4,
      ].filter(Boolean);
    }

    // normalize to absolute URLs and dedupe
    const normalized = Array.from(
      new Set(list.map(toPublicUrl).filter(Boolean))
    );

    return normalized.length ? normalized : [PLACEHOLDER];
  }, [product]);

  const handleImgError = (e) => {
    // Stop loops & set local placeholder that actually exists
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

  const handleWishClick = () => setClicked((c) => !c);

  const priceNumber = Number(product?.final_price ?? product?.price ?? 0);
  const priceLabel  = `₹${priceNumber.toLocaleString("en-IN")}`;

  const handleAddToCart = () => {
    if (!product) return;

    const payload = {
      ...product,
      productID: product.id,
      productName: product.name,
      productPrice: priceNumber,
      frontImg: images[0],
      quantity,
    };

    const productInCart = cartItems.find((item) => item.productID === payload.productID);

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

  // Loading / Error states (kept very light to preserve layout)
  if (loading) {
    return (
      <div className="productSection">
        <div className="productShowCase">
          <div className="productDetails">
            <div className="productName"><h1>Loading...</h1></div>
          </div>
        </div>
      </div>
    );
  }
  if (error || !product) {
    return (
      <div className="productSection">
        <div className="productShowCase">
          <div className="productDetails">
            <div className="productName"><h1>{error || "Product not found"}</h1></div>
            <Link to="/shop" className="backLink">← Back to Shop</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="productSection">
        <div className="productShowCase">
          {/* Gallery */}
          <div className="productGallery">
            <div className="productThumb">
              {images.map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  onError={handleImgError}
                  onClick={() => setCurrentImg(idx)}
                  alt={product.name || `image-${idx}`}
                />
              ))}
            </div>
            <div className="productFullImg">
              <img
                src={images[currentImg]}
                alt={product.name || "Product"}
                onError={handleImgError}
              />
              <div className="buttonsGroup">
                <button onClick={prevImg} className="directionBtn">
                  <GoChevronLeft size={18} />
                </button>
                <button onClick={nextImg} className="directionBtn">
                  <GoChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="productDetails">
            <div className="productBreadcrumb">
              <div className="breadcrumbLink">
                <Link to="/">Home</Link>&nbsp;/&nbsp;
                <Link to="/shop">The Shop</Link>
              </div>
            </div>

            <div className="productName">
              <h1>{product.name}</h1>
            </div>

            <div className="productPrice">
              <h3>{priceLabel}</h3>
            </div>

            <div className="productDescription">
              <p>
                {product.full_description || product.short_description ||
                  "Product description will appear here. Update 'description' field in your products table to override this placeholder."}
              </p>
            </div>
            <div className="infoBadges">
              <div className="featureItem">
                <span className="featureIcon">🛠️</span>
                <span className="featureText">
                  Made to Order
                  <span className="tooltipContainer">
                    <span className="tooltipIcon">?</span>
                    <span className="tooltipText">
                      This product will be exclusively made once we receive your order.
                      Hence, additional time is taken for delivery. Weight and prices are
                      subject to minor changes.
                    </span>
                  </span>
                </span>
              </div>

              <div className="infoBadge">
                <span className="infoBadgeIcon">🛡️</span>
                <span className="infoBadgeText">Transit Insurance</span>
              </div>

              <div
                className="infoBadge"
                onClick={() => {
                  const el = document.getElementById("priceBreakupSection");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                style={{ cursor: "pointer" }}
              >
                <span className="infoBadgeIcon">💰</span>
                <span className="infoBadgeText">Price Break-Up</span>
              </div>
            </div>



            <div className="productCartQuantity">
              <div className="productQuantity">
                <button onClick={decrement}>-</button>
                <input type="text" value={quantity} onChange={handleQtyInput} />
                <button onClick={increment}>+</button>
              </div>
              <div className="productCartBtn">
                <button onClick={handleAddToCart}>Add to Cart</button>
              </div>
            </div>

            <div className="productWishShare">
              <div className="productWishList">
                <button onClick={handleWishClick}>
                  <FiHeart color={clicked ? "red" : ""} size={17} />
                  <p>Add to Wishlist</p>
                </button>
              </div>
            </div>

            
          </div>
        </div>
      </div>
    </>
  );
};

export default Product;
