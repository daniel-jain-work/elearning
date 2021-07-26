import { useMutation } from '@apollo/react-hooks';
import { Graphql } from '@cl/types';
import { DialogActions, DialogContent, Link, Typography } from '@material-ui/core';
import { Rating } from '@material-ui/lab';
import * as React from 'react';
import { Project } from '../data-types';
import { FeatureProjectMutation, FeatureProjectResult } from '../project-queries';
import ModalWrapper from './modal-wrapper';
import ProjectPreview from './project-preview';

interface Props {
  open: boolean;
  onClose: () => void;
  project: Project;
}

export default function ProjectDetails(props: Props) {
  const [rating, setRating] = React.useState(props.project.featured || 0);

  const [featureProject, featureResult] = useMutation<
    FeatureProjectResult,
    Graphql.UpdateProjectArgs
  >(FeatureProjectMutation, {
    onCompleted(data) {
      setRating(data.updateProject.featured);
    }
  });

  return (
    <ModalWrapper
      open={props.open}
      title={props.project.title}
      onClose={props.onClose}
    >
      <DialogContent>
        <Typography color="textSecondary" gutterBottom>
          {props.project.description}
        </Typography>
        <Link href={props.project.url} target="_blank" color="primary">
          {props.project.url}
        </Link>
      </DialogContent>
      {props.project.preview && (
        <DialogContent>
          <ProjectPreview url={props.project.preview} size={360} />
        </DialogContent>
      )}
      {props.project.preview && props.project.title && (
        <DialogActions style={{ justifyContent: 'center' }}>
          <Rating
            value={rating}
            disabled={featureResult.loading}
            max={5}
            size="large"
            onChange={(evt, val) =>
              featureProject({
                variables: {
                  id: props.project.id,
                  featured: val ? val : 0
                }
              })
            }
          />
        </DialogActions>
      )}
    </ModalWrapper>
  );
}
