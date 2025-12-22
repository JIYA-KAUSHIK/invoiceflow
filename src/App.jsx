import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Receipt,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Plus,
  Menu,
  X,
  LogOut,
  User,
  Truck
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { auth, db } from './firebase'
import { syncAllDataToSheet } from './services/sheetService'
import { showConfirm, showError, showSuccess } from './utils/alert'
// Removed unused auth/firestore imports for session check

// Lazy Load Components for better performance code-splitting
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const Inventory = React.lazy(() => import('./pages/Inventory'))
const Billing = React.lazy(() => import('./pages/Billing'))
const Purchases = React.lazy(() => import('./pages/Purchases'))
const Customers = React.lazy(() => import('./pages/Customers'))
const Suppliers = React.lazy(() => import('./pages/Suppliers'))
const Reports = React.lazy(() => import('./pages/Reports'))
// Login is small and critical, keep it eager or lazy is fine, keeping lazy for consistency
const Login = React.lazy(() => import('./pages/Login'))

function App() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('billing')
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)


  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
    { id: 'billing', label: 'New Bill', icon: Plus, roles: ['admin', 'staff'] },
    { id: 'invoices', label: 'All Invoices', icon: Receipt, roles: ['admin', 'staff'] },
    { id: 'inventory', label: 'Stock / Products', icon: Package, roles: ['admin', 'staff'] },
    { id: 'purchases', label: 'Purchase Entry', icon: ShoppingCart, roles: ['admin'] },
    { id: 'suppliers', label: 'Suppliers', icon: Truck, roles: ['admin'] },
    { id: 'customers', label: 'Customers', icon: Users, roles: ['admin', 'staff'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['admin'] },
  ]

  useEffect(() => {
    const savedUser = localStorage.getItem('invoiceflow_user')
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
      setRole(userData.role)

      // Handle URL Parameters for Tab Navigation
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      // Validate tab exists and user has role
      const targetMenuItem = menuItems.find(i => i.id === tabParam)

      if (tabParam && targetMenuItem && targetMenuItem.roles.includes(userData.role)) {
        setActiveTab(tabParam)
      } else {
        // Default tab if no URL param or invalid
        const defaultTab = userData.role === 'admin' ? 'dashboard' : 'billing'
        setActiveTab(defaultTab)
        // Set initial URL without reloading
        const newUrl = new URL(window.location)
        newUrl.searchParams.set('tab', defaultTab)
        window.history.replaceState({}, '', newUrl)
      }
    }
    setLoading(false)
  }, [])

  // Handle Browser Back Button
  useEffect(() => {
    const handlePopState = (event) => {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      if (tabParam) {
        setActiveTab(tabParam)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (mobile) {
        setIsSidebarOpen(false)
      } else {
        setIsSidebarOpen(true)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Ignore if user is typing in an input (except for specific overrides like Ctrl+Space)
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

      // Ctrl + Space: Focus Search
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        // Determine active tab and focus corresponding search
        if (activeTab === 'billing') {
          document.getElementById('billing-search')?.focus();
        } else if (activeTab === 'purchases') {
          document.getElementById('purchase-search')?.focus();
        } else if (activeTab === 'inventory') {
          document.getElementById('inventory-search')?.focus();
        }
        return;
      }

      // Ctrl + P: Go to Purchases (User specific request override)
      if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        if (role === 'admin') {
          handleTabChange('purchases');
          showSuccess('Shortcut: Go to Purchases');
        }
        return;
      }

      if (isInput) return; // Don't trigger other shortcuts while typing

      // Navigation Shortcuts (Alt + Key)
      if (e.altKey) {
        let targetTab = '';
        switch (e.key.toLowerCase()) {
          case 'd': targetTab = 'dashboard'; break;
          case 'b': targetTab = 'billing'; break;
          case 'i': targetTab = 'inventory'; break;
          case 'p': targetTab = 'purchases'; break;
          case 's': targetTab = 'suppliers'; break;
          case 'c': targetTab = 'customers'; break;
          case 'r': targetTab = 'reports'; break;
        }

        if (targetTab) {
          e.preventDefault();
          // check role
          const menuItem = menuItems.find(i => i.id === targetTab);
          if (menuItem && menuItem.roles.includes(role)) {
            handleTabChange(targetTab);
          }
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeTab, role]);

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(role))

  const handleLogout = () => {
    localStorage.removeItem('invoiceflow_user')
    setUser(null)
    setRole(null)
    window.history.pushState({}, '', '/')
  }

  const handleTabChange = (itemId) => {
    setActiveTab(itemId)
    const newUrl = new URL(window.location)
    newUrl.searchParams.set('tab', itemId)
    window.history.pushState({}, '', newUrl)
    if (isMobile) setIsSidebarOpen(false)
  }



  const renderContent = () => {
    const isStaff = role === 'staff'
    switch (activeTab) {
      case 'dashboard': return role === 'admin' ? <Dashboard setActiveTab={setActiveTab} /> : <Billing isStaff={isStaff} />
      case 'billing': return <Billing isStaff={isStaff} />
      case 'invoices': return <Billing initialHistory={true} isStaff={isStaff} /> // Opens Billing in History Mode
      case 'inventory': return <Inventory isStaff={isStaff} />
      case 'purchases': return <Purchases isStaff={isStaff} />
      case 'suppliers': return <Suppliers />
      case 'customers': return <Customers />
      case 'reports': return role === 'admin' ? <Reports /> : <Billing isStaff={isStaff} />
      default: return role === 'admin' ? <Dashboard /> : <Billing isStaff={isStaff} />
    }
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
      </div>
    )
  }

  if (!user) {
    return (
      <React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div></div>}>
        <Login onLogin={(u) => { setUser(u); setRole(u.role); setActiveTab(u.role === 'admin' ? 'dashboard' : 'billing'); }} />
      </React.Suspense>
    )
  }


  return (
    <div className="app-container">

      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 45 /* Just below sidebar */
          }}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', height: '100%' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', padding: '0 8px' }}>
            <div style={{
              background: 'white',
              minWidth: '40px',
              height: '40px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Package size={24} color="var(--primary-dark)" />
            </div>
            {(isSidebarOpen || isMobile) && (
              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>InvoiceFlow</h2>
                <p style={{ fontSize: '10px', opacity: 0.7, margin: 0, textTransform: 'uppercase' }}>Management System</p>
              </div>
            )}
          </div>

          {/* Nav Menu */}
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`sidebar-nav-btn ${activeTab === item.id ? 'active' : ''}`}
              >
                <item.icon size={20} style={{ minWidth: '20px' }} />
                {(isSidebarOpen || isMobile) && <span>{item.label}</span>}
                {activeTab === item.id && (
                  <motion.div
                    layoutId="active-indicator"
                    style={{
                      position: 'absolute',
                      left: '-16px',
                      width: '4px',
                      height: '24px',
                      background: 'var(--accent)',
                      borderRadius: '0 4px 4px 0'
                    }}
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Footer / User Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>

            {/* User Profile Box */}
            <div style={{
              padding: '12px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px',
              overflow: 'hidden'
            }}>
              <div style={{ background: 'var(--primary)', padding: '6px', borderRadius: '50%', minWidth: '28px' }}>
                <User size={16} />
              </div>
              {(isSidebarOpen || isMobile) && (
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ fontSize: '13px', margin: 0, fontWeight: 600 }}>{role === 'admin' ? 'Administrator' : 'Shop Staff'}</p>
                  <p style={{ fontSize: '11px', margin: 0, opacity: 0.6 }}>{user.username}</p>
                </div>
              )}
            </div>




            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="btn-logout"
            >
              <LogOut size={20} style={{ minWidth: '20px' }} />
              {(isSidebarOpen || isMobile) && <span>Logout</span>}
            </button>

            {/* Developer Attribution */}
            {(isSidebarOpen || isMobile) && (
              <div style={{ marginTop: '16px', padding: '0 8px', opacity: 0.5 }}>
                <a
                  href="https://www.linkedin.com/in/aroramanas01/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '10px', color: 'inherit', textDecoration: 'none', display: 'block', textAlign: 'center' }}
                >
                  Made by Manas Arora
                </a>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`main-content ${isSidebarOpen ? 'expanded' : 'collapsed'}`}>
        {!isMobile && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{
              position: 'fixed',
              top: '20px',
              left: isSidebarOpen ? '260px' : '60px', /* Dynamic positioning */
              zIndex: 60,
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              transition: 'left 0.3s ease',
              cursor: 'pointer'
            }}
          >
            {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        )}

        <header className="page-header mb-8 flex justify-between items-center md:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="bg-surface border border-border p-2 rounded-lg flex items-center justify-center"
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">
                {menuItems.find(i => i.id === activeTab)?.label}
              </h1>
            </div>
          </div>
        </header>

        {/* Desktop Header Title */}
        <div className="hidden md:flex justify-between items-end mb-8 border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Welcome back, {user.username}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Today</div>
            <div className="text-lg font-bold text-primary">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Suspense Wrapper for Lazy Loaded Components */}
            <React.Suspense fallback={
              <div className="flex h-64 items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            }>
              {renderContent()}
            </React.Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

    </div>
  )
}

export default App
