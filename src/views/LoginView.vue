<template>
  <div class="login-container">
    <h2>Login Admin / Operator</h2>
    <form @submit.prevent="handleLogin">
      
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" v-model="email" required placeholder="Enter your email" />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" v-model="password" required placeholder="Enter your password" />
      </div>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Loading...' : 'Login' }}
      </button>

    </form>
    
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
  </div>
  <div class="mt-3">
    <RouterLink to="/" class="inline-block w-full text-center px-3 py-2 bg-slate-700 text-white rounded">
      Home
    </RouterLink>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { supabase } from '@/supabaseClient.js';
import { useRouter } from 'vue-router'; // Untuk navigasi setelah login
import { useAuth } from '@/stores/auth'

const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const router = useRouter();
const authStore = useAuth();

// Fungsi untuk menangani proses login
const handleLogin = async () => {
  errorMessage.value = '';
  successMessage.value = '';
  loading.value = true;

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (error) {
      errorMessage.value = error.message;
    } else {
      successMessage.value = 'Login Berhasil! Mengarahkan ke Dashboard...';
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const role =
          user.app_metadata?.role ||
          user.user_metadata?.role ||
          'operator'
        authStore.setAuthUser({ id: user.id, email: user.email, role })
      }
      // Navigasi ke halaman utama setelah login berhasil
      router.push('/'); 
    }
  } catch (err) {
    errorMessage.value = 'Terjadi kesalahan tidak terduga.';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.form-group {
  margin-bottom: 15px;
}
label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}
input[type="email"], input[type="password"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}
button {
  width: 100%;
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}
button:disabled {
  background-color: #a0c3e6;
  cursor: not-allowed;
}
.error-message {
  color: red;
  margin-top: 15px;
}
.success-message {
  color: green;
  margin-top: 15px;
}
</style>
