/**
 * Button — GotPOS Bootstrap button wrapper
 * `riIcon` accepts a Remix Icon class string e.g. "ri-add-line"
 */
const VARIANT_MAP = {
  primary:   'btn-primary',
  secondary: 'btn-light',
  danger:    'btn-danger',
  ghost:     'btn-link text-muted',
  success:   'btn-success',
  warning:   'btn-warning',
}

const SIZE_MAP = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  riIcon,
  onClick,
  disabled,
  type = 'button',
  className = '',
}) {
  const vCls = VARIANT_MAP[variant] ?? 'btn-primary'
  const sCls = SIZE_MAP[size] ?? ''

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn ${vCls} ${sCls} d-inline-flex align-items-center gap-1 ${className}`.trim()}
    >
      {riIcon && <i className={`${riIcon} ${size === 'sm' ? 'fs-6' : 'fs-5'}`}></i>}
      {children}
    </button>
  )
}
