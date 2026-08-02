import React from "react";
import "./CollectionBox.css";

import { Link } from "react-router-dom";
import { FiArrowUpRight } from "react-icons/fi";

const CollectionBox = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <section className="collection" id="homeCollections" aria-labelledby="collectionTitle">
      <div className="collectionHeading">
        <div>
          <p>Find your expression</p>
          <h2 id="collectionTitle">Discover by collection</h2>
        </div>
        <p className="collectionIntro">
          From heirloom silhouettes to pieces made for every day, explore
          jewellery for every chapter.
        </p>
      </div>

      <div className="collectionGrid">
        <Link className="collectionCard collectionCard--heritage" to="/shop" onClick={scrollToTop}>
          <span className="collectionNumber">01</span>
          <div className="collectionCardContent">
            <p>Rooted in tradition</p>
            <h3>Bridal &amp; temple</h3>
            <span className="collectionCardLink">
              Explore collection <FiArrowUpRight aria-hidden="true" />
            </span>
          </div>
        </Link>

        <Link className="collectionCard collectionCard--men" to="/shop" onClick={scrollToTop}>
          <span className="collectionNumber">02</span>
          <div className="collectionCardContent">
            <p>Quiet confidence</p>
            <h3>For him</h3>
            <span className="collectionCardLink">
              Explore collection <FiArrowUpRight aria-hidden="true" />
            </span>
          </div>
        </Link>

        <Link className="collectionCard collectionCard--everyday" to="/shop" onClick={scrollToTop}>
          <span className="collectionNumber">03</span>
          <div className="collectionCardContent">
            <p>Light, lovely, lasting</p>
            <h3>Everyday gold</h3>
            <span className="collectionCardLink">
              Explore collection <FiArrowUpRight aria-hidden="true" />
            </span>
          </div>
        </Link>

      </div>
    </section>
  );
};

export default CollectionBox;
