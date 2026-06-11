import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

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
    searchPlaceholder?: string;
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
    searchPlaceholder = 'Search...',
    disabled = false
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    // Filter options based on search term
    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleDropdown = () => {
        if (disabled) return;
        if (isOpen) {
            setSearchTerm('');
        }
        setIsOpen(!isOpen);
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={`custom-select-container ${className}`} ref={containerRef} style={style}>
            {label && <label className="custom-select-label">{label}</label>}
            <div 
                className={`custom-select-trigger ${isOpen ? 'active' : ''} ${disabled ? 'disabled' : ''}`} 
                style={disabled ? { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none', backgroundColor: 'var(--input-bg-disabled, rgba(255,255,255,0.05))' } : undefined}
                onClick={toggleDropdown}
                tabIndex={disabled ? -1 : 0}
                onKeyDown={(e) => {
                    if (disabled) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleDropdown();
                    }
                }}
            >
                <span className={!selectedOption ? 'placeholder' : ''}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={16} className={`chevron ${isOpen ? 'rotate' : ''}`} />
            </div>

            {isOpen && (
                <div className="custom-select-dropdown">
                    {searchable && (
                        <div className="custom-select-search-container" onClick={(e) => e.stopPropagation()}>
                            <Search size={14} className="custom-select-search-icon" />
                            <input
                                type="text"
                                className="custom-select-search-input"
                                placeholder={searchPlaceholder}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                    )}
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
