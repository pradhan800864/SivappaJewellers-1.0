import React from "react";
import { Link } from "react-router-dom";
import "./ContactPage.css";
import { businessDetails } from "../Legal/legalContent";

const ContactPage = () => {
  return (
    <>
      <div className="contactSection">
        <h2>Contact Us</h2>
        <div className="contactMap contactMapConsentSafe">
          <h3>Visit our Kurnool store</h3>
          <p>{businessDetails.address}</p>
          <a
            href="https://www.google.com/maps/search/?api=1&query=Sri%20Sivappa%20Jewellers%20Kurnool"
            target="_blank"
            rel="noreferrer"
          >
            Open location in Google Maps
          </a>
          <small>Google Maps opens only when you choose this link.</small>
        </div>
        <div className="contactInfo">
          <div className="contactAddress">
            <div className="address">
              <h3>Store in Kurnool</h3>
              <p>{businessDetails.address}</p>
              <p>
                <a href={`mailto:${businessDetails.email}`}>{businessDetails.email}</a>
                <br />
                <a href={`tel:${businessDetails.phoneHref}`}>{businessDetails.phoneDisplay}</a>
              </p>
              <p>GSTIN: {businessDetails.gstin}</p>
            </div>
            <div className="address">
              <h3>Customer grievance</h3>
              <p>
                We acknowledge consumer complaints within 48 hours and aim to
                resolve them within one month.
              </p>
              <Link to="/grievance">View grievance process</Link>
            </div>
          </div>
          <div className="contactForm">
            <h3>Get In Touch</h3>
            <p>
              Email us from your registered contact details and include your order
              request or invoice number, selected store, issue and preferred resolution.
            </p>
            <a className="contactAction" href={`mailto:${businessDetails.email}`}>
              Email customer care
            </a>
            <a className="contactAction secondary" href={`tel:${businessDetails.phoneHref}`}>
              Call {businessDetails.phoneDisplay}
            </a>
            <p className="contactPrivacyNote">
              We use the information you send to answer your request, prevent fraud
              and maintain legally required records. See our <Link to="/privacy">Privacy Notice</Link>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactPage;
