export default function HomeBar({ onHome }) {
  return (
    <button
      type="button"
      className="home-indicator go-home"
      onClick={onHome}
      aria-label="Go to home screen"
    />
  )
}
