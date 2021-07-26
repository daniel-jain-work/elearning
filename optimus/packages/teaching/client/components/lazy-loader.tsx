import {
  Accordion,
  AccordionDetails,
  AccordionProps,
  AccordionSummary,
  LinearProgress
} from '@material-ui/core';
import { ExpandMore } from '@material-ui/icons';
import React from 'react';

interface LazyLoaderProps
  extends Pick<
    AccordionProps,
    'square' | 'elevation' | 'defaultExpanded' | 'style'
  > {
  summary: React.ReactNode;
  children: React.ReactNode;
  loading: boolean;
  onExpanded: () => void;
}

export default function LazyLoader({
  summary,
  loading,
  onExpanded,
  children,
  ...props
}: LazyLoaderProps) {
  return (
    <Accordion
      {...props}
      onChange={(evt, expanded) => {
        if (expanded) {
          onExpanded();
        }
      }}
    >
      <AccordionSummary expandIcon={<ExpandMore />}>{summary}</AccordionSummary>
      <AccordionDetails style={{ display: 'block' }}>
        {loading ? <LinearProgress /> : children}
      </AccordionDetails>
    </Accordion>
  );
}
