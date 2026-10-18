import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { toast } from '@monolith/ui'

function Documentation() {
  const navigate = useNavigate()
  const { t } = useTranslation('common.fetch')

  useEffect(() => {
    const a = document.createElement('a')

    a.href = 'https://github.com/MaxJafar/monolith#readme'
    a.target = '_blank'
    a.click()

    navigate(-1)
    toast.success(t('redirected'))
  }, [])

  return null
}

export default Documentation
