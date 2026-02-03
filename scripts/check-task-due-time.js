require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTask() {
  const { data: tasks } = await supabase
    .from('pending_tasks')
    .select('*')
    .eq('task_type', 'check_in_to_meeting')
    .is('completed_at', null)
    .limit(1)

  if (tasks && tasks.length > 0) {
    const task = tasks[0]
    console.log('Task due_at:', task.due_at)
    
    const dueDate = new Date(task.due_at)
    const now = new Date()
    
    console.log('Due date:', dueDate.toLocaleString())
    console.log('Now:', now.toLocaleString())
    
    const diffMs = dueDate.getTime() - now.getTime()
    const totalSeconds = Math.floor(Math.abs(diffMs) / 1000)
    
    console.log('\nDifference:', diffMs, 'ms')
    console.log('Total seconds overdue:', totalSeconds)
    
    const overdueDays = Math.floor(totalSeconds / (24 * 60 * 60))
    const overdueHours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60))
    const overdueMinutes = Math.floor((totalSeconds % (60 * 60)) / 60)
    
    console.log('\nCalculation:')
    console.log('  Days:', overdueDays)
    console.log('  Hours:', overdueHours)
    console.log('  Minutes:', overdueMinutes)
  } else {
    console.log('No check-in task found')
  }
}

checkTask()
