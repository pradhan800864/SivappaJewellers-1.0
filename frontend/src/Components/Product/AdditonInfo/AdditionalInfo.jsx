import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";
import axios from "axios";
import "./AdditionalInfo.css";

// ✅ INR formatter (no decimals)
const currency = (n) =>
  `₹${Math.round(Number(n || 0)).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

// ✅ Metal rate formatter (keep 2 decimals for per-gram rate)
const rateINR = (n) =>
  `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}/g`;

const AdditionalInfo = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // accordion open/close
  const [open, setOpen] = useState({
    price: true,
    metal: false,
    diamond: false,
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    axios
      .get(`${process.env.REACT_APP_API_BASE}/api/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch((e) => {
        console.error("Failed to load product additional info:", e);
        setProduct(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const {
    product_code,
    purity,
    type_name,
    net_weight,
    gross_weight,

    // ✅ metal rate fields from backend
    metal_rate,
    metal_price_per_gram,

    // server-computed fields
    metal_amount,
    stone_amount,
    vadd_amount,
    final_price,
  } = product || {};

  // Prefer metal_rate; fallback to metal_price_per_gram
  const metalRatePerGram = Number(metal_rate ?? metal_price_per_gram ?? 0);

  // ✅ Show VADD instead of Making Charges
  const vaddPct = Number(product?.vadd || 0);
  const vaddLabel = vaddPct ? `VADD (${vaddPct}%)` : "VADD";

  const priceRows = useMemo(
    () => [
      { label: "Metal", value: metal_amount },
      { label: "Diamond", value: stone_amount },
      { label: vaddLabel, value: vadd_amount },
    ],
    [metal_amount, stone_amount, vadd_amount, vaddLabel]
  );

  if (loading) return null;
  if (!product) return null;

  return (
    <div id="priceBreakupSection" className="priceBreakupAnchor">
      <div className="productAdditionalInfo">
        <h2 className="aiTitle">Product Information</h2>

        <div className="aiInfoGrid">
          {/* LEFT – Summary */}
          <aside className="aiCard aiSummary">
            <h4>Product Summary</h4>

            <div className="aiKV">
              <span>Product Code</span>
              <span className="aiKVValue">{product_code || "—"}</span>
            </div>

            <div className="aiKV">
              <span>Purity</span>
              <span className="aiKVValue">{purity || "—"}</span>
            </div>

            <div className="aiKV">
              <span>Metal Type</span>
              <span className="aiKVValue">{type_name || "—"}</span>
            </div>

            {/* ✅ NEW: Metal Rate */}
            <div className="aiKV">
              <span>Metal Rate</span>
              <span className="aiKVValue">
                {metalRatePerGram > 0 ? rateINR(metalRatePerGram) : "—"}
              </span>
            </div>

            <div className="aiKV">
              <span>Metal Weight</span>
              <span className="aiKVValue">
                {net_weight ? `${net_weight} g` : "—"}
              </span>
            </div>

            <div className="aiKV">
              <span>Gross Weight</span>
              <span className="aiKVValue">
                {gross_weight ? `${gross_weight} g` : "—"}
              </span>
            </div>

            <p className="aiNote">
              *Difference in gold weight may occur & will apply on final price.
            </p>

            <div className="aiHelp">
              <p className="aiHelpTitle">
                Need help to find the best jewellery for you ?
              </p>
              <p className="aiHelpSub">We are available for your assistance</p>
              <div className="aiHelpBtns">
                <button onClick={() => navigate("/contact")}>
                  📞 Speak with Experts
                </button>
                <button onClick={() => navigate("/contact")}>
                  💬 Chat with Experts
                </button>
              </div>
            </div>
          </aside>

          {/* RIGHT – Accordions */}
          <section className="aiCard aiRight">
            {/* PRICE BREAKUP */}
            <div className="aiAcc">
              <button
                className="aiAccHeader"
                onClick={() =>
                  setOpen({ price: !open.price, metal: false, diamond: false })
                }
              >
                <span className="aiAccTitle">PRICE BREAKUP</span>
                {open.price ? <FiChevronUp /> : <FiChevronDown />}
              </button>

              <div className={`aiAccBody ${open.price ? "open" : ""}`}>
                <div className="aiRows">
                  {priceRows.map((r) => (
                    <div className="aiRow" key={r.label}>
                      <span className="aiRowLabel">{r.label}</span>
                      <span className="aiRowValue">{currency(r.value)}</span>
                    </div>
                  ))}

                  <div className="aiDivider" />

                  <div className="aiRow aiGrand">
                    <span className="aiRowLabel">Grand Total</span>
                    <span className="aiRowValue">{currency(final_price)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* METAL DETAILS */}
            <div className="aiAcc">
              <button
                className="aiAccHeader"
                onClick={() =>
                  setOpen({ price: false, metal: !open.metal, diamond: false })
                }
              >
                <span className="aiAccTitle">METAL DETAILS</span>
                {open.metal ? <FiChevronUp /> : <FiChevronDown />}
              </button>

              <div className={`aiAccBody ${open.metal ? "open" : ""}`}>
                <ul className="aiList">
                  <li>Metal: {type_name || "—"}</li>
                  <li>Purity: {purity || "—"}</li>

                  {/* ✅ NEW: Metal Rate */}
                  <li>
                    Metal Rate:{" "}
                    {metalRatePerGram > 0 ? rateINR(metalRatePerGram) : "—"}
                  </li>

                  <li>Net Weight: {net_weight ? `${net_weight} g` : "—"}</li>
                  <li>
                    Gross Weight: {gross_weight ? `${gross_weight} g` : "—"}
                  </li>
                </ul>
              </div>
            </div>

            {/* DIAMOND DETAILS */}
            <div className="aiAcc">
              <button
                className="aiAccHeader"
                onClick={() =>
                  setOpen({
                    price: false,
                    metal: false,
                    diamond: !open.diamond,
                  })
                }
              >
                <span className="aiAccTitle">DIAMOND DETAILS</span>
                {open.diamond ? <FiChevronUp /> : <FiChevronDown />}
              </button>

              <div className={`aiAccBody ${open.diamond ? "open" : ""}`}>
                {Number(product?.stone_count || 0) > 0 ? (
                  <ul className="aiList">
                    <li>Stones: {product.stone_count}</li>
                    {product.stone_weight && (
                      <li>Total Stone Weight: {product.stone_weight} ct</li>
                    )}
                    {stone_amount != null && (
                      <li>Stone Value: {currency(stone_amount)}</li>
                    )}
                  </ul>
                ) : (
                  <p className="aiMuted">No diamond/stone details for this product.</p>
                )}
              </div>
            </div>

            <p className="aiFootNote">
              *A differential amount will be applicable with difference in weight if any.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdditionalInfo;
