import { supabase } from '@/lib/supabaseClient'
import { createMyWorkService } from './createMyWorkService'

export const myWorkService = createMyWorkService(supabase)
