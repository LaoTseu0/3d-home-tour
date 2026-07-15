import { describe, it, expect } from 'vitest'
import { sceneInteractionFlags } from './useScenePicking'
import type { ActiveTool, ViewMode } from '@/store/types'

describe('sceneInteractionFlags', () => {
  it('mode découverte (orbite, hors édition) : sélectionnable', () => {
    const f = sceneInteractionFlags({ viewMode: 'orbit', editMode: false, activeTool: 'select' })
    expect(f.selectable).toBe(true)
    expect(f.hosting).toBe(false)
    expect(f.valving).toBe(false)
    expect(f.pushable).toBe(false)
  })

  it('visite : jamais sélectionnable, quel que soit l’outil', () => {
    expect(
      sceneInteractionFlags({ viewMode: 'visit', editMode: false, activeTool: 'select' }).selectable
    ).toBe(false)
    expect(
      sceneInteractionFlags({ viewMode: 'visit', editMode: true, activeTool: 'select' }).selectable
    ).toBe(false)
  })

  it('édition + outil Sélection : sélectionnable', () => {
    expect(
      sceneInteractionFlags({ viewMode: 'orbit', editMode: true, activeTool: 'select' }).selectable
    ).toBe(true)
  })

  it('édition + outil de tracé : NON sélectionnable', () => {
    expect(
      sceneInteractionFlags({ viewMode: 'orbit', editMode: true, activeTool: 'rect' }).selectable
    ).toBe(false)
  })

  it('drapeaux d’outils actifs seulement en édition', () => {
    expect(
      sceneInteractionFlags({ viewMode: 'orbit', editMode: true, activeTool: 'joinery' }).hosting
    ).toBe(true)
    expect(
      sceneInteractionFlags({ viewMode: 'orbit', editMode: true, activeTool: 'valve' }).valving
    ).toBe(true)
    expect(
      sceneInteractionFlags({ viewMode: 'orbit', editMode: true, activeTool: 'pushpull' }).pushable
    ).toBe(true)
    // Hors édition, aucun drapeau d'outil n'est actif même si activeTool le suggère.
    expect(
      sceneInteractionFlags({ viewMode: 'orbit', editMode: false, activeTool: 'joinery' }).hosting
    ).toBe(false)
  })

  it('équivalence historique : selectable === !passive de Model.jsx', () => {
    // Model calculait passive = viewMode==='visit' || (editMode && activeTool!=='select').
    const passive = (viewMode: ViewMode, editMode: boolean, activeTool: ActiveTool) =>
      viewMode === 'visit' || (editMode && activeTool !== 'select')
    const views: ViewMode[] = ['orbit', 'visit']
    const tools: ActiveTool[] = ['select', 'rect', 'pushpull']
    for (const viewMode of views) {
      for (const editMode of [true, false]) {
        for (const activeTool of tools) {
          const { selectable } = sceneInteractionFlags({ viewMode, editMode, activeTool })
          expect(selectable).toBe(!passive(viewMode, editMode, activeTool))
        }
      }
    }
  })
})
