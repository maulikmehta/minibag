import React from 'react';
import { Plus, Minus, Users } from 'lucide-react';

/**
 * Component for setting expected participants count
 * Styled to match item list rows with +/- buttons
 *
 * @param {Object} props
 * @param {string} props.sessionId - The session ID for API calls
 * @param {number|null} props.expectedCount - Current expected count (null = not set, 0 = solo, 1-3 = wait for N)
 * @param {Function} props.onChange - Callback when count changes (receives new value)
 */
export default function ExpectedParticipantsInput({
  sessionId,
  expectedCount,
  onChange
}) {
  const handleDecrement = async () => {
    const newValue = expectedCount === null || expectedCount === 0
      ? null
      : expectedCount - 1;
    onChange(newValue);

    if (sessionId) {
      try {
        await fetch(`/api/sessions/${sessionId}/expected`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expected_participants: newValue })
        });
      } catch (error) {
        console.error('Failed to update expected participants:', error);
        // Note: parent component should handle reverting to session value on error
      }
    }
  };

  const handleIncrement = async () => {
    const newValue = expectedCount === null
      ? 0
      : Math.min(3, expectedCount + 1);
    onChange(newValue);

    if (sessionId) {
      try {
        await fetch(`/api/sessions/${sessionId}/expected`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expected_participants: newValue })
        });
      } catch (error) {
        console.error('Failed to update expected participants:', error);
        // Note: parent component should handle reverting to session value on error
      }
    }
  };

  const handleInputChange = async (e) => {
    const value = e.target.value === '' ? null : parseInt(e.target.value);
    if (value === null || (!isNaN(value) && value >= 0 && value <= 3)) {
      onChange(value);

      if (sessionId) {
        try {
          await fetch(`/api/sessions/${sessionId}/expected`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expected_participants: value })
          });
        } catch (error) {
          console.error('Failed to update expected participants:', error);
          // Note: parent component should handle reverting to session value on error
        }
      }
    }
  };

  return (
    <div className="flex items-center gap-3 py-3 px-2">
      {/* User icon */}
      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
        <Users size={20} className="text-green-600" />
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className="text-base text-gray-900">How many friends joining?</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleDecrement}
          className="w-9 h-9 rounded-full border border-gray-400 flex items-center justify-center flex-shrink-0"
        >
          <Minus size={16} strokeWidth={2} />
        </button>
        <div className="flex items-center gap-1">
          <input
            type="text"
            inputMode="numeric"
            value={expectedCount === null ? '' : expectedCount}
            onChange={handleInputChange}
            placeholder="-"
            className="w-14 text-base text-gray-900 text-center border-b-2 border-gray-300 focus:border-gray-900 focus:outline-none py-1"
          />
        </div>
        <button
          onClick={handleIncrement}
          disabled={expectedCount >= 3}
          className="w-9 h-9 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center flex-shrink-0 transition-colors disabled:bg-gray-400 disabled:hover:bg-gray-400"
        >
          <Plus size={16} className="text-white" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
