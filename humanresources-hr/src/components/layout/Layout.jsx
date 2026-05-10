import Header from './Header'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

import './layout.css'

export default function Layout({ children }) {
  return (
    <div className="layout-page">
      <Header />

      <Navbar />

      <div className="layout-body">
        <Sidebar />

        <main className="layout-content">{children}</main>
      </div>
    </div>
  )
}
