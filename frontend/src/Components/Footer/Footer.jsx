import React from "react";
import "./Footer.css";
import { Link } from "react-router-dom";
import { businessDetails } from "../Legal/legalContent";

const Footer = () => {
  const brandLogoSrc = `${process.env.PUBLIC_URL}/brand/sai-surya-app-icon.svg`;
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const getCurrentYear = () => new Date().getFullYear();

  return (
    <>
      <footer className="footer">
        <div className="footer__container">
          <div className="footer_left">
            <div className="footer_logo_container">
              <img src={brandLogoSrc} alt="" aria-hidden="true" />
              <h2>SAI SURYAA JEWELLERS</h2>
            </div>

            <p>{businessDetails.merchantName}</p>
            <p>{businessDetails.address}</p>
            <p>GSTIN: {businessDetails.gstin}</p>

            <div className="footer_address">
              <a href={`mailto:${businessDetails.email}`}>{businessDetails.email}</a>
              <a href={`tel:${businessDetails.phoneHref}`}>{businessDetails.phoneDisplay}</a>
            </div>
          </div>

          <div className="footer_content">
            <h5>Company</h5>
            <div className="links_container">
              <ul onClick={scrollToTop}>
                <li>
                  <Link to="/about">About Us</Link>
                </li>
                <li>
                  <Link to="/blog">Blog</Link>
                </li>
                <li>
                  <Link to="/contact">Contact Us</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer_content">
            <h5>Shop</h5>
            <div className="links_container">
              <ul onClick={scrollToTop}>
                <li>
                  <Link to="/shop">New Arrivals</Link>
                </li>
                <li>
                  <Link to="/shop">Accessories</Link>
                </li>
                <li>
                  <Link to="/shop">Men</Link>
                </li>
                <li>
                  <Link to="/shop">Women</Link>
                </li>
                <li>
                  <Link to="/shop">Shop All</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer_content">
            <h5>Policies</h5>
            <div className="links_container">
              <ul onClick={scrollToTop}>
                <li>
                  <Link to="/legal">Legal & Policy Centre</Link>
                </li>
                <li>
                  <Link to="/terms">Terms of Use</Link>
                </li>
                <li>
                  <Link to="/privacy">Privacy Notice</Link>
                </li>
                <li>
                  <Link to="/cancellations-returns-refunds">Returns & Refunds</Link>
                </li>
                <li>
                  <Link to="/store-fulfilment">Store Fulfilment</Link>
                </li>
                <li>
                  <Link to="/grievance">Grievance Redressal</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer_right">
            <h5>Order Requests</h5>
            <p>
              Browse products and send a request to your selected store. The store
              confirms availability, final price, billing and fulfilment before payment.
            </p>
            <p className="footerNoPayment"><strong>No payment is collected in this app.</strong></p>
            <Link className="footerPolicyLink" to="/product-disclosures" onClick={scrollToTop}>
              Pricing & Hallmarking
            </Link>
            <Link className="footerPolicyLink" to="/referral-wallet-terms" onClick={scrollToTop}>
              Referral & Wallet Terms
            </Link>
          </div>
        </div>
        <div className="footer_bottom">
          <p>
            © {getCurrentYear()} Sai Suryaa Jewellers | All Rights Reserved 
          </p>
        </div>
      </footer>
    </>
  );
};

export default Footer;
