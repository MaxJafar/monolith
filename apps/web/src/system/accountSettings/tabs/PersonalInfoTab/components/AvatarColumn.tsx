import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@monolith/api'
import {
  Box,
  Button,
  ConfirmationModal,
  FilePickerModal,
  Flex,
  Icon,
  OptionsColumn,
  toast,
  useModalStore
} from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

export default function AvatarColumn() {
  const { userData, setUserData, getAvatarURL } = useAuth()
  const { t } = useTranslation('common.account-settings')
  const { open } = useModalStore()
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)

  async function save(file: File | string | null, remove = false) {
    if (!userData || locked.current || (!remove && !file)) return
    locked.current = true
    setBusy(true)
    try {
      const avatar = remove
        ? (await workspaceAPI.user.settings.deleteAvatar.mutateRaw(undefined),
          null)
        : await workspaceAPI.user.settings.updateAvatar.mutate({ file: file! })
      setUserData(current => (current ? { ...current, avatar } : current))
      toast.success(
        t(remove ? 'messages.avatarRemoved' : 'messages.avatarSaved')
      )
    } catch (error) {
      toast.error(t('messages.avatarFailed'))
      throw error
    } finally {
      locked.current = false
      setBusy(false)
    }
  }

  function choose() {
    open(FilePickerModal, {
      mimeTypes: { image: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
      sources: { pixabay: true, url: true, ai: { defaultPrompt: '' } },
      onSelect: file => save(file).catch(() => {})
    })
  }

  return (
    <OptionsColumn
      icon="tabler:camera"
      title={t('settings.title.profilePicture')}
      description={t('settings.desc.profilePicture')}
    >
      <Flex align="center" gap="md" width="100%">
        <Flex
          centered
          width="56px"
          height="56px"
          r="full"
          overflow="hidden"
          flexShrink="0"
          bg={{ base: 'bg-100', dark: 'bg-800' }}
        >
          {userData?.avatar ? (
            <Box
              asChild
              width="100%"
              height="100%"
              style={{ objectFit: 'cover' }}
            >
              <img alt="" src={getAvatarURL()} />
            </Box>
          ) : (
            <Icon icon="tabler:user" color="muted" size="1.5em" />
          )}
        </Flex>
        <Button
          icon="tabler:photo"
          variant="secondary"
          loading={busy}
          disabled={!userData}
          onClick={choose}
        >
          select
        </Button>
        {userData?.avatar && (
          <Button
            icon="tabler:trash"
            dangerous
            variant="plain"
            disabled={busy}
            onClick={() =>
              open(ConfirmationModal, {
                title: t('actions.removeAvatar'),
                description: t('messages.avatarRemoveDescription'),
                confirmationButton: 'delete',
                onConfirm: () => save(null, true)
              })
            }
          >
            remove
          </Button>
        )}
      </Flex>
    </OptionsColumn>
  )
}
