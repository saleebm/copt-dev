"use client";
import { SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  className?: string;
  onChange: (value: string) => void;
  placeholder: string;
  showClear?: boolean;
  value: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className = "",
  showClear = true,
}: SearchInputProps) {
  const handleClear = () => {
    onChange("");
  };

  return (
    <div className={`relative ${className}`}>
      <SearchIcon className="pointer-events-none absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
      <Input
        className="pr-8 pl-8 text-sm"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
      {showClear && value && (
        <Button
          className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={handleClear}
          size="icon"
          variant="ghost"
        >
          <XIcon className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
