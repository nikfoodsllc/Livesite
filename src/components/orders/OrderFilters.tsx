import { Box, Chip } from '@mui/material';

export type OrderFilterType = 'all' | 'active' | 'delivered' | 'cancelled';

interface OrderFiltersProps {
  selectedFilter: OrderFilterType;
  onFilterChange: (filter: OrderFilterType) => void;
}

const filters: { value: OrderFilterType; label: string }[] = [
  { value: 'all', label: 'All Orders' },
  { value: 'active', label: 'Active' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function OrderFilters({ selectedFilter, onFilterChange }: OrderFiltersProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        mb: 3,
        overflowX: 'auto',
        pb: 1,
        '&::-webkit-scrollbar': {
          height: '6px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: '#F3F4F6',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#D1D5DB',
          borderRadius: '3px',
        },
      }}
    >
      {filters.map((filter) => {
        const isSelected = selectedFilter === filter.value;
        return (
          <Chip
            key={filter.value}
            label={filter.label}
            onClick={() => onFilterChange(filter.value)}
            sx={{
              backgroundColor: isSelected ? '#FF9F0D' : '#FFFFFF',
              color: isSelected ? '#FFFFFF' : '#6B7280',
              border: isSelected ? 'none' : '1px solid #E5E7EB',
              fontWeight: isSelected ? 600 : 500,
              fontSize: { xs: '13px', sm: '14px' },
              height: { xs: '32px', sm: '36px' },
              px: { xs: 2, sm: 3 },
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: isSelected ? '#E88F0C' : '#F9FAFB',
              },
              whiteSpace: 'nowrap',
            }}
          />
        );
      })}
    </Box>
  );
}
