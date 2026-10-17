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
      description={t('settings.desc.profilePicture')}
      icon="tabler:camera"
      title={t('settings.title.profilePicture')}
    >
      <Flex align="center" gap="md" width="100%">
        <Flex
          centered
          bg={{ base: 'bg-100', dark: 'bg-800' }}
          flexShrink="0"
          height="56px"
          overflow="hidden"
          r="full"
          width="56px"
        >
          {userData?.avatar ? (
            <Box
              asChild
              height="100%"
              style={{ objectFit: 'cover' }}
              width="100%"
            >
              <img alt="" src={getAvatarURL()} />
            </Box>
          ) : (
            <Icon color="muted" icon="tabler:user" size="1.5em" />
          )}
        </Flex>
        <Button
          disabled={!userData}
          icon="tabler:photo"
          loading={busy}
          variant="secondary"
          onClick={choose}
        >
          select
        </Button>
        {userData?.avatar && (
          <Button
            dangerous
            disabled={busy}
            icon="tabler:trash"
            variant="plain"
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
