'use client'

import Link from 'next/link'

interface MembersFilterTabsProps {
  currentFilter: string
  allCount: number
  unassignedCount: number
  leadersCount: number
  certifiedCount: number
}

export default function MembersFilterTabs({
  currentFilter,
  allCount,
  unassignedCount,
  leadersCount,
  certifiedCount,
}: MembersFilterTabsProps) {
  const tabs = [
    { label: 'All', value: 'all', count: allCount, color: '' },
    { label: 'Unassigned', value: 'unassigned', count: unassignedCount, color: unassignedCount > 0 ? 'text-orange-600' : '' },
    { label: 'Leaders', value: 'leaders', count: leadersCount, color: '' },
    { label: 'Certified', value: 'certified', count: certifiedCount, color: '' },
  ]

  return (
    <div className="flex gap-2">
      {tabs.map(tab => {
        const isActive = currentFilter === tab.value
        return (
          <Link
            key={tab.value}
            href={`/admin/members?filter=${tab.value}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              isActive
                ? 'bg-burnt-orange text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            } ${tab.color && !isActive ? tab.color : ''}`}
          >
            {tab.label} ({tab.count})
          </Link>
        )
      })}
    </div>
  )
}
