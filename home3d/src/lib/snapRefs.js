import * as THREE from 'three'
import { meshReferencesNear } from './bvh.js'
import { SNAP_THRESHOLD_PX } from './snapping.js'

// Projection écran + collecte des références d'accroche du mesh importé —
// helpers partagés entre le tracé (EditObjects, E12-03) et le drag sur axe
// des poignées / du Push/Pull (useAxisDrag, E22-03). Dépendent de three
// (caméra, géométrie survolée) contrairement à lib/snapping (maths pures).

const SNAP_QUERY_MARGIN = 1.6 // sur-collecte BVH vs seuil px (le gate exact reste pickBestSnap)

// Position écran (pixels, repère canvas) d'un point monde. Vecteur réutilisé : le
// snapping projette des dizaines de candidats par déplacement souris.
const _projV = new THREE.Vector3()
export function worldToScreen(point, camera, rect) {
  _projV.set(point[0], point[1], point[2]).project(camera)
  return {
    x: (_projV.x * 0.5 + 0.5) * rect.width,
    y: (-_projV.y * 0.5 + 0.5) * rect.height,
  }
}

// Taille MONDE d'un pixel écran à la profondeur d'un point — pour dimensionner
// les requêtes de proximité BVH d'après le seuil d'accroche en pixels, et les
// poignées à taille écran constante (DeformHandles).
const _radV = new THREE.Vector3()
export function worldPerPixel(point, camera, viewportHeight) {
  if (camera.isOrthographicCamera) {
    return (camera.top - camera.bottom) / camera.zoom / viewportHeight
  }
  const dist = camera.position.distanceTo(_radV.set(point[0], point[1], point[2]))
  const worldHeight = 2 * dist * Math.tan((camera.fov * Math.PI) / 360)
  return worldHeight / viewportHeight
}

// Sommets monde du triangle touché.
function triangleWorldVerts(hit) {
  const pos = hit.object.geometry.attributes.position
  const m = hit.object.matrixWorld
  const v = new THREE.Vector3()
  return [hit.face.a, hit.face.b, hit.face.c].map((i) => {
    v.fromBufferAttribute(pos, i).applyMatrix4(m)
    return [v.x, v.y, v.z]
  })
}

// Références d'accroche du MESH importé près du curseur. Requête de proximité
// `three-mesh-bvh` (E12-03) : sommets + arêtes des triangles à portée d'écran,
// PAS seulement le triangle directement survolé. Repli sur le triangle survolé si
// le mesh n'a pas de boundsTree. Renvoie sommets et arêtes en MONDE (non projetés).
export function meshRefsNear(hit, freeWorld, camera, rect) {
  const radius =
    SNAP_THRESHOLD_PX *
    SNAP_QUERY_MARGIN *
    worldPerPixel(freeWorld, camera, rect.height)
  const refs = meshReferencesNear(hit.object, freeWorld, radius)
  if (refs) return refs
  // Fallback : le seul triangle survolé (comportement E12-03 inc.1).
  const [a, b, c] = triangleWorldVerts(hit)
  return {
    verts: [a, b, c],
    edges: [
      [a, b],
      [b, c],
      [c, a],
    ],
  }
}
