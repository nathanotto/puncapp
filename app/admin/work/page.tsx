import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminWorkPage() {
  const supabase = await createClient()

  // Verify admin access
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  const { data: adminUser } = await supabase
    .from('users')
    .select('is_punc_admin')
    .eq('id', user.id)
    .single()

  if (!adminUser?.is_punc_admin) {
    redirect('/dashboard')
  }

  const actionCards = [
    {
      icon: '🏛️',
      title: 'Create New Chapter',
      description: 'Set up a new chapter with leaders and initial members',
      enabled: true,
      link: '/admin/work/create-chapter',
      comingSoon: null,
    },
    {
      icon: '🎖️',
      title: 'Certify Leaders',
      description: 'Review and certify members as chapter leaders',
      enabled: true,
      link: '/admin/members?filter=leaders',
      comingSoon: null,
    },
    {
      icon: '📚',
      title: 'Create Curriculum',
      description: 'Add new curriculum modules and sequences',
      enabled: false,
      link: null,
      comingSoon: 'Coming in Session 10',
    },
    {
      icon: '✂️',
      title: 'Split Chapter',
      description: 'Split a large chapter into two smaller chapters',
      enabled: false,
      link: null,
      comingSoon: 'Coming in Session 11',
    },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-earth-brown mb-2">Admin Work</h1>
        <p className="text-stone-gray">Common administrative tasks and workflows</p>
      </div>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-2 gap-6">
        {actionCards.map((card, idx) => {
          if (card.enabled && card.link) {
            return (
              <Link
                key={idx}
                href={card.link}
                className="bg-white rounded-lg p-6 border-2 border-stone-200 hover:border-burnt-orange transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{card.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-earth-brown mb-2">{card.title}</h3>
                    <p className="text-stone-600">{card.description}</p>
                  </div>
                  <div className="text-burnt-orange">→</div>
                </div>
              </Link>
            )
          } else {
            return (
              <div
                key={idx}
                className="bg-stone-50 rounded-lg p-6 border-2 border-stone-200 opacity-60 cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl grayscale">{card.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-stone-500 mb-2">{card.title}</h3>
                    <p className="text-stone-500 mb-2">{card.description}</p>
                    {card.comingSoon && (
                      <p className="text-sm text-stone-400 italic">{card.comingSoon}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          }
        })}
      </div>
    </div>
  )
}
