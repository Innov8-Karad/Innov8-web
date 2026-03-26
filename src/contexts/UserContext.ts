import { createContext } from 'react';
import type { User } from '../types';

export interface UserContextType {
  students: User[];
  loading: boolean;
  error: string | null;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);
