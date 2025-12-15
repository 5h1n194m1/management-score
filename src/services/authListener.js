import { supabase } from '@/supabaseClient.js'
import { useAuth } from '@/stores/auth'

export const initAuthListener = (pinia) => {
  const authStore = useAuth(pinia)

  supabase.auth.getSession().then(({ data }) => {
    const user = data.session?.user || null
    if (user) {
      const role =
        user.app_metadata?.role ||
        user.user_metadata?.role ||
        'operator'
      authStore.setAuthUser({ id: user.id, email: user.email, role })
    } else {
      authStore.clearAuth()
    }
  })

  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user || null
    if (user) {
      const role =
        user.app_metadata?.role ||
        user.user_metadata?.role ||
        'operator'
      authStore.setAuthUser({ id: user.id, email: user.email, role })
    } else {
      authStore.clearAuth()
    }
  })
}
