// SPDX-License-Identifier: 0BSD
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/inputs/Button'
import { Flex } from '@/components/primitives'

import { StateMessage } from '../StateMessage'

export interface NotFoundScreenProps {
  title?: string
  message?: string
  reportIssueLink?: string
}

export function NotFoundScreen(props: NotFoundScreenProps) {
  const { t } = useTranslation('common.misc')
  return (
    <StateMessage
      icon="tabler:file-search"
      size="3rem"
      title={props.title ?? t('notFound.title')}
      detail={props.message ?? t('notFound.description')}
      action={
        <Flex gap="sm" wrap="wrap" justify="center">
          <Button as="a" href="/" icon="tabler:arrow-left">
            Go Back
          </Button>
          <Button
            as="a"
            href={
              props.reportIssueLink ??
              'https://github.com/MaxJafar/monolith/issues'
            }
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
            namespace="common.misc"
            icon="tabler:bug"
          >
            Report Bug
          </Button>
        </Flex>
      }
    />
  )
}
