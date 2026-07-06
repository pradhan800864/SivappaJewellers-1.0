import React, { useState, useContext } from "react";
import "./Navbar.css";

import { useSelector } from "react-redux";

import { Link, useNavigate } from "react-router-dom";

import { RiMenu2Line } from "react-icons/ri";
import { FiSearch } from "react-icons/fi";
import { FaRegUser } from "react-icons/fa6";
import { RiShoppingBagLine } from "react-icons/ri";
import { MdOutlineClose } from "react-icons/md";
import { FiHeart } from "react-icons/fi";

// social Links imports Icons

import { FaFacebookF } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { FaInstagram } from "react-icons/fa";
import { FaYoutube } from "react-icons/fa";
import { FaPinterest } from "react-icons/fa";

import Badge from "@mui/material/Badge";
import { AuthContext } from "../../Context/AuthContext";
import { getCustomerDisplayName } from "../../utils/customerDisplay";

const Navbar = () => {
  const cart = useSelector((state) => state.cart);
  const { user } = useContext(AuthContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const brandLogoSrc = `${process.env.PUBLIC_URL}/brand/sai-surya-app-icon.svg`;
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    document.body.style.overflow = mobileMenuOpen ? "auto" : "hidden";
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <>
      {/* Desktop Menu */}
      <nav className="navBar">
        <div className="logoLinkContainer">
          <div className="logoContainer">
            <Link
              to="/"
              onClick={scrollToTop}
              className="brandLogoLink"
              aria-label="Sai Suryaa Jewellers home"
            >
              <img src={brandLogoSrc} alt="" className="brandLogoMark" aria-hidden="true" />
              <span className="brandLogoText">
                <span>Sai Suryaa</span>
                <small>Jewellers</small>
              </span>
            </Link>
          </div>
          <div className="linkContainer">
            <ul>
              <li>
                <Link to="/" onClick={scrollToTop}>
                  HOME
                </Link>
              </li>
              <li>
                <Link to="/shop" onClick={scrollToTop}>
                  SHOP
                </Link>
              </li>
              <li>
                <Link to="/blog" onClick={scrollToTop}>
                  BLOG
                </Link>
              </li>
              <li>
                <Link to="/about" onClick={scrollToTop}>
                  ABOUT
                </Link>
              </li>
              <li>
                <Link to="/contact" onClick={scrollToTop}>
                  CONTACT
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="iconContainer">
          {/* <FiSearch size={22} onClick={scrollToTop} /> */}
          
          <Link to={user ? "/profile" : "/loginSignUp"} onClick={scrollToTop} className="userContainer">
            <FaRegUser size={22} />
            {user && <span className="userGreeting">Hi, {getCustomerDisplayName(user)}</span>}
          </Link>

          <Link to="/cart" onClick={scrollToTop}>
            <Badge
              badgeContent={cart.items.length === 0 ? "0" : cart.items.length}
              color="primary"
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
            >
              <RiShoppingBagLine size={22} />
            </Badge>
          </Link>
          <FiHeart
            size={22}
            style={{ cursor: "pointer" }}
            onClick={() => {
              scrollToTop();
              if (user) {
                navigate("/profile", {
                  state: { activeTab: "My Favorites" },
                });
              } else {
                navigate("/loginSignUp");
              }
            }}
          />

          {/* <RiMenu2Line size={22} /> */}
        </div>
      </nav>

      {/* Mobile Menu */}
      <nav>
        <div className="mobile-nav">
          {mobileMenuOpen ? (
            <MdOutlineClose size={22} onClick={toggleMobileMenu} />
          ) : (
            <RiMenu2Line size={22} onClick={toggleMobileMenu} />
          )}
          <div className="logoContainer mobile-logo-text">
            <Link
              to="/"
              onClick={scrollToTop}
              className="brandLogoLink brandLogoLinkMobile"
              aria-label="Sai Suryaa Jewellers home"
            >
              <img src={brandLogoSrc} alt="" className="brandLogoMark brandLogoMarkMobile" aria-hidden="true" />
              <span className="brandLogoMobileText">
                <span>Sai Suryaa</span>
                <small>Jewellers</small>
              </span>
            </Link>
          </div>
          <Link to="/cart">
            <Badge
              badgeContent={cart.items.length === 0 ? "0" : cart.items.length}
              color="primary"
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
            >
              <RiShoppingBagLine size={22} color="black" />
            </Badge>
          </Link>
        </div>
        <div className={`mobile-menu ${mobileMenuOpen ? "open" : ""}`}>
          <div className="mobile-menuTop">
            <div className="mobile-menuSearchBar">
              <div className="mobile-menuSearchBarContainer">
                <input type="text" placeholder="Search products" />
                <Link to="/shop">
                  <FiSearch size={22} onClick={toggleMobileMenu} />
                </Link>
              </div>
            </div>
            <div className="mobile-menuList">
              <ul>
                <li>
                  <Link to="/" onClick={toggleMobileMenu}>
                    HOME
                  </Link>
                </li>
                <li>
                  <Link to="/shop" onClick={toggleMobileMenu}>
                    SHOP
                  </Link>
                </li>
                <li>
                  <Link to="/blog" onClick={toggleMobileMenu}>
                    BLOG
                  </Link>
                </li>
                <li>
                  <Link to="/about" onClick={toggleMobileMenu}>
                    ABOUT
                  </Link>
                </li>
                <li>
                  <Link to="/contact" onClick={toggleMobileMenu}>
                    CONTACT
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mobile-menuFooter">
            <div className="mobile-menuFooterLogin">
              <Link
                to={user ? "/profile" : "/loginSignUp"}
                onClick={() => {
                  toggleMobileMenu();
                  scrollToTop();
                }}
              >
                <FaRegUser />
                <p>My Account</p>
              </Link>
            </div>

            <div className="mobile-menuSocial_links">
              <FaFacebookF />
              <FaXTwitter />
              <FaInstagram />
              <FaYoutube />
              <FaPinterest />
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
