import { supabase } from '@/lib/supabaseClient'
import { createRevisionService } from './createRevisionService'

export const revisionService = createRevisionService(supabase)
