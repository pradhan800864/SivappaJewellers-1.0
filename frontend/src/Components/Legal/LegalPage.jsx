import React from "react";
import { Link } from "react-router-dom";
import { businessDetails, legalPolicyList, policyMeta } from "./legalContent";
import "./LegalPage.css";

export const LegalCentre = () => (
  <main className="legalPage">
    <header className="legalHero">
      <p className="legalEyebrow">CUSTOMER INFORMATION</p>
      <h1>Legal & Policy Centre</h1>
      <p>
        Clear information about using the application, submitting a store request,
        jewellery pricing, privacy, fulfilment and after-sales support.
      </p>
      <div className="legalMeta">
        <span>Updated {policyMeta.lastUpdated}</span>
      </div>
    </header>

    <section className="legalImportant" aria-label="Important order information">
      <strong>Important:</strong> This application does not collect payment. A submitted
      request asks your selected store to confirm availability, final price, billing,
      pickup or delivery, and payment instructions.
    </section>

    <section className="legalCardGrid" aria-label="Policies">
      {legalPolicyList.map((policy) => (
        <Link className="legalCard" to={policy.path} key={policy.path}>
          <h2>{policy.shortTitle}</h2>
          <p>{policy.summary}</p>
          <span>Read policy →</span>
        </Link>
      ))}
    </section>

    <section className="legalContactBox">
      <h2>Need help?</h2>
      <p>
        Contact {businessDetails.grievanceOfficer} at{" "}
        <a href={`mailto:${businessDetails.email}`}>{businessDetails.email}</a> or{" "}
        <a href={`tel:${businessDetails.phoneHref}`}>{businessDetails.phoneDisplay}</a>.
      </p>
      <Link to="/grievance">How grievance redressal works</Link>
    </section>
  </main>
);

const LegalPage = ({ policy }) => {
  if (!policy) return null;

  return (
    <main className="legalPage">
      <nav className="legalBreadcrumb" aria-label="Breadcrumb">
        <Link to="/legal">Legal & Policy Centre</Link>
        <span aria-hidden="true">/</span>
        <span>{policy.shortTitle}</span>
      </nav>

      <header className="legalHero legalHeroPolicy">
        <p className="legalEyebrow">SAI SURYAA JEWELLERS</p>
        <h1>{policy.title}</h1>
        <p>{policy.summary}</p>
        <div className="legalMeta">
          <span>Updated {policyMeta.lastUpdated}</span>
        </div>
      </header>

      <div className="legalPolicyLayout">
        <aside className="legalToc">
          <strong>On this page</strong>
          {policy.sections.map((section) => (
            <a href={`#${section.id}`} key={section.id}>{section.heading}</a>
          ))}
        </aside>

        <article className="legalArticle">
          {policy.sections.map((section) => (
            <section id={section.id} key={section.id}>
              <h2>{section.heading}</h2>
              {section.paragraphs?.map((paragraph, index) => (
                <p key={`${section.id}-p-${index}`}>{paragraph}</p>
              ))}
              {section.bullets && (
                <ul>
                  {section.bullets.map((item, index) => (
                    <li key={`${section.id}-li-${index}`}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <div className="legalEndNote">
            <p>
              Questions about this policy? Email{" "}
              <a href={`mailto:${businessDetails.email}`}>{businessDetails.email}</a> or use our{" "}
              <Link to="/grievance">grievance process</Link>.
            </p>
          </div>
        </article>
      </div>
    </main>
  );
};

export default LegalPage;
