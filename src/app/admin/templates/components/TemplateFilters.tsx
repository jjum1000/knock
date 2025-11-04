"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";

interface TemplateFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  sectionFilter: string;
  onSectionChange: (value: string) => void;
  onReset: () => void;
}

export function TemplateFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sectionFilter,
  onSectionChange,
  onReset,
}: TemplateFiltersProps) {
  const hasFilters = searchQuery || statusFilter !== "all" || sectionFilter !== "all";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {/* Section Type Filter */}
        <Select value={sectionFilter} onValueChange={onSectionChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            <SelectItem value="WHY">WHY</SelectItem>
            <SelectItem value="HOW">HOW</SelectItem>
            <SelectItem value="WHAT">WHAT</SelectItem>
            <SelectItem value="PERSONALITY">PERSONALITY</SelectItem>
            <SelectItem value="PAST">PAST</SelectItem>
            <SelectItem value="TRAUMA">TRAUMA</SelectItem>
            <SelectItem value="RELATIONSHIP">RELATIONSHIP</SelectItem>
          </SelectContent>
        </Select>

        {/* Reset Filters */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-10"
          >
            <X className="h-4 w-4 mr-2" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
