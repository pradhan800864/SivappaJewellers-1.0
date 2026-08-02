import React from "react";
import "./HeroSection.css";
import { Link } from "react-router-dom";
import { FiArrowDownRight, FiArrowUpRight } from "react-icons/fi";
import heroImage from "../../../Assets/HomeHero/hero-campaign-v2.png";

const HeroSection = () => {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <section className="heroMain" aria-labelledby="homeHeroTitle">
      <div className="heroMedia" aria-hidden="true">
        <img src={heroImage} alt="" fetchpriority="high" />
      </div>

      <div className="heroShade" aria-hidden="true" />

      <div className="heroContent">
        <p className="heroEyebrow">Sai Suryaa Jewellers · Kurnool</p>
        <h1 id="homeHeroTitle">
          Jewellery that
          <em> carries a story.</em>
        </h1>
        <p className="heroIntro">
          Discover gold and gemstone pieces shaped by Indian heritage, then
          request availability from the store you trust.
        </p>

        <div className="heroActions">
          <Link className="heroPrimaryAction" to="/shop" onClick={scrollToTop}>
            Explore jewellery <FiArrowUpRight aria-hidden="true" />
          </Link>
          <Link className="heroSecondaryAction" to="/about" onClick={scrollToTop}>
            Our story
          </Link>
        </div>

        <div className="heroAssurances" aria-label="Shopping assurances">
          <span>Store-confirmed pricing</span>
          <span>Purity details before billing</span>
          <span>No online payment</span>
        </div>
      </div>

      <a className="heroScrollCue" href="#homeCollections">
        Discover collections <FiArrowDownRight aria-hidden="true" />
      </a>

      <p className="heroIndex" aria-hidden="true">
        <span>01</span> / Heritage, reimagined
      </p>
    </section>
  );
};

export default HeroSection;
