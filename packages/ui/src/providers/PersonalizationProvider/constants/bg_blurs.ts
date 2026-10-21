// SPDX-License-Identifier: 0BSD
const labels = ['none', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl'] as const
const pixels = [0, 4, 8, 12, 16, 24, 40, 64]
export const BG_BLURS = Object.fromEntries(
  labels.map((label, index) => [label, pixels[index] + 'px'])
) as Record<(typeof labels)[number], string>
