<script setup>
const props = defineProps({
  title: { type: String, required: true },
  actions: { type: Boolean, default: false }
})
</script>

<template>
  <div class="rounded-xl bg-white shadow border border-slate-200 hover-lift animate-fade-in">
    <div class="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-slate-900">{{ props.title }}</h2>
      <div v-if="props.actions" class="flex items-center gap-2">
        <slot name="actions"></slot>
      </div>
    </div>
    <div class="p-4">
      <slot></slot>
    </div>
  </div>
</template>
