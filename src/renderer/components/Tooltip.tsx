interface Props {
  text: string
  visible: boolean
}

export function Tooltip({ text, visible }: Props) {
  if (!visible) return null

  return (
    <div className="tooltip">
      {text}
    </div>
  )
}
