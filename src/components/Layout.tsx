import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import styles from './Layout.module.css'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const location = useLocation()
  
  const tabs = [
    { path: '/import', label: '📥 Import', id: 'import' },
    { path: '/database', label: '🗄️ Baza Danych', id: 'database' },
    { path: '/bet-finder', label: '🔍 Wyszukiwarka Typów', id: 'bet-finder' },
    { path: '/strefa-typera', label: '📊 Strefa Typera', id: 'strefa-typera' },
    { path: '/analytics', label: '📈 Analityka', id: 'analytics' },
  ]

  const openInVSCode = () => {
    fetch('http://localhost:3000/api/open-vscode', {
      method: 'POST'
    }).catch(err => console.error('Error opening VSCode:', err))
  }
  
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1>⚽ Bet Assistant</h1>
          <p>System zarządzania danymi meczów piłkarskich</p>
        </div>
      </header>
      
      <nav className={styles.tabs}>
        <div className={styles.tabsHeader}>
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              to={tab.path}
              className={`${styles.tabButton} ${
                location.pathname === tab.path ? styles.active : ''
              }`}
            >
              {tab.label}
            </Link>
          ))}
          
          <button 
            onClick={openInVSCode}
            className={styles.vscButton}
            title="Otwórz w Visual Studio Code"
          >
            <img src="/files/vsc.ico" alt="VSCode" className={styles.vscIcon} />
          </button>
        </div>
      </nav>
      
      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}

export default Layout
