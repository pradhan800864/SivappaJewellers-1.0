import React from "react";
import "./Services.css";

import { TfiHeadphoneAlt } from "react-icons/tfi";
import { MdVerified } from "react-icons/md";
import { AiOutlineReload } from "react-icons/ai";
import { FaTools } from "react-icons/fa";
import { FaLock } from "react-icons/fa";
import { GiDiamondRing } from "react-icons/gi";


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
          <h3>24/7 Customer Support</h3>
          <p>Friendly 24/7 customer support</p>
        </div>
        {/* Certified Jewelry */}
        <div className="serviceBox">
          <MdVerified size={50} style={{ marginBottom: "20px", color: "gold" }} />
          <h3>Certified & Authentic</h3>
          <p>All our jewelry comes with authenticity certification</p>
        </div>
        {/* Easy Returns & Exchanges */}
        <div className="serviceBox">
          <AiOutlineReload size={50} style={{ marginBottom: "20px", color: "green" }} />
          <h3>Easy Returns & Exchanges</h3>
          <p>Hassle-free 30-day return & exchange policy</p>
        </div>

        {/* Jewelry Repair & Maintenance */}
        <div className="serviceBox">
          <FaTools size={50} style={{ marginBottom: "20px", color: "gray" }} />
          <h3>Jewelry Repair & Maintenance</h3>
          <p>We offer professional cleaning, resizing, and repairs</p>
        </div>

        {/* Secure Payments */}
        <div className="serviceBox">
          <FaLock size={50} style={{ marginBottom: "20px", color: "blue" }} />
          <h3>Secure Payments</h3>
          <p>100% secure payment gateway with multiple options</p>
        </div>
      </div>
    </>
  );
};

export default Services;
