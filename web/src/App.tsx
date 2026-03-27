import { useState, lazy, Suspense } from 'react'
import { PageKey } from './types'
import { Layout } from './components/Layout'

const Dashboard = lazy(() => import('./components/Dashboard'))

// 页面懒加载 — 减少首屏 JS 体积
const ImageWorkspace = lazy(() => import('./components/workspace/ImageWorkspace'))
const VideoWorkspace = lazy(() => import('./components/workspace/VideoWorkspace'))
const History = lazy(() => import('./components/History'))
const Settings = lazy(() => import('./components/Settings'))

// 页面加载占位
function PageFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="loading-spinner w-10 h-10 border-violet-500" />
    </div>
  )
}

function App() {
  const [activePage, setActivePage] = useState<PageKey>('dashboard')

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />
      case 'image':
        return <ImageWorkspace />
      case 'video':
        return <VideoWorkspace />
      case 'history':
        return <History />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  return (
    <Layout activePage={activePage} onNavigate={setActivePage}>
      <Suspense fallback={<PageFallback />}>
        {renderPage()}
      </Suspense>
    </Layout>
  )
}

export default App
