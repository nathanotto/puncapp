import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    const inputStyles = `
      w-full bg-white border-2 rounded px-4 py-3 text-base
      focus:outline-none focus:border-earth-brown focus:ring-1 focus:ring-earth-brown
      disabled:bg-gray-100 disabled:cursor-not-allowed
      ${error ? 'border-error' : 'border-border-light'}
      ${className}
    `

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-deep-charcoal mb-1.5">
            {label}
          </label>
        )}
        <input ref={ref} className={inputStyles.trim()} {...props} />
        {error && (
          <p className="mt-1.5 text-sm text-error">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-stone-gray">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
