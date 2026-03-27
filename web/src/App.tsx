import { useState, lazy, Suspense } from 'react'
import { PageKey } from './types'
import { Layout } from './components/Layout'

// 页面懒加载 — 减少首屏 JS 体积
const ImageGeneration = lazy(() => import('./components/ImageGeneration'))
const ImageComposition = lazy(() => import('./components/ImageComposition'))
const VideoGeneration = lazy(() => import('./components/VideoGeneration'))
const History = lazy(() => import('./components/History'))
const Settings = lazy(() => import('./components/Settings'))

// 页面加载占位
function PageFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="loading-spinner w-10 h-10" />
    </div>
  )
}

function App() {
  const [activePage, setActivePage] = useState<PageKey>('text2image')

  const renderPage = () => {
    switch (activePage) {
      case 'text2image':
        return <ImageGeneration />
      case 'image2image':
        return <ImageComposition />
      case 'video':
        return <VideoGeneration />
      case 'history':
        return <History />
      case 'settings':
        return <Settings />
      default:
        return <ImageGeneration />
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
