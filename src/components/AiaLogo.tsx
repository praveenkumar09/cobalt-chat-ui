interface AiaLogoProps {
  size?: number
}

export function AiaLogo({ size = 36 }: AiaLogoProps) {
  return (
    <span
      className="aia-logo"
      style={{ width: size, height: size }}
    >
      <img src="/aia-orbit-icon.png" alt="AIA Orbit" />
    </span>
  )
}
