export default function FoldEmpty({
  title = 'Nothing open',
  subtitle = 'Choose something on the left screen.',
}) {
  return (
    <div className="fold-empty">
      <span className="fold-empty-mark" aria-hidden="true" />
      <p className="fold-empty-title">{title}</p>
      <p className="fold-empty-subtitle">{subtitle}</p>
    </div>
  )
}
