import { useSyncExternalStore } from 'react';
import {
  getPathnameServerSnapshot,
  getPathnameSnapshot,
  subscribePathname,
} from '../lib/pathnameStore';

export function usePathname() {
  return useSyncExternalStore(
    subscribePathname,
    getPathnameSnapshot,
    getPathnameServerSnapshot,
  );
}