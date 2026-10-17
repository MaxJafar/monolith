/* eslint-disable @typescript-eslint/no-explicit-any */
import clsx from 'clsx'
import _ from 'lodash'
import React, { type CSSProperties, type ElementType } from 'react'

import { useModuleTranslation } from '@monolith/localization'

import {
  Box,
  Flex,
  type FlexProps,
  type IconProps,
  Text,
  type TextProps,
  Transition
} from '@/components/primitives'
import { settleElement } from '@/utils/elasticMotion'

import { buttonRecipe } from './Button.css'
import { ButtonIcon } from './components/ButtonIcon'
import { useButtonStyleProps } from './hooks/useButtonStyleProps'

type ButtonOwnProps = {
  /** The content to display inside the button. Can be text or any valid React node. */
  children?: React.ReactNode
  /** The icon to display in the button. Should be a valid icon name from Iconify in the format `<icon-library>:<icon-name>`. */
  icon?: string
  /** The position of the icon within the button. Defaults to 'start'. */
  iconPosition?: 'start' | 'end'
  /** Additional CSS styles to apply to the icon. */
  iconProps?: Omit<IconProps, 'icon'>
  /** Additional props to apply to the text content. */
  textProps?: Omit<TextProps, 'children'>
  /** Callback function called when the button is clicked. */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>
  /** Whether the button is in a loading state. When true, displays a spinner and disables interactions. */
  loading?: boolean
  /** Whether the button is disabled and non-interactive. */
  disabled?: boolean
  /** Additional plain CSS class names to apply to the button. */
  className?: string
  /** The visual style variant of the button. Defaults to 'primary'. */
  variant?: 'primary' | 'secondary' | 'tertiary' | 'plain'
  /** Whether the button should be styled as dangerous/destructive with a red background. */
  dangerous?: boolean
  /** The i18n namespace for internationalization. See the [main documentation](https://github.com/MaxJafar/monolith/tree/main/docs) for more details. */
  namespace?: string | false
  /** Additional properties for the translation function. Used for dynamic translations. See the [i18n documentation](https://github.com/MaxJafar/monolith/tree/main/docs) for more details. */
  tProps?: Record<string, unknown>
  style?: CSSProperties
}

type ButtonProps<T extends ElementType = 'button'> = ButtonOwnProps &
  Omit<React.ComponentPropsWithoutRef<T>, keyof ButtonOwnProps> &
  FlexProps<T> & {
    /** Ref for the button element. */
    ref?: React.Ref<Element>
  }

/**
 * A button component for user interactions. Should be used consistently throughout the application. When designing pages, custom defined button should be avoided as much as possible.
 */
export function Button<T extends ElementType = 'button'>({
  ref,
  as,
  children,
  icon,
  onClick,
  iconPosition = 'start',
  loading = false,
  disabled = false,
  className,
  variant = 'primary',
  dangerous = false,
  namespace = 'common.buttons',
  iconProps,
  textProps,
  tProps,
  style,
  ...props
}: ButtonProps<T>) {
  const recipeClassName = buttonRecipe({
    variant,
    dangerous
  })

  const { buttonStyle, restProps } = useButtonStyleProps({
    variant,
    style,
    props: props as any
  })

  const { t } = useModuleTranslation(namespace === false ? [] : [namespace])

  return (
    <Transition
      duration="var(--motion-fast, 140ms)"
      easing="var(--motion-ease, ease)"
      property={[
        'color',
        'background-color',
        'border-color',
        'border-radius',
        'box-shadow',
        'opacity',
        'transform'
      ]}
    >
      <Text asChild tracking="normal" weight="medium" whiteSpace="nowrap">
        <Flex<ElementType>
          ref={ref}
          align="center"
          as={as ?? ('button' as ElementType)}
          className={clsx(recipeClassName, className)}
          disabled={loading || disabled}
          flexShrink="0"
          gap="sm"
          justify="center"
          minHeight={{ base: '44px', md: '34px' }}
          minWidth="0"
          position="relative"
          px={props.p === undefined ? 'md' : undefined}
          py={props.p === undefined ? 'sm' : undefined}
          r="md"
          style={buttonStyle}
          type="button"
          {...(restProps as any)}
          aria-busy={loading || undefined}
          data-variant={variant}
          data-dangerous={dangerous || undefined}
          data-icon-only={icon && !children ? true : undefined}
          aria-disabled={loading || disabled || undefined}
          data-loading-without-icon={loading && !icon ? true : undefined}
          onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
            if (loading || disabled) {
              event.preventDefault()
              event.stopPropagation()

              return
            }

            settleElement(event.currentTarget, 0.65)
            return onClick?.(event)
          }}
        >
          {loading && !icon && (
            <Flex
              centered
              aria-hidden="true"
              data-loading-indicator="true"
              inset="0"
              position="absolute"
            >
              <ButtonIcon loading icon="svg-spinners:ring-resize" />
            </Flex>
          )}
          {icon && iconPosition === 'start' && (
            <ButtonIcon
              disabled={disabled}
              hasChildren={Boolean(children)}
              icon={icon}
              loading={loading}
              {...iconProps}
            />
          )}
          {children && typeof children === 'string' ? (
            <Box asChild minWidth="0">
              <Text truncate {...textProps}>
                {namespace === false
                  ? children
                  : t(
                      [
                        `buttons.${_.camelCase(children)}`,
                        `${_.camelCase(children)}`,
                        children,
                        `${namespace}:buttons.${_.camelCase(children)}`,
                        `${namespace}:${_.camelCase(children)}`,
                        `${namespace}:${children}`,
                        `common.buttons:buttons.${_.camelCase(children)}`,
                        `common.buttons:${_.camelCase(children)}`,
                        `common.buttons:${children}`
                      ],
                      { ...tProps, defaultValue: children }
                    )}
              </Text>
            </Box>
          ) : (
            children
          )}
          {icon && iconPosition === 'end' && (
            <ButtonIcon
              disabled={disabled}
              hasChildren={Boolean(children)}
              icon={icon}
              loading={loading}
              {...iconProps}
            />
          )}
        </Flex>
      </Text>
    </Transition>
  )
}
