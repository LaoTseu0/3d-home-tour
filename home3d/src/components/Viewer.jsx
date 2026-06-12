import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'

// Canvas R3F principal.
// E1-02 : cube de test pour valider le socle 3D.
// Sera remplacé par le rendu du GLB chargé (E3/E4).
export default function Viewer() {
  return (
    <Canvas camera={{ position: [4, 3, 5], fov: 50 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 3]} intensity={1.2} />

      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#378ADD" />
      </mesh>

      <Grid args={[20, 20]} cellColor="#444" sectionColor="#666" />
      <OrbitControls makeDefault />
    </Canvas>
  )
}
