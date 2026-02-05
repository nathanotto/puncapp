import { redirect } from 'next/navigation'

export default function DashboardPage() {
  // Redirect to home page (they're the same)
  redirect('/')
}
