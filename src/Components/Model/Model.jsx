import React, { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three"; // ✅ Import THREE.js for material changes

export function Model(props) {
  const { nodes, materials } = useGLTF("/diamond_ring.glb");
  const modelRef = useRef();

  useEffect(() => {
    if (materials.wire_143225087) {
      materials.wire_143225087.color.set("#FFD700"); // ✅ Real Gold Color
      materials.wire_143225087.metalness = 1; // ✅ Full metallic effect
      materials.wire_143225087.roughness = 0.2; // ✅ Smooth & reflective
    }
  }, []);

  useFrame(() => {
    if (modelRef.current) {
      modelRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group ref={modelRef} {...props} dispose={null} position={[0, -1, 0]} scale={[0.15, 0.15, 0.15]}>
      <mesh
        geometry={nodes.OBJ_1.geometry}
        material={materials.wire_143225087}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
      />
    </group>
  );
}

useGLTF.preload("/diamond_ring.glb");
