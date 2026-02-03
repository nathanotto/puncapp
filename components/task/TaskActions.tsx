interface TaskAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary';
}

interface TaskActionsProps {
  primaryAction: TaskAction;
  secondaryActions?: TaskAction[];
  isLoading?: boolean;
  isDisabled?: boolean;
}

export default function TaskActions({
  primaryAction,
  secondaryActions = [],
  isLoading = false,
  isDisabled = false
}: TaskActionsProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Primary Action */}
      <button
        onClick={primaryAction.onClick}
        disabled={isDisabled || isLoading}
        className={`
          w-full py-3 px-6 rounded-lg font-semibold text-lg
          transition-colors duration-200
          ${isDisabled || isLoading
            ? 'bg-stone-gray/30 text-stone-gray cursor-not-allowed'
            : 'bg-burnt-orange text-white hover:bg-burnt-orange/90'
          }
        `}
      >
        {isLoading ? 'Processing...' : primaryAction.label}
      </button>

      {/* Secondary Actions */}
      {secondaryActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {secondaryActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              disabled={isLoading}
              className={`
                py-2 px-4 rounded-lg font-medium
                transition-colors duration-200
                ${action.variant === 'tertiary'
                  ? 'text-stone-gray hover:text-earth-brown'
                  : 'border border-earth-brown text-earth-brown hover:bg-earth-brown hover:text-white'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
