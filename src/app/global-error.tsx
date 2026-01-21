'use client';

import { Box, Container, Typography, Button } from "@mui/material";
import { IconRefresh } from "@tabler/icons-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <Container maxWidth="md">
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "100vh",
              textAlign: "center",
              py: 8,
            }}
          >
            <Typography variant="h4" component="h1" sx={{ mb: 2, fontWeight: "medium", color: "error.main" }}>
              Something went wrong!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: "500px" }}>
              We apologize for the inconvenience. An unexpected error has occurred.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<IconRefresh size={20} />}
              onClick={reset}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: "1.1rem",
              }}
            >
              Try again
            </Button>
          </Box>
        </Container>
      </body>
    </html>
  );
}