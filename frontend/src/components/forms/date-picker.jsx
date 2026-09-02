import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const FRENCH_DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

const monthFormatter = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
});
const fullDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function createLocalDate(year, month, day) {
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function parseIsoDate(value) {
  const match = ISO_DATE_PATTERN.exec(value ?? '');
  if (!match) return null;

  return createLocalDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

function toIsoDate(date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatFrenchDate(value) {
  const date = parseIsoDate(value);
  if (!date) return '';

  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function parseFrenchDate(value) {
  const match = FRENCH_DATE_PATTERN.exec(value.trim());
  if (!match) return null;

  const date = createLocalDate(Number(match[3]), Number(match[2]), Number(match[1]));
  return date ? toIsoDate(date) : null;
}

function isDateWithinBounds(value, min, max) {
  if (!value) return false;
  if (min && value < min) return false;
  if (max && value > max) return false;
  return true;
}

function getCalendarDays(visibleMonth) {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1, 12);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0, 12).getDate();

  return [
    ...Array.from({ length: mondayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1, 12)),
  ];
}

function DatePicker({
  id,
  value = '',
  onChange,
  disabled = false,
  min,
  max,
  className,
  placeholder = 'jj/mm/aaaa',
  'aria-label': ariaLabel,
}) {
  const rootRef = useRef(null);
  const selectedDate = parseIsoDate(value);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => formatFrenchDate(value));
  const [invalid, setInvalid] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate ?? new Date());

  useEffect(() => {
    setDraft(formatFrenchDate(value));
    setInvalid(false);

    const nextSelectedDate = parseIsoDate(value);
    if (nextSelectedDate) setVisibleMonth(nextSelectedDate);
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const monthLabel = monthFormatter.format(visibleMonth);

  function commitDraft() {
    if (!draft.trim()) {
      setInvalid(false);
      onChange('');
      return;
    }

    const parsedValue = parseFrenchDate(draft);
    if (!parsedValue || !isDateWithinBounds(parsedValue, min, max)) {
      setInvalid(true);
      return;
    }

    setInvalid(false);
    setDraft(formatFrenchDate(parsedValue));
    onChange(parsedValue);
  }

  function selectDate(date) {
    const nextValue = toIsoDate(date);
    if (!isDateWithinBounds(nextValue, min, max)) return;

    setDraft(formatFrenchDate(nextValue));
    setInvalid(false);
    setOpen(false);
    onChange(nextValue);
  }

  function moveMonth(offset) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12));
  }

  return (
    <div className={cn('relative', className)} ref={rootRef}>
      <div className="relative">
        <input
          aria-invalid={invalid || undefined}
          aria-label={ariaLabel}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          id={id}
          inputMode="numeric"
          onBlur={commitDraft}
          onChange={(event) => {
            setDraft(event.target.value);
            setInvalid(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitDraft();
            if (event.key === 'Escape') setOpen(false);
          }}
          placeholder={placeholder}
          type="text"
          value={draft}
        />
        <button
          aria-label="Ouvrir le calendrier"
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <CalendarDays aria-hidden="true" className="size-4" />
        </button>
      </div>

      {invalid && (
        <p className="mt-1.5 text-xs text-destructive" role="alert">
          Saisissez une date valide au format jj/mm/aaaa.
        </p>
      )}

      {open && (
        <div
          aria-label="Calendrier"
          className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg"
          role="dialog"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <Button aria-label="Mois précédent" onClick={() => moveMonth(-1)} size="icon" type="button" variant="ghost">
              <ChevronLeft aria-hidden="true" />
            </Button>
            <p className="text-sm font-semibold capitalize">{monthLabel}</p>
            <Button aria-label="Mois suivant" onClick={() => moveMonth(1)} size="icon" type="button" variant="ghost">
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground" aria-hidden="true">
            {['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map((weekday) => (
              <span className="py-1" key={weekday}>{weekday}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              if (!date) return <span key={`empty-${index}`} />;

              const dayValue = toIsoDate(date);
              const selected = dayValue === value;
              const today = dayValue === toIsoDate(new Date());
              const outOfBounds = !isDateWithinBounds(dayValue, min, max);

              return (
                <button
                  aria-current={today ? 'date' : undefined}
                  aria-label={fullDateFormatter.format(date)}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground',
                    outOfBounds && 'cursor-not-allowed opacity-40',
                  )}
                  disabled={outOfBounds}
                  key={dayValue}
                  onClick={() => selectDate(date)}
                  type="button"
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <Button onClick={() => selectDate(new Date())} size="sm" type="button" variant="ghost">
              Aujourd’hui
            </Button>
            <Button
              onClick={() => {
                setDraft('');
                setInvalid(false);
                setOpen(false);
                onChange('');
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              Effacer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export {
  DatePicker,
  formatFrenchDate,
  parseFrenchDate,
  parseIsoDate,
  toIsoDate,
};
