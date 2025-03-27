import React, { useEffect, useRef } from "react";
import { useGLTF, Environment } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Model(props) {
  const { nodes, materials } = useGLTF("/diamond_ring.glb");
  const modelRef = useRef();

  useEffect(() => {
    console.log("Nodes:", nodes);
    console.log("Materials:", materials);

    // ✅ Gold Material (Ring)
    if (materials.wire_143225087) {
      materials.wire_143225087.color.set("#FFD700"); // Gold color
      materials.wire_143225087.metalness = 1;
      materials.wire_143225087.roughness = 0.2;
    }

    if (materials.wire_215215215) {
      materials.wire_215215215.color.set("#FF1744"); // Pure White for Diamond
      materials.wire_215215215.metalness = 0.9; // Almost fully metallic
      materials.wire_215215215.roughness = 0; // Fully smooth (like glass)
      materials.wire_215215215.transparent = true; 
      materials.wire_215215215.opacity = 0.95;
      materials.wire_215215215.transmission = 1; // ✅ Adds Refraction
      materials.wire_215215215.ior = 2.417; // ✅ Realistic Diamond IOR (Index of Refraction)
      materials.wire_215215215.reflectivity = 1; // ✅ High reflectivity
      materials.wire_215215215.clearcoat = 1; // ✅ Extra Shiny Layer
      materials.wire_215215215.clearcoatRoughness = 0;
    }
  }, []);

  useFrame(() => {
    if (modelRef.current) {
      modelRef.current.rotation.y += 0.01;
    }
  });

  return (
    <>
      <group ref={modelRef} {...props} dispose={null} position={[0, -1, 0]} scale={[0.15, 0.15, 0.15]}>
        {/* ✅ Gold Ring */}
        <mesh geometry={nodes.OBJ_1.geometry} material={materials.wire_143225087} />
        
        {/* ✅ Diamonds */}
        <mesh geometry={nodes.OBJ_2.geometry} material={materials.wire_215215215} />
      </group>

      {/* ✅ Environment Lighting for Realistic Reflections */}
      <Environment preset="studio" />
    </>
  );
}

useGLTF.preload("/diamond_ring.glb");
