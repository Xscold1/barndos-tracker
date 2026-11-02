import { supabase } from '@/lib/supabaseClient'
import { createDashboardService } from './createDashboardService'

export const dashboardService = createDashboardService(supabase)
