import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import './CustomDatePicker.css';

interface CustomDatePickerProps {
    value: string; // YYYY-MM-DD format
    onChange: (e: { target: { value: string } }) => void;
    required?: boolean;
    min?: string; // YYYY-MM-DD format
    max?: string; // YYYY-MM-DD format
    placeholder?: string;
    className?: string;
}

export default function CustomDatePicker({
    value,
    onChange,
    required = false,
    min = '',
    max = '',
    placeholder = 'Select Date',
    className = ''
}: CustomDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [alignRight, setAlignRight] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Dynamic dropdown alignment to avoid clipping
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceOnRight = window.innerWidth - rect.right;
            const spaceOnLeft = rect.left;
            if (spaceOnRight < 270 && spaceOnLeft > spaceOnRight) {
                setAlignRight(true);
            } else {
                setAlignRight(false);
            }
        }
    }, [isOpen]);

    // Parse current value or default to today
    const parsedDate = value ? new Date(value) : null;
    const [viewDate, setViewDate] = useState(parsedDate ? new Date(parsedDate) : new Date());

    // Update internal view date when external value changes
    useEffect(() => {
        if (value) {
            setViewDate(new Date(value));
        }
    }, [value]);

    // Close calendar on clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Date calculations
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    // Previous month info to fill empty spaces
    const prevMonthDays = new Date(year, month, 0).getDate();

    // Month details
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const handleMonthChange = (direction: 'prev' | 'next') => {
        const newDate = new Date(viewDate);
        if (direction === 'prev') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setViewDate(newDate);
    };

    const handleDateSelect = (day: number, isCurrentMonth = true) => {
        let selectedYear = year;
        let selectedMonth = month;

        if (!isCurrentMonth) {
            if (day > 20) {
                // Clicked previous month day
                selectedMonth = month - 1;
                if (selectedMonth < 0) {
                    selectedMonth = 11;
                    selectedYear = year - 1;
                }
            } else {
                // Clicked next month day
                selectedMonth = month + 1;
                if (selectedMonth > 11) {
                    selectedMonth = 0;
                    selectedYear = year + 1;
                }
            }
        }

        const formattedDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Mock a standard change event structure
        onChange({ target: { value: formattedDate } });
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange({ target: { value: '' } });
        setIsOpen(false);
    };

    const handleToday = () => {
        const today = new Date();
        const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        onChange({ target: { value: formattedDate } });
        setIsOpen(false);
    };

    // Format display text (e.g. 10 Jun 2026)
    const formatDisplay = () => {
        if (!parsedDate) return '';
        const day = parsedDate.getDate();
        const monthShort = monthNames[parsedDate.getMonth()].slice(0, 3);
        const yearFull = parsedDate.getFullYear();
        return `${day} ${monthShort} ${yearFull}`;
    };

    // Min and Max validations
    const isDateDisabled = (day: number, isCurrentMonth = true) => {
        let checkYear = year;
        let checkMonth = month;

        if (!isCurrentMonth) {
            if (day > 20) {
                checkMonth = month - 1;
                if (checkMonth < 0) { checkMonth = 11; checkYear = year - 1; }
            } else {
                checkMonth = month + 1;
                if (checkMonth > 11) { checkMonth = 0; checkYear = year + 1; }
            }
        }

        const dateStr = `${checkYear}-${String(checkMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        if (min && dateStr < min) return true;
        if (max && dateStr > max) return true;
        return false;
    };

    // Render cells helper
    const renderCells = () => {
        const cells = [];

        // 1. Previous month days
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const dayNum = prevMonthDays - i;
            const disabled = isDateDisabled(dayNum, false);
            cells.push(
                <button
                    key={`prev-${dayNum}`}
                    type="button"
                    className="custom-datepicker-cell empty"
                    disabled={disabled}
                    onClick={() => !disabled && handleDateSelect(dayNum, false)}
                >
                    {dayNum}
                </button>
            );
        }

        // 2. Current month days
        const today = new Date();
        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
            const isToday =
                today.getDate() === dayNum &&
                today.getMonth() === month &&
                today.getFullYear() === year;

            const isSelected = parsedDate &&
                parsedDate.getDate() === dayNum &&
                parsedDate.getMonth() === month &&
                parsedDate.getFullYear() === year;

            const disabled = isDateDisabled(dayNum, true);

            cells.push(
                <button
                    key={`curr-${dayNum}`}
                    type="button"
                    className={`custom-datepicker-cell${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                    disabled={disabled}
                    onClick={() => !disabled && handleDateSelect(dayNum, true)}
                >
                    {dayNum}
                </button>
            );
        }

        // 3. Next month days to pad grid to complete week rows (usually multiple of 7)
        const totalCells = cells.length;
        const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
            const disabled = isDateDisabled(dayNum, false);
            cells.push(
                <button
                    key={`next-${dayNum}`}
                    type="button"
                    className="custom-datepicker-cell empty"
                    disabled={disabled}
                    onClick={() => !disabled && handleDateSelect(dayNum, false)}
                >
                    {dayNum}
                </button>
            );
        }

        return cells;
    };

    return (
        <div className={`custom-datepicker-container ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`custom-datepicker-trigger ${isOpen ? 'active' : ''}`}
            >
                <div className="custom-datepicker-trigger-content">
                    <CalendarIcon className="custom-datepicker-icon" size={16} />
                    <span className={`custom-datepicker-text ${!value ? 'placeholder' : ''}`}>
                        {formatDisplay() || placeholder}
                    </span>
                </div>
            </button>

            {isOpen && (
                <div className={`custom-datepicker-dropdown ${alignRight ? 'align-right' : ''}`}>
                    <div className="custom-datepicker-header">
                        <span className="custom-datepicker-month-year">
                            <strong>{monthNames[month]}</strong>
                            <span>{year}</span>
                        </span>
                        <div className="custom-datepicker-nav-buttons">
                            <button
                                type="button"
                                className="custom-datepicker-nav-btn"
                                onClick={() => handleMonthChange('prev')}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                type="button"
                                className="custom-datepicker-nav-btn"
                                onClick={() => handleMonthChange('next')}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="custom-datepicker-grid">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                            <div key={d} className="custom-datepicker-day-label">
                                {d}
                            </div>
                        ))}
                        {renderCells()}
                    </div>

                    <div className="custom-datepicker-footer">
                        <button
                            type="button"
                            className="custom-datepicker-footer-btn"
                            onClick={handleClear}
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            className="custom-datepicker-footer-btn today-btn"
                            onClick={handleToday}
                        >
                            Today
                        </button>
                    </div>
                </div>
            )}

            {required && <input type="hidden" name="date" value={value} required />}
        </div>
    );
}
