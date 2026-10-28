import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/inputs'
import { Box, Flex, Icon } from '@/components/primitives'
import { useAppearance } from '@/providers/AppearanceProvider'

import { useAppearancePopover } from './AppearancePopover'
import './cover.css'

/** The large page icon above a title, with Add icon and Add cover actions that
 * appear while the page is hovered or focused. Directly after a cover, the icon
 * overlaps the cover's lower edge. */
export function PageIdentity({ children }: { children?: ReactNode }) {
  const { appearance, openEditor, changeIcon, changeCover, readOnly } =
    useAppearance()

  const customize = useAppearancePopover()
  const { t } = useTranslation('common.appearance')

  const editable =
    !readOnly && (!!openEditor || (!!changeIcon && !!changeCover))
  const icon = appearance.icon
  const actions = (editable && (!icon || !appearance.cover)) || !!children

  if (!icon && !actions) return null

  const glyph = icon && (
    <Icon
      aria-hidden
      preserveStyle
      icon={icon}
      size={{ base: '56px', md: '72px' }}
    />
  )

  return (
    <Box className="page-identity" data-icon={!!icon || undefined}>
      {glyph &&
        (editable ? (
          <Box
            aria-label={t('changeIcon')}
            as="button"
            className="page-identity-icon"
            type="button"
            onClick={event => customize.toggle(event.currentTarget)}
          >
            {glyph}
          </Box>
        ) : (
          <Box className="page-identity-icon">{glyph}</Box>
        ))}
      {actions && (
        <Flex
          align="center"
          className="page-identity-actions"
          gap="xs"
          wrap="wrap"
        >
          {editable && !icon && (
            <Button
              icon="lucide:smile-plus"
              namespace={false}
              variant="plain"
              onClick={event => customize.toggle(event.currentTarget)}
            >
              {t('addIcon')}
            </Button>
          )}
          {editable && !appearance.cover && (
            <Button
              icon="lucide:image"
              namespace={false}
              variant="plain"
              onClick={event => customize.toggle(event.currentTarget)}
            >
              {t('addCover')}
            </Button>
          )}
          {children}
        </Flex>
      )}
      {customize.popover}
    </Box>
  )
}
