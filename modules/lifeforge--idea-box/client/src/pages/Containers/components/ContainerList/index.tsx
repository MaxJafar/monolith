import { Grid } from '@lifeforge/ui'

import type { IdeaBoxContainer } from '@/providers/IdeaBoxProvider'

import ContainerItem from './components/ContainerItem'

function ContainerList({ filteredList }: { filteredList: IdeaBoxContainer[] }) {
  return (
    <Grid
      as="ul"
      gap="sm"
      mt="lg"
      pb="2xl"
      px="sm"
      templateCols="repeat(auto-fill, minmax(18rem, 1fr))"
      width="100%"
    >
      {filteredList.map(container => (
        <ContainerItem key={container.id} container={container} />
      ))}
    </Grid>
  )
}

export default ContainerList
