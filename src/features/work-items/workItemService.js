import { supabase } from '@/lib/supabaseClient'
import { createWorkItemService } from './createWorkItemService.js'

export const workItemService = createWorkItemService(supabase)
