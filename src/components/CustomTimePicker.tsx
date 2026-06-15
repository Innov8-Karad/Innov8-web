import { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import './CustomTimePicker.css';

interface CustomTimePickerProps {
    value: string; // "HH:MM" 24-hour format
    onChange: (e: { target: { value: string } }) => void;
    required?: boolean;
    placeholder?: string;
    className?: string;
}

export default function CustomTimePicker({
    value,
    onChange,
    required = false,
    placeholder = 'Select Time',
    className = ''
}: CustomTimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [alignRight, setAlignRight] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Temporary states for selections before clicking "Set"
    const [tempHour, setTempHour] = useState(12);
    const [tempMinute, setTempMinute] = useState(0);
    const [tempPeriod, setTempPeriod] = useState('AM');

    // Parse helper
    const parseTime = (time24: string) => {
        if (!time24) return { hour: 12, minute: 0, period: 'AM', isEmpty: true };
        const parts = time24.split(':');
        const h24 = parseInt(parts[0] || '0', 10);
        const minute = parseInt(parts[1] || '0', 10);
        
        let period = 'AM';
        let hour = h24;
        if (h24 >= 12) {
            period = 'PM';
            if (h24 > 12) hour = h24 - 12;
        } else if (h24 === 0) {
            hour = 12;
        }
        return { hour, minute, period, isEmpty: false };
    };

    const parsed = parseTime(value);

    // Dropdown alignment helper
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceOnRight = window.innerWidth - rect.right;
            const spaceOnLeft = rect.left;
            const shouldAlign = spaceOnRight < 270 && spaceOnLeft > spaceOnRight;
            
            const handle = requestAnimationFrame(() => {
                setAlignRight(shouldAlign);
            });
            return () => cancelAnimationFrame(handle);
        }
    }, [isOpen]);

    // Close on click outside
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

    const handleTempSelect = (h: number, m: number, p: string) => {
        setTempHour(h);
        setTempMinute(m);
        setTempPeriod(p);
    };

    const handleSet = () => {
        let h24 = tempHour;
        if (tempPeriod === 'PM') {
            if (tempHour !== 12) h24 += 12;
        } else { // AM
            if (tempHour === 12) h24 = 0;
        }
        const formatted = `${String(h24).padStart(2, '0')}:${String(tempMinute).padStart(2, '0')}`;
        onChange({ target: { value: formatted } });
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange({ target: { value: '' } });
        setIsOpen(false);
    };

    const handleNow = () => {
        const now = new Date();
        const formatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        onChange({ target: { value: formatted } });
        setIsOpen(false);
    };

    const formatDisplay = () => {
        if (parsed.isEmpty) return '';
        const hStr = String(parsed.hour).padStart(2, '0');
        const mStr = String(parsed.minute).padStart(2, '0');
        return `${hStr}:${mStr} ${parsed.period}`;
    };

    const hours = Array.from({ length: 12 }, (_, i) => i + 1);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    return (
        <div className={`custom-timepicker-container ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => {
                    const nextOpen = !isOpen;
                    if (nextOpen) {
                        const current = parseTime(value);
                        setTempHour(current.hour);
                        setTempMinute(current.minute);
                        setTempPeriod(current.period);
                    }
                    setIsOpen(nextOpen);
                }}
                className={`custom-timepicker-trigger ${isOpen ? 'active' : ''}`}
            >
                <div className="custom-timepicker-trigger-content">
                    <Clock className="custom-timepicker-icon" size={16} />
                    <span className={`custom-timepicker-text ${parsed.isEmpty ? 'placeholder' : ''}`}>
                        {formatDisplay() || placeholder}
                    </span>
                </div>
            </button>

            {isOpen && (
                <div className={`custom-timepicker-dropdown ${alignRight ? 'align-right' : ''}`}>
                    {/* Selected headers displaying temporary states */}
                    <div className="custom-timepicker-header">
                        <div className="custom-timepicker-header-block">
                            {String(tempHour).padStart(2, '0')}
                        </div>
                        <div className="custom-timepicker-header-block">
                            {String(tempMinute).padStart(2, '0')}
                        </div>
                        <div className="custom-timepicker-header-block">
                            {tempPeriod}
                        </div>
                    </div>

                    {/* Columns grid */}
                    <div className="custom-timepicker-columns">
                        {/* Hours list */}
                        <div className="custom-timepicker-col">
                            {hours.map((h) => {
                                const isSelected = tempHour === h;
                                return (
                                    <button
                                        key={`h-${h}`}
                                        type="button"
                                        className={`custom-timepicker-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleTempSelect(h, tempMinute, tempPeriod)}
                                    >
                                        {String(h).padStart(2, '0')}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Minutes list */}
                        <div className="custom-timepicker-col">
                            {minutes.map((m) => {
                                const isSelected = tempMinute === m;
                                return (
                                    <button
                                        key={`m-${m}`}
                                        type="button"
                                        className={`custom-timepicker-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleTempSelect(tempHour, m, tempPeriod)}
                                    >
                                        {String(m).padStart(2, '0')}
                                    </button>
                                );
                            })}
                        </div>

                        {/* AM/PM list */}
                        <div className="custom-timepicker-col period-col">
                            {['AM', 'PM'].map((p) => {
                                const isSelected = tempPeriod === p;
                                return (
                                    <button
                                        key={`p-${p}`}
                                        type="button"
                                        className={`custom-timepicker-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleTempSelect(tempHour, tempMinute, p)}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer buttons */}
                    <div className="custom-timepicker-footer">
                        <button
                            type="button"
                            className="custom-timepicker-footer-btn"
                            onClick={handleClear}
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            className="custom-timepicker-footer-btn now-btn"
                            onClick={handleNow}
                        >
                            Now
                        </button>
                        <button
                            type="button"
                            className="custom-timepicker-footer-btn set-btn"
                            onClick={handleSet}
                        >
                            Set
                        </button>
                    </div>
                </div>
            )}

            {required && <input type="hidden" name="time" value={value} required />}
        </div>
    );
}
