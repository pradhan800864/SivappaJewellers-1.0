import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import "./AboutPage.css";

import heroImage from "../../Assets/About/about-hero-heritage.webp";
import craftImage from "../../Assets/About/about-craftsmanship.webp";
import portraitImage from "../../Assets/About/about-modern-heritage.webp";
import { businessDetails } from "../Legal/legalContent";

const values = [
  {
    number: "01",
    title: "Clarity first",
    text: "Product details, store confirmation and the final invoice stay central to every request.",
  },
  {
    number: "02",
    title: "A local connection",
    text: "Choose a participating store and continue the conversation with people who understand the purchase.",
  },
  {
    number: "03",
    title: "Jewellery with meaning",
    text: "Explore designs that move naturally between celebrations, gifting and everyday milestones.",
  },
];

const journey = [
  "Discover pieces online",
  "Save favourites and compare",
  "Select your preferred store",
  "Confirm availability, price and fulfilment",
];

const AboutPage = () => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "About Us | Sai Suryaa Jewellers";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="about-page">
      <section className="about-hero" aria-labelledby="about-title">
        <img
          className="about-hero__image"
          src={heroImage}
          alt="Traditional gold necklace, earrings and bangles arranged on wine-coloured silk"
          fetchpriority="high"
        />
        <div className="about-hero__shade" />
        <div className="about-hero__content">
          <p className="about-eyebrow">The Sai Suryaa story</p>
          <h1 id="about-title">Jewellery with roots. Chosen for today.</h1>
          <p>
            A thoughtful way to discover Indian jewellery and connect with a
            preferred local store for the details that matter.
          </p>
          <div className="about-hero__actions">
            <Link className="about-button about-button--light" to="/shop">
              Explore jewellery
            </Link>
            <Link className="about-text-link about-text-link--light" to="/blog">
              Read our journal <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
        <div className="about-hero__note">
          <span>Kurnool · Andhra Pradesh</span>
          <strong>Indian artistry, thoughtfully presented</strong>
        </div>
      </section>

      <section className="about-intro about-shell">
        <p className="about-section-label">Why we are here</p>
        <div className="about-intro__copy">
          <h2>Every piece begins with a feeling worth keeping.</h2>
          <div>
            <p>
              Jewellery is rarely chosen for one reason alone. It can mark a
              celebration, carry a memory or simply make an ordinary day feel more
              personal. Sai Suryaa Jewellers brings that discovery into one clear,
              welcoming experience.
            </p>
            <p>
              Browse the catalogue at your pace, keep the pieces you love close,
              and send a request to the participating store you prefer. The store
              then confirms availability, final specifications, price, billing and
              fulfilment before the purchase is completed.
            </p>
          </div>
        </div>
      </section>

      <section className="about-craft about-shell">
        <div className="about-craft__image-wrap">
          <img
            src={craftImage}
            alt="Jewellery artisan setting a ruby into an ornate gold pendant by hand"
            loading="lazy"
          />
          <span className="about-image-caption">The beauty is in the details</span>
        </div>
        <div className="about-craft__content">
          <p className="about-section-label">Craft at the centre</p>
          <h2>Made remarkable by the human touch.</h2>
          <p>
            Indian jewellery is a language of form, colour and detail. From sculpted
            gold and stone setting to enamel and filigree, each tradition rewards a
            closer look. We celebrate that richness through designs selected for
            both their character and their place in modern life.
          </p>
          <blockquote>
            “A beautiful jewel should reveal something new every time you wear it.”
          </blockquote>
          <Link className="about-text-link" to="/blog">
            Discover heritage stories <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      <section className="about-values">
        <div className="about-shell">
          <div className="about-values__heading">
            <p className="about-section-label about-section-label--light">What guides us</p>
            <h2>Beautiful choices.<br />Clear next steps.</h2>
          </div>
          <div className="about-values__grid">
            {values.map((value) => (
              <article className="about-value-card" key={value.number}>
                <span>{value.number}</span>
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-experience about-shell">
        <div className="about-experience__content">
          <p className="about-section-label">Heritage, made approachable</p>
          <h2>From first look to store confirmation.</h2>
          <p>
            The digital experience makes browsing easier while your selected store
            remains responsible for confirming the real-world purchase details.
          </p>
          <ol className="about-journey">
            {journey.map((step, index) => (
              <li key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <div className="about-experience__portrait">
          <img
            src={portraitImage}
            alt="Woman wearing a heritage-inspired gold choker and jhumka earrings"
            loading="lazy"
          />
          <div>
            <span>For every chapter</span>
            <strong>Traditional soul. Contemporary ease.</strong>
          </div>
        </div>
      </section>

      <section className="about-company about-shell">
        <div>
          <p className="about-section-label">Our business</p>
          <h2>Rooted in Kurnool.</h2>
        </div>
        <div className="about-company__details">
          <strong>{businessDetails.merchantName}</strong>
          <p>{businessDetails.address}</p>
          <p>GSTIN: {businessDetails.gstin}</p>
          <Link className="about-text-link" to="/legal">
            Legal &amp; policy centre <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      <section className="about-cta about-shell">
        <div>
          <p className="about-section-label about-section-label--light">Find your next favourite</p>
          <h2>A story worth wearing starts here.</h2>
        </div>
        <Link className="about-button about-button--light" to="/shop">
          Explore the collection
        </Link>
      </section>
    </main>
  );
};

export default AboutPage;
