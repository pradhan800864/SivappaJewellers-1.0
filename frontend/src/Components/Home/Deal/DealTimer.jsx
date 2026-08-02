import React from "react";
import { Link } from "react-router-dom";
import { FiArrowUpRight } from "react-icons/fi";
import "./DealTimer.css";
import heritageImage from "../../../Assets/HomeHero/heroImage3.jpg";

const DealTimer = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <section className="mainDeal" aria-labelledby="dealTitle">
      <div className="dealImage">
        <img
          src={heritageImage}
          alt="Traditional gold necklace displayed against a deep blue background"
          loading="lazy"
          decoding="async"
        />
        <span>Craft · Culture · Continuity</span>
      </div>

      <div className="dealContent">
        <p className="dealEyebrow">A tradition, worn forward</p>
        <h2 id="dealTitle">Heritage in every detail.</h2>
        <p className="dealCopy">
          Discover silhouettes inspired by the jewellery traditions of India,
          thoughtfully selected for celebrations today and memories tomorrow.
        </p>
        <div className="dealFacts">
          <div>
            <strong>Purity</strong>
            <span>Details shared before billing</span>
          </div>
          <div>
            <strong>Price</strong>
            <span>Confirmed by your selected store</span>
          </div>
        </div>
        <Link className="dealLink" to="/shop" onClick={scrollToTop}>
          Explore heritage pieces <FiArrowUpRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
};
export default DealTimer;
