interface Props {
  isFocused: boolean
}

export function RunningIndicator({ isFocused }: Props) {
  return (
    <div
      className="running-indicator"
      style={{
        opacity: isFocused ? 1 : 0.6,
      }}
    />
  )
}
