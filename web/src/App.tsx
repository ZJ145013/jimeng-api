import { useState } from 'react'
import { PageKey } from './types'
import { Layout } from './components/Layout'
import ImageGeneration from './components/ImageGeneration'
import ImageComposition from './components/ImageComposition'
import VideoGeneration from './components/VideoGeneration'
import History from './components/History'
import Settings from './components/Settings'

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
      {renderPage()}
    </Layout>
  )
}

export default App
