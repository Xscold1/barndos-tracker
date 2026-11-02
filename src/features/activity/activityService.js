import { supabase } from '@/lib/supabaseClient'
import { createActivityService } from './createActivityService'

export const activityService = createActivityService(supabase)
