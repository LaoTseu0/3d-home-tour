import { create } from 'zustand'

// Store Zustand — structure V2-ready (cf. cahier des charges).
// Toute mutation passe par une action nommée : prérequis pour brancher
// le command pattern + middleware `zundo` (undo/redo) en V2 sans refonte.
const useStore = create((set) => ({
  // Modèle chargé
  glb: null,
  metadata: null, // extras de la scène racine parsés

  // Calques : { structure: { visible, color, label }, ... }
  layers: {},
  toggleLayer: (id) =>
    set((state) => ({
      layers: {
        ...state.layers,
        [id]: { ...state.layers[id], visible: !state.layers[id].visible },
      },
    })),

  // Sélection — les node names sont des identifiants immuables
  // (clé de liaison GLB ↔ extras), ne jamais les renommer.
  selectedNode: null,
  selectNode: (name) => set({ selectedNode: name }),

  // V2 : historique (command pattern)
  // history: [],
  // future: [],
  // push: (command) => {},
  // undo: () => {},
  // redo: () => {},
}))

export default useStore
