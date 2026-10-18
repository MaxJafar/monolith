import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'

import { Box, Flex, Icon, Stack, Text, colorWithOpacity } from '@monolith/ui'

import { workspaceAPI } from '@/manifest'
import { useIdeaBoxContext } from '@/providers/IdeaBoxProvider'

import ContainerName from './components/ContainerName'
import GoBackButtonAndMenu from './components/GoBackButtonAndMenu'

function Header() {
  const { setSearchQuery, setSelectedTags, pathValid } = useIdeaBoxContext()
  const { id, '*': path } = useParams<{ id: string; '*': string }>()

  const pathDetailsQuery = useQuery(
    workspaceAPI.misc.getPath
      .input({
        container: id || '',
        folder: path ? path.split('/').pop() : undefined
      })
      .queryOptions({
        enabled: id !== undefined && pathValid
      })
  )

  const pathDetails = pathDetailsQuery.data

  return (
    <Stack as="header" gap="sm">
      <GoBackButtonAndMenu />
      <Flex
        align="end"
        bg={
          pathDetails?.container.cover
            ? 'bg-900'
            : { base: 'bg-200', dark: 'bg-800' }
        }
        height={{ base: '14rem', sm: '18rem' }}
        justify="between"
        p="lg"
        position="relative"
        r="lg"
        style={{
          backgroundImage:
            pathDetails?.container.cover &&
            `url(${workspaceAPI.getMedia({
              key: pathDetails.container.cover
            })})`,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          isolation: 'isolate'
        }}
        width="100%"
      >
        {pathDetails?.container.cover && (
          <Box
            inset="0"
            position="absolute"
            r="lg"
            style={{
              backgroundImage:
                'linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.7) 80%)'
            }}
          />
        )}
        <Flex justify="between" position="relative" width="100%" zIndex="9999">
          <Text
            asChild
            color={
              pathDetails?.container.cover
                ? 'bg-100'
                : { base: 'bg-900', dark: 'bg-100' }
            }
            size={{ base: '2xl', sm: '3xl' }}
            weight="semibold"
          >
            <Flex align="center" as="h1" gap="sm">
              {(() => {
                if (!pathDetails) {
                  return (
                    <>
                      <Icon
                        color="muted"
                        icon="svg-spinners:ring-resize"
                        size="1.25rem"
                      />
                      Loading...
                    </>
                  )
                } else {
                  return (
                    <Flex align="center" gap="sm" wrap="wrap">
                      <ContainerName
                        color={pathDetails.container.color}
                        icon={pathDetails.container.icon}
                        id={pathDetails.container.id}
                        name={pathDetails.container.name}
                      />
                      {pathDetails.route.length > 0 && (
                        <Icon
                          color="gray-500"
                          icon="tabler:chevron-right"
                          size="1.25rem"
                        />
                      )}
                      {pathDetails.route.map((folder, index) => (
                        <>
                          <Box
                            key={folder.id}
                            asChild
                            overflow="hidden"
                            r="lg"
                            style={{
                              backgroundColor: folder.color + '20',
                              color: folder.color
                            }}
                          >
                            <Link
                              to={`/idea-box/${id}/${path
                                ?.split('/')
                                .slice(0, index + 1)
                                .join('/')
                                .replace('//', '/')}`}
                              onClick={() => {
                                setSelectedTags([])
                                setSearchQuery('')
                              }}
                            >
                              <Flex
                                align="center"
                                bg={{
                                  hover: colorWithOpacity('bg-50', '5%')
                                }}
                                gap="sm"
                                p="sm"
                              >
                                <Icon
                                  icon={folder.icon}
                                  size="1.25rem"
                                  style={{ color: folder.color }}
                                />
                                <Text
                                  display={{ base: 'none', md: 'block' }}
                                  size="base"
                                >
                                  {folder.name}
                                </Text>
                              </Flex>
                            </Link>
                          </Box>
                          {index !== pathDetails.route.length - 1 && (
                            <Icon
                              color="gray-500"
                              icon="tabler:chevron-right"
                              size="1.25rem"
                            />
                          )}
                        </>
                      ))}
                    </Flex>
                  )
                }
              })()}
            </Flex>
          </Text>
        </Flex>
      </Flex>
    </Stack>
  )
}

export default Header
