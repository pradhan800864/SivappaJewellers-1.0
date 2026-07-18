import React, { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";

import "./BlogDetails.css";
import BlogData from "../../../Data/BlogData";

const BlogDetails = () => {
  const { slug } = useParams();
  const articleIndex = Math.max(
    0,
    BlogData.findIndex((article) => article.slug === slug)
  );
  const article = BlogData[articleIndex];
  const previousArticle = articleIndex > 0 ? BlogData[articleIndex - 1] : null;
  const nextArticle = articleIndex < BlogData.length - 1 ? BlogData[articleIndex + 1] : null;

  useEffect(() => {
    document.title = `${article.blogHeading} | Sai Suryaa Jewellers`;
    return () => {
      document.title = "Sai Suryaa Jewellers";
    };
  }, [article.blogHeading]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="blogDetailsSection">
      <article className="blogDetailsSectionContainer">
        <header className="blogDetailsHeading">
          <Link className="blogDetailsBack" to="/blog">
            Journal
          </Link>
          <h1>{article.blogHeading}</h1>
          <div className="blogDetailsMetaData">
            <span>{article.author}</span>
            <span>{article.blogDate}</span>
            <span>{article.category}</span>
          </div>
        </header>

        <figure className="blogDetailsFeaturedImg">
          <img src={article.blogThumbnail} alt={article.imageAlt} />
        </figure>

        <div className="blogDetailsContent">
          <p className="blogDetailsIntro">{article.intro}</p>

          {article.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              <p>{section.paragraph}</p>
            </section>
          ))}

          <aside className="blogDetailsHighlights">
            <p>Details to notice</p>
            <ul>
              {article.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </aside>
        </div>

        <nav className="blogDetailsNextPrev" aria-label="More heritage stories">
          {previousArticle ? (
            <Link
              className="blogDetailsNextPrevContainer"
              to={`/blog/${previousArticle.slug}`}
              onClick={scrollToTop}
            >
              <span className="blogDetailsNextPrevLabel">
                <GoChevronLeft size={20} /> Previous story
              </span>
              <strong>{previousArticle.blogHeading}</strong>
            </Link>
          ) : (
            <span />
          )}

          {nextArticle ? (
            <Link
              className="blogDetailsNextPrevContainer blogDetailsNext"
              to={`/blog/${nextArticle.slug}`}
              onClick={scrollToTop}
            >
              <span className="blogDetailsNextPrevLabel">
                Next story <GoChevronRight size={20} />
              </span>
              <strong>{nextArticle.blogHeading}</strong>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>
    </main>
  );
};

export default BlogDetails;
