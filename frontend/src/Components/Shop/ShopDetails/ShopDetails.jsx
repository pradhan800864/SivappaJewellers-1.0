import React, { useState, useEffect, useMemo, useCallback } from "react";
import "./ShopDetails.css";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../../Features/Cart/cartSlice";

import Filter from "../Filters/Filter";
import { Link } from "react-router-dom";
import { FiHeart } from "react-icons/fi";
import { IoFilterSharp, IoClose } from "react-icons/io5";
import { FaCartPlus } from "react-icons/fa";
import toast from "react-hot-toast";
import axios from "axios";

const ShopDetails = () => {
  const MAX_PAGES_VISIBLE = 10;
  const dispatch = useDispatch();
  const [products, setProducts] = useState([]);
  const [taxonomy, setTaxonomy] = useState(null);

  // wishlist + drawer + pagination
  const [wishList, setWishList] = useState({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

  // filters & sorting
  const [filterLabels, setFilterLabels] = useState([]);          // e.g. ['type:Gold','cat:Ring', ...]
  const [sortBy, setSortBy] = useState("default");

  // Load products
  useEffect(() => {
    axios
      .get("http://localhost:4998/api/products")
      .then((res) => setProducts(res.data))
      .catch((err) => console.error("Failed to fetch products:", err));
  }, []);

  // Load taxonomy (mounted under /api/products/taxonomy per our route)
  useEffect(() => {
    axios
      .get("http://localhost:4998/api/taxonomy")
      .then((res) => setTaxonomy(res.data))
      .catch((err) => console.error("Failed to fetch taxonomy:", err));
  }, []);

  const handleWishlistClick = (productID) => {
    setWishList((prev) => ({ ...prev, [productID]: !prev[productID] }));
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
  // Stable identity + guard to avoid redundant state churn when labels didn't change
  const handleFilterChange = useCallback((labels = [], structured = null) => {
    setFilterLabels((prev) => {
      const sameLength = prev.length === labels.length;
      const sameOrder = sameLength && prev.every((v, i) => v === labels[i]);
      if (sameOrder) return prev; // no-op; prevents unnecessary rerenders
      setCurrentPage(1);
      return labels;
    });
  }, []);

  // ---- Helper: normalize & tokens from product ----
  const norm = (v) => (v == null ? "" : String(v).trim());
  const toTokens = (product) => {
    const tokens = new Set();

    // try common field names
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

    // Availability (best-effort)
    const qty = product.quantity ?? product.stock ?? product.qty;
    const inStockFlag =
      product.in_stock ?? product.inStock ?? (typeof qty === "number" ? qty > 0 : null);
    if (inStockFlag) tokens.add("in-stock");

    // Labels array from DB (text[])
    if (Array.isArray(product.labels)) {
      product.labels.forEach((l) => {
        const label = norm(l);
        if (label) tokens.add(label);
      });
    }

    return tokens;
  };

  // ---- Score a product against current filters ----
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
        // loose match fallback for raw, non-prefixed labels
        const plain = lbl.split(":").pop();
        if (tokens.has(plain)) score += 1;
      }
    });

    return score;
  };

  // ---- Sort inside same score bucket by chosen sort ----
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

  // ---- Prioritized, then paginated list ----
  const prioritizedProducts = useMemo(() => {
    if (!products?.length) return [];
    const withScore = products.map((p) => ({ p, s: scoreProduct(p) }));
    withScore.sort((A, B) => {
      if (B.s !== A.s) return B.s - A.s;
      return secondaryCompare(A.p, B.p);
    });
    return withScore.map(({ p }) => p);
    // eslint-disable-next-line
  }, [products, filterLabels, sortBy]);

  // Pagination on prioritized list
  const totalPages = Math.ceil(prioritizedProducts.length / productsPerPage);
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = prioritizedProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct
  );


  // compute which page numbers to show (a bucket of 10)
  const visiblePages = useMemo(() => {
    if (!totalPages || totalPages <= 1) return [1];

    // 1–10, 11–20, 21–30, ...
    const start = Math.floor((currentPage - 1) / MAX_PAGES_VISIBLE) * MAX_PAGES_VISIBLE + 1;
    const end = Math.min(start + MAX_PAGES_VISIBLE - 1, totalPages);

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  return (
    <>
      <div className="shopDetails">
        <div className="shopDetailMain">
          <div className="shopDetails__left">
            <Filter onFilterChange={handleFilterChange} facets={taxonomy} />
          </div>

          <div className="shopDetails__right">
            <div className="shopDetailsSorting">
              <div className="shopDetailsBreadcrumbLink">
                <Link to="/" onClick={scrollToTop}>Home</Link>
                &nbsp;/&nbsp;
                <Link to="/shop">The Shop</Link>
              </div>

              <div className="filterLeft" onClick={toggleDrawer}>
                <IoFilterSharp />
                <p>Filter</p>
              </div>

              <div className="shopDetailsSort">
                <select
                  name="sort"
                  id="sort"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="default">Default Sorting</option>
                  <option value="Featured">Featured</option>
                  <option value="bestSelling">Best Selling</option>
                  <option value="a-z">Alphabetically, A-Z</option>
                  <option value="z-a">Alphabetically, Z-A</option>
                  <option value="lowToHigh">Price, Low to high</option>
                  <option value="highToLow">Price, high to low</option>
                  <option value="oldToNew">Date, old to new</option>
                  <option value="newToOld">Date, new to old</option>
                </select>

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
                        <img src={product.frontImg} alt="" className="sdProduct_front" />
                        <img src={product.backImg} alt="" className="sdProduct_back" />
                      </Link>
                      <h4 onClick={() => handleAddToCart(product)}>Add to Cart</h4>
                    </div>

                    <div
                      className="sdProductImagesCart"
                      onClick={() => handleAddToCart(product)}
                    >
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
                          ₹{Number(
                            product.final_price ?? product.price ?? 0
                          ).toLocaleString("en-IN")}
                        </p>
                        <div className="sdProductRatingReviews"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            <div className="shopDetailsPagination">
              <div className="sdPaginationPrev">
                <p
                  onClick={() => {
                    if (currentPage > 1) {
                      setCurrentPage(currentPage - 1);
                      scrollToTop();
                    }
                  }}
                  style={{ opacity: currentPage === 1 ? 0.5 : 1 }}
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

                  {/* optional ellipsis when more pages exist */}
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
                  style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}
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
          <Filter onFilterChange={handleFilterChange} facets={taxonomy} />
        </div>
      </div>
    </>
  );
};

export default ShopDetails;
