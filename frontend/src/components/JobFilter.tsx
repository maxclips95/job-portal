'use client';

import React, { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface FilterOptions {
  categories: string[];
  locations: string[];
  jobTypes: string[];
  salaryRanges: { label: string; min: number; max: number }[];
  experienceLevels: string[];
}

interface FilterState {
  category: string[];
  location: string[];
  jobType: string[];
  salaryRange: string;
  experience: string[];
}

interface JobFilterProps {
  options: FilterOptions;
  onFilterChange: (filters: FilterState) => void;
  activeFilters: FilterState;
}

export default function JobFilter({
  options,
  onFilterChange,
  activeFilters,
}: JobFilterProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleFilter = (filterType: string, value: string) => {
    const currentValues = activeFilters[filterType as keyof FilterState];

    if (Array.isArray(currentValues)) {
      const updatedValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];

      onFilterChange({
        ...activeFilters,
        [filterType]: updatedValues,
      });
    }
  };

  const toggleSalaryRange = (range: string) => {
    onFilterChange({
      ...activeFilters,
      salaryRange: activeFilters.salaryRange === range ? '' : range,
    });
  };

  const clearFilters = () => {
    onFilterChange({
      category: [],
      location: [],
      jobType: [],
      salaryRange: '',
      experience: [],
    });
  };

  const hasActiveFilters =
    activeFilters.category.length > 0 ||
    activeFilters.location.length > 0 ||
    activeFilters.jobType.length > 0 ||
    activeFilters.salaryRange ||
    activeFilters.experience.length > 0;

  const FilterSection = ({
    title,
    filterKey,
    items,
  }: {
    title: string;
    filterKey: string;
    items: string[] | { label: string; min: number; max: number }[];
  }) => (
    <div className="border-b border-gray-200 py-4">
      <button
        onClick={() => setExpanded(expanded === filterKey ? null : filterKey)}
        className="w-full flex items-center justify-between font-semibold text-gray-900 hover:text-blue-600"
      >
        <span>{title}</span>
        <ChevronDown
          size={20}
          className={`transition-transform duration-200 ${
            expanded === filterKey ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded === filterKey && (
        <div className="mt-3 space-y-2">
          {items.map((item, idx) => {
            const value =
              typeof item === 'string' ? item : `${item.min}-${item.max}`;
            const label = typeof item === 'string' ? item : item.label;
            const isChecked = Array.isArray(activeFilters[filterKey as keyof FilterState])
              ? activeFilters[filterKey as keyof FilterState].includes(value)
              : activeFilters.salaryRange === value;

            return (
              <label
                key={idx}
                className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() =>
                    filterKey === 'salaryRange'
                      ? toggleSalaryRange(value)
                      : toggleFilter(filterKey, value)
                  }
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
                <span className="ml-2 text-gray-700">{label}</span>
                {isChecked && <span className="ml-auto text-blue-600">✓</span>}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-fit sticky top-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-semibold"
          >
            <X size={16} />
            Clear
          </button>
        )}
      </div>

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap gap-2">
          {activeFilters.category.map((cat) => (
            <span
              key={cat}
              className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1"
            >
              {cat}
              <button
                onClick={() => toggleFilter('category', cat)}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          ))}
          {activeFilters.location.map((loc) => (
            <span
              key={loc}
              className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1"
            >
              {loc}
              <button
                onClick={() => toggleFilter('location', loc)}
                className="hover:text-green-900"
              >
                ×
              </button>
            </span>
          ))}
          {activeFilters.jobType.map((type) => (
            <span
              key={type}
              className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1"
            >
              {type}
              <button
                onClick={() => toggleFilter('jobType', type)}
                className="hover:text-purple-900"
              >
                ×
              </button>
            </span>
          ))}
          {activeFilters.experience.map((exp) => (
            <span
              key={exp}
              className="px-3 py-1 bg-orange-100 text-orange-700 text-xs rounded-full flex items-center gap-1"
            >
              {exp}
              <button
                onClick={() => toggleFilter('experience', exp)}
                className="hover:text-orange-900"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Filter Sections */}
      <FilterSection
        title="Job Category"
        filterKey="category"
        items={options.categories}
      />

      <FilterSection
        title="Location"
        filterKey="location"
        items={options.locations}
      />

      <FilterSection
        title="Job Type"
        filterKey="jobType"
        items={options.jobTypes}
      />

      <FilterSection
        title="Salary Range"
        filterKey="salaryRange"
        items={options.salaryRanges}
      />

      <FilterSection
        title="Experience Level"
        filterKey="experience"
        items={options.experienceLevels}
      />

      {/* Apply Button */}
      <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
        Apply Filters
      </button>
    </div>
  );
}
