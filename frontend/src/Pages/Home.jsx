import React, { useEffect } from "react";
import CollectionBox from "../Components/Home/Collection/CollectionBox";
import Services from "../Components/Home/Services/Services";
import Instagram from "../Components/Home/Instagram/Instagram";
import Trendy from "../Components/Home/Trendy/Trendy";
import LimitedEdition from "../Components/Home/Limited/LimitedEdition";
import DealTimer from "../Components/Home/Deal/DealTimer";
import HeroSection from "../Components/Home/Hero/HeroSection";
import "./Home.css";

const Home = () => {
  useEffect(() => {
    document.title = "Sai Suryaa Jewellers | Jewellery with a Story";
  }, []);

  return (
    <main className="homePage">
      <HeroSection />
      <CollectionBox />
      <Trendy />
      <DealTimer />
      <LimitedEdition />
      <Instagram />
      <Services />
    </main>
  );
};

export default Home;
