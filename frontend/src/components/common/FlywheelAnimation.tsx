// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Box, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { motion, AnimatePresence } from 'framer-motion';

interface FlywheelAnimationProps {
  visible: boolean;
}

const FlywheelAnimation: React.FC<FlywheelAnimationProps> = ({ visible }) => {
  return (
    <AnimatePresence>
      {visible && (
        <Box
          component={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(17, 46, 81, 0.75)',
            zIndex: 9999,
          }}
        >
          <Box
            component={motion.div}
            animate={{ rotate: 360 }}
            transition={{
              duration: 2,
              repeat: 0,
              ease: 'easeInOut',
            }}
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <SettingsIcon sx={{ fontSize: 80, color: '#02BFE7' }} />
          </Box>
          <Typography
            variant="h6"
            sx={{ color: '#FFFFFF', mt: 2, fontWeight: 600 }}
          >
            Updating PIVOT Flywheel...
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 0.5 }}
          >
            Training agents with your decision
          </Typography>
        </Box>
      )}
    </AnimatePresence>
  );
};

export default FlywheelAnimation;
