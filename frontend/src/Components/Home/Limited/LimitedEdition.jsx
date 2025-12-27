import React, { useEffect, useMemo, useState } from "react";
import "./LimitedEdition.css";

import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../../Features/Cart/cartSlice";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation, Autoplay } from "swiper/modules";

import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import { FiHeart } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { FaCartPlus } from "react-icons/fa";
import toast from "react-hot-toast";

const API_BASE = process.env.REACT_APP_API_BASE;

// ---------- helpers ----------
const fixUrl = (u) => {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return u.startsWith("/") ? `${API_BASE}${u}` : `${API_BASE}/${u}`;
};

const num = (v) => {
  if (v === null || v === undefined) return 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

// map backend row → UI product shape
const toUiProduct = (p) => {
  const imgs = Array.isArray(p.image_urls) ? p.image_urls : [];
  const front = fixUrl(p.image_url || imgs[0]);
  const back = fixUrl(imgs[1] || imgs[0] || p.image_url);

  return {
    id: p.id,
    productID: p.id,
    productName: p.name || "Product",
    productPrice:
      num(p.final_price) || num(p.net_price) || num(p.making_charges),
    productReviews: p.reviews || "No reviews",
    frontImg: front,
    backImg: back,
    productType: p.product_type || "Jewellery",
    labels: Array.isArray(p.labels)
      ? p.labels
      : typeof p.labels === "string"
      ? p.labels.split(",").map((s) => s.trim())
      : [],
  };
};

// ---------- component ----------
const LimitedEdition = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // ✅ hooks must be at top (before any useEffect that uses them)
  const [wishList, setWishList] = useState({}); // { [productId]: true }
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const cartItems = useSelector((state) => state.cart.items);

  const getAuthToken = () =>
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    "";

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // ✅ Add/remove favorite (persist to DB)
  const toggleFavorite = async (e, productId) => {
    e.preventDefault();
    e.stopPropagation();

    const token = getAuthToken();
    if (!token) {
      toast.error("Please login to add favorites");
      setTimeout(() => navigate("/loginSignUp"), 0); // ✅ reliable redirect
      return;
    }

    const alreadyFav = !!wishList[productId];

    // optimistic UI
    setWishList((prev) => ({ ...prev, [productId]: !alreadyFav }));

    try {
      if (!alreadyFav) {
        const r = await fetch(`${API_BASE}/api/favorites`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ product_id: productId }),
        });

        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || "Failed to add favorite");

        toast.success("Added to favorites");
      } else {
        const r = await fetch(`${API_BASE}/api/favorites/${productId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || "Failed to remove favorite");

        toast.success("Removed from favorites");
      }
    } catch (err2) {
      // rollback
      setWishList((prev) => ({ ...prev, [productId]: alreadyFav }));
      toast.error(err2?.message || "Failed to update favorite");
    }
  };

  // ✅ Fetch favorites (so heart shows correct state)
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    let alive = true;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/favorites`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));

        const rows = data?.favorites || data || [];
        const map = {};
        rows.forEach((r) => {
          const pid = Number(r.product_id ?? r.productID ?? r.id);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Normalize cart payload so ShoppingCart doesn't show NaN
  const handleAddToCart = (product) => {
    const normalized = {
      ...product,
      productID: product.productID ?? product.id,
      name: product.name ?? product.productName,
      productName: product.productName ?? product.name,
      final_price: product.final_price ?? product.productPrice ?? 0,
    };

    const found = cartItems.find((i) => i.productID === normalized.productID);

    if (found && found.quantity >= 20) {
      toast.error("Product limit reached", {
        duration: 2000,
        style: { backgroundColor: "#ff4b4b", color: "white" },
        iconTheme: { primary: "#fff", secondary: "#ff4b4b" },
      });
    } else {
      dispatch(addToCart(normalized));
      toast.success("Added to cart!", {
        duration: 2000,
        style: { backgroundColor: "#07bc0c", color: "white" },
        iconTheme: { primary: "#fff", secondary: "#07bc0c" },
      });
    }
  };

  // ✅ Fetch products and filter limited edition label
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const { data } = await axios.get(`${API_BASE}/api/products`);
        const list = Array.isArray(data) ? data : data.rows || data.items || [];
        const ui = list.map(toUiProduct);

        const le = ui.filter((p) =>
          p.labels.some((lbl) => String(lbl).toLowerCase() === "limited edition")
        );

        if (alive) setItems(le);
      } catch (e) {
        if (alive)
          setErr(
            e?.response?.data?.error || e.message || "Failed to load products"
          );
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // If there are only a few items, duplicate them so the loop feels continuous
  const marqueeItems = useMemo(() => {
    if (items.length >= 8) return items;
    return Array(Math.ceil(8 / Math.max(items.length || 1, 1)))
      .fill(0)
      .flatMap(() => items);
  }, [items]);

  if (loading)
    return (
      <div className="limitedProductSection">Loading limited edition…</div>
    );
  if (err)
    return (
      <div className="limitedProductSection text-red-600">Error: {err}</div>
    );
  if (!items.length)
    return (
      <div className="limitedProductSection">
        No limited edition products yet.
      </div>
    );

  return (
    <>
      <div className="limitedProductSection">
        <h2>
          Limited <span>Edition</span>
        </h2>

        <div className="limitedProductSlider">
          <div className="swiper-button image-swiper-button-next">
            <IoIosArrowForward />
          </div>
          <div className="swiper-button image-swiper-button-prev">
            <IoIosArrowBack />
          </div>

          <Swiper
            slidesPerView={4}
            slidesPerGroup={1}
            spaceBetween={30}
            loop={true}
            speed={5000}
            autoplay={{
              delay: 0,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            freeMode={true}
            freeModeMomentum={false}
            navigation={{
              nextEl: ".image-swiper-button-next",
              prevEl: ".image-swiper-button-prev",
            }}
            modules={[Navigation, Autoplay]}
            breakpoints={{
              320: { slidesPerView: 2, slidesPerGroup: 1, spaceBetween: 14 },
              768: { slidesPerView: 3, slidesPerGroup: 1, spaceBetween: 24 },
              1024: { slidesPerView: 4, slidesPerGroup: 1, spaceBetween: 30 },
            }}
          >
            {marqueeItems.map((product, idx) => (
              <SwiperSlide key={`${product.productID}-${idx}`}>
                <div className="lpContainer">
                  <div className="lpImageContainer">
                    <Link
                      to={`/product/${product.productID}`}
                      onClick={scrollToTop}
                    >
                      <img
                        src={product.frontImg}
                        alt={product.productName}
                        className="lpImage"
                      />
                    </Link>

                    <h4 onClick={() => handleAddToCart(product)}>Add to Cart</h4>
                  </div>

                  <div
                    className="lpProductImagesCart"
                    onClick={() => handleAddToCart(product)}
                  >
                    <FaCartPlus />
                  </div>

                  <div className="limitedProductInfo">
                    <div className="lpCategoryWishlist">
                      <p>{product.productType}</p>
                      <FiHeart
                        onClick={(e) => toggleFavorite(e, product.productID)}
                        style={{
                          color: wishList[product.productID] ? "red" : "#767676",
                          cursor: "pointer",
                        }}
                      />
                    </div>

                    <div className="productNameInfo">
                      <Link
                        to={`/product/${product.productID}`}
                        onClick={scrollToTop}
                      >
                        <h5>{product.productName}</h5>
                      </Link>

                      <p>
                        ₹
                        {Number(product.productPrice || 0).toLocaleString(
                          "en-IN",
                          { maximumFractionDigits: 2 }
                        )}
                      </p>

                      <div className="productRatingReviews">
                        <div className="productRatingStar">
                          {[...Array(5)].map((_, i) => (
                            <FaStar key={i} color="#FEC78A" size={10} />
                          ))}
                        </div>
                        <span>{product.productReviews}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </>
  );
};

export default LimitedEdition;
