// SPDX-License-Identifier: 0BSD
import {
  type PropsWithChildren,
  createContext,
  useContext,
  useState
} from 'react'

export const InputFocusContext = createContext(false)
export const useInputFocused = () => useContext(InputFocusContext)

export function InputFocusProvider({ children }: PropsWithChildren) {
  const [focused, setFocused] = useState(false)
  return (
    <InputFocusContext value={focused}>
      <span
        style={{ display: 'contents' }}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={event => {
          if (
            !(event.relatedTarget instanceof Node) ||
            !event.currentTarget.contains(event.relatedTarget)
          )
            setFocused(false)
        }}
      >
        {children}
      </span>
    </InputFocusContext>
  )
}
