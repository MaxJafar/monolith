import { useAuth } from '@monolith/api'
import { Box, Button, Flex, Grid, Icon, Stack, Text } from '@monolith/ui'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { useOverlayFocus } from '@/core/overlays/useOverlayFocus'
import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'
import { workspaceAPI } from '@/core/workspaces/workspaceAPI'

import {
  type Character,
  characterSchema,
  stats
} from '../../../../../modules/monolith--databases/urpgShared'
import './urpg.css'

export async function readAvatar(file: File) {
  if (
    !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
    file.size > 8 * 1024 * 1024
  )
    throw Error('Use a PNG, JPEG or WebP image under 8 MB')
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas'),
      scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height))
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas
      .getContext('2d')!
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const result = canvas.toDataURL('image/webp', 0.8)
    if (result.length > 400000) throw Error('Choose a smaller image')
    return result
  } finally {
    bitmap.close()
  }
}

export default function UrpgWizard({
  onClose
}: {
  data: Record<string, never>
  onClose: () => void
}) {
  const { t } = useTranslation('common', { keyPrefix: 'urpg' }),
    { userData } = useAuth(),
    { refresh } = useWorkspace(),
    navigate = useNavigate()
  const [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [uploading, setUploading] = useState(false)
  const [name, setName] = useState('life.exe'),
    [setupId] = useState(() => crypto.randomUUID())
  const [character, setCharacter] = useState<Character>({
    name: userData?.name ?? '',
    age: null,
    weight: null,
    avatar: '',
    calorieTarget: 0,
    waterTarget: 0,
    weeklyTarget: 3000,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  })
  const guard = useRef(false)
  const ref = useOverlayFocus(() => {
    if (!guard.current) onClose()
  })
  async function create() {
    if (guard.current || uploading) return
    const valid = characterSchema.safeParse(character)
    if (!valid.success || !name.trim()) {
      setError(t('completeProfile'))
      return
    }
    guard.current = true
    setBusy(true)
    setError('')
    try {
      const result = await workspaceAPI.urpg.setup.mutate({
        setup_id: setupId,
        name,
        character: valid.data
      })
      await refresh()
      navigate(`/urpg?workspace=${result.workspace_id}`)
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      guard.current = false
      setBusy(false)
    }
  }
  return (
    <Stack
      ref={ref}
      data-workspace-overlay="urpg"
      className="urpg-wizard"
      role="dialog"
      aria-modal="true"
      aria-label={t('wizardTitle')}
      tabIndex={-1}
      gap="lg"
      p="xl"
      width="min(600px, calc(100vw - 56px))"
    >
      <Flex align="center" justify="between">
        <Flex align="center" gap="sm">
          <Icon icon="lucide:swords" />
          <Text weight="semibold">uRPG</Text>
          <Text color="muted" size="xs">
            {t('step', { current: step + 1, total: 3 })}
          </Text>
        </Flex>
        <Button
          namespace={false}
          variant="plain"
          icon="lucide:x"
          aria-label={t('close')}
          disabled={busy}
          onClick={onClose}
        />
      </Flex>
      <Stack gap="xs">
        <Text as="h1" size="2xl" weight="semibold">
          {t(`wizardTitles.${step}`)}
        </Text>
        <Text color="muted" size="sm">
          {t(`wizardHelp.${step}`)}
        </Text>
      </Stack>
      <Stack
        as="form"
        gap="md"
        onSubmit={event => {
          event.preventDefault()
          if (step < 2) setStep(step + 1)
          else void create()
        }}
      >
        {step === 0 && (
          <>
            <Flex gap="md" align="center">
              <Flex
                className="urpg-avatar"
                align="center"
                justify="center"
                width="80px"
                height="96px"
                r="sm"
                overflow="hidden"
              >
                {character.avatar ? (
                  <Box
                    as="img"
                    className="urpg-avatar-image"
                    width="100%"
                    height="100%"
                    src={character.avatar}
                    alt={t('avatar')}
                  />
                ) : (
                  <Icon icon="lucide:user-round" size="32px" />
                )}
              </Flex>
              <Stack gap="xs">
                <Text
                  as="label"
                  htmlFor="urpg-avatar"
                  size="sm"
                  weight="medium"
                >
                  {t('uploadAvatar')}
                </Text>
                <Box
                  as="input"
                  id="urpg-avatar"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={uploading}
                  onChange={async event => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    setError('')
                    setUploading(true)
                    try {
                      const avatar = await readAvatar(file)
                      setCharacter(c => ({ ...c, avatar }))
                    } catch (cause) {
                      setError(String(cause))
                    } finally {
                      setUploading(false)
                    }
                  }}
                />
                <Text size="xs" color="muted">
                  PNG · JPEG · WebP
                </Text>
              </Stack>
            </Flex>
            <Field label={t('characterName')}>
              <Box
                data-autofocus
                as="input"
                className="workspace-input"
                required
                maxLength={200}
                value={character.name}
                onChange={e =>
                  setCharacter({ ...character, name: e.target.value })
                }
              />
            </Field>
            <Field label={t('workspaceName')}>
              <Box
                as="input"
                className="workspace-input"
                required
                maxLength={160}
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </Field>
            <Grid templateCols={2} gap="md">
              <Field label={t('age')}>
                <Box
                  as="input"
                  className="workspace-input"
                  type="number"
                  min="1"
                  max="120"
                  step="1"
                  value={character.age ?? ''}
                  onChange={e =>
                    setCharacter({
                      ...character,
                      age: e.target.value ? Number(e.target.value) : null
                    })
                  }
                />
              </Field>
              <Field label={t('weight')}>
                <Box
                  as="input"
                  className="workspace-input"
                  type="number"
                  min="1"
                  max="500"
                  step="0.1"
                  value={character.weight ?? ''}
                  onChange={e =>
                    setCharacter({
                      ...character,
                      weight: e.target.value ? Number(e.target.value) : null
                    })
                  }
                />
              </Field>
            </Grid>
          </>
        )}
        {step === 1 && (
          <>
            <Field label={t('calorieTarget')}>
              <Box
                as="input"
                className="workspace-input"
                type="number"
                min="1"
                max="20000"
                required
                value={character.calorieTarget || ''}
                onChange={e =>
                  setCharacter({
                    ...character,
                    calorieTarget: Number(e.target.value)
                  })
                }
              />
            </Field>
            <Field label={t('waterTarget')}>
              <Box
                as="input"
                className="workspace-input"
                type="number"
                min="1"
                max="20000"
                required
                value={character.waterTarget || ''}
                onChange={e =>
                  setCharacter({
                    ...character,
                    waterTarget: Number(e.target.value)
                  })
                }
              />
            </Field>
            <Field label={t('weeklyTarget')}>
              <Box
                as="input"
                className="workspace-input"
                type="number"
                min="1"
                max="1000000"
                required
                value={character.weeklyTarget}
                onChange={e =>
                  setCharacter({
                    ...character,
                    weeklyTarget: Number(e.target.value)
                  })
                }
              />
            </Field>
            <Text size="sm" color="muted">
              {t('targetsHelp')}
            </Text>
            <Text size="xs" color="muted">
              {character.timezone}
            </Text>
          </>
        )}
        {step === 2 && (
          <>
            <Grid templateCols={4} gap="sm">
              {Object.entries(stats).map(([code, stat]) => (
                <Stack key={code} gap="xs" align="center" p="sm">
                  <Icon
                    preserveStyle
                    icon={stat.icon}
                    style={{ color: stat.color }}
                  />
                  <Text size="xs">{t(`stats.${code}`)}</Text>
                </Stack>
              ))}
            </Grid>
            {['hierarchyHelp', 'xpHelp', 'coinsHelp', 'recoveryHelp'].map(
              key => (
                <Text key={key} as="p" size="sm" leading="relaxed">
                  {t(key)}
                </Text>
              )
            )}
          </>
        )}
        {error && (
          <Text role="alert" size="sm" color="dangerous">
            {error}
          </Text>
        )}
        <Flex justify="between" align="center" mt="sm">
          <Button
            namespace={false}
            variant="plain"
            disabled={busy}
            onClick={() => (step ? setStep(step - 1) : onClose())}
          >
            {t(step ? 'back' : 'cancel')}
          </Button>
          <Button
            namespace={false}
            type="submit"
            disabled={busy || uploading}
            loading={busy}
            icon={step === 2 ? 'lucide:swords' : 'lucide:arrow-right'}
          >
            {t(step === 2 ? 'begin' : 'continue')}
          </Button>
        </Flex>
      </Stack>
    </Stack>
  )
}

export function Field({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <Stack as="label" gap="xs">
      <Text size="xs" color="muted">
        {label}
      </Text>
      {children}
    </Stack>
  )
}
