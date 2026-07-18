import React from "react";
import { Link } from "react-router-dom";

import "./BlogList.css";
import BlogData from "../../../Data/BlogData";

const BlogList = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="blogListSection">
      <div className="blogListHeaderContainer">
        <div className="blogListHeader">
          <p className="blogListEyebrow">Stories of Indian craftsmanship</p>
          <h1>Our Journal</h1>
          <div className="blogListHeaderCategories" aria-label="Journal themes">
            <span className="activeCategory">Heritage Jewellery</span>
            <span>Regional Craft</span>
            <span>Artisan Stories</span>
          </div>
        </div>
      </div>

      <div className="blogPostListContainer">
        {BlogData.map((blogPost) => {
          const articlePath = `/blog/${blogPost.slug}`;

          return (
            <article className="blogPost" key={blogPost.blogID}>
              <Link className="blogPostThumb" to={articlePath} onClick={scrollToTop}>
                <img
                  src={blogPost.blogThumbnail}
                  alt={blogPost.imageAlt}
                  loading="lazy"
                />
              </Link>

              <div className="blogPostContent">
                <div className="blogPostContentDate">
                  <span>{blogPost.category}</span>
                  <span>{blogPost.blogDate}</span>
                </div>
                <h2 className="blogPostContentHeading">
                  <Link to={articlePath} onClick={scrollToTop}>
                    {blogPost.blogHeading}
                  </Link>
                </h2>
                <p className="blogPostContentDescription">{blogPost.excerpt}</p>
                <div className="blogPostContentReadMore">
                  <Link to={articlePath} onClick={scrollToTop}>
                    Read the story
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
};

export default BlogList;
