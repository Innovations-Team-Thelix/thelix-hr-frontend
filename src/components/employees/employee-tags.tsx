import React from 'react';
import { Badge } from '@/components/ui/badge';

interface EmployeeTagsProps {
  tags?: string[];
}

export function EmployeeTags({ tags }: EmployeeTagsProps) {
  if (!tags || tags.length === 0) return null;

  const getTagVariant = (tag: string) => {
    const lower = tag.toLowerCase();
    if (lower.includes('leave')) return 'info';
    if (lower.includes('probation')) return 'warning';
    if (lower.includes('notice')) return 'danger';
    return 'neutral';
  };

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge key={tag} variant={getTagVariant(tag)}>
          {tag}
        </Badge>
      ))}
    </div>
  );
}
