import { HTMLAttributes, forwardRef } from 'react'

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', className = '', children, ...props }, ref) => {
    const baseStyles = 'inline-block px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase'

    const variantStyles = {
      success: 'bg-success text-white',
      warning: 'bg-warning text-deep-charcoal',
      error: 'bg-error text-white',
      info: 'bg-info text-white',
      neutral: 'bg-stone-gray text-white',
    }

    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${className}`

    return (
      <span ref={ref} className={combinedClassName} {...props}>
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export default Badge
