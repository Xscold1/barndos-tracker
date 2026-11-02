import { supabase } from '@/lib/supabaseClient'
import { createProjectService } from './createProjectService.js'

export const projectService = createProjectService(supabase)
