import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { UI_STRINGS } from '../constants';

export const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="menu-btn"
            title={theme === 'light' ? UI_STRINGS.THEME.SWITCH_DARK : UI_STRINGS.THEME.SWITCH_LIGHT}
            style={{ 
                transform: 'none',
                backgroundColor: 'var(--bg-card-accent)',
                opacity: 0.8
            }}
        >
            {theme === 'light' ? (
                <Moon size={20} className="animate-fade-in" />
            ) : (
                <Sun size={20} className="animate-fade-in" />
            )}
        </button>
    );
};
