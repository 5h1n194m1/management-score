<script setup>
const props = defineProps({
  title: { type: String, required: true },
  value: { type: [String, Number], required: true },
  color: { type: String, default: 'indigo' }
})
</script>

<template>
  <div class="rounded-xl bg-white shadow p-4 border border-slate-200 hover-lift animate-slide-up">
    <div class="text-sm text-slate-500">{{ props.title }}</div>
    <div
      class="mt-2 text-3xl font-bold"
      :class="{
        'text-indigo-600': props.color === 'indigo',
        'text-emerald-600': props.color === 'emerald',
        'text-amber-600': props.color === 'amber',
        'text-rose-600': props.color === 'rose'
      }"
    >
      {{ props.value }}
    </div>
  </div>
</template>
