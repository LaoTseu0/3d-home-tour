import Viewer from './components/Viewer.jsx'
import GLBLoader from './components/GLBLoader.jsx'
import LayerPanel from './components/LayerPanel.jsx'
import InfoPanel from './components/InfoPanel.jsx'

export default function App() {
  return (
    <div className="app">
      <Viewer />
      <GLBLoader />
      <LayerPanel />
      <InfoPanel />
    </div>
  )
}
