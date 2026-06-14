import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
    value: string;
    label: string;
}

interface CustomSelectProps {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
    style?: React.CSSProperties;
    searchable?: boolean;
    disabled?: boolean;
}

export default function CustomSelect({
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    label,
    className = '',
    style,
    searchable = false,
    disabled = false
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    // Filter options based on search term
    const filterText = isFocused ? searchTerm : '';
    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(filterText.toLowerCase())
    );

    const toggleDropdown = () => {
        if (disabled) return;
        if (!isOpen) {
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setIsFocused(false);
        setSearchTerm('');
    };

    const handleFocus = () => {
        if (disabled) return;
        setIsFocused(true);
        setSearchTerm('');
        setIsOpen(true);
    };

    const handleBlur = () => {
        // Delay blur slightly to allow click event on option to fire
        setTimeout(() => {
            setIsFocused(false);
            setSearchTerm('');
        }, 150);
    };

    return (
        <div className={`custom-select-container ${className}`} ref={containerRef} style={style}>
            {label && <label className="custom-select-label">{label}</label>}
            <div 
                className={`custom-select-trigger ${isOpen ? 'active' : ''} ${disabled ? 'disabled' : ''}`} 
                style={disabled ? { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none', backgroundColor: 'var(--input-bg-disabled, rgba(255,255,255,0.05))' } : undefined}
                onClick={!searchable ? toggleDropdown : undefined}
                tabIndex={disabled ? -1 : 0}
            >
                {searchable ? (
                    <input
                        type="text"
                        value={isFocused ? searchTerm : (selectedOption ? selectedOption.label : '')}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            if (!isOpen) setIsOpen(true);
                        }}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder={placeholder}
                        style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', color: 'var(--text-main)', fontSize: '0.95rem', fontFamily: 'inherit', padding: 0 }}
                    />
                ) : (
                    <span className={!selectedOption ? 'placeholder' : ''}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                )}
                <ChevronDown size={16} className={`chevron ${isOpen ? 'rotate' : ''}`} onClick={(e) => { if (searchable && !disabled) { e.stopPropagation(); toggleDropdown(); } }} style={{ cursor: 'pointer' }} />
            </div>

            {isOpen && (
                <div className="custom-select-dropdown">
                    {filteredOptions.length === 0 ? (
                        <div className="custom-select-option empty">No options found</div>
                    ) : (
                        filteredOptions.map((option) => (
                            <div
                                key={option.value}
                                className={`custom-select-option ${option.value === value ? 'selected' : ''}`}
                                onClick={() => handleSelect(option.value)}
                            >
                                {option.label}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
