import React from "react";
import "./AboutPage.css";

import about1 from "../../Assets/About/about-1.jpg";
import about2 from "../../Assets/About/about-2.jpg";

import Services from "../../Components/Home/Services/Services";
import { Link } from "react-router-dom";
import { businessDetails } from "../Legal/legalContent";

const AboutPage = () => {
  return (
    <>
      <div className="aboutSection">
        <h2>About Sai Suryaa Jewellers</h2>
        <img src={about1} alt="" />
        <div className="aboutContent">
          <h3>Our Story</h3>
          <h4>
            A local jewellery experience supported by a clearer digital way to
            discover products and connect with a preferred store.
          </h4>
          <p>
            Sai Suryaa Jewellers is the customer-facing brand used by this
            application. Customers can browse catalogue products, save favourites,
            select a participating store and send an order request. The selected
            store then confirms availability, final weight and price, billing,
            payment and fulfilment before a sale is completed.
          </p>
          <div className="content1">
            <div className="contentBox">
              <h5>Our Mission</h5>
              <p>
                Make jewellery discovery easier while preserving clear product,
                pricing, seller and customer-service information.
              </p>
            </div>
            <div className="contentBox">
              <h5>Our Vision</h5>
              <p>
                Build trust through transparent store confirmation, accurate
                invoices and responsible after-sales support.
              </p>
            </div>
          </div>
          <div className="content2">
            <div className="imgContent">
              <img src={about2} alt="" />
            </div>
            <div className="textContent">
              <h5>The Company</h5>
              <p>
                The application is operated for {businessDetails.merchantName} at{" "}
                {businessDetails.address}. GSTIN: {businessDetails.gstin}. The seller
                responsible for a completed purchase is identified on the final tax
                invoice. Read our <Link to="/legal">Legal & Policy Centre</Link> for
                detailed customer information.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Services />
    </>
  );
};

export default AboutPage;
