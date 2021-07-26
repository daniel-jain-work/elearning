import {
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@material-ui/core';
import { CardGiftcard } from '@material-ui/icons';
import { upgradeExpiration } from 'cl-common';
import React from 'react';
import { ClassDetails } from '../data-types';

interface Props {
  course: ClassDetails['course'];
}

export default function TrialPromotion({ course }: Props) {
  if (!course.isTrial || !course.offer) {
    return null;
  }

  return (
    <Card style={{ marginBottom: 24 }}>
      <CardHeader
        title="Special Offer"
        titleTypographyProps={{ color: 'primary' }}
        subheader={
          <>
            Use code <u>{course.offer.code}</u> within
            {upgradeExpiration.trialToPay} days
          </>
        }
      />
      <CardContent>
        <List dense disablePadding>
          <ListItem disableGutters>
            <ListItemIcon>
              <CardGiftcard color="primary" />
            </ListItemIcon>
            <ListItemText primary={course.offer.description} />
          </ListItem>
        </List>
      </CardContent>
    </Card>
  );
}
