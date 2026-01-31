import { ButtonHTMLAttributes, forwardRef } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary'
export type ButtonSize = 'small' | 'large'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'large', fullWidth = false, className = '', children, ...props }, ref) => {
    const baseStyles = 'font-ui font-semibold rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'

    const variantStyles = {
      primary: 'bg-burnt-orange text-warm-cream hover:bg-[#C56829] shadow-[0_2px_4px_rgba(0,0,0,0.15)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.2)] hover:-translate-y-0.5',
      secondary: 'bg-transparent border-2 border-earth-brown text-earth-brown hover:bg-earth-brown hover:text-warm-cream',
      tertiary: 'bg-transparent text-earth-brown hover:underline px-3 py-2',
    }

    const sizeStyles = {
      small: variant === 'tertiary' ? 'px-3 py-2 text-sm' : 'px-6 py-3 text-sm',
      large: variant === 'tertiary' ? 'px-3 py-2 text-lg' : 'px-7 py-3.5 text-lg',
    }

    const widthStyle = fullWidth ? 'w-full' : ''

    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`

    return (
      <button ref={ref} className={combinedClassName} {...props}>
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
