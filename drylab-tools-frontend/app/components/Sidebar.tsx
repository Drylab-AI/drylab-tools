'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebarStore } from '../../lib/store/sidebarStore'

export default function Spidebar() {
  const pathname = usePathname()
  const { activeItem, setActiveItem } = useSidebarStore()
  const isTools = pathname === '/tools'
  const isResults = pathname === '/results'

  return (
    <div className="w-60 bg-[#FBFBFB] border-r h-screen p-3 sideBar">
      <div className="text-xl font-semibold px-2 py-3 logoText" onClick={() => window.location.href = 'https://thedrylab.com'}>Drylab</div>
      <nav className="space-y-1">
        <Link
          href="/tools"
          onClick={() => setActiveItem('Tools')}
          className={`block px-3 py-2 rounded ${isTools ? 'bg-white border text-[#28282A]' : 'text-gray-600 hover:bg-white border-transparent border'}`}
        >
          Tools
        </Link>
        <Link
          href="/results"
          onClick={() => setActiveItem('Results')}
          className={`block px-3 py-2 rounded ${isResults ? 'bg-white border text-[#28282A]' : 'text-gray-600 hover:bg-white border-transparent border'}`}
        >
          Results
        </Link>
      </nav>
      <div className="mt-6 px-3 text-xs text-gray-500">
        Maintained by team from <a href="https://thedrylab.com" className="text-blue-500">The Drylab</a>
      </div>
    </div>
  )
}

