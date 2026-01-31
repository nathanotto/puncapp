import { HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover = false, className = '', children, ...props }, ref) => {
    const baseStyles = 'bg-white border border-border-light rounded-md p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
    const hoverStyles = hover ? 'transition-all duration-250 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:scale-[1.02]' : ''
    const combinedClassName = `${baseStyles} ${hoverStyles} ${className}`

    return (
      <div ref={ref} className={combinedClassName} {...props}>
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export default Card
