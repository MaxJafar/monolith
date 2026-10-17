import './styles/index.css'

export * from './providers'
export {
  PageChromeProvider,
  usePageChrome
} from './providers/PageChromeProvider'

export * from './components'

export {
  vars,
  TAILWIND_PALETTE,
  COLORS,
  colorWithOpacity,
  ColorWithOpacity,
  surface
} from './system'

export { default as anyColorToHex } from './utils/anyColorToHex'
export { registerWorkspaceIcons } from './utils/registerWorkspaceIcons'

export { default as useDivSize } from './hooks/useDivSize'
export { useAnimatedClose, usePopoverExit } from './hooks/useSurfaceMotion'
export {
  elasticScrollEdge,
  elasticDragPreview,
  settleElement,
  kineticPose,
  reducedMotion,
  animateLayout
} from './utils/elasticMotion'
export {
  setInternalDragData,
  getInternalDragData,
  hasInternalDragData
} from './utils/internalDrag'

export type {
  ColorValue,
  OpacityValue,
  ColorValue as ColorPropValue
} from './system'
