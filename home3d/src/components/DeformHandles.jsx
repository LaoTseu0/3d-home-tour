import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { deformHandles } from '../lib/editRegistry.js'
import { frameOfObjectPlane } from '../lib/workPlanes.js'
import { axisColorForDir } from '../lib/snapping.js'

// Poignées de déformation paramétrique (E22-01) : l'objet app sélectionné
// (mode édition, outil Sélection) affiche des poignées de face ; les tirer
// déforme l'objet le long de l'axe de la poignée via le moteur de drag partagé
// avec le Push/Pull (lib/useAxisDrag) — face opposée fixe. Les positions/axes
// viennent du registre (deformHandles, analytique). Vit dans le Canvas.

const HANDLE_PX = 11 // arête écran d'une poignée (px, ~constante au zoom)
const HOVER_SCALE = 1.45 // grossissement au survol

// Taille monde d'un pixel écran à la position de la poignée (même géométrie que
// worldRadiusForPixels du snapping — ici par frame, sur la caméra courante).
const _pos = new THREE.Vector3()
function worldPerPixel(position, camera, viewportHeight) {
  if (camera.isOrthographicCamera) {
    return (camera.top - camera.bottom) / camera.zoom / viewportHeight
  }
  const dist = camera.position.distanceTo(_pos.copy(position))
  const worldHeight = 2 * dist * Math.tan((camera.fov * Math.PI) / 360)
  return worldHeight / viewportHeight
}

/**
 * @param {object} obj      objet app sélectionné (store.objects)
 * @param {object} preview  patch éphémère du drag en cours (store.extrude) —
 *                          les poignées suivent l'aperçu comme EditObject
 * @param {Function} onStartDrag  startDrag du moteur (lib/useAxisDrag)
 * @param {boolean} dragging      drag en cours (curseur)
 */
export default function DeformHandles({ obj, preview, onStartDrag, dragging }) {
  // Même patch éphémère qu'EditObject : pendant le drag, les poignées suivent
  // la géométrie prévisualisée (cote + origine décalée), pas l'objet committé.
  const effective = useMemo(
    () =>
      preview
        ? {
            ...obj,
            params: { ...obj.params, [preview.paramKey]: preview.value },
            plane: { ...obj.plane, origin: preview.origin },
          }
        : obj,
    [obj, preview]
  )
  const handles = useMemo(() => deformHandles(effective), [effective])

  // Poignées orientées comme le repère de l'objet (u→X, v→Y, normal→Z) : les
  // petits cubes épousent les faces du solide, quel que soit le plan d'esquisse.
  const quaternion = useMemo(() => {
    const { u, v, normal } = frameOfObjectPlane(effective.plane)
    const m = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(...u),
      new THREE.Vector3(...v),
      new THREE.Vector3(...normal)
    )
    return new THREE.Quaternion().setFromRotationMatrix(m)
  }, [effective.plane])

  const [hovered, setHovered] = useState(null)
  const refs = useRef({})

  // Changer d'objet remet le survol à zéro (pas de curseur « collé ») — ajusté
  // pendant le rendu (pattern React), pas dans un effet.
  const [hoverForId, setHoverForId] = useState(obj.id)
  if (hoverForId !== obj.id) {
    setHoverForId(obj.id)
    setHovered(null)
  }

  // Curseur dédié (même mécanique que le pointer de sélection, Model.jsx E6-04).
  useEffect(() => {
    if (!hovered && !dragging) return undefined
    document.body.style.cursor = 'move'
    return () => {
      document.body.style.cursor = ''
    }
  }, [hovered, dragging])

  // Taille écran ~constante (façon TransformControls) : re-scale chaque frame
  // selon la distance caméra — HANDLE_PX px d'arête quel que soit le zoom.
  useFrame(({ camera, size }) => {
    for (const h of handles) {
      const mesh = refs.current[h.key]
      if (!mesh) continue
      const s = HANDLE_PX * worldPerPixel(mesh.position, camera, size.height)
      mesh.scale.setScalar(hovered === h.key ? s * HOVER_SCALE : s)
    }
  })

  if (!handles.length) return null
  return (
    <>
      {handles.map((h) => (
        <mesh
          key={h.key}
          ref={(m) => {
            if (m) refs.current[h.key] = m
            else delete refs.current[h.key]
          }}
          position={h.point}
          quaternion={quaternion}
          scale={0.0001} // taille réelle posée par useFrame (évite un flash 1 m)
          renderOrder={5}
          onPointerDown={(event) => {
            if (event.ctrlKey) return // E21-02 : verrou d'action sous Ctrl
            event.stopPropagation()
            onStartDrag(
              {
                id: obj.id,
                paramKey: h.paramKey,
                axisVec: h.axis,
                sign: h.sign,
                anchored: h.anchored,
              },
              event
            )
          }}
          onPointerOver={(event) => {
            if (event.ctrlKey) return
            event.stopPropagation()
            setHovered(h.key)
          }}
          onPointerOut={() => setHovered((k) => (k === h.key ? null : k))}
        >
          <boxGeometry args={[1, 1, 1]} />
          {/* Couleur d'axe (convention SketchUp, cf. snapping AXIS_COLORS) ;
              dessinée par-dessus (depthTest off) pour rester saisissable même
              côté caché. */}
          <meshBasicMaterial
            color={axisColorForDir(h.axis)}
            transparent
            opacity={hovered === h.key ? 1 : 0.85}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  )
}
