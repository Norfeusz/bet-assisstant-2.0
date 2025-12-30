import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ImportPage from './pages/ImportPage'
import DatabasePage from './pages/DatabasePage'
import BetFinderPage from './pages/BetFinderPage'
import StrefaTyperaPage from './pages/StrefaTyperaPage'
import AnalyticsPage from './pages/AnalyticsPage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<BetFinderPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/database" element={<DatabasePage />} />
        <Route path="/bet-finder" element={<BetFinderPage />} />
        <Route path="/strefa-typera" element={<StrefaTyperaPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
      </Routes>
    </Layout>
  )
}

export default App
