import React, { useEffect, useState } from "react";
import "./LimitedEdition.css";

import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../../Features/Cart/cartSlice";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation, Autoplay } from "swiper/modules";

import { Link } from "react-router-dom";

import { FiArrowUpRight, FiHeart, FiShoppingBag } from "react-icons/fi";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import toast from "react-hot-toast";
import { resolveImageUrl } from "../../../utils/resolveImageUrl";
import OtpLoginModal from "../../Authentication/OtpLoginModal/OtpLoginModal";
import { fetchProductCatalog } from "../../../utils/productCatalog";

const API_BASE = process.env.REACT_APP_API_BASE;

const num = (v) => {
  if (v === null || v === undefined) return 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

// map backend row → UI product shape
const toUiProduct = (p) => {
  const imgs = Array.isArray(p.image_urls) ? p.image_urls : [];
  // Prefer the absolute URLs returned by the products API. The raw database
  // paths are kept as fallbacks for older API responses.
  const front = resolveImageUrl(p.frontImg || p.image_url || imgs[0]);
  const back = resolveImageUrl(
    p.backImg || imgs[1] || p.frontImg || imgs[0] || p.image_url
  );

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

  // ✅ hooks must be at top (before any useEffect that uses them)
  const [wishList, setWishList] = useState({}); // { [productId]: true }
  const [favoriteLoginProductId, setFavoriteLoginProductId] = useState(null);
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

  const saveFavorite = async (productId) => {
    const token = getAuthToken();
    if (!token) {
      setFavoriteLoginProductId(productId);
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

  // ✅ Add/remove favorite (persist to DB)
  const toggleFavorite = async (e, productId) => {
    e.preventDefault();
    e.stopPropagation();
    await saveFavorite(productId);
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

        const list = await fetchProductCatalog();
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
      <section className="limitedProductSection" aria-labelledby="limitedTitle">
        <div className="limitedHeading">
          <div>
            <p>Rare by design</p>
            <h2 id="limitedTitle">Limited editions.</h2>
          </div>
          <p className="limitedIntro">
            Distinctive pieces selected in smaller numbers for the moments that
            deserve something less expected.
          </p>
        </div>

        <div className="limitedProductSlider">
          {items.length > 1 && (
            <>
              <button type="button" className="limitedSwiperButton limited-swiper-button-next" aria-label="Next limited-edition pieces">
                <IoIosArrowForward />
              </button>
              <button type="button" className="limitedSwiperButton limited-swiper-button-prev" aria-label="Previous limited-edition pieces">
                <IoIosArrowBack />
              </button>
            </>
          )}

          <Swiper
            slidesPerView={4}
            slidesPerGroup={1}
            spaceBetween={30}
            loop={items.length > 4}
            speed={5000}
            autoplay={items.length > 1 ? {
              delay: 0,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            } : false}
            freeMode={true}
            navigation={{
              nextEl: ".limited-swiper-button-next",
              prevEl: ".limited-swiper-button-prev",
            }}
            modules={[Navigation, Autoplay]}
            breakpoints={{
              320: { slidesPerView: 2, slidesPerGroup: 1, spaceBetween: 14 },
              768: { slidesPerView: 3, slidesPerGroup: 1, spaceBetween: 24 },
              1024: { slidesPerView: 4, slidesPerGroup: 1, spaceBetween: 30 },
            }}
          >
            {items.map((product, idx) => (
              <SwiperSlide key={`${product.productID}-${idx}`}>
                <article className="lpContainer">
                  <div className="lpImageContainer">
                    <Link
                      to={`/product/${product.productID}`}
                      onClick={scrollToTop}
                      aria-label={`View ${product.productName}`}
                    >
                      <img
                        src={resolveImageUrl(product.frontImg)}
                        alt={product.productName}
                        className="lpImage"
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="lpViewPiece">
                        View piece <FiArrowUpRight aria-hidden="true" />
                      </span>
                    </Link>

                    <button
                      type="button"
                      className="lpWishButton"
                      onClick={(e) => toggleFavorite(e, product.productID)}
                      aria-label={`${wishList[product.productID] ? "Remove" : "Save"} ${product.productName} ${wishList[product.productID] ? "from" : "to"} favourites`}
                      aria-pressed={Boolean(wishList[product.productID])}
                    >
                      <FiHeart className={wishList[product.productID] ? "isFavorite" : ""} />
                    </button>
                    <button
                      type="button"
                      className="lpCartButton"
                      onClick={() => handleAddToCart(product)}
                    >
                      <FiShoppingBag aria-hidden="true" />
                      <span>Add to cart</span>
                    </button>
                  </div>

                  <div className="limitedProductInfo">
                    <div className="lpCategoryWishlist">
                      <p>{product.productType}</p>
                      <span>Limited edit</span>
                    </div>

                    <Link
                      className="lpProductNameInfo"
                      to={`/product/${product.productID}`}
                      onClick={scrollToTop}
                    >
                      <h3>{product.productName}</h3>
                      <p>
                        ₹
                        {Number(product.productPrice || 0).toLocaleString(
                          "en-IN",
                          { maximumFractionDigits: 2 }
                        )}
                      </p>
                    </Link>
                  </div>
                </article>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
        <Link className="limitedViewAll" to="/shop" onClick={scrollToTop}>
          View all jewellery <FiArrowUpRight aria-hidden="true" />
        </Link>
      </section>
    </>
  );
};

export default LimitedEdition;
