import gql from 'graphql-tag';
import { Project, ProjectFragment } from './data-types';

export interface ProjectListQueryResults {
  list: {
    offset: number;
    count: number;
    rows: Project[];
  };
}
export const ProjectListQuery = gql`
  ${ProjectFragment}
  query($limit: Int!, $offset: Int!) {
    list: projects(limit: $limit, offset: $offset) {
      offset
      count
      rows {
        ...ProjectFragment
      }
    }
  }
`;

export interface FeatureProjectResult {
  updateProject: { id: string; featured: number };
}

export const FeatureProjectMutation = gql`
  mutation($id: ID!, $featured: Int) {
    updateProject(id: $id, featured: $featured) {
      id
      featured
    }
  }
`;
