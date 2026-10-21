// SPDX-License-Identifier: 0BSD
import { style } from '@vanilla-extract/css'

import { themeTokens } from './token-values'

export const vars = themeTokens
export const shadowClass = style({ boxShadow: 'var(--custom-shadow)' })
export type SpaceToken = keyof typeof themeTokens.space
export type RadiusToken = keyof typeof themeTokens.radii
export type FontSizeToken = keyof typeof themeTokens.fontSize
export type FontWeightToken = keyof typeof themeTokens.fontWeight
