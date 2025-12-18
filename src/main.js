import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './assets/main.css'; // This is where your global styles are imported

// Initialize the Vue app
const app = createApp(App);

// Use Pinia for state management
app.use(createPinia());

// Use the router for navigation
app.use(router);

// Mount the app to the DOM
app.mount('#app');
