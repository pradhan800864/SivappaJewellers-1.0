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
  const serviceItems = [
    {
      icon: GiDiamondRing,
      title: "Custom jewellery",
      copy: "Speak with the store about a piece shaped around your occasion and preferences.",
    },
    {
      icon: TfiHeadphoneAlt,
      title: "Store guidance",
      copy: "Get help with products, availability and every step of your order request.",
    },
    {
      icon: MdVerified,
      title: "Purity clarity",
      copy: "Review applicable hallmark, purity and certificate details before billing.",
    },
    {
      icon: AiOutlineReload,
      title: "Clear policies",
      copy: (
        <Link to="/cancellations-returns-refunds">
          See return, exchange and statutory-remedy eligibility.
        </Link>
      ),
    },
    {
      icon: FaTools,
      title: "Care & maintenance",
      copy: "Ask your selected store about cleaning, resizing and repair services.",
    },
    {
      icon: FaLock,
      title: "Verified billing",
      copy: "No payment is collected here; pay only after the store confirms the bill.",
    },
  ];

  return (
    <section className="services" aria-labelledby="servicesTitle">
      <div className="servicesHeading">
        <p>Considered at every step</p>
        <h2 id="servicesTitle">A thoughtful way to shop.</h2>
      </div>

      <div className="servicesGrid">
        {serviceItems.map(({ icon: Icon, title, copy }, index) => (
          <article className="serviceBox" key={title}>
            <div className="serviceBoxTopline">
              <Icon aria-hidden="true" />
              <span>{String(index + 1).padStart(2, "0")}</span>
            </div>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Services;
