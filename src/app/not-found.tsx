import Link from "next/link";
import { Box, Container, Typography, Button } from "@mui/material";
import { IconHome } from "@tabler/icons-react";

export default function NotFound() {
  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          textAlign: "center",
          py: 8,
        }}
      >
        <Typography variant="h1" component="h1" sx={{ fontSize: { xs: "4rem", md: "6rem" }, fontWeight: "bold", color: "primary.main", mb: 2 }}>
          404
        </Typography>
        <Typography variant="h4" component="h2" sx={{ mb: 2, fontWeight: "medium" }}>
          Page Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: "500px" }}>
          Sorry, we couldn&apos;t find the page you&apos;re looking for. The page might have been removed, renamed, or is temporarily unavailable.
        </Typography>
        <Link href="/" passHref legacyBehavior>
          <Button
            variant="contained"
            size="large"
            startIcon={<IconHome size={20} />}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: "1.1rem",
            }}
          >
            Back to Home
          </Button>
        </Link>
      </Box>
    </Container>
  );
}