import useStore from '@/store/useStore'
import type { ActiveTool, ViewMode } from '@/store/types'

// Décision « que fait un clic dans la scène » selon le mode (point #3 de l'analyse
// d'archi). Ce prédicat était DUPLIQUÉ : Model.jsx (nœuds GLB importés) le calculait
// sous forme `passive`, ObjectsLayer (objets app) sous forme `selectable` — deux
// dérivations identiques qui pouvaient diverger. Source unique désormais, testable.

export interface SceneInteractionFlags {
  /** Sélection active : clic sur un nœud/objet le sélectionne. */
  selectable: boolean
  /** Menuiserie (E14-05) : clic sur une ouverture y pose le cadre. */
  hosting: boolean
  /** Vanne (E16-04) : clic sur un tuyau y insère une vanne. */
  valving: boolean
  /** Push/Pull (E12-08) : clic sur une face l'extrude. */
  pushable: boolean
}

export function sceneInteractionFlags(state: {
  viewMode: ViewMode
  editMode: boolean
  activeTool: ActiveTool
}): SceneInteractionFlags {
  const { viewMode, editMode, activeTool } = state
  // Sélection active : mode découverte (orbite) OU édition avec l'outil Sélection ;
  // jamais en visite ni pendant un outil de tracé/édition (E6-01).
  const selectable = viewMode !== 'visit' && (!editMode || activeTool === 'select')
  return {
    selectable,
    hosting: editMode && activeTool === 'joinery',
    valving: editMode && activeTool === 'valve',
    pushable: editMode && activeTool === 'pushpull',
  }
}

// Hook : câble `sceneInteractionFlags` sur le store (sélecteurs atomiques). Partagé
// par Model (via `!selectable` = passif) et ObjectsLayer.
export default function useScenePicking(): SceneInteractionFlags {
  const viewMode = useStore((state) => state.viewMode)
  const editMode = useStore((state) => state.editMode)
  const activeTool = useStore((state) => state.activeTool)
  return sceneInteractionFlags({ viewMode, editMode, activeTool })
}
