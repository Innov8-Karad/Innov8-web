import { Search } from 'lucide-react';

interface SearchInputProps {
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    style?: React.CSSProperties;
}

export default function SearchInput({ placeholder, value, onChange, style }: SearchInputProps) {
    return (
        <div style={{ position: 'relative', flex: 1, ...style }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{ paddingLeft: '40px' }}
            />
        </div>
    );
}
