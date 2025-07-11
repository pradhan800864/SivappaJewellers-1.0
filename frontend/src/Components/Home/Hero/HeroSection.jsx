import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei"; // ✅ Import Environment
import "./HeroSection.css";
import { Model } from "../../Model/Model";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <>
      <div className="heroMain">
        <div className="sectionleft">
          <p>New Arrival</p>
          <h1>Luxury Diamond Rings</h1>
          <span>Exclusive Collection - Up to 60% off & Free Shipping</span>
          <div className="heroLink">
            <Link to="/shop">
              <h5>Discover More</h5>
            </Link>
          </div>
        </div>

        <div className="sectionright">
          <Canvas className="canvasModel" camera={{ position: [0, 2, 8], fov: 50 }}>
            <ambientLight intensity={1} />
            <directionalLight position={[5, 5, 5]} intensity={3} />
            
            {/* ✅ Environment map for realistic reflections */}
            <Environment preset="studio" /> 

            <OrbitControls enableZoom={true} enablePan={false} enableRotate={true} minPolarAngle={0} maxPolarAngle={Math.PI} />
            <Model />
          </Canvas>
        </div>
      </div>
    </>
  );
};

export default HeroSection;
