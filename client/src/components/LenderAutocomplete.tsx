import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import type { Lender } from "@shared/schema";

interface LenderAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  "data-testid"?: string;
}

export function LenderAutocomplete({
  value,
  onChange,
  placeholder = "Search lender...",
  id,
  "data-testid": testId,
}: LenderAutocompleteProps) {
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: lenders } = useQuery<Lender[]>({
    queryKey: ['/api/lenders'],
  });

  const filtered = (lenders || []).filter((lender) => {
    if (!value.trim()) return true;
    return lender.name.toLowerCase().includes(value.toLowerCase());
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowResults(true);
        }}
        onFocus={() => setShowResults(true)}
        placeholder={placeholder}
        data-testid={testId}
        autoComplete="off"
      />
      {showResults && (value.length === 0 || filtered.length > 0) ? (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-auto">
          {filtered.length > 0 ? (
            filtered.map((lender) => (
              <button
                key={lender.id}
                type="button"
                onClick={() => {
                  onChange(lender.name);
                  setShowResults(false);
                }}
                className="w-full p-2 text-left hover-elevate border-b last:border-b-0"
                data-testid={`button-select-lender-${lender.id}`}
              >
                <p className="font-medium text-sm">{lender.name}</p>
                {lender.tier && (
                  <p className="text-xs text-muted-foreground">Tier: {lender.tier}</p>
                )}
              </button>
            ))
          ) : (
            <div className="p-2 text-center text-muted-foreground text-sm">
              No lenders found
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
