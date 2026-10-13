import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Box,
  Button,
  Flex,
  Icon,
  Text,
  colorWithOpacity,
  useModalStore
} from '@lifeforge/ui'

import { useIdeaBoxContext } from '@/providers/IdeaBoxProvider'

import ModifyFolderModal from './modals/ModifyFolderModal'
import ModifyIdeaModal from './modals/ModifyIdeaModal'

function FAB() {
  const { open } = useModalStore()
  const { t } = useModuleTranslation()
  const { viewArchived } = useIdeaBoxContext()
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleEntryCreation = useCallback(
    (name: string) => () => {
      if (name === 'Folder') {
        open(ModifyFolderModal, {
          type: 'create'
        })
      } else {
        open(ModifyIdeaModal, {
          type: 'create',
          initialData: {
            type: name.toLowerCase() as 'text' | 'link' | 'image'
          }
        })
      }
      setIsOpen(false)
    },
    [open]
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const menuItems = [
    ['Folder', 'tabler:folder'],
    ['Text', 'tabler:text-size'],
    ['Link', 'tabler:link'],
    ['Image', 'tabler:photo']
  ] as const

  return !viewArchived ? (
    createPortal(
      <Box
        ref={menuRef}
        bottom={{ base: '1.5rem', sm: '3rem' }}
        position="fixed"
        right={{ base: '1.5rem', sm: '3rem' }}
        zIndex="9990"
      >
        <Button
          shadow
          icon="tabler:plus"
          iconProps={{
            style: {
              transform: isOpen ? 'rotate(45deg)' : 'none',
              transition: 'transform 100ms'
            }
          }}
          position="relative"
          zIndex="9991"
          onClick={() => setIsOpen(!isOpen)}
        />
        <Box
          bottom="100%"
          mb="md"
          position="absolute"
          r="lg"
          right="0"
          style={{
            opacity: isOpen ? 1 : 0,
            outline: 'none',
            pointerEvents: isOpen ? 'auto' : 'none',
            transform: isOpen ? 'scale(1)' : 'scale(0.95)',
            transition: 'opacity 100ms ease-out, transform 100ms ease-out'
          }}
          zIndex="9999"
        >
          {menuItems.map(([name, icon], index) => (
            <Flex
              key={name}
              align="center"
              bg={
                focusedIndex === index
                  ? colorWithOpacity('bg-800', '50%')
                  : undefined
              }
              gap="sm"
              justify="end"
              pr="sm"
              py="sm"
              r="md"
              onMouseEnter={() => setFocusedIndex(index)}
              onMouseLeave={() => setFocusedIndex(null)}
            >
              <Text
                color={focusedIndex === index ? 'bg-200' : 'bg-50'}
                style={{ transition: 'color 100ms' }}
                whiteSpace="nowrap"
              >
                {t(`entryType.${name.toLowerCase()}`)}
              </Text>
              <Flex
                centered
                as="button"
                bg={focusedIndex === index ? 'bg-200' : 'bg-100'}
                p="sm"
                r="full"
                style={{ transition: 'background-color 100ms' }}
                type="button"
                onClick={handleEntryCreation(name)}
              >
                <Icon color="bg-800" icon={icon} size="1.25rem" />
              </Flex>
            </Flex>
          ))}
        </Box>
        <Box
          height="100%"
          left="0"
          position="fixed"
          style={{
            transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: isOpen ? 'none' : 'transform 100ms 100ms'
          }}
          top="0"
          width="100%"
          zIndex="9990"
        >
          <Box
            bg={colorWithOpacity('bg-900', '50%')}
            height="100%"
            style={{
              backdropFilter: 'blur(4px)',
              opacity: isOpen ? 1 : 0,
              transition: 'opacity 100ms'
            }}
            width="100%"
            onClick={() => {
              setIsOpen(false)
            }}
          />
        </Box>
      </Box>,
      (document.getElementById('app') as HTMLElement) || document.body
    )
  ) : (
    <></>
  )
}

export default FAB
