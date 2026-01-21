'use client';

import { Card, CardContent, Box, Typography, useTheme } from '@mui/material';
import Image from 'next/image';
import { IconArrowRight } from '@tabler/icons-react';

interface CategoryCardProps {
  imageUrl?: string;
  name: string;
  selected?: boolean;
  onClick?: () => void;
}

export default function CategoryCard({
  imageUrl,
  name,
  selected = false,
  onClick,
}: CategoryCardProps) {
  const theme = useTheme();
  const imageSize = 80;
  const backgroundColor = selected ? theme.palette.primary.main : '#FFF4E4';
  const textColor = selected ? '#ffffff' : theme.palette.text.primary;

  // Fallback placeholder image when imageUrl is undefined or null
  const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiByeD0iNDAiIGZpbGw9IiNGNUY1RjUiLz4KPHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSIyMCIgeT0iMjAiPgo8cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJTNi40OCAyMiAxMiAyMlMyMiAxNy41MiAyMiAxMlMxNy41MiAyIDEyIDJ6TTEyIDIwYy00LjQxIDAtOC0zLjU5LTgtOHMzLjU5LTggOC04IDggMy41OSA4IDgtMy41OSA4LTggOHpNMTMgN2gtMnY2aDZWN2gtNHoiIGZpbGw9IiNDQ0NDQ0MiLz4KPC9zdmc+Cjwvc3ZnPgo=';
  const imageSrc = imageUrl || fallbackImage;

  return (
    <Card
      onClick={onClick}
      sx={{
        width: 150,
        maxHeight: 250,
        borderRadius: 1.5,
        backgroundColor,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: selected
          ? '0 8px 16px rgba(248, 156, 53, 0.3)'
          : '0 2px 8px rgba(0, 0, 0, 0.1)',
        '&:hover': {
          backgroundColor: theme.palette.primary.main,
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 16px rgba(248, 156, 53, 0.3)',
          '& .category-name': {
            color: '#ffffff',
          },
          '& .arrow-icon': {
            color: '#ffffff',
          },
        },
      }}
    >
      <CardContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
          py: 2,
          px: 1.5,
          '&:last-child': { pb: 2 },
        }}
      >
        {/* Circular Image */}
        <Box
          sx={{
            width: imageSize,
            height: imageSize,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid #ffffff',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            backgroundColor: '#f5f5f5',
          }}
        >
          <Image
            src={imageSrc}
            alt={name}
            width={imageSize}
            height={imageSize}
            style={{
              objectFit: 'cover',
            }}
          />
        </Box>

        {/* Category Name */}
        <Typography
          className="category-name"
          variant="body1"
          sx={{
            fontWeight: 600,
            fontSize: { xs: '0.875rem', sm: '1rem' },
            color: textColor,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: 40,
            transition: 'color 0.3s ease',
          }}
        >
          {name}
        </Typography>

        {/* Arrow Icon */}
        <Box
          className="arrow-icon"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: textColor,
            transition: 'color 0.3s ease',
          }}
        >
          <IconArrowRight size={20} />
        </Box>
      </CardContent>
    </Card>
  );
}
