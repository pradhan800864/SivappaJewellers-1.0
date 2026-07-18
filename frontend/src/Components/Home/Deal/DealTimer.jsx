import React from "react";
import { Link } from "react-router-dom";
import "./DealTimer.css";

const DealTimer = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <>
      <div className="mainDeal">
        <div className="dealTimer">
          <div className="dealTimerMainContent">
            <div className="dealTimeContent">
              <p>Featured Collection</p>
              <h3>
               Eternal Sparkle<br/>
                <span> Collection</span>
              </h3>
              <div className="dealTimeLink">
                <Link to="/shop" onClick={scrollToTop}>
                  Shop Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
export default DealTimer;
