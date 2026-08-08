import { Suspense, useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, useTexture } from "@react-three/drei";

// Proof-of-concept real WebGL 3D hero: a small cluster of branded product
// cutouts rendered as floating, mouse-parallaxed cards in true 3D space
// (not CSS). Kept intentionally light — 3 cards, no heavy geometry or
// postprocessing — since this is evaluating whether real 3D is worth the
// bundle-size cost versus the CSS-only rotating circle it replaces.
//
// The cards use a single Gemini-generated 2x2 product sprite sheet (one
// consistent cream-background studio shot per quadrant) instead of raw
// catalog photos, which are user-uploaded and wildly inconsistent in
// lighting/background — that mismatch was visibly ugly floating in 3D space.
const SPRITE_URL =
  "https://res.cloudinary.com/dyzkjerez/image/upload/v1786166750/Gemini_Generated_Image_3cbgc13cbgc13cbg_orbodx.png";

// Quadrant layout: tomato (top-left), yam (top-right), plantain (bottom-left),
// rice (bottom-right). Texture V is flipped vs. image rows (V=1 is image top).
const QUADRANTS = {
  tomato: { offset: [0, 0.5], repeat: [0.5, 0.5] },
  yam: { offset: [0.5, 0.5], repeat: [0.5, 0.5] },
  plantain: { offset: [0, 0], repeat: [0.5, 0.5] },
};

function useQuadrantTexture(baseTexture, quadrant) {
  const texture = useMemo(() => baseTexture.clone(), [baseTexture]);
  useEffect(() => {
    const { offset, repeat } = QUADRANTS[quadrant];
    texture.offset.set(offset[0], offset[1]);
    texture.repeat.set(repeat[0], repeat[1]);
    texture.needsUpdate = true;
  }, [texture, quadrant]);
  return texture;
}

function FloatingCard({ baseTexture, quadrant, position, tilt = 0 }) {
  const texture = useQuadrantTexture(baseTexture, quadrant);
  const mesh = useRef();
  const seed = position[0];

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    mesh.current.position.y = position[1] + Math.sin(t * 0.6 + seed) * 0.18;
    mesh.current.rotation.z = tilt + Math.sin(t * 0.4 + seed) * 0.04;
  });

  return (
    <mesh ref={mesh} position={position} rotation={[0, 0, tilt]}>
      <RoundedBox args={[1.5, 1.5, 0.1]} radius={0.14} smoothness={4}>
        <meshStandardMaterial map={texture} roughness={0.35} metalness={0.05} />
      </RoundedBox>
    </mesh>
  );
}

function Scene() {
  const group = useRef();
  const baseTexture = useTexture(SPRITE_URL);

  useFrame((state) => {
    group.current.rotation.y = state.pointer.x * 0.35;
    group.current.rotation.x = -state.pointer.y * 0.18;
  });

  const cards = [
    { quadrant: "tomato", position: [-1.65, 0.3, -0.4], tilt: -0.12 },
    { quadrant: "yam", position: [0, 0.6, 0.3], tilt: 0 },
    { quadrant: "plantain", position: [1.65, -0.1, -0.2], tilt: 0.14 },
  ];

  return (
    <group ref={group}>
      <ambientLight intensity={1} />
      <directionalLight position={[3, 4, 5]} intensity={1.2} />
      <directionalLight position={[-3, -2, 2]} intensity={0.4} color="#FFD9A0" />
      {cards.map((c) => (
        <FloatingCard key={c.quadrant} baseTexture={baseTexture} {...c} />
      ))}
    </group>
  );
}

export default function Hero3D({ heroProducts }) {
  if (!heroProducts?.length) return null;
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas camera={{ position: [0, 0, 4.6], fov: 42 }} dpr={[1, 1.75]} gl={{ alpha: true, antialias: true }}>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}