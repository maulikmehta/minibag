import React from 'react';

/**
 * CategoryButton - Optimized category selection button
 * Wrapped with React.memo to prevent unnecessary re-renders
 */
const CategoryButton = React.memo(({
  category,
  isSelected,
  isDisabled,
  onClick
}) => {
  return (
    <button
      key={category.id}
      onClick={onClick}
      disabled={isDisabled}
      className={`flex flex-col items-center flex-shrink-0 relative ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-all ${
        isSelected
          ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600 p-[3px]'
          : 'border-2 border-gray-300 bg-gray-50'
      }`}>
        <div className={`w-full h-full rounded-full flex items-center justify-center ${
          isSelected ? category.color : 'bg-gray-50'
        }`}>
          <span className="text-2xl">{category.emoji}</span>
        </div>
      </div>
      <p className={`text-xs ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
        {category.name}
      </p>
      {isDisabled && (
        <p className="text-[10px] text-gray-400 mt-0.5">Soon</p>
      )}
    </button>
  );
});

CategoryButton.displayName = 'CategoryButton';

export default CategoryButton;
