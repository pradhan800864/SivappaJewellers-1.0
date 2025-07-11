import React, { useEffect, useRef } from "react";
import { useGLTF, Environment } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

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

    // ✅ Diamond Material (Make it shine like a real diamond)
    if (materials.wire_215215215) {
      materials.wire_215215215.color.set("#FFFFFF");
      materials.wire_215215215.metalness = 0;
      materials.wire_215215215.roughness = 0;
      materials.wire_215215215.transparent = true;
      materials.wire_215215215.opacity = 30;
      materials.wire_215215215.ior = 2.42; // Real diamond IOR
      materials.wire_215215215.transmission = 1; // Makes it transparent
      materials.wire_215215215.clearcoat = 1;
      materials.wire_215215215.clearcoatRoughness = 0;
      materials.wire_215215215.reflectivity = 1;

      // ✅ Enhancements for realistic diamond shine
      materials.wire_215215215.iridescence = 1; // Adds colorful reflections
      materials.wire_215215215.iridescenceIOR = 1.3; // Bends light slightly
      materials.wire_215215215.iridescenceThicknessRange = [200, 500]; // Light dispersion effect

      materials.wire_215215215.anisotropy = 0.5; // Makes light bend inside
      materials.wire_215215215.anisotropyRotation = Math.PI / 4; // Controls light distortion

      materials.wire_215215215.dispersion = 0.1; // Adds slight rainbow effect (simulated caustics)
    }
    // eslint-disable-next-line
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
