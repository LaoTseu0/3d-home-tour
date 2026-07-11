import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import useStore from '../store/useStore.js'
import { extrudeHeightFromRay } from './workPlanes.js'

// Moteur « drag le long d'un axe CONNU » (E22-01), extrait du Push/Pull (E12-08).
// Tirer le long de `axisVec` (u/v/normal du repère de l'objet) change UNE cote
// paramétrique en gardant la face OPPOSÉE fixe (décalage d'origine compensé),
// avec aperçu éphémère (store.extrude) et commit en UNE SEULE entrée
// d'historique au relâché (updateObjectParams + planePatch).
//
// Deux déclencheurs le consomment :
//   - le Push/Pull (EditObjects) : axe déduit de la face cliquée (pickPushAxis) ;
//   - les poignées de déformation (DeformHandles, E22) : axe connu d'avance.

const MIN_VALUE = 0.01 // m — cote plancher pendant le drag (et seuil de commit)

const rayArrays = (ray) => [
  [ray.origin.x, ray.origin.y, ray.origin.z],
  [ray.direction.x, ray.direction.y, ray.direction.z],
]

const addScaled3 = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s]

/**
 * Hook du moteur de drag sur axe (vit dans le Canvas : caméra/raycaster R3F).
 *
 * `startDrag(spec, event)` démarre le drag depuis un évènement pointeur R3F :
 *   spec = {
 *     id,        // objet app visé
 *     paramKey,  // cote modifiée ('largeur_m' | 'profondeur_m' | 'hauteur_m'…)
 *     axisVec,   // axe du drag (vecteur unitaire MONDE, u/v/normal du repère)
 *     sign,      // côté tiré (±1) le long de l'axe
 *     anchored,  // true = géométrie ancrée base-sur-plan le long de cet axe
 *                //   (hauteur) ; false = centrée (largeur/profondeur)
 *   }
 * Les écouteurs fenêtre prennent le relais (le pointeur sort de la forme pendant
 * le tirage) ; `dragging` reflète le drag en cours (curseur, etc.).
 *
 * @returns {{ startDrag: Function, dragging: boolean }}
 */
export default function useAxisDrag() {
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const raycaster = useThree((state) => state.raycaster)
  const setExtrude = useStore((state) => state.setExtrude)
  const updateObjectParams = useStore((state) => state.updateObjectParams)

  // `dragRef` = données du drag ; `dragging` (re)branche les écouteurs fenêtre.
  const dragRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const rayFromClient = useCallback(
    (cx, cy) => {
      const rect = gl.domElement.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((cx - rect.left) / rect.width) * 2 - 1,
        -((cy - rect.top) / rect.height) * 2 + 1
      )
      raycaster.setFromCamera(ndc, camera)
      return raycaster.ray
    },
    [gl, camera, raycaster]
  )

  const startDrag = useCallback(
    (spec, event) => {
      const obj = useStore.getState().objects[spec.id]
      if (!obj) return
      const outward = spec.axisVec.map((c) => c * spec.sign)
      const center = obj.plane?.origin ?? [0, 0, 0]
      const baseParam = Number(obj.params[spec.paramKey]) || 0
      const [ro, rd] = rayArrays(event.ray)
      dragRef.current = {
        id: spec.id,
        paramKey: spec.paramKey,
        anchored: spec.anchored,
        axisVec: spec.axisVec,
        sign: spec.sign,
        outward,
        baseParam,
        baseOrigin: center,
        h0: extrudeHeightFromRay(center, outward, ro, rd),
      }
      setExtrude({ id: spec.id, paramKey: spec.paramKey, value: baseParam, origin: center })
      gl.domElement.setPointerCapture?.(event.pointerId)
      setDragging(true)
    },
    [gl, setExtrude]
  )

  useEffect(() => {
    if (!dragging) return
    const onMove = (e) => {
      const p = dragRef.current
      if (!p) return
      const [ro, rd] = rayArrays(rayFromClient(e.clientX, e.clientY))
      const disp = extrudeHeightFromRay(p.baseOrigin, p.outward, ro, rd) - p.h0
      const value = Math.max(p.baseParam + disp, MIN_VALUE)
      const delta = value - p.baseParam
      // Garder la face OPPOSÉE fixe : axe centré (u/v) → demi-décalage ; axe normal
      // ancré à la base (sol/plan) → décalage seulement si on tire le côté « base ».
      const shift = p.anchored ? ((p.sign - 1) / 2) * delta : (p.sign * delta) / 2
      const origin = addScaled3(p.baseOrigin, p.axisVec, shift)
      setExtrude({
        id: p.id,
        paramKey: p.paramKey,
        value: Number(value.toFixed(3)),
        origin: origin.map((c) => Number(c.toFixed(4))),
      })
    }
    const onUp = () => {
      const p = dragRef.current
      dragRef.current = null
      const ex = useStore.getState().extrude
      setExtrude(null)
      if (p && ex && Math.abs(ex.value - p.baseParam) >= MIN_VALUE) {
        updateObjectParams(p.id, { [p.paramKey]: ex.value }, { origin: ex.origin })
      }
      setDragging(false)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragging, rayFromClient, setExtrude, updateObjectParams])

  return { startDrag, dragging }
}
