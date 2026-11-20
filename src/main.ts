import { mount } from 'svelte'
import './app.css'
import './lib/sidebar.css'
import './lib/settings.css'
import App from './App.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
