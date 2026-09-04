import { useEffect, useId, useState } from 'react';

import { DatePicker } from '@/components/forms/date-picker';
import { cn } from '@/lib/utils';

const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

function pad2(value) {
  return String(value).padStart(2, '0');
}

function isoToLocalDateTimeParts(value) {
  if (!value) return { date: '', time: '' };

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '', time: '' };

  return {
    date: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    time: `${pad2(date.getHours())}:${pad2(date.getMinutes())}`,
  };
}

function localDateTimeToIso(dateValue, timeValue) {
  if (!dateValue || !timeValue) return '';

  const timeMatch = TIME_PATTERN.exec(timeValue);
  if (!timeMatch) return '';

  const [year, month, day] = dateValue.split('-').map(Number);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);

  if (
    !Number.isInteger(year)
    || !Number.isInteger(month)
    || !Number.isInteger(day)
    || hours < 0
    || hours > 23
    || minutes < 0
    || minutes > 59
  ) {
    return '';
  }

  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (
    localDate.getFullYear() !== year
    || localDate.getMonth() !== month - 1
    || localDate.getDate() !== day
  ) {
    return '';
  }

  return localDate.toISOString();
}

/**
 * Composition réutilisable Date + Heure.
 *
 * `DatePicker` reste l'autorité de saisie de date française. Ce composant ajoute
 * uniquement l'heure locale 24 h et expose un instant ISO afin que chaque
 * feature ne réimplémente pas les conversions fuseau local -> backend.
 */
function DateTimePicker({
  id,
  value = '',
  onChange,
  disabled = false,
  className,
  dateLabel = 'Date',
  timeLabel = 'Heure',
}) {
  const generatedId = useId();
  const rootId = id ?? generatedId;
  const initialParts = isoToLocalDateTimeParts(value);
  const [dateValue, setDateValue] = useState(initialParts.date);
  const [timeValue, setTimeValue] = useState(initialParts.time);

  useEffect(() => {
    const parts = isoToLocalDateTimeParts(value);
    setDateValue(parts.date);
    setTimeValue(parts.time);
  }, [value]);

  function emit(nextDate, nextTime) {
    if (!nextDate) {
      onChange?.('');
      return;
    }

    const resolvedTime = nextTime || '00:00';
    const isoValue = localDateTimeToIso(nextDate, resolvedTime);
    if (isoValue) onChange?.(isoValue);
  }

  function handleDateChange(nextDate) {
    setDateValue(nextDate);
    if (!nextDate) {
      setTimeValue('');
      onChange?.('');
      return;
    }

    const resolvedTime = timeValue || '00:00';
    if (!timeValue) setTimeValue(resolvedTime);
    emit(nextDate, resolvedTime);
  }

  function handleTimeChange(nextTime) {
    setTimeValue(nextTime);
    if (dateValue) emit(dateValue, nextTime);
  }

  return (
    <div className={cn('grid gap-3 sm:grid-cols-[1fr_8rem]', className)}>
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground" htmlFor={`${rootId}-date`}>
          {dateLabel}
        </label>
        <DatePicker
          disabled={disabled}
          id={`${rootId}-date`}
          onChange={handleDateChange}
          value={dateValue}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground" htmlFor={`${rootId}-time`}>
          {timeLabel}
        </label>
        <input
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          id={`${rootId}-time`}
          onChange={(event) => handleTimeChange(event.target.value)}
          type="time"
          value={timeValue}
        />
      </div>
    </div>
  );
}

export {
  DateTimePicker,
  isoToLocalDateTimeParts,
  localDateTimeToIso,
};
