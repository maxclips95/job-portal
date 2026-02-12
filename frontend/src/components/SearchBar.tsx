'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
  debounceDelay?: number;
}

export default function SearchBar({
  onSearch,
  placeholder = 'Search jobs by title, company, or skills...',
  initialValue = '',
  debounceDelay = 300,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      onSearch(query);
      setLoading(false);
    }, debounceDelay);

    return () => clearTimeout(timer);
  }, [query, onSearch, debounceDelay]);

  const handleClear = useCallback(() => {
    setQuery('');
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
    },
    []
  );

  return (
    <div
      className={`relative w-full transition-all duration-200 ${
        isFocused ? 'shadow-lg' : ''
      }`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 bg-white border-2 rounded-lg transition-colors duration-200 ${
          isFocused ? 'border-blue-500' : 'border-gray-200'
        }`}
      >
        {/* Search Icon */}
        <Search
          size={20}
          className={`transition-colors duration-200 ${
            isFocused ? 'text-blue-600' : 'text-gray-400'
          }`}
        />

        {/* Input Field */}
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 outline-none text-gray-900 placeholder-gray-500 bg-transparent"
        />

        {/* Loading Indicator */}
        {loading && (
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        )}

        {/* Clear Button */}
        {query && (
          <button
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            aria-label="Clear search"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Recent Searches or Suggestions */}
      {isFocused && !query && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10">
          <p className="text-xs text-gray-500 mb-3 font-semibold">
            Popular Searches
          </p>
          <div className="space-y-2">
            <button
              onClick={() => setQuery('Frontend Developer')}
              className="block w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-gray-700 text-sm transition-colors"
            >
              Frontend Developer
            </button>
            <button
              onClick={() => setQuery('Backend Engineer')}
              className="block w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-gray-700 text-sm transition-colors"
            >
              Backend Engineer
            </button>
            <button
              onClick={() => setQuery('Product Manager')}
              className="block w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-gray-700 text-sm transition-colors"
            >
              Product Manager
            </button>
            <button
              onClick={() => setQuery('Data Scientist')}
              className="block w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-gray-700 text-sm transition-colors"
            >
              Data Scientist
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
