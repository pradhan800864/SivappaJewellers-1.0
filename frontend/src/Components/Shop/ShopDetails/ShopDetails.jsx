import React, { useState, useEffect, useMemo, useCallback } from "react";
import "./ShopDetails.css";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../../Features/Cart/cartSlice";

import Filter from "../Filters/Filter";
import { Link, useNavigate } from "react-router-dom";
import { FiHeart } from "react-icons/fi";
import { IoFilterSharp, IoClose } from "react-icons/io5";
import { FaCartPlus } from "react-icons/fa";
import toast from "react-hot-toast";
import axios from "axios";
import { resolveImageUrl } from "../../../utils/resolveImageUrl";


const ShopDetails = () => {
  const navigate = useNavigate();

  const getToken = () => localStorage.getItem("token"); // change key if you use different one
  const authHeaders = () => {
    const t = getToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  // ✅ show fewer pages on mobile to avoid horizontal scroll
  const getMaxPagesVisible = () => {
    if (window.innerWidth <= 360) return 5;
    if (window.innerWidth <= 480) return 6;
    return 8;
  };
  const [MAX_PAGES_VISIBLE, setMAX_PAGES_VISIBLE] = useState(getMaxPagesVisible());

  useEffect(() => {
    const onResize = () => setMAX_PAGES_VISIBLE(getMaxPagesVisible());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const dispatch = useDispatch();
  const [products, setProducts] = useState([]);
  const [taxonomy, setTaxonomy] = useState(null);
  const [isSortOpen, setIsSortOpen] = useState(false);
  // wishlist + drawer + pagination
  const [wishList, setWishList] = useState({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

  // filters & sorting
  const [filterLabels, setFilterLabels] = useState([]); // e.g. ['type:Gold','cat:Ring', ...]
  const [sortBy, setSortBy] = useState("default");
  const [searchText, setSearchText] = useState("");

  const sortOptions = [
    { value: "default", label: "Default Sorting" },
    { value: "Featured", label: "Featured" },
    { value: "bestSelling", label: "Best Selling" },
    { value: "a-z", label: "Alphabetically, A-Z" },
    { value: "z-a", label: "Alphabetically, Z-A" },
    { value: "lowToHigh", label: "Price, Low to high" },
    { value: "highToLow", label: "Price, high to low" },
    { value: "oldToNew", label: "Date, old to new" },
    { value: "newToOld", label: "Date, new to old" },
  ];
  
  const sortLabel =
    sortOptions.find((o) => o.value === sortBy)?.label || "Default Sorting";

  // Load products
  useEffect(() => {
    axios
      .get(process.env.REACT_APP_API_BASE + "/api/products")
      .then((res) => {
        console.log("SAMPLE PRODUCT:", res.data?.[0]);
        setProducts(res.data);
      })
      .catch((err) => console.error("Failed to fetch products:", err));
  }, []);

  // Load taxonomy
  useEffect(() => {
    axios
      .get(process.env.REACT_APP_API_BASE + "/api/taxonomy")
      .then((res) => setTaxonomy(res.data))
      .catch((err) => console.error("Failed to fetch taxonomy:", err));
  }, []);

  // Load favorites for logged-in user so hearts are correct
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    axios
      .get(process.env.REACT_APP_API_BASE + "/api/favorites", { headers: authHeaders() })
      .then((res) => {
        const favs = res.data?.favorites || [];
        const map = {};
        favs.forEach((f) => {
          map[Number(f.product_id)] = true;
        });
        setWishList(map);
      })
      .catch((err) => {
        console.error("Failed to fetch favorites:", err);
      });
    // eslint-disable-next-line
  }, []);

  const handleWishlistClick = async (productID) => {
    const token = getToken();

    if (!token) {
      localStorage.setItem("pending_favorite_product_id", String(productID));
      localStorage.setItem(
        "post_login_redirect",
        window.location.pathname + window.location.search
      );
      navigate("/loginSignUp");
      return;
    }

    const alreadyFav = !!wishList[productID];

    try {
      if (!alreadyFav) {
        await axios.post(
          process.env.REACT_APP_API_BASE + "/api/favorites",
          { product_id: productID },
          { headers: authHeaders() }
        );
        setWishList((prev) => ({ ...prev, [productID]: true }));
        toast.success("Added to favorites");
      } else {
        await axios.delete(`${process.env.REACT_APP_API_BASE}/api/favorites/${productID}`, {
          headers: authHeaders(),
        });
        setWishList((prev) => {
          const copy = { ...prev };
          delete copy[productID];
          return copy;
        });
        toast.success("Removed from favorites");
      }
    } catch (err) {
      console.error("Favorite toggle failed:", err);
      if (err?.response?.status === 401) {
        localStorage.setItem("pending_favorite_product_id", String(productID));
        localStorage.setItem(
          "post_login_redirect",
          window.location.pathname + window.location.search
        );
        navigate("/loginSignUp");
        return;
      }
      toast.error("Failed to update favorite");
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const toggleDrawer = () => setIsDrawerOpen((s) => !s);
  const closeDrawer = () => setIsDrawerOpen(false);

  const cartItems = useSelector((state) => state.cart.items);

  const handleAddToCart = (product) => {
    const productInCart = cartItems.find((item) => item.productID === product.id);
    if (productInCart && productInCart.quantity >= 20) {
      toast.error("Product limit reached", {
        duration: 2000,
        style: { backgroundColor: "#ff4b4b", color: "white" },
        iconTheme: { primary: "#fff", secondary: "#ff4b4b" },
      });
    } else {
      dispatch(addToCart({ ...product, productID: product.id }));
      toast.success(`Added to cart!`, {
        duration: 2000,
        style: { backgroundColor: "#07bc0c", color: "white" },
        iconTheme: { primary: "#fff", secondary: "#07bc0c" },
      });
    }
  };

  // ===== Filter hookup =====
  const handleFilterChange = useCallback((labels = [], structured = null) => {
    setFilterLabels((prev) => {
      const sameLength = prev.length === labels.length;
      const sameOrder = sameLength && prev.every((v, i) => v === labels[i]);
      if (sameOrder) return prev;
      setCurrentPage(1);
      return labels;
    });
  }, []);

  const norm = (v) => (v == null ? "" : String(v).trim());
  const toTokens = (product) => {
    const tokens = new Set();

    const type =
      product.type_name || product.type || product.product_type || product.typeName;
    const category =
      product.category_name || product.category || product.categoryName;
    const subCategory =
      product.sub_category_name || product.sub_category || product.subCategoryName;
    const purity = product.purity;
    const hasStones =
      typeof product.has_stones === "boolean" ? product.has_stones : product.hasStones;
    const stoneType = product.stone_type || product.stoneType;

    if (type) tokens.add(`type:${norm(type)}`);
    if (category) tokens.add(`cat:${norm(category)}`);
    if (subCategory) tokens.add(`sub:${norm(subCategory)}`);
    if (purity) tokens.add(`purity:${norm(purity)}`);
    if (hasStones) tokens.add("has-stones");
    if (stoneType) tokens.add(`stone:${norm(stoneType)}`);

    const qty = product.quantity ?? product.stock ?? product.qty;
    const inStockFlag =
      product.in_stock ?? product.inStock ?? (typeof qty === "number" ? qty > 0 : null);
    if (inStockFlag) tokens.add("in-stock");

    if (Array.isArray(product.labels)) {
      product.labels.forEach((l) => {
        const label = norm(l);
        if (label) tokens.add(label);
      });
    }

    return tokens;
  };

  const scoreProduct = (product) => {
    if (!filterLabels?.length) return 0;
    const tokens = toTokens(product);
    let score = 0;

    const weights = {
      "type:": 3,
      "cat:": 2,
      "sub:": 2,
      "purity:": 2,
      "stone:": 1,
      "has-stones": 1,
      "in-stock": 1,
      default: 1,
    };

    filterLabels.forEach((lbl) => {
      if (tokens.has(lbl)) {
        if (lbl.startsWith("type:")) score += weights["type:"];
        else if (lbl.startsWith("cat:")) score += weights["cat:"];
        else if (lbl.startsWith("sub:")) score += weights["sub:"];
        else if (lbl.startsWith("purity:")) score += weights["purity:"];
        else if (lbl.startsWith("stone:")) score += weights["stone:"];
        else if (lbl === "has-stones") score += weights["has-stones"];
        else if (lbl === "in-stock") score += weights["in-stock"];
        else score += weights.default;
      } else {
        const plain = lbl.split(":").pop();
        if (tokens.has(plain)) score += 1;
      }
    });

    return score;
  };

  const tokenize = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")   // remove symbols
      .replace(/-/g, " ")             // treat "-" like space
      .split(/\s+/)
      .filter(Boolean);
  
  const tokenMatchScore = (text, query) => {
    const qTokens = tokenize(query);
    if (!qTokens.length) return 0;
  
    const tTokens = tokenize(text);
    if (!tTokens.length) return 0;
  
    // ✅ if every query token matches the start of SOME text token => match
    // ex: "coin" matches "coins" because "coins".startsWith("coin")
    const allMatch = qTokens.every((qt) =>
      tTokens.some((tt) => tt.startsWith(qt) || qt.startsWith(tt))
    );
  
    if (!allMatch) return 0;
  
    // scoring: prefer stronger/earlier matches
    // (more matches => higher)
    let score = 0;
    qTokens.forEach((qt) => {
      if (tTokens.some((tt) => tt === qt)) score += 3;          // exact token
      else if (tTokens.some((tt) => tt.startsWith(qt))) score += 2; // prefix
      else if (tTokens.some((tt) => qt.startsWith(tt))) score += 1; // query longer than token
    });
  
    return score;
  };
  
  const searchRank = (product, q) => {
    const query = (q || "").trim();
    if (!query) return 0;
  
    const name = product?.name || "";
    const labels = Array.isArray(product?.labels) ? product.labels.join(" ") : "";
  
    const nameScore = tokenMatchScore(name, query);
    if (nameScore > 0) return 200 + nameScore; // ✅ name always highest priority
  
    const labelScore = tokenMatchScore(labels, query);
    if (labelScore > 0) return 100 + labelScore; // ✅ labels next
  
    return 0;
  };
  
  const secondaryCompare = (a, b) => {
    const ap = a;
    const bp = b;
    const aPrice = Number(ap.final_price ?? ap.price ?? 0);
    const bPrice = Number(bp.final_price ?? bp.price ?? 0);
    const aName = norm(ap.name).toLowerCase();
    const bName = norm(bp.name).toLowerCase();

    const aDate =
      new Date(ap.created_at ?? ap.createdAt ?? 0).getTime() || Number(ap.id) || 0;
    const bDate =
      new Date(bp.created_at ?? bp.createdAt ?? 0).getTime() || Number(bp.id) || 0;

    switch (sortBy) {
      case "a-z":
        return aName.localeCompare(bName);
      case "z-a":
        return bName.localeCompare(aName);
      case "lowToHigh":
        return aPrice - bPrice;
      case "highToLow":
        return bPrice - aPrice;
      case "oldToNew":
        return aDate - bDate;
      case "newToOld":
        return bDate - aDate;
      default:
        return 0;
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  const prioritizedProducts = useMemo(() => {
    if (!products?.length) return [];
  
    const q = searchText.trim();
    const withMeta = products.map((p) => ({
      p,
      filterScore: scoreProduct(p),
      searchScore: searchRank(p, q),
    }));
  
    withMeta.sort((A, B) => {
      // ✅ 1) Search priority first (name > labels > others)
      if (B.searchScore !== A.searchScore) return B.searchScore - A.searchScore;
  
      // ✅ 2) Then your existing filter scoring
      if (B.filterScore !== A.filterScore) return B.filterScore - A.filterScore;
  
      // ✅ 3) Then your existing dropdown sort (price/date/a-z...)
      return secondaryCompare(A.p, B.p);
    });
  
    return withMeta.map(({ p }) => p);
    // eslint-disable-next-line
  }, [products, filterLabels, sortBy, searchText]);
  

  const totalPages = Math.ceil(prioritizedProducts.length / productsPerPage);
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = prioritizedProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  // ✅ visible pages bucket based on MAX_PAGES_VISIBLE
  const visiblePages = useMemo(() => {
    if (!totalPages || totalPages <= 1) return [1];
    const start =
      Math.floor((currentPage - 1) / MAX_PAGES_VISIBLE) * MAX_PAGES_VISIBLE + 1;
    const end = Math.min(start + MAX_PAGES_VISIBLE - 1, totalPages);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages, MAX_PAGES_VISIBLE]);

  return (
    <>
      <div className="shopDetails">
        <div className="shopDetailMain">
          <div className="shopDetails__left">
            <Filter onFilterChange={handleFilterChange} facets={taxonomy} />
          </div>

          <div className="shopDetails__right">
            <div className="shopDetailsSorting">
              {/* ✅ Left-most: Breadcrumb */}
              <div className="shopDetailsBreadcrumbLink">
                <Link to="/" onClick={scrollToTop}>Home</Link>
                &nbsp;/&nbsp;
                <Link to="/shop">The Shop</Link>
              </div>

              {/* ✅ Search icon + input */}
              <div className="shopSearchWrap">
                <span className="shopSearchIcon">🔍</span>

                <input
                  type="text"
                  placeholder="Search products or labels..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="shopSearchInput"
                />

                {searchText && (
                  <button
                    type="button"
                    className="shopSearchClear"
                    onClick={() => setSearchText("")}
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* ✅ Optional: Filter (left) */}
              <div className="filterLeft" onClick={toggleDrawer}>
                <IoFilterSharp />
                <p>Filter</p>
              </div>

              {/* ✅ Right-most: Sorting */}
              <div className="shopDetailsSort">
                {/* ✅ Desktop/Web */}
                <select
                  className="sortSelectDesktop"
                  name="sort"
                  id="sort"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  {sortOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>

                {/* ✅ Mobile dropdown */}
                <div className="sortSelectMobile">
                  <button
                    type="button"
                    className="sortTrigger"
                    onClick={() => setIsSortOpen((s) => !s)}
                    aria-expanded={isSortOpen}
                  >
                    {sortLabel} <span className="sortChevron">▾</span>
                  </button>

                  {isSortOpen && (
                    <div className="sortMenu">
                      {sortOptions.map((o) => (
                        <button
                          type="button"
                          key={o.value}
                          className={`sortItem ${sortBy === o.value ? "active" : ""}`}
                          onClick={() => {
                            setSortBy(o.value);
                            setCurrentPage(1);
                            setIsSortOpen(false);
                          }}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ✅ Optional: Filter (right) */}
                <div className="filterRight" onClick={toggleDrawer}>
                  <div className="filterSeprator"></div>
                  <IoFilterSharp />
                  <p>Filter</p>
                </div>
              </div>
            </div>


            <div className="shopDetailsProducts">
              <div className="shopDetailsProductsContainer">
                {currentProducts.map((product) => (
                  <div className="sdProductContainer" key={product.id}>
                    <div className="sdProductImages">
                      <Link to={`/product/${product.id}`} onClick={scrollToTop}>
                        <img src={resolveImageUrl(product.frontImg)} alt="" className="sdProduct_front" />
                        <img src={resolveImageUrl(product.backImg)} alt="" className="sdProduct_back" />
                      </Link>
                      <h4 onClick={() => handleAddToCart(product)}>Add to Cart</h4>
                    </div>

                    <div className="sdProductImagesCart" onClick={() => handleAddToCart(product)}>
                      <FaCartPlus />
                    </div>

                    <div className="sdProductInfo">
                      <div className="sdProductCategoryWishlist">
                        <p>
                          {product.product_type ||
                            product.type_name ||
                            product.type ||
                            "Jewellery"}
                        </p>
                        <FiHeart
                          onClick={() => handleWishlistClick(product.id)}
                          style={{
                            color: wishList[product.id] ? "red" : "#767676",
                            cursor: "pointer",
                          }}
                        />
                      </div>

                      <div className="sdProductNameInfo">
                        <Link to={`/product/${product.id}`} onClick={scrollToTop}>
                          <h5>{product.name}</h5>
                        </Link>
                        <p>
                          ₹{Number(product.final_price ?? product.price ?? 0).toLocaleString("en-IN")}
                        </p>
                        <div className="sdProductRatingReviews"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ✅ Pagination (mobile-safe) */}
            <div className="shopDetailsPagination">
              <div className="sdPaginationPrev">
                <p
                  onClick={() => {
                    if (currentPage > 1) {
                      setCurrentPage(currentPage - 1);
                      scrollToTop();
                    }
                  }}
                  className={currentPage === 1 ? "disabled" : ""}
                >
                  <GoChevronLeft /> Prev
                </p>
              </div>

              <div className="sdPaginationNumber">
                <div className="paginationNum">
                  {visiblePages.map((pageNum) => (
                    <p
                      key={pageNum}
                      onClick={() => {
                        setCurrentPage(pageNum);
                        scrollToTop();
                      }}
                      className={currentPage === pageNum ? "active" : ""}
                    >
                      {pageNum}
                    </p>
                  ))}

                  {visiblePages[visiblePages.length - 1] < totalPages && (
                    <span className="ellipsis">…</span>
                  )}
                </div>
              </div>

              <div className="sdPaginationNext">
                <p
                  onClick={() => {
                    if (currentPage < totalPages) {
                      setCurrentPage(currentPage + 1);
                      scrollToTop();
                    }
                  }}
                  className={currentPage === totalPages ? "disabled" : ""}
                >
                  Next <GoChevronRight />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer */}
      <div className={`filterDrawer ${isDrawerOpen ? "open" : ""}`}>
        <div className="drawerHeader">
          <p>Filter By</p>
          <IoClose onClick={closeDrawer} className="closeButton" size={26} />
        </div>
        <div className="drawerContent">
          <Filter onFilterChange={handleFilterChange} facets={taxonomy} onClose={closeDrawer}/>
        </div>
      </div>
    </>
  );
};

export default ShopDetails;
