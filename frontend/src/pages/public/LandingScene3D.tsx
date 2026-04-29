import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Box, Environment, Float, MeshTransmissionMaterial, Octahedron, Sphere } from "@react-three/drei";
import * as THREE from "three";

const c = {
  primary: "#4F3FE8",
};

const studios = [
  { name: "Writing Studio", color: "#4F3FE8" },
  { name: "Research Studio", color: "#0E7AE6" },
  { name: "Image Studio", color: "#E5484D" },
  { name: "Data Studio", color: "#30A46C" },
  { name: "Finance Studio", color: "#E55613" },
  { name: "Model Compare", color: "#8B5CF6" },
];

function CognitiveCore() {
  const group = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const idleSpin = useRef(0);
  const idleVelocity = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const isMobile = viewport.width < 8;
  const xOffset = 0;
  const yOffset = isMobile ? 1.4 : 0.7;
  const sceneScale = isMobile ? 0.72 : 0.9;

  useFrame((state, delta) => {
    if (!group.current) {
      return;
    }

    const t = state.clock.elapsedTime;

    const spinDirection = mouse.current.x < -0.02 ? -1 : mouse.current.x > 0.02 ? 1 : 0;
    const targetVelocity = spinDirection * 0.1;
    idleVelocity.current = THREE.MathUtils.lerp(idleVelocity.current, targetVelocity, 0.08);
    idleSpin.current += idleVelocity.current * delta;

    const idleY = spinDirection === 0 ? Math.sin(t * 0.18) * 0.05 : idleSpin.current;
    const idleX = Math.sin(t * 0.2) * 0.04;
    const maxYaw = 0.42;
    const maxPitch = 0.45;

    const targetRotY = idleY + mouse.current.x * maxYaw;
    const targetRotX = idleX - mouse.current.y * maxPitch;

    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRotY, 0.12);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetRotX, 0.12);
  });

  return (
    <group position={[xOffset, yOffset, 0]} ref={group} scale={sceneScale}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <mesh>
          <icosahedronGeometry args={[2, 0]} />
          <MeshTransmissionMaterial
            backside
            backsideThickness={0.5}
            thickness={0.8}
            roughness={0.02}
            chromaticAberration={0.3}
            color="#ffffff"
            transmission={1}
            ior={1.3}
            clearcoat={1}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color={c.primary} emissive={c.primary} emissiveIntensity={2.5} toneMapped={false} />
        </mesh>
        {studios.map((studio, i) => {
          const angle = (i / studios.length) * Math.PI * 2;
          const radius = 3.2;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          const y = Math.sin(angle * 3) * 0.6;
          const NodeGeometry = i % 3 === 0 ? Box : i % 3 === 1 ? Sphere : Octahedron;

          return (
            <Float key={studio.name} speed={3 + i * 0.5} rotationIntensity={2} floatIntensity={1} position={[x, y, z]}>
              <NodeGeometry args={i % 3 === 1 ? ([0.25, 32, 32] as never) : ([0.3] as never)}>
                <meshPhysicalMaterial color={studio.color} emissive={studio.color} emissiveIntensity={0.8} roughness={0.1} metalness={0.9} clearcoat={1} />
              </NodeGeometry>
            </Float>
          );
        })}
        <mesh rotation={[Math.PI / 2.1, 0.1, 0]}>
          <torusGeometry args={[3.2, 0.005, 64, 100]} />
          <meshStandardMaterial color="#6B6B70" transparent opacity={0.4} />
        </mesh>
        <mesh rotation={[-Math.PI / 2.1, -0.1, 0]}>
          <torusGeometry args={[3.2, 0.005, 64, 100]} />
          <meshStandardMaterial color="#6B6B70" transparent opacity={0.2} />
        </mesh>
        <Environment preset="city" />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
        <directionalLight position={[-10, -10, -5]} intensity={1} color={c.primary} />
      </Float>
    </group>
  );
}

export default function LandingScene3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 14], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
      style={{ width: "100%", height: "100%" }}
    >
      <CognitiveCore />
    </Canvas>
  );
}
