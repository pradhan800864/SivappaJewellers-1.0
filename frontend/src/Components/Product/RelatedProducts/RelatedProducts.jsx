import React, { useEffect, useState } from "react";
import "./RelatedProducts.css";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";

import axios from "axios";
import { useParams, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { FiHeart } from "react-icons/fi";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { resolveImageUrl } from "../../../utils/resolveImageUrl";
import OtpLoginModal from "../../Authentication/OtpLoginModal/OtpLoginModal";

const currencyIN = (n) =>
  `₹${Math.round(Number(n || 0)).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;


const RelatedProducts = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // current product id
  const [wishList, setWishList] = useState({});
  const [favoriteLoginProductId, setFavoriteLoginProductId] = useState(null);
  const [items, setItems] = useState([]);

  const getAuthToken = () => localStorage.getItem("token") || "";

  useEffect(() => {
    if (!id) return;
    axios
      .get(`${process.env.REACT_APP_API_BASE}/api/products/${id}/related?limit=20`)
      .then((res) => setItems(res.data || []))
      .catch((e) => {
        console.error("Failed to load related products:", e);
        setItems([]);
      });
  }, [id]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    let alive = true;
    axios
      .get(`${process.env.REACT_APP_API_BASE}/api/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const favs = res.data?.favorites || [];
        const map = {};
        favs.forEach((f) => {
          map[Number(f.product_id)] = true;
        });
        if (alive) setWishList(map);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  const saveFavorite = async (productID) => {
    const token = getAuthToken();
    if (!token) {
      setFavoriteLoginProductId(productID);
      return;
    }

    const alreadyFav = !!wishList[productID];
    setWishList((prev) => ({ ...prev, [productID]: !alreadyFav }));

    try {
      if (!alreadyFav) {
        await axios.post(
          `${process.env.REACT_APP_API_BASE}/api/favorites`,
          { product_id: productID },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Added to favorites");
      } else {
        await axios.delete(`${process.env.REACT_APP_API_BASE}/api/favorites/${productID}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Removed from favorites");
      }
    } catch (error) {
      setWishList((prev) => ({ ...prev, [productID]: alreadyFav }));
      if (error?.response?.status === 401) {
        setFavoriteLoginProductId(productID);
        return;
      }
      toast.error(error?.response?.data?.error || "Failed to update favorite");
    }
  };

  const handleWishlistClick = async (event, productID) => {
    event.preventDefault();
    event.stopPropagation();
    await saveFavorite(productID);
  };

  const scrollToTop = () =>
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

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
      <div className="relatedProductSection">
        <div className="relatedProducts">
          <h2>
            RELATED <span>PRODUCTS</span>
          </h2>
        </div>

        <div className="relatedProductSlider">
          <div className="swiper-button image-swiper-button-next">
            <IoIosArrowForward />
          </div>
          <div className="swiper-button image-swiper-button-prev">
            <IoIosArrowBack />
          </div>

          <Swiper
            slidesPerView={4}
            slidesPerGroup={4}
            spaceBetween={30}
            loop={true}
            navigation={{
              nextEl: ".image-swiper-button-next",
              prevEl: ".image-swiper-button-prev",
            }}
            modules={[Navigation]}
            breakpoints={{
              320: { slidesPerView: 2, slidesPerGroup: 2, spaceBetween: 14 },
              768: { slidesPerView: 3, slidesPerGroup: 3, spaceBetween: 24 },
              1024: { slidesPerView: 4, slidesPerGroup: 4, spaceBetween: 30 },
            }}
          >
            {items.slice(0, 20).map((p) => {
              const productID = p.id;
              const front = p.frontImg || p.images?.[0] || "/placeholder.png";
              const back =
                p.backImg || p.images?.[1] || p.images?.[0] || "/placeholder.png";
              const price = currencyIN(p.final_price);

              return (
                <SwiperSlide key={productID}>
                  <div className="rpContainer">
                    <div
                      className="rpImages"
                      onClick={() => {
                        scrollToTop();
                        navigate(`/product/${productID}`);
                      }}
                    >
                      <img src={resolveImageUrl(front)} alt={p.name} className="rpFrontImg" />
                      <img src={resolveImageUrl(back)} alt={p.name} className="rpBackImg" />
                      <h4>Add to Cart</h4>
                    </div>

                    <div className="relatedProductInfo">
                      <div className="rpCategoryWishlist">
                        <p>Jewellery</p>
                        <FiHeart
                          onClick={(e) => handleWishlistClick(e, productID)}
                          style={{
                            color: wishList[productID] ? "red" : "#767676",
                            cursor: "pointer",
                          }}
                        />
                      </div>

                      <div className="productNameInfo">
                        <Link to={`/product/${productID}`} onClick={scrollToTop}>
                          <h5>{p.name}</h5>
                        </Link>
                        <p>{price}</p>

                        
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>
      </div>
    </>
  );
};

export default RelatedProducts;
