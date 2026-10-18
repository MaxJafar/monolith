import clsx from 'clsx'

import { Flex, Text, Transition } from '@/components/primitives'

import * as styles from './SidebarItemWrapper.css'

export function SidebarItemWrapper({
  active,
  children,
  className,
  ariaLabel,
  expanded,
  onClick
}: {
  active: boolean
  children: React.ReactNode
  className?: string
  ariaLabel?: string
  expanded?: boolean
  onClick?: () => void
}) {
  return (
    <Transition>
      <Text
        asChild
        color={active ? { base: 'bg-800', dark: 'bg-50' } : 'bg-500'}
        weight={active ? 'semibold' : undefined}
      >
        <Flex
          align="center"
          as="li"
          className={clsx(
            'sidebar-item',
            active && styles.listItemActiveIndicator,
            className
          )}
          justify="center"
          position="relative"
          px="md"
        >
          <Transition duration="0.1s">
            <Flex
              asChild
              align="center"
              aria-expanded={expanded}
              aria-label={ariaLabel}
              as="button"
              bg={
                active
                  ? {
                      base: 'bg-200',
                      dark: 'bg-800'
                    }
                  : {
                      hover: 'bg-200',
                      darkHover: 'bg-800'
                    }
              }
              className="group"
              gap="md"
              height="3.5em"
              justify="between"
              pl="md"
              position="relative"
              pr="xs"
              r="lg"
              role="button"
              style={{
                cursor: 'pointer'
              }}
              tabIndex={0}
              width="100%"
              onClick={onClick}
              onKeyDown={event => {
                if (
                  event.target === event.currentTarget &&
                  (event.key === 'Enter' || event.key === ' ')
                ) {
                  event.preventDefault()
                  onClick?.()
                }
              }}
            >
              <Text align="left">{children}</Text>
            </Flex>
          </Transition>
        </Flex>
      </Text>
    </Transition>
  )
}
