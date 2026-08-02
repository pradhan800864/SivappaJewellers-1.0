import React from "react";
import "./Instagram.css";
import insta1 from "../../../Assets/Instagram/inst1.png";
import insta2 from "../../../Assets/Instagram/inst2.png";
import insta3 from "../../../Assets/Instagram/inst3.png";
import insta4 from "../../../Assets/Instagram/inst4.png";
import insta5 from "../../../Assets/Instagram/inst5.png";
import insta6 from "../../../Assets/Instagram/inst6.png";
import insta7 from "../../../Assets/Instagram/inst7.png";
import insta8 from "../../../Assets/Instagram/inst8.png";
import insta9 from "../../../Assets/Instagram/inst9.png";
import insta10 from "../../../Assets/Instagram/inst10.png";
import insta11 from "../../../Assets/Instagram/inst11.png";
import insta12 from "../../../Assets/Instagram/inst12.png";

const Instagram = () => {
  const moments = [insta1, insta2, insta9, insta4, insta5, insta6, insta7, insta8, insta10, insta12, insta11, insta3];

  return (
    <section className="instagram" aria-labelledby="instagramTitle">
      <h2 id="instagramTitle">@SAI SURYAA JEWELLERS</h2>

      <div className="instagramTiles">
        {moments.map((src, index) => (
          <figure className="instagramtile" key={src}>
            <img
              src={src}
              alt={`Sai Suryaa Jewellers jewellery inspiration ${String(index + 1).padStart(2, "0")}`}
              loading="lazy"
              decoding="async"
            />
          </figure>
        ))}
      </div>
    </section>
  );
};

export default Instagram;
