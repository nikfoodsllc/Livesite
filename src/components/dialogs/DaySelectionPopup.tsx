'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Checkbox,
  Button,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import Image from 'next/image';
import { IconX, IconPlus, IconMinus } from '@tabler/icons-react';
import { FoodItem } from '@/types/food';
import { DayType } from '@/types/cart';
import { CartCustomizations } from '@/types/localCart';
import VegIndicator from '@/components/common/VegIndicator';
import { generateAvailableDatesFromAPI, DayOption } from '@/lib/dayAvailabilityClient';

export interface DaySelection {
  day: DayType;
  date: string;
  quantity: number;
}

interface DaySelectionPopupProps {
  open: boolean;
  onClose: () => void;
  foodItem: FoodItem | null;
  customizations?: CartCustomizations;
  onSelectDays: (selectedDays: DaySelection[], customizations?: CartCustomizations) => void;
}

export default function DaySelectionPopup({
  open,
  onClose,
  foodItem,
  customizations,
  onSelectDays,
}: DaySelectionPopupProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedDays, setSelectedDays] = useState<Map<string, number>>(new Map());
  const [availableDays, setAvailableDays] = useState<DayOption[]>([]);

  // Generate available days when popup opens
  useEffect(() => {
    if (open) {
      const fetchDays = async () => {
        const days = await generateAvailableDatesFromAPI(false); // Only show enabled days
        setAvailableDays(days);
        setSelectedDays(new Map()); // Reset selections
      };
      fetchDays();
    }
  }, [open]);

  const handleDayToggle = (dateString: string) => {
    setSelectedDays((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(dateString)) {
        newMap.delete(dateString);
      } else {
        newMap.set(dateString, 1); // Default quantity of 1
      }
      return newMap;
    });
  };

  const handleQuantityChange = (dateString: string, delta: number) => {
    setSelectedDays((prev) => {
      const newMap = new Map(prev);
      const currentQty = newMap.get(dateString) || 1;
      const newQty = Math.max(1, currentQty + delta);
      newMap.set(dateString, newQty);
      return newMap;
    });
  };

  const handleSubmit = () => {
    if (!foodItem) return;

    const selections: DaySelection[] = [];
    const dayOptionMap = new Map(availableDays.map((opt) => [opt.date, opt]));

    selectedDays.forEach((quantity, dateString) => {
      const dayOption = dayOptionMap.get(dateString);
      if (dayOption) {
        selections.push({
          day: dayOption.day as DayType,
          date: dateString,
          quantity,
        });
      }
    });

    if (selections.length > 0) {
      onSelectDays(selections, customizations);
      handleClose();
    }
  };

  const handleClose = () => {
    // Use setTimeout to avoid synchronous setState
    setTimeout(() => {
      setSelectedDays(new Map());
    }, 0);
    onClose();
  };

  if (!foodItem) return null;

  const hasSelections = selectedDays.size > 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      fullScreen={isMobile}
      sx={{
        '& .MuiDialog-paper': {
          width: isMobile ? '100%' : 500,
          maxWidth: isMobile ? '100%' : 500,
          maxHeight: isMobile ? '100%' : '90vh',
          borderRadius: isMobile ? 0 : 3,
          m: isMobile ? 0 : 2,
        },
      }}
    >
      <DialogContent
        sx={{
          p: isMobile ? 2 : 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pb: 1,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: isMobile ? '1.125rem' : '1.25rem',
              color: theme.palette.text.primary,
            }}
          >
            Choose Delivery Date
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <IconX size={24} />
          </IconButton>
        </Box>

        {/* Food Item Preview */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            backgroundColor: '#F8F8F8',
            borderRadius: 2,
            border: '1px solid #E0E0E0',
          }}
        >
          {/* Food Image */}
          <Box
            sx={{
              width: 70,
              height: 70,
              flexShrink: 0,
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: '#f5f5f5',
              position: 'relative',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <Image
              src={foodItem.url || '/placeholder-food.png'}
              alt={foodItem.name}
              width={70}
              height={70}
              style={{
                objectFit: 'cover',
              }}
            />
            <Box sx={{ position: 'absolute', top: 4, left: 4 }}>
              <VegIndicator isVeg={foodItem.veg} size={14} />
            </Box>
          </Box>

          {/* Food Details */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                fontSize: '1rem',
                color: theme.palette.text.primary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {foodItem.name}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: '1.1rem',
                color: theme.palette.primary.main,
                mt: 0.5,
              }}
            >
              {customizations?.selectedPortionPrice != null
                ? `$${customizations.selectedPortionPrice.toFixed(2)}`
                : foodItem.price != null
                ? `$${foodItem.price.toFixed(2)}`
                : 'Price not available'}
            </Typography>
          </Box>
        </Box>

        {/* Instructions */}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: theme.palette.text.secondary,
            fontSize: '0.875rem',
          }}
        >
          Select from available days:
        </Typography>

        {/* Day Options */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            pr: 0.5,
          }}
        >
          {availableDays.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 4,
                px: 2,
                backgroundColor: '#FFF8EE',
                borderRadius: 2,
                border: '1px dashed #FFB648',
              }}
            >
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                No delivery dates available. Please check back later.
              </Typography>
            </Box>
          ) : (
            availableDays.map((dayOption) => {
              const isSelected = selectedDays.has(dayOption.date);
              const quantity = selectedDays.get(dayOption.date) || 1;

              return (
                <Box
                  key={dayOption.date}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    border: `1.5px solid ${isSelected ? theme.palette.primary.main : '#E0E0E0'}`,
                    borderRadius: 2,
                    backgroundColor: isSelected ? '#FFF4E4' : '#ffffff',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: theme.palette.primary.main,
                      backgroundColor: isSelected ? '#FFF4E4' : '#FAFAFA',
                    },
                  }}
                  onClick={() => handleDayToggle(dayOption.date)}
                >
                  {/* Checkbox and Day Info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleDayToggle(dayOption.date)}
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        color: theme.palette.grey[400],
                        '&.Mui-checked': {
                          color: theme.palette.primary.main,
                        },
                        p: 0,
                      }}
                    />
                    <Box>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.95rem',
                          color: theme.palette.text.primary,
                        }}
                      >
                        {dayOption.formattedDate}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Quantity Selector */}
                  {isSelected && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        backgroundColor: '#FFF8EE',
                        border: '1px solid #E0CAB6',
                        borderRadius: 1,
                        px: 0.5,
                        height: 28,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuantityChange(dayOption.date, -1);
                        }}
                        disabled={quantity <= 1}
                        sx={{
                          p: 0.25,
                          color: theme.palette.primary.main,
                          '&:disabled': {
                            color: theme.palette.grey[400],
                          },
                        }}
                      >
                        <IconMinus size={16} />
                      </IconButton>

                      <Typography
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          minWidth: 20,
                          textAlign: 'center',
                          color: theme.palette.text.primary,
                        }}
                      >
                        {quantity}
                      </Typography>

                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuantityChange(dayOption.date, 1);
                        }}
                        sx={{
                          p: 0.25,
                          color: theme.palette.primary.main,
                        }}
                      >
                        <IconPlus size={16} />
                      </IconButton>
                    </Box>
                  )}
                </Box>
              );
            })
          )}
        </Box>

        {/* Submit Button */}
        <Button
          variant="contained"
          fullWidth
          onClick={handleSubmit}
          disabled={!hasSelections}
          sx={{
            backgroundColor: hasSelections ? theme.palette.primary.main : theme.palette.grey[400],
            color: '#ffffff',
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '1rem',
            height: 50,
            borderRadius: 2,
            mt: 1,
            '&:hover': {
              backgroundColor: hasSelections
                ? theme.palette.primary.dark
                : theme.palette.grey[400],
            },
            '&:disabled': {
              backgroundColor: theme.palette.grey[400],
              color: '#ffffff',
            },
          }}
        >
          {hasSelections
            ? `Add to Cart for ${selectedDays.size} ${selectedDays.size === 1 ? 'Day' : 'Days'}`
            : 'Select at least one day'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
