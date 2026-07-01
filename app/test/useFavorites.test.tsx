import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useFavorites } from '../src/hooks/useFavorites';

const FROM_KEY = 'midiremap:favorites:from';
const TO_KEY = 'midiremap:favorites:to';

describe('useFavorites', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty with no stored value', () => {
    const { result } = renderHook(() => useFavorites('from'));
    expect([...result.current.favorites]).toEqual([]);
  });

  it('loads an existing list from its scoped key', () => {
    localStorage.setItem(FROM_KEY, JSON.stringify(['ggd_invasion']));
    const { result } = renderHook(() => useFavorites('from'));
    expect(result.current.favorites.has('ggd_invasion')).toBe(true);
  });

  it('toggles a favourite on then off and persists to the scoped key', () => {
    const { result } = renderHook(() => useFavorites('from'));
    act(() => result.current.toggleFavorite('ezdrummer'));
    expect(result.current.favorites.has('ezdrummer')).toBe(true);
    expect(JSON.parse(localStorage.getItem(FROM_KEY)!)).toEqual(['ezdrummer']);
    act(() => result.current.toggleFavorite('ezdrummer'));
    expect(result.current.favorites.has('ezdrummer')).toBe(false);
    expect(JSON.parse(localStorage.getItem(FROM_KEY)!)).toEqual([]);
  });

  it('ignores corrupt stored JSON', () => {
    localStorage.setItem(FROM_KEY, '{');
    const { result } = renderHook(() => useFavorites('from'));
    expect([...result.current.favorites]).toEqual([]);
  });

  it('keeps from and to scopes isolated', () => {
    const from = renderHook(() => useFavorites('from'));
    const to = renderHook(() => useFavorites('to'));
    act(() => from.result.current.toggleFavorite('x'));
    expect(JSON.parse(localStorage.getItem(FROM_KEY)!)).toEqual(['x']);
    expect(JSON.parse(localStorage.getItem(TO_KEY)!)).toEqual([]);
    expect(to.result.current.favorites.has('x')).toBe(false);
  });

  it('does not read the legacy shared key', () => {
    localStorage.setItem('midiremap:favorites', JSON.stringify(['legacy']));
    const { result } = renderHook(() => useFavorites('from'));
    expect(result.current.favorites.has('legacy')).toBe(false);
  });
});
