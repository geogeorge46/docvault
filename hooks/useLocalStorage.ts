import { useState, useEffect, Dispatch, SetStateAction } from 'react';

// Fix: Use Dispatch and SetStateAction directly to avoid needing the React namespace.
function useLocalStorage<T,>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };
  
  // This useEffect is not strictly necessary if you only write via setValue,
  // but it's good practice to ensure state is loaded from localStorage on mount.
  useEffect(() => {
    try {
        const item = window.localStorage.getItem(key);
        if (item) {
            setStoredValue(JSON.parse(item));
        }
    } catch (error) {
        console.error("Error reading from local storage", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);


  return [storedValue, setValue];
}

export default useLocalStorage;
