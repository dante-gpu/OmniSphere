import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import dayjs from 'dayjs';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  disabled?: boolean;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  disabled
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const presetRanges = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 }
  ];

  const handlePresetClick = (days: number) => {
    const endDate = new Date();
    const startDate = dayjs().subtract(days, 'day').toDate();
    onChange({ startDate, endDate });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full flex items-center gap-2 p-3 rounded-xl border
          ${disabled
            ? 'bg-neutral-50 cursor-not-allowed'
            : 'hover:border-primary transition-colors cursor-pointer'
          }
        `}
      >
        <Calendar size={20} className="text-neutral-500" />
        <span>
          {dayjs(value.startDate).format('MMM D, YYYY')} - {dayjs(value.endDate).format('MMM D, YYYY')}
        </span>
        <ChevronDown className={`
          ml-auto transition-transform duration-200
          ${isOpen ? 'rotate-180' : ''}
          ${disabled ? 'text-neutral-400' : 'text-neutral-600'}
        `} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl border shadow-lg p-4">
          <div className="space-y-2">
            {presetRanges.map((range) => (
              <button
                key={range.days}
                onClick={() => handlePresetClick(range.days)}
                className="w-full text-left px-4 py-2 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                {range.label}
              </button>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-neutral-500 mb-1">Start Date</label>
              <input
                type="date"
                value={dayjs(value.startDate).format('YYYY-MM-DD')}
                onChange={(e) => onChange({
                  ...value,
                  startDate: new Date(e.target.value)
                })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-500 mb-1">End Date</label>
              <input
                type="date"
                value={dayjs(value.endDate).format('YYYY-MM-DD')}
                onChange={(e) => onChange({
                  ...value,
                  endDate: new Date(e.target.value)
                })}
                className="input"
                min={dayjs(value.startDate).format('YYYY-MM-DD')}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};