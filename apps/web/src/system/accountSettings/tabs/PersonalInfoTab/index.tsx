import OrdinaryColumn from '../../components/OrdinaryColumn'
import { profileFields } from '../../profile'
import AvatarColumn from './components/AvatarColumn'

export default function PersonalInfoTab() {
  return (
    <>
      <AvatarColumn />
      {profileFields.map(field => (
        <OrdinaryColumn key={field.id} field={field} />
      ))}
    </>
  )
}
