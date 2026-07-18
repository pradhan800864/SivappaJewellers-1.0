import React from "react";
import "./Services.css";

import { TfiHeadphoneAlt } from "react-icons/tfi";
import { MdVerified } from "react-icons/md";
import { AiOutlineReload } from "react-icons/ai";
import { FaTools } from "react-icons/fa";
import { FaLock } from "react-icons/fa";
import { GiDiamondRing } from "react-icons/gi";
import { Link } from "react-router-dom";


const Services = () => {
  return (
    <>
      <div className="services">
         {/* Custom Jewelry Design */}
        <div className="serviceBox">
          <GiDiamondRing size={50} style={{ marginBottom: "20px", color: "gold" }} />
          <h3>Custom Jewelry Design</h3>
          <p>Get your jewelry personalized with custom designs</p>
        </div>
        <div className="serviceBox">
          <TfiHeadphoneAlt size={50} style={{ marginBottom: "20px" }} />
          <h3>Customer Support</h3>
          <p>Contact our store team for product and order-request help</p>
        </div>
        {/* Certified Jewelry */}
        <div className="serviceBox">
          <MdVerified size={50} style={{ marginBottom: "20px", color: "gold" }} />
          <h3>Certified & Authentic</h3>
          <p>Review the applicable hallmark, purity and certificate details before billing</p>
        </div>
        {/* Easy Returns & Exchanges */}
        <div className="serviceBox">
          <AiOutlineReload size={50} style={{ marginBottom: "20px", color: "green" }} />
          <h3>Clear Returns & Exchanges</h3>
          <p><Link to="/cancellations-returns-refunds">See eligibility, exclusions and statutory remedies</Link></p>
        </div>

        {/* Jewelry Repair & Maintenance */}
        <div className="serviceBox">
          <FaTools size={50} style={{ marginBottom: "20px", color: "gray" }} />
          <h3>Jewelry Repair & Maintenance</h3>
          <p>Ask the selected store about available cleaning, resizing and repair services</p>
        </div>

        {/* Secure Payments */}
        <div className="serviceBox">
          <FaLock size={50} style={{ marginBottom: "20px", color: "blue" }} />
          <h3>Verified Billing</h3>
          <p>No payment is collected in the app; pay only after the store confirms the bill</p>
        </div>
      </div>
    </>
  );
};

export default Services;
