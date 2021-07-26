import { useQuery } from '@apollo/react-hooks';
import { Graphql } from '@cl/types';
import {
  Card,
  CardHeader,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@material-ui/core';
import { LabelImportantOutlined, LabelOutlined } from '@material-ui/icons';
import { upgradeExpiration } from 'cl-common';
import gql from 'graphql-tag';
import { DateTime } from 'luxon';
import React from 'react';
import { Promotion, PromotionFragment, Session } from '../data-types';

interface Props {
  session: Session;
}

type Nextup = Partial<{
  recommendation: {
    name: string;
    offer?: Promotion;
  };
  registration: {
    startDate: string;
    course: {
      name: string;
    };
  };
}>;

interface RecommendationsQueryResult {
  class: {
    students: { id: string; name: string; nextup: Nextup }[];
  };
}

const RecommendationsQuery = gql`
  ${PromotionFragment}
  query($id: ID!) {
    class(id: $id) {
      students {
        id
        name
        nextup(classId: $id) {
          recommendation {
            name
            offer {
              ...PromotionFragment
            }
          }
          registration {
            startDate
            course {
              name
            }
          }
        }
      }
    }
  }
`;

export default function Recommendations({ session }: Props) {
  const result = useQuery<RecommendationsQueryResult, Graphql.IdArgs>(
    RecommendationsQuery,
    {
      variables: {
        id: session.classId
      }
    }
  );

  if (!result.data?.class) {
    return null;
  }

  return (
    <Card square elevation={0} style={{ marginTop: 32 }}>
      <CardHeader subheader="Personalized recommendations" />
      <List dense disablePadding>
        {result.data.class.students.map(student => {
          const { recommendation, registration } = student.nextup;

          if (registration) {
            return (
              <ListItem key={student.id}>
                <ListItemIcon style={{ minWidth: 40 }}>
                  <LabelOutlined />
                </ListItemIcon>
                <ListItemText
                  primary={`${student.name} has already signed up another class`}
                  secondary={
                    registration.course.name +
                    DateTime.fromISO(registration.startDate).toFormat(
                      ', cccc, LLL d'
                    )
                  }
                />
              </ListItem>
            );
          }

          if (recommendation) {
            return (
              <ListItem key={student.id}>
                <ListItemIcon style={{ minWidth: 40 }}>
                  <LabelImportantOutlined color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={`A good next step for ${student.name}`}
                  secondary={
                    recommendation.offer ? (
                      <>
                        <strong>{recommendation.name}</strong>
                        <br />
                        Use code <u>{recommendation.offer.code}</u> and get{' '}
                        {recommendation.offer.description} within{' '}
                        {upgradeExpiration.levelup} days
                      </>
                    ) : (
                      recommendation.name
                    )
                  }
                />
              </ListItem>
            );
          }

          return null;
        })}
      </List>
    </Card>
  );
}
