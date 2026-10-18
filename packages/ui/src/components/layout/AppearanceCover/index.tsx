import { useTranslation } from 'react-i18next'

import { Button } from '@/components/inputs'
import { Box, Flex } from '@/components/primitives'
import { useAppearance } from '@/providers/AppearanceProvider'
import { workspaceAPI } from '@/utils/workspaceAPI'

import './cover.css'
import { useCoverPicker } from './CoverPicker'

export { CoverPicker, useCoverPicker } from './CoverPicker'

export function AppearanceCover() {
  const { appearance, openEditor, changeCover, readOnly } = useAppearance()
  const pickCover = useCoverPicker()
  const { t } = useTranslation('common.appearance')
  const cover = appearance.cover
  if (!cover) return null
  return (
    <Box
      className="appearance-cover"
      flexShrink="0"
      r="lg"
      overflow="hidden"
      position="relative"
      width="100%"
      mb="md"
      style={{
        background: cover.type === 'color' ? cover.value : 'var(--bg-lifted)'
      }}
    >
      {cover.type === 'image' && (cover.fileKey || cover.value) && (
        <Box
          as="img"
          src={
            cover.fileKey
              ? workspaceAPI.getMedia({ key: cover.fileKey })
              : cover.value
          }
          alt=""
          width="100%"
          height="100%"
          className="appearance-cover-image"
          referrerPolicy="no-referrer"
          style={{ objectPosition: `center ${cover.position}%` }}
        />
      )}
      {openEditor && !readOnly && (
        <Flex position="absolute" right="12px" bottom="12px">
          <Button
            namespace={false}
            className="appearance-cover-action"
            icon="lucide:image"
            variant="secondary"
            onClick={() => changeCover ? pickCover(cover, changeCover) : openEditor('page')}
          >
            {t('changeCover')}
          </Button>
        </Flex>
      )}
    </Box>
  )
}
